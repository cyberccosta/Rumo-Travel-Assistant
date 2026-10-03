from typing import Literal
from pydantic import BaseModel, Field, model_validator

Estilo = Literal["economico", "moderado", "luxuoso"]


class PlanRequest(BaseModel):
    destino: str = ""                 # país ou cidade (preenchido a partir de `destinos`)
    destinos: list[str] = []          # um ou mais países, na ordem da rota
    dias: int = Field(ge=1, le=60)
    estilo: Estilo = "moderado"
    origem: str = "Brasil"
    data_inicio: str | None = None    # AAAA-MM-DD
    data_fim: str | None = None
    interesses: list[str] = []
    detalhes: str = Field("", max_length=2000)   # lugares, restaurantes, endereço do hotel...

    @model_validator(mode="after")
    def _destinos(self):
        if not self.destinos and self.destino:
            self.destinos = [self.destino]
        if not self.destinos:
            raise ValueError("Informe ao menos um destino")
        self.destino = " + ".join(self.destinos)
        return self


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
    notas: str = ""                   # diário de bordo do dia (escrito pelo viajante)


class Trecho(BaseModel):
    de: str
    para: str
    modo: str
    duracao: str | None = None
    custo_brl: float | None = None    # só preencher se vier das APIs


class CustoDestino(BaseModel):
    destino: str
    dias: int
    # BRL por pessoa por dia, gasto em solo (sem passagem aérea internacional)
    hospedagem: float
    alimentacao: float
    transporte_local: float
    atividades: float


class CustosIA(BaseModel):
    por_destino: list[CustoDestino]
    transporte_entre_destinos: float = 0   # total em BRL dos deslocamentos entre os destinos
    observacao: str = ""


class Itinerario(BaseModel):
    cidades: list[Cidade]
    roteiro: list[DiaRoteiro]
    trechos: list[Trecho]
    checklist: list[str]
    custos_ia: CustosIA | None = None


# --- partes calculadas em Python (dados reais) ---
class Custos(BaseModel):
    moeda_destino: str
    cambio: float | None              # 1 BRL = x moeda_destino
    diaria_brl: float
    total_brl: float
    por_categoria: dict[str, float]
    por_destino: list[dict] = []
    observacao: str = ""
    origem: str = "ia"                # "ia" = estimativa da IA; "padrao" = tabela provisória (reserva)


class Plan(BaseModel):
    request: PlanRequest
    itinerario: Itinerario
    custos: Custos | None
    clima: dict | None = None
    id: str | None = None             # preenchidos ao salvar a viagem
    criado_em: str | None = None


# --- ideias de atividade pedidas pelo viajante ---
class IdeiaRequest(BaseModel):
    destinos: list[str] = []
    cidade: str = ""
    dia: int = 1
    titulo: str = ""
    itens: list[str] = []             # atividades que já estão no dia
    estilo: str = ""
    interesses: list[str] = []
    detalhes: str = Field("", max_length=2000)
    pedido: str = Field("", max_length=300)    # o que o viajante quer fazer
    evitar: list[str] = []            # ideias já sugeridas (para não repetir)


class Ideia(BaseModel):
    atividade: str
    motivo: str = ""
