from pathlib import Path
from urllib.parse import unquote

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import repositorio
from .fontes import locais
from .planner import gerar_ideia, montar
from .schemas import Anexo, Ideia, IdeiaRequest, Plan, PlanRequest

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


# --- anexos da Preparação (documentos e reservas) ---
# Tipos que o navegador pode abrir sem risco; qualquer outro (HTML, SVG...) só baixa.
INLINE = {"application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"}


@app.post("/api/viagens/{vid}/anexos", response_model=Anexo)
async def anexar(vid: str, request: Request):
    """Recebe o arquivo cru no corpo da requisição; o nome vai no cabeçalho X-Nome (codificado em URL)."""
    if not repositorio.obter(vid):
        raise HTTPException(404, "Viagem não encontrada (o servidor pode ter reiniciado)")
    if int(request.headers.get("content-length") or 0) > repositorio.LIMITE_ANEXO:
        raise HTTPException(413, "Arquivo grande demais. O limite é de 8 MB.")
    dados = await request.body()
    if not dados:
        raise HTTPException(400, "Arquivo vazio.")
    if len(dados) > repositorio.LIMITE_ANEXO:
        raise HTTPException(413, "Arquivo grande demais. O limite é de 8 MB.")
    nome = unquote(request.headers.get("x-nome", "")).strip() or "arquivo"
    mime = request.headers.get("content-type", "").split(";")[0].strip() or "application/octet-stream"
    return repositorio.salvar_anexo(vid, nome, mime, dados)


@app.get("/api/viagens/{vid}/anexos/{aid}")
def baixar(vid: str, aid: str):
    meta, caminho = repositorio.anexo_da_viagem(vid, aid), repositorio.caminho_anexo(vid, aid)
    if not meta or not caminho:
        raise HTTPException(404, "Anexo não encontrado.")
    abre = meta.mime in INLINE
    return FileResponse(caminho, media_type=meta.mime if abre else "application/octet-stream", filename=meta.nome,
                        content_disposition_type="inline" if abre else "attachment",
                        headers={"X-Content-Type-Options": "nosniff"})


@app.delete("/api/viagens/{vid}/anexos/{aid}")
def remover_anexo(vid: str, aid: str):
    repositorio.excluir_anexo(vid, aid)
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


class SiteSemCache(StaticFiles):
    """Entrega o site pedindo ao navegador que confira com o servidor a cada abertura (304 se nada mudou).
    Sem isso, o navegador reaproveita app.js e style.css antigos e uma versão nova parece não ter mudado nada."""

    async def get_response(self, path, scope):
        resp = await super().get_response(path, scope)
        resp.headers["Cache-Control"] = "no-cache"
        return resp


app.mount("/web", SiteSemCache(directory=WEB), name="web")


@app.get("/")
def home():
    return FileResponse(WEB / "index.html", headers={"Cache-Control": "no-cache"})
