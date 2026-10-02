from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

load_dotenv()
from . import providers  # noqa: E402
from .planner import montar  # noqa: E402
from .schemas import Plan, PlanRequest  # noqa: E402

app = FastAPI(title="Assistente de Viagens")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])  # restrinja em produção
WEB = Path(__file__).resolve().parent.parent / "web"


@app.post("/api/plan", response_model=Plan)
async def plan(req: PlanRequest):
    try:
        return await montar(req)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(502, f"Falha ao montar o roteiro: {e}")


@app.get("/api/paises")
def paises():
    return [{"iso2": p["iso2"], "nome": p["nome"]} for p in providers.PAISES]


@app.get("/")
def home():
    return FileResponse(WEB / "index.html")
