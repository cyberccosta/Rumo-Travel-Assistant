"""Clima da viagem: o que é HISTORICAMENTE esperado na época (nunca previsão do tempo).
Hoje a fonte é a IA. Uma API de clima entra em FONTES devolvendo o mesmo AnaliseClima, com fonte="api"."""
import json
import os
from datetime import date

from ..llm import gerar
from ..schemas import ESTILO_ROTULO, AnaliseClima

MESES = ("janeiro", "fevereiro", "março", "abril", "maio", "junho",
         "julho", "agosto", "setembro", "outubro", "novembro", "dezembro")

SYSTEM = (
    "Você é um consultor de clima para viajantes. Você NÃO faz previsão do tempo: descreve o que é HISTORICAMENTE típico "
    "(climatologia) nos meses informados, com base no seu conhecimento. Use 'costuma', 'em geral', 'tipicamente'; nunca afirme "
    "que vai chover ou fazer sol em um dia específico. Arredonde as temperaturas (média típica das mínimas e das máximas diárias, "
    "em °C) e não invente precisão. Se o clima variar muito dentro do país (litoral e interior, lado caribenho e pacífico, "
    "altitude), considere a região mais provável para os 'interesses' do viajante e diga isso. "
    "Para cada destino, na ordem informada: estacao (sazonalidade, ex.: 'estação chuvosa'), chuva ('baixa', 'moderada' ou 'alta'), "
    "chuva_descricao (1 frase sobre a ocorrência típica de chuva), condicoes (1 frase sobre as condições típicas), temp_min_c e temp_max_c. "
    "Depois CRUZE período + destino + estilo + interesses: 'compatibilidade' = 'boa', 'regular' ou 'baixa' para o que o viajante "
    "quer fazer (praia, trekking e natureza pedem tempo firme; museus e gastronomia sofrem menos com chuva). 'avaliacao' = até 2 frases "
    "diretas explicando o porquê e citando os interesses; se a época for menos favorável, diga com clareza "
    "(ex.: '<Mês> costuma apresentar condições menos favoráveis para este tipo de viagem nesta região.'). "
    "Só preencha 'alternativa' quando a compatibilidade for 'regular' ou 'baixa' E houver um período claramente melhor para ESSAS "
    "preferências; caso contrário use null. Em alternativa: periodo (ex.: 'Maio' ou 'Abril a junho'), motivo (1 frase), "
    "impacto_clima (1 frase comparando temperatura e chuva com o período escolhido) e relacao_preferencias (1 frase ligando às "
    "preferências). É apenas uma possibilidade: o viajante decide. Frases curtas, sem blocos de texto. Português do Brasil."
)

FORMATO = {
    "destinos": [{"destino": "", "estacao": "", "temp_min_c": 0, "temp_max_c": 0,
                  "chuva": "baixa | moderada | alta", "chuva_descricao": "", "condicoes": ""}],
    "compatibilidade": "boa | regular | baixa",
    "avaliacao": "",
    "alternativa": {"periodo": "", "motivo": "", "impacto_clima": "", "relacao_preferencias": ""},
}


def meses_do_periodo(inicio, fim) -> list[str]:
    """Nomes dos meses entre duas datas AAAA-MM-DD (vazio se as datas faltarem ou forem inválidas)."""
    try:
        a, b = date.fromisoformat(inicio), date.fromisoformat(fim)
    except (TypeError, ValueError):
        return []
    ano, mes, out = a.year, a.month, []
    while (ano, mes) <= (b.year, b.month) and len(out) < 12:
        out.append(MESES[mes - 1])
        ano, mes = (ano + 1, 1) if mes == 12 else (ano, mes + 1)
    return out


def _juntar(itens: list[str]) -> str:
    return itens[0] if len(itens) == 1 else ", ".join(itens[:-1]) + " e " + itens[-1]


async def _ia(req, lugares) -> AnaliseClima | None:
    meses = meses_do_periodo(req.data_inicio, req.data_fim)
    if not meses:
        return None
    ctx = {"destinos": [lg["nome"] for lg in lugares], "meses": meses, "data_inicio": req.data_inicio,
           "data_fim": req.data_fim, "estilo": ESTILO_ROTULO[req.estilo], "interesses": req.interesses,
           "detalhes": req.detalhes}
    clima = await gerar(SYSTEM, json.dumps(ctx, ensure_ascii=False), AnaliseClima, FORMATO)
    clima.fonte, clima.periodo = "ia", _juntar(meses)
    if len(clima.destinos) == len(lugares):            # nomes iguais aos da rota, para a tela casar bandeira e título
        for d, lg in zip(clima.destinos, lugares, strict=True):
            d.destino = lg["nome"]
    return clima


FONTES = {"ia": _ia}   # exemplo futuro: "normais": _api_normais_climaticas


async def obter(req, lugares) -> AnaliseClima | None:
    fonte = os.getenv("CLIMA_FONTE", "ia").lower()
    if fonte not in FONTES:
        raise RuntimeError(f"CLIMA_FONTE inválida: {fonte}. Opções: {', '.join(FONTES)}")
    return await FONTES[fonte](req, lugares)
