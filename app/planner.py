import asyncio
import json
import os
import re

import httpx
from pydantic import ValidationError

from . import providers as p
from .schemas import Custos, Ideia, IdeiaRequest, Itinerario, Plan, PlanRequest

SYSTEM = (
    "Você é um planejador de viagens. Monte o roteiro usando os dados fornecidos e conhecimento geral. "
    "NUNCA invente horários de voo; em 'trechos' só preencha custo_brl se vier nos dados (senão use null). "
    "Em 'custos_ia' estime, em REAIS (BRL) por pessoa e por dia, o gasto real em solo de cada destino, SEM passagem aérea internacional, "
    "para o estilo escolhido: hospedagem, alimentacao, transporte_local e atividades. Seja realista com o custo de vida do país e use "
    "o câmbio fornecido (cambio_usd_brl) como âncora; os dias por destino devem somar o total de dias. "
    "Em transporte_entre_destinos coloque o total estimado em BRL dos deslocamentos entre os destinos (0 se houver um só) e, em observacao, "
    "uma frase curta dizendo o que a estimativa considera. Distribua exatamente o número "
    "de dias pedido, respeite o estilo de viagem e inclua no checklist documentos, seguro viagem, vacinas, "
    "tomadas e chip/eSIM. Cada dia deve ter título próprio e de 3 a 5 itens específicos e DIFERENTES dos outros dias: "
    "nunca repita atividades, mesmo em viagens longas (use bairros, passeios, refeições e horários concretos). "
    "Se houver vários destinos, percorra-os na ordem informada e divida os dias entre eles. Estilo 'economico' = mochileiro "
    "(hostels, transporte público, comida local); 'moderado' = confortável; 'luxuoso' = alto padrão. Use as datas do pedido "
    "(estações, feriados, clima). Priorize os 'interesses' do viajante. Em 'detalhes' o viajante cita lugares, restaurantes ou o "
    "endereço do hotel: inclua o que ele pediu e organize cada dia com pontos próximos a esse endereço, sem inventar endereços. "
    "Escreva em português do Brasil."
)

FORMATO = {
    "cidades": [{"nome": "", "dias": 1, "destaques": [""]}],
    "roteiro": [{"dia": 1, "cidade": "", "titulo": "", "itens": [""]}],
    "trechos": [{"de": "", "para": "", "modo": "", "duracao": None, "custo_brl": None}],
    "checklist": [""],
    "custos_ia": {"por_destino": [{"destino": "", "dias": 1, "hospedagem": 0, "alimentacao": 0,
                                   "transporte_local": 0, "atividades": 0}],
                  "transporte_entre_destinos": 0, "observacao": ""},
}


def ok(x):
    return None if isinstance(x, Exception) else x


# ---------- provedores de IA (troque com LLM_PROVIDER no .env) ----------
async def _claude(system: str, user: str, modelo=Itinerario) -> dict:
    import anthropic  # import tardio: só exige a chave se você usar Claude

    ai = anthropic.AsyncAnthropic()
    resp = await ai.messages.create(
        model=os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5"), max_tokens=4000, system=system,
        tools=[{"name": "montar_roteiro", "description": "Entrega o roteiro estruturado",
                "input_schema": modelo.model_json_schema()}],
        tool_choice={"type": "tool", "name": "montar_roteiro"},
        messages=[{"role": "user", "content": user}])
    return next(b for b in resp.content if b.type == "tool_use").input


async def _gemini(system: str, user: str, formato=None) -> dict:
    formato = formato or FORMATO
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("Defina GEMINI_API_KEY no arquivo .env")
    modelos = [os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
               os.getenv("GEMINI_MODEL_RESERVA", "gemini-2.5-flash-lite")]
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text":
            user + "\n\nResponda SOMENTE com JSON válido neste formato:\n"
            + json.dumps(formato, ensure_ascii=False)}]}],
        "generationConfig": {"responseMimeType": "application/json",
                             "temperature": 0.7, "maxOutputTokens": 16384},
    }
    async with httpx.AsyncClient(timeout=90) as http:
        for modelo in dict.fromkeys(modelos):          # modelo principal, depois o de reserva
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent"
            for espera in (0, 3, 8):                   # até 3 tentativas por modelo
                if espera:
                    await asyncio.sleep(espera)
                r = await http.post(url, headers={"x-goog-api-key": key}, json=body)
                if r.status_code == 200:
                    break
                if r.status_code not in (429, 500, 502, 503, 504):   # erro que repetir não resolve
                    raise RuntimeError(f"Gemini respondeu {r.status_code}: {r.text[:200]}")
            else:
                continue                               # esgotou as tentativas: próximo modelo
            break
        else:
            raise RuntimeError("O Gemini está sobrecarregado ou no limite gratuito agora. "
                               "Tente de novo em alguns minutos.")
    partes = r.json()["candidates"][0]["content"]["parts"]
    texto = "".join(x.get("text", "") for x in partes).strip()
    texto = re.sub(r"^```(?:json)?|```$", "", texto, flags=re.M).strip()
    return json.loads(texto)


async def gerar(system: str, user: str, modelo, formato):
    provedor = os.getenv("LLM_PROVIDER", "gemini").lower()
    if provedor not in ("gemini", "claude"):
        raise RuntimeError("LLM_PROVIDER deve ser 'gemini' ou 'claude'")
    chamar, arg = (_claude, modelo) if provedor == "claude" else (_gemini, formato)
    erro = None
    for _ in range(2):  # modelos gratuitos às vezes erram o JSON: tenta de novo uma vez
        try:
            return modelo(**await chamar(system, user, arg))
        except (json.JSONDecodeError, ValidationError, KeyError, TypeError) as e:
            erro = e
    raise RuntimeError(f"A IA devolveu um formato inválido: {erro}")


async def gerar_itinerario(system: str, user: str) -> Itinerario:
    return await gerar(system, user, Itinerario, FORMATO)


SYSTEM_IDEIA = (
    "Você sugere UMA atividade de viagem para o dia que o viajante está montando. Seja específico e coerente com a cidade, o "
    "estilo (economico = mochileiro, moderado = confortável, luxuoso = alto padrão) e os interesses. Atenda ao 'pedido' do viajante "
    "quando houver. Não repita o que já está em 'itens' nem em 'evitar'. Não invente preços, horários de funcionamento nem endereços "
    "exatos. 'atividade' = 1 a 2 frases, no formato de item de roteiro; 'motivo' = 1 frase curta. Português do Brasil."
)


async def gerar_ideia(req: IdeiaRequest) -> Ideia:
    return await gerar(SYSTEM_IDEIA, json.dumps(req.model_dump(), ensure_ascii=False), Ideia, {"atividade": "", "motivo": ""})


# ---------- custos: a IA estima os valores, o Python soma e valida ----------
def custos_da_ia(req, itin, lugar, cambio_dest, usd_brl):
    c = itin.custos_ia
    if not c or not c.por_destino:
        return None
    base = sum(x.dias for x in c.por_destino) or 1
    k = req.dias / base                                   # ajusta se a IA errou a soma dos dias
    cat = {"hospedagem": 0.0, "alimentacao": 0.0, "transporte_local": 0.0, "atividades": 0.0}
    por_dest = []
    for x in c.por_destino:
        d = x.dias * k
        diaria = x.hospedagem + x.alimentacao + x.transporte_local + x.atividades
        if usd_brl and not (10 <= diaria / usd_brl <= 1500):   # fora do plausível (US$10 a US$1500/dia)
            return None
        for n in cat:
            cat[n] += getattr(x, n) * d
        por_dest.append({"destino": x.destino, "dias": round(d), "diaria_brl": round(diaria)})
    entre = max(c.transporte_entre_destinos, 0)
    if entre:
        cat["transporte_entre_destinos"] = entre
    total = sum(cat.values())
    return Custos(moeda_destino=lugar["moeda"] or "?", cambio=cambio_dest, diaria_brl=round((total - entre) / req.dias, 2),
                  total_brl=round(total, 2), por_categoria={n: round(v, 2) for n, v in cat.items()},
                  por_destino=por_dest, observacao=c.observacao, origem="ia")


def custos_padrao(req, lugares, usd_brl, cambio_dest):
    """Reserva: tabela provisória, usada só se a IA não trouxer números plausíveis."""
    if usd_brl is None:
        return None
    mult = sum(p.MULT.get(l["iso2"], 1.0) for l in lugares) / len(lugares)
    diaria = p.DIARIA_USD[req.estilo] * mult * usd_brl
    total = diaria * req.dias
    return Custos(moeda_destino=lugares[0]["moeda"] or "?", cambio=cambio_dest, diaria_brl=round(diaria, 2), total_brl=round(total, 2),
                  por_categoria={k: round(total * v, 2) for k, v in p.SPLIT.items()}, origem="padrao",
                  observacao="Estimativa genérica: a IA não trouxe valores confiáveis desta vez.")


async def montar(req: PlanRequest) -> Plan:
    async with httpx.AsyncClient(timeout=p.TIMEOUT, follow_redirects=True) as http:
        lugares = list(await asyncio.gather(*[p.local(http, d) for d in req.destinos]))
        lugar = lugares[0]
        usd_brl, cambio_dest, clima, atr, rotas = [ok(x) for x in await asyncio.gather(
            p.cambio(http, "USD", "BRL"), p.cambio(http, "BRL", lugar["moeda"]),
            p.clima(http, lugar["lat"], lugar["lng"], req.dias),
            p.atracoes(http, lugar["lat"], lugar["lng"]),
            p.rotas(http, req.origem, req.destinos[0]), return_exceptions=True)]

    contexto = {"pedido": req.model_dump(), "cambio_usd_brl": usd_brl, "destinos_na_ordem": [l["nome"] for l in lugares], "clima": clima,
                "atracoes_encontradas": atr, "rotas_encontradas": rotas}
    itin = await gerar_itinerario(SYSTEM, json.dumps(contexto, ensure_ascii=False))
    custos = custos_da_ia(req, itin, lugar, cambio_dest, usd_brl) or custos_padrao(req, lugares, usd_brl, cambio_dest)
    return Plan(request=req, itinerario=itin, custos=custos, clima=clima)
