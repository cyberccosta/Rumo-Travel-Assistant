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


# --- Preparação da viagem (tudo informado pelo viajante, sem IA) ---
class Anexo(BaseModel):                 # arquivo guardado no servidor; a viagem só guarda a referência
    id: str
    nome: str = Field(max_length=200)
    tamanho: int = 0
    mime: str = ""


class ItemChecklist(BaseModel):
    id: str
    texto: str = Field(max_length=200)
    feito: bool = False


class Documento(BaseModel):
    id: str
    nome: str = Field(max_length=200)
    tipo: str = Field("outro", max_length=40)
    validade: str | None = None         # AAAA-MM-DD
    nota: str = Field("", max_length=500)
    anexo: Anexo | None = None


class RegraEntrada(BaseModel):          # regra de entrada, visto ou exigência anotada pelo viajante
    id: str
    pais: str = Field("", max_length=120)
    assunto: str = Field("", max_length=120)
    detalhes: str = Field("", max_length=1500)
    link: str = Field("", max_length=500)
    resolvido: bool = False


class Reserva(BaseModel):
    id: str
    tipo: str = Field("outro", max_length=40)        # voo | onibus | hospedagem | passeio | outro
    titulo: str = Field(max_length=200)
    data: str | None = None             # AAAA-MM-DD (início)
    data_fim: str | None = None         # opcional (ex.: saída da hospedagem)
    codigo: str = Field("", max_length=80)
    valor_brl: float | None = Field(None, ge=0, le=1e9)
    status: str = Field("reservada", max_length=20)  # a_reservar | reservada | paga
    nota: str = Field("", max_length=500)
    anexo: Anexo | None = None


class Lancamento(BaseModel):            # gasto previsto que não é uma reserva
    id: str
    categoria: str = Field("outros", max_length=40)
    descricao: str = Field(max_length=200)
    valor_brl: float = Field(0, ge=0, le=1e9)
    pago: bool = False


class Financeiro(BaseModel):            # só R$ (BRL) por enquanto; múltiplas moedas ficam para uma versão futura
    guardado_brl: float = Field(0, ge=0, le=1e9)
    meta_brl: float | None = Field(None, ge=0, le=1e9)
    lancamentos: list[Lancamento] = []


class Preparacao(BaseModel):
    checklist: list[ItemChecklist] = []
    sugestoes_importadas: bool = False  # as sugestões do roteiro já foram copiadas para o checklist
    documentos: list[Documento] = []
    regras: list[RegraEntrada] = []
    reservas: list[Reserva] = []
    financeiro: Financeiro = Field(default_factory=Financeiro)


# --- Em viagem (tudo registrado pelo viajante durante a expedição, sem IA) ---
# O diário de cada dia continua em DiaRoteiro.notas, para não perder o que já foi escrito.
class Local(BaseModel):                 # lugar que o viajante quer visitar ou já visitou
    id: str
    nome: str = Field(max_length=200)
    lugar: str = Field("", max_length=120)           # cidade ou país, ajuda a achar no mapa
    tipo: str = Field("outro", max_length=40)
    visitado: bool = False
    data: str | None = None             # AAAA-MM-DD da visita
    nota: str = Field("", max_length=500)


class Deslocamento(BaseModel):          # trajeto realizado entre dois pontos
    id: str
    de: str = Field(max_length=120)
    para: str = Field(max_length=120)
    modo: str = Field("outro", max_length=40)
    data: str | None = None
    duracao: str = Field("", max_length=60)
    nota: str = Field("", max_length=500)


class GastoViagem(BaseModel):           # só R$ (BRL) por enquanto
    id: str
    categoria: str = Field("outros", max_length=40)
    descricao: str = Field(max_length=200)
    valor_brl: float = Field(0, ge=0, le=1e9)
    data: str | None = None


class Registro(BaseModel):              # anotação da viagem, organizada por categoria
    id: str
    categoria: str = Field("outros", max_length=40)
    titulo: str = Field(max_length=200)
    texto: str = Field("", max_length=3000)
    data: str | None = None


class EmViagem(BaseModel):
    locais: list[Local] = []
    deslocamentos: list[Deslocamento] = []
    gastos: list[GastoViagem] = []
    registros: list[Registro] = []


class Plan(BaseModel):
    request: PlanRequest
    itinerario: Itinerario
    custos: Custos | None
    clima: AnaliseClima | None = None
    financas: ContextoFinanceiro | None = None
    preparacao: Preparacao = Field(default_factory=Preparacao)
    em_viagem: EmViagem = Field(default_factory=EmViagem)
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
