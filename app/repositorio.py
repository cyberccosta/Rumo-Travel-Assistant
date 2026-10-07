"""Onde as viagens ficam guardadas. Hoje: memória do servidor (some ao reiniciar).
Trocar por banco de dados = reescrever só este arquivo, mantendo as funções. (Também é aqui que entrariam
o dono de cada viagem e a visibilidade, quando existirem contas.)

Anexos (documentos e reservas da Preparação) ficam em disco, em data/anexos/<viagem>/<arquivo>. Como as viagens
ainda vivem só na memória, a pasta é esvaziada quando o servidor sobe: assim nenhum arquivo fica órfão.
Ao ligar um banco de dados, REMOVA essa limpeza."""
import re
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .schemas import Anexo, Plan

_VIAGENS: dict[str, Plan] = {}
ANEXOS = Path(__file__).resolve().parent.parent / "data" / "anexos"
LIMITE_ANEXO = 8 * 1024 * 1024  # 8 MB por arquivo
_ID = re.compile(r"^[0-9a-f]{6,32}$")  # ids gerados aqui; impede caminhos como "../"

shutil.rmtree(ANEXOS, ignore_errors=True)


def listar() -> list[Plan]:
    return sorted(_VIAGENS.values(), key=lambda v: v.criado_em or "", reverse=True)


def obter(vid: str) -> Plan | None:
    return _VIAGENS.get(vid)


def criar(v: Plan) -> Plan:
    v.id, v.criado_em = uuid.uuid4().hex[:10], datetime.now(timezone.utc).isoformat()
    _VIAGENS[v.id] = v
    return v


def atualizar(vid: str, v: Plan) -> Plan | None:
    atual = _VIAGENS.get(vid)
    if not atual:
        return None
    v.id, v.criado_em = vid, atual.criado_em
    _VIAGENS[vid] = v
    return v


def excluir(vid: str) -> None:
    _VIAGENS.pop(vid, None)
    if _ID.match(vid):
        shutil.rmtree(ANEXOS / vid, ignore_errors=True)


# --- anexos ---
def _caminho(vid: str, aid: str) -> Path | None:
    return ANEXOS / vid / aid if _ID.match(vid) and _ID.match(aid) else None


def salvar_anexo(vid: str, nome: str, mime: str, dados: bytes) -> Anexo:
    aid = uuid.uuid4().hex[:12]
    destino = _caminho(vid, aid)
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(dados)
    return Anexo(id=aid, nome=nome[:200], tamanho=len(dados), mime=mime[:100])


def caminho_anexo(vid: str, aid: str) -> Path | None:
    c = _caminho(vid, aid)
    return c if c and c.is_file() else None


def excluir_anexo(vid: str, aid: str) -> None:
    c = _caminho(vid, aid)
    if c:
        c.unlink(missing_ok=True)


def anexo_da_viagem(vid: str, aid: str) -> Anexo | None:
    """Metadados (nome e tipo) de um anexo, procurando nos documentos e reservas da viagem."""
    v = _VIAGENS.get(vid)
    if not v:
        return None
    for item in [*v.preparacao.documentos, *v.preparacao.reservas]:
        if item.anexo and item.anexo.id == aid:
            return item.anexo
    return None
