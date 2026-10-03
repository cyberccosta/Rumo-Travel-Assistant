import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()
from . import providers  # noqa: E402
from .planner import gerar_ideia, montar  # noqa: E402
from .schemas import Ideia, IdeiaRequest, Plan, PlanRequest  # noqa: E402

app = FastAPI(title="Rumo - assistente de viagens")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])  # restrinja em produção
WEB = Path(__file__).resolve().parent.parent / "web"

# Viagens salvas SÓ na memória do servidor: somem quando ele reinicia. Trocar por banco de dados depois.
VIAGENS: dict[str, Plan] = {}


async def _planejar(req: PlanRequest) -> Plan:
    try:
        return await montar(req)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(502, f"Falha ao montar o roteiro: {e}")


@app.post("/api/plan", response_model=Plan)
async def plan(req: PlanRequest):
    return await _planejar(req)


@app.get("/api/viagens", response_model=list[Plan])
def listar():
    return sorted(VIAGENS.values(), key=lambda v: v.criado_em or "", reverse=True)


@app.post("/api/viagens", response_model=Plan)
async def criar(req: PlanRequest):
    v = await _planejar(req)
    v.id, v.criado_em = uuid.uuid4().hex[:10], datetime.now(timezone.utc).isoformat()
    VIAGENS[v.id] = v
    return v


@app.put("/api/viagens/{vid}", response_model=Plan)
def salvar(vid: str, v: Plan):
    if vid not in VIAGENS:
        raise HTTPException(404, "Viagem não encontrada (o servidor pode ter reiniciado)")
    v.id, v.criado_em = vid, VIAGENS[vid].criado_em
    VIAGENS[vid] = v
    return v


@app.delete("/api/viagens/{vid}")
def excluir(vid: str):
    VIAGENS.pop(vid, None)
    return {"ok": True}


@app.post("/api/ideia", response_model=Ideia)
async def ideia(req: IdeiaRequest):
    try:
        return await gerar_ideia(req)
    except Exception as e:
        raise HTTPException(502, f"Não consegui gerar uma ideia agora: {e}")


@app.get("/api/paises")
def paises():
    return [{"iso2": p["iso2"], "nome": p["nome"], "continente": p["continente"]} for p in providers.PAISES]


app.mount("/web", StaticFiles(directory=WEB), name="web")


@app.get("/")
def home():
    return FileResponse(WEB / "index.html")
