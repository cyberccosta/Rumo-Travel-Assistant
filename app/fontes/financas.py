"""Contexto financeiro do destino: câmbio aproximado + "Sobre o dinheiro" (cartões, espécie, taxas, dicas).
Hoje tudo vem da IA (fonte="ia", valores aproximados). Com CAMBIO_FONTE=api, só o CÂMBIO passa a vir de uma API
(Frankfurter/AwesomeAPI, fonte="api"); o texto contextual continua da IA e a tela não muda."""
import asyncio
import datetime as dt
import json
import os

from ..llm import gerar
from ..schemas import ESTILO_ROTULO, Cambio, ContextoFinanceiro, FinancasDestino, FinancasIA

SYSTEM = (
    "Você explica o dinheiro de uma viagem para um viajante brasileiro. Tudo o que você informar são APROXIMAÇÕES do seu "
    "conhecimento, nunca cotações em tempo real; não prometa regras, taxas ou valores exatos (use 'costuma', 'em geral'). "
    "Para cada destino, na ordem informada, com a moeda local em 'moeda' (código ISO; se vier vazia, informe o código correto): "
    "moeda_nome; 'por_brl' = quantas unidades da moeda local equivalem a 1 BRL, aproximado e arredondado (null se não souber); "
    "'nivel_custo' = 'baixo', 'moderado', 'alto' ou 'muito alto' (custo geral comparado ao Brasil, para o estilo do viajante); "
    "'percepcao' = 1 frase sobre o custo de vida; 'variacao_cambial' = 1 frase sobre a estabilidade da moeda (inflação, câmbio "
    "paralelo, moeda estável), sem prever cotações; 'cartoes' = onde cartão funciona e onde não; 'dinheiro_especie' = necessidade ou "
    "utilidade de dinheiro vivo; 'quando_especie' = situações em que o dinheiro físico pesa mais (transporte local, mercados, áreas "
    "rurais...); 'taxas_cuidados' = taxas e cuidados com cartão internacional (IOF, conversão dinâmica, saque em caixa, qual moeda "
    "escolher ao pagar); 'dicas_economia' = 3 a 5 dicas curtas e específicas do destino para gastar menos (priorize o mochileiro "
    "quando o estilo for mochileiro: hostel, transporte público, comida local, passes, saque e câmbio). "
    "Informe também 'usd_brl' = quantos reais valem 1 dólar americano, aproximado. Frases curtas, sem blocos de texto. "
    "Português do Brasil."
)

FORMATO = {
    "usd_brl": 0,
    "destinos": [{"destino": "", "moeda": "", "moeda_nome": "", "por_brl": 0,
                  "nivel_custo": "baixo | moderado | alto | muito alto", "percepcao": "", "variacao_cambial": "",
                  "cartoes": "", "dinheiro_especie": "", "quando_especie": "", "taxas_cuidados": "",
                  "dicas_economia": [""]}],
}


def _taxa_plausivel(x, minimo, maximo):
    return x if isinstance(x, (int, float)) and minimo <= x <= maximo else None


def _cambio_ia(de, para, taxa):
    return Cambio(fonte="ia", de=de, para=para, taxa=taxa)


async def _ia(req, lugares) -> ContextoFinanceiro:
    ctx = {"destinos": [{"destino": lg["nome"], "moeda": lg["moeda"] or ""} for lg in lugares],
           "estilo": ESTILO_ROTULO[req.estilo], "interesses": req.interesses, "dias": req.dias}
    ia = await gerar(SYSTEM, json.dumps(ctx, ensure_ascii=False), FinancasIA, FORMATO)
    destinos = []
    for lg, d in zip(lugares, ia.destinos, strict=False):  # a IA pode devolver menos destinos
        moeda = lg["moeda"] or d.moeda
        campos = d.model_dump(exclude={"destino", "moeda", "por_brl"})
        destinos.append(FinancasDestino(destino=lg["nome"], moeda=moeda, cambio=_cambio_ia("BRL", moeda, _taxa_plausivel(d.por_brl, 1e-6, 1e9)),
                                        **campos))
    return ContextoFinanceiro(usd_brl=_cambio_ia("USD", "BRL", _taxa_plausivel(ia.usd_brl, 2, 15)), destinos=destinos)


# ---------- câmbio por API (opcional: CAMBIO_FONTE=api) ----------
async def _awesome(http, moeda):
    """AwesomeAPI: quantos BRL vale 1 unidade de `moeda` (cobre moedas que o BCE não publica)."""
    r = await http.get(f"https://economia.awesomeapi.com.br/json/last/{moeda}-BRL")
    r.raise_for_status()
    return float(r.json()[f"{moeda}BRL"]["bid"])


async def _taxa_api(http, base, alvo):
    """1 `base` = x `alvo`. Frankfurter (BCE) primeiro; AwesomeAPI como reserva."""
    if base == alvo:
        return 1.0
    try:
        r = await http.get("https://api.frankfurter.dev/v1/latest", params={"base": base, "symbols": alvo})
        r.raise_for_status()
        return r.json()["rates"][alvo]
    except Exception:
        if alvo == "BRL":
            return await _awesome(http, base)
        if base == "BRL":
            return 1 / await _awesome(http, alvo)
        raise


async def _com_cambio_api(fin: ContextoFinanceiro, http) -> ContextoFinanceiro:
    """Troca os câmbios da IA pelos da API; o que a API não trouxer continua como estimativa da IA."""
    pares = [fin.usd_brl] + [d.cambio for d in fin.destinos if d.moeda]
    taxas = await asyncio.gather(*[_taxa_api(http, c.de, c.para) for c in pares], return_exceptions=True)
    hoje = dt.date.today().isoformat()
    for c, t in zip(pares, taxas, strict=True):
        if not isinstance(t, Exception):
            c.fonte, c.taxa, c.consultado_em = "api", t, hoje
    return fin


FONTES_CAMBIO = ("ia", "api")


async def obter(req, lugares, http) -> ContextoFinanceiro:
    fonte = os.getenv("CAMBIO_FONTE", "ia").lower()
    if fonte not in FONTES_CAMBIO:
        raise RuntimeError(f"CAMBIO_FONTE inválida: {fonte}. Opções: {', '.join(FONTES_CAMBIO)}")
    fin = await _ia(req, lugares)
    return await _com_cambio_api(fin, http) if fonte == "api" else fin
