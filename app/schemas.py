from typing import Literal
from pydantic import BaseModel, Field

Estilo = Literal["economico", "moderado", "luxuoso"]


class PlanRequest(BaseModel):
    destino: str                      # país ou cidade
    dias: int = Field(ge=1, le=60)
    estilo: Estilo = "moderado"
    passaporte: str = "BR"            # ISO-2 do passaporte
    origem: str = "Brasil"


# --- parte gerada pela IA (sem números de preço nem visto) ---
class Cidade(BaseModel):
    nome: str
    dias: int
    destaques: list[str]


class DiaRoteiro(BaseModel):
    dia: int
    cidade: str
    titulo: str
    itens: list[str]


class Trecho(BaseModel):
    de: str
    para: str
    modo: str
    duracao: str | None = None
    custo_brl: float | None = None    # só preencher se vier das APIs


class Itinerario(BaseModel):
    cidades: list[Cidade]
    roteiro: list[DiaRoteiro]
    trechos: list[Trecho]
    checklist: list[str]


# --- partes calculadas em Python (dados reais) ---
class Custos(BaseModel):
    moeda_destino: str
    cambio: float | None              # 1 BRL = x moeda_destino
    diaria_brl: float
    total_brl: float
    por_categoria: dict[str, float]


class Visto(BaseModel):
    requisito: str
    estadia_max_dias: int | None
    fonte: str
    consultado_em: str
    aviso: str


class Plan(BaseModel):
    request: PlanRequest
    itinerario: Itinerario
    custos: Custos | None
    visto: Visto
    clima: dict | None = None
