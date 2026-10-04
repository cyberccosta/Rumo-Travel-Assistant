import re
from typing import Annotated, Literal
from pydantic import BaseModel, BeforeValidator, Field, model_validator

Estilo = Literal["economico", "moderado", "luxuoso"]
ESTILO_ROTULO = {"economico": "mochileiro (econômico)", "moderado": "confortável", "luxuoso": "luxuoso"}
# De onde vem um dado: estimativa da IA ou API externa. A tela mostra a diferença; trocar a fonte não muda o formato.
Fonte = Literal["ia", "api"]
# Nível em texto vindo da IA ("Alta " vira "alta"). A tela trata com elegância valores que não conhece.
Nivel = Annotated[str, BeforeValidator(lambda v: "" if v is None else str(v).strip().lower())]


# Respostas de IA vêm "sujas" (null, "21 °C", {}): estes tipos aceitam isso em vez de derrubar a análise inteira.
def _numero(v):
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return v
    m = re.search(r"-?\d+(?:[.,]\d+)?", str(v)) if v is not None else None
    return float(m.group().replace(",", ".")) if m else None


Texto = Annotated[str, BeforeValidator(lambda v: "" if v is None else str(v))]
Numero = Annotated[float | None, BeforeValidator(_numero)]
Lista = Annotated[list[str], BeforeValidator(lambda v: [] if v is None else v)]


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
    atividades: float                 # passeios e experiências
    outros: float = 0                 # chip/eSIM, seguro, gorjetas, imprevistos pequenos


class CustosIA(BaseModel):
    por_destino: list[CustoDestino]
    voos_total: float = 0             # BRL por pessoa: ida e volta da origem + voos entre destinos
    terrestre_total: float = 0        # BRL por pessoa: ônibus, trem e barco entre os destinos
    observacao: str = ""


class Itinerario(BaseModel):
    cidades: list[Cidade]
    roteiro: list[DiaRoteiro]
    trechos: list[Trecho]
    checklist: list[str]
    custos_ia: CustosIA | None = None


# --- partes calculadas em Python (dados reais) ---
class Custos(BaseModel):
    diaria_brl: float                 # média por dia no destino (sem voos, deslocamentos e reserva)
    total_brl: float
    # chaves: voos, onibus_trem, transporte_local, hospedagem, alimentacao, atividades, outros, reserva
    por_categoria: dict[str, float]
    por_destino: list[dict] = []
    observacao: str = ""
    origem: str = "ia"                # "ia" = estimativa da IA; "padrao" = tabela provisória (reserva)
    reserva_pct: float = 0            # fração do subtotal separada como reserva/emergência


# --- clima historicamente esperado (NÃO é previsão do tempo) ---
class ClimaDestino(BaseModel):
    destino: Texto = ""
    estacao: Texto = ""                 # sazonalidade: "estação chuvosa", "inverno"...
    temp_min_c: Numero = None   # média típica das mínimas
    temp_max_c: Numero = None   # média típica das máximas
    chuva: Nivel = ""                 # baixa | moderada | alta
    chuva_descricao: Texto = ""
    condicoes: Texto = ""


class Alternativa(BaseModel):
    periodo: Texto = ""
    motivo: Texto = ""
    impacto_clima: Texto = ""
    relacao_preferencias: Texto = ""


class AnaliseClima(BaseModel):
    fonte: Fonte = "ia"
    periodo: Texto = ""                 # meses da viagem, calculados a partir das datas
    destinos: list[ClimaDestino] = []
    compatibilidade: Nivel = ""       # boa | regular | baixa (para o estilo e os interesses escolhidos)
    avaliacao: Texto = ""
    alternativa: Annotated[Alternativa | None, BeforeValidator(lambda v: v if isinstance(v, dict) and v.get("periodo") else None)] = None   # só uma sugestão: as datas do viajante nunca mudam sozinhas


# --- contexto financeiro do destino ---
class Cambio(BaseModel):
    fonte: Fonte
    de: str
    para: str
    taxa: float | None = None         # 1 `de` = taxa `para`
    consultado_em: str | None = None  # só quando a fonte é uma API


class SobreODinheiro(BaseModel):
    nivel_custo: Nivel = ""           # baixo | moderado | alto | muito alto (percepção geral)
    percepcao: Texto = ""
    variacao_cambial: Texto = ""
    cartoes: Texto = ""
    dinheiro_especie: Texto = ""
    quando_especie: Texto = ""
    taxas_cuidados: Texto = ""
    dicas_economia: Lista = []


class FinancasDestinoIA(SobreODinheiro):          # o que a IA devolve
    destino: Texto = ""
    moeda: Texto = ""
    moeda_nome: Texto = ""
    por_brl: Numero = None      # 1 BRL = x moeda local (aproximado)


class FinancasIA(BaseModel):
    usd_brl: Numero = None
    destinos: list[FinancasDestinoIA] = []


class FinancasDestino(SobreODinheiro):            # o que a tela recebe
    destino: str
    moeda: str = ""
    moeda_nome: str = ""
    cambio: Cambio


class ContextoFinanceiro(BaseModel):
    usd_brl: Cambio
    destinos: list[FinancasDestino]


class Plan(BaseModel):
    request: PlanRequest
    itinerario: Itinerario
    custos: Custos | None
    clima: AnaliseClima | None = None
    financas: ContextoFinanceiro | None = None
    avisos: dict[str, str] = {}       # fonte -> motivo, quando uma fonte opcional (clima, financas) falhou
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
