from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import repositorio
from .fontes import locais
from .planner import gerar_ideia, montar
from .schemas import Ideia, IdeiaRequest, Plan, PlanRequest

load_dotenv()  # as variáveis só são lidas quando as funções rodam, não na importação

app = FastAPI(title="Rumo - assistente de viagens")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])  # restrinja em produção
WEB = Path(__file__).resolve().parent.parent / "web"


@app.get("/api/viagens", response_model=list[Plan])
def listar():
    return repositorio.listar()


@app.post("/api/viagens", response_model=Plan)
async def criar(req: PlanRequest):
    try:
        plano = await montar(req)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e
    except Exception as e:
        raise HTTPException(502, f"Falha ao montar o roteiro: {e}") from e
    return repositorio.criar(plano)


@app.put("/api/viagens/{vid}", response_model=Plan)
def salvar(vid: str, v: Plan):
    salva = repositorio.atualizar(vid, v)
    if not salva:
        raise HTTPException(404, "Viagem não encontrada (o servidor pode ter reiniciado)")
    return salva


@app.delete("/api/viagens/{vid}")
def excluir(vid: str):
    repositorio.excluir(vid)
    return {"ok": True}


@app.post("/api/ideia", response_model=Ideia)
async def ideia(req: IdeiaRequest):
    try:
        return await gerar_ideia(req)
    except Exception as e:
        raise HTTPException(502, f"Não consegui gerar uma ideia agora: {e}") from e


@app.get("/api/paises")
def paises():
    return [{"iso2": p["iso2"], "nome": p["nome"], "continente": p["continente"]} for p in locais.PAISES]


app.mount("/web", StaticFiles(directory=WEB), name="web")


@app.get("/")
def home():
    return FileResponse(WEB / "index.html")
