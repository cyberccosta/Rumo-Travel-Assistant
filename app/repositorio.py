"""Onde as viagens ficam guardadas. Hoje: memória do servidor (some ao reiniciar).
Trocar por banco de dados = reescrever só este arquivo, mantendo as funções. (Também é aqui que entrariam
o dono de cada viagem e a visibilidade, quando existirem contas.)"""
import uuid
from datetime import datetime, timezone

from .schemas import Plan

_VIAGENS: dict[str, Plan] = {}


def listar() -> list[Plan]:
    return sorted(_VIAGENS.values(), key=lambda v: v.criado_em or "", reverse=True)


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
