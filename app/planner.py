import asyncio
import json
import logging

import httpx

from .custos import custos_da_ia, custos_padrao
from .fontes import clima as fonte_clima
from .fontes import financas as fonte_financas
from .fontes import locais
from .llm import gerar
from .schemas import Ideia, IdeiaRequest, Itinerario, Plan, PlanRequest

log = logging.getLogger("rumo")

SYSTEM = (
    "Você é um planejador de viagens: ajuda o viajante a decidir, e quem decide é ele. Monte o roteiro usando os dados fornecidos e conhecimento geral. "
    "NUNCA invente horários de voo; em 'trechos' só preencha custo_brl se vier nos dados (senão use null). "
    "Em 'custos_ia' estime, em REAIS (BRL) por pessoa e por dia, o gasto real em solo de cada destino para o estilo escolhido: "
    "hospedagem, alimentacao, transporte_local, atividades (passeios e experiências) e outros (chip/eSIM, gorjetas, imprevistos pequenos). "
    "Seja realista com o custo de vida do país e use 'financas_estimadas' (usd_brl e nivel_custo) como âncora; os dias por destino devem "
    "somar o total de dias. Em 'voos_total' estime, em BRL por pessoa, o total das passagens aéreas (ida e volta da origem mais voos entre "
    "os destinos), de forma aproximada e conservadora para a época e o estilo (0 se o roteiro não exigir voo); em 'terrestre_total' o total "
    "de ônibus, trem e barco entre os destinos (0 se houver um só); em observacao, uma frase curta dizendo o que a estimativa considera. "
    "Distribua exatamente o número "
    "de dias pedido, respeite o estilo de viagem e inclua no checklist documentos, seguro viagem, vacinas, "
    "tomadas e chip/eSIM. Cada dia deve ter título próprio e de 3 a 5 itens específicos e DIFERENTES dos outros dias: "
    "nunca repita atividades, mesmo em viagens longas (use bairros, passeios, refeições e horários concretos). "
    "Cada item é UMA frase curta e direta, sem parágrafos. "
    "Se houver vários destinos, percorra-os na ordem informada e divida os dias entre eles. Estilo 'economico' = mochileiro "
    "(hostels, transporte público, comida local); 'moderado' = confortável; 'luxuoso' = alto padrão. Use as datas do pedido "
    "(estações, feriados, clima). Considere 'clima_estimado' (o que é historicamente esperado na época, não previsão): se a época for "
    "menos favorável aos interesses, adapte o roteiro (atividades ao ar livre no período mais seco do dia, alternativas cobertas, folga "
    "para dias de chuva) SEM mudar as datas. Priorize os 'interesses' do viajante. Em 'detalhes' o viajante cita lugares, restaurantes ou o "
    "endereço do hotel: inclua o que ele pediu e organize cada dia com pontos próximos a esse endereço, sem inventar endereços. "
    "Escreva em português do Brasil."
)

FORMATO = {
    "cidades": [{"nome": "", "dias": 1, "destaques": [""]}],
    "roteiro": [{"dia": 1, "cidade": "", "titulo": "", "itens": [""]}],
    "trechos": [{"de": "", "para": "", "modo": "", "duracao": None, "custo_brl": None}],
    "checklist": [""],
    "custos_ia": {"por_destino": [{"destino": "", "dias": 1, "hospedagem": 0, "alimentacao": 0,
                                   "transporte_local": 0, "atividades": 0, "outros": 0}],
                  "voos_total": 0, "terrestre_total": 0, "observacao": ""},
}

SYSTEM_IDEIA = (
    "Você sugere UMA atividade de viagem para o dia que o viajante está montando. Seja específico e coerente com a cidade, o "
    "estilo (economico = mochileiro, moderado = confortável, luxuoso = alto padrão) e os interesses. Atenda ao 'pedido' do viajante "
    "quando houver. Não repita o que já está em 'itens' nem em 'evitar'. Não invente preços, horários de funcionamento nem endereços "
    "exatos. 'atividade' = 1 a 2 frases, no formato de item de roteiro; 'motivo' = 1 frase curta. Português do Brasil."
)


async def gerar_ideia(req: IdeiaRequest) -> Ideia:
    return await gerar(SYSTEM_IDEIA, json.dumps(req.model_dump(), ensure_ascii=False), Ideia, {"atividade": "", "motivo": ""})


def _ok(valor, nome, avisos):
    """Fonte opcional: se falhar, a viagem sai sem ela; o motivo vai para o terminal e para a tela."""
    if isinstance(valor, Exception):
        log.warning("%s indisponível: %s", nome, valor)
        avisos[nome] = str(valor)[:300]
        return None
    return valor


def _resumo_clima(c):
    return c and {"periodo": c.periodo, "compatibilidade": c.compatibilidade, "avaliacao": c.avaliacao,
                  "destinos": [d.model_dump(include={"destino", "estacao", "chuva", "condicoes"}) for d in c.destinos]}


def _resumo_financas(f):
    return f and {"usd_brl": f.usd_brl.taxa,
                  "destinos": [{"destino": d.destino, "moeda": d.moeda, "nivel_custo": d.nivel_custo} for d in f.destinos]}


async def montar(req: PlanRequest) -> Plan:
    async with httpx.AsyncClient(timeout=locais.TIMEOUT, follow_redirects=True) as http:
        lugares = list(await asyncio.gather(*[locais.local(http, d) for d in req.destinos]))
        lugar = lugares[0]
        nomes = ("atrações", "rotas", "clima", "financas")
        avisos = {}
        atr, rotas, clima, fin = [_ok(x, n, avisos) for x, n in zip(await asyncio.gather(
            locais.atracoes(http, lugar["lat"], lugar["lng"]), locais.rotas(http, req.origem, req.destinos[0]),
            fonte_clima.obter(req, lugares), fonte_financas.obter(req, lugares, http),
            return_exceptions=True), nomes, strict=True)]

    contexto = {"pedido": req.model_dump(), "destinos_na_ordem": [lg["nome"] for lg in lugares],
                "clima_estimado": _resumo_clima(clima), "financas_estimadas": _resumo_financas(fin),
                "atracoes_encontradas": atr, "rotas_encontradas": rotas}
    itin = await gerar(SYSTEM, json.dumps({k: v for k, v in contexto.items() if v}, ensure_ascii=False), Itinerario, FORMATO)
    usd_brl = fin.usd_brl.taxa if fin else None
    custos = custos_da_ia(req, itin, usd_brl) or custos_padrao(req, lugares, usd_brl)
    return Plan(request=req, itinerario=itin, custos=custos, clima=clima, financas=fin, avisos=avisos)
