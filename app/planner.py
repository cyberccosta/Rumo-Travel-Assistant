import asyncio
import json
import os
import re

import httpx
from pydantic import ValidationError

from . import providers as p
from .schemas import Custos, Itinerario, Plan, PlanRequest

SYSTEM = (
    "Você é um planejador de viagens. Monte o roteiro usando os dados fornecidos e conhecimento geral. "
    "NUNCA invente preços, horários de voo ou regras de visto: custos e visto são calculados fora de você. "
    "Em 'trechos', só preencha custo_brl se vier nos dados (senão use null). Distribua exatamente o número "
    "de dias pedido, respeite o estilo de viagem e inclua no checklist documentos, seguro viagem, vacinas, "
    "tomadas e chip/eSIM. Cada dia deve ter título próprio e de 3 a 5 itens específicos e DIFERENTES dos outros dias: "
    "nunca repita atividades, mesmo em viagens longas (use bairros, passeios, refeições e horários concretos). "
    "Escreva em português do Brasil."
)

FORMATO = {
    "cidades": [{"nome": "", "dias": 1, "destaques": [""]}],
    "roteiro": [{"dia": 1, "cidade": "", "titulo": "", "itens": [""]}],
    "trechos": [{"de": "", "para": "", "modo": "", "duracao": None, "custo_brl": None}],
    "checklist": [""],
}


def ok(x):
    return None if isinstance(x, Exception) else x


# ---------- provedores de IA (troque com LLM_PROVIDER no .env) ----------
async def _claude(system: str, user: str) -> dict:
    import anthropic  # import tardio: só exige a chave se você usar Claude

    ai = anthropic.AsyncAnthropic()
    resp = await ai.messages.create(
        model=os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5"), max_tokens=4000, system=system,
        tools=[{"name": "montar_roteiro", "description": "Entrega o roteiro estruturado",
                "input_schema": Itinerario.model_json_schema()}],
        tool_choice={"type": "tool", "name": "montar_roteiro"},
        messages=[{"role": "user", "content": user}])
    return next(b for b in resp.content if b.type == "tool_use").input


async def _gemini(system: str, user: str) -> dict:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("Defina GEMINI_API_KEY no arquivo .env")
    modelos = [os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
               os.getenv("GEMINI_MODEL_RESERVA", "gemini-2.5-flash-lite")]
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text":
            user + "\n\nResponda SOMENTE com JSON válido neste formato:\n"
            + json.dumps(FORMATO, ensure_ascii=False)}]}],
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


async def gerar_itinerario(system: str, user: str) -> Itinerario:
    provedor = os.getenv("LLM_PROVIDER", "gemini").lower()
    if provedor not in ("gemini", "claude"):
        raise RuntimeError("LLM_PROVIDER deve ser 'gemini' ou 'claude'")
    chamar = _claude if provedor == "claude" else _gemini
    erro = None
    for _ in range(2):  # modelos gratuitos às vezes erram o JSON: tenta de novo uma vez
        try:
            return Itinerario(**await chamar(system, user))
        except (json.JSONDecodeError, ValidationError, KeyError, TypeError) as e:
            erro = e
    raise RuntimeError(f"A IA devolveu um formato inválido: {erro}")


# ---------- cálculo determinístico ----------
def calcular_custos(req, lugar, usd_brl, cambio_dest):
    if usd_brl is None:
        return None
    diaria = p.DIARIA_USD[req.estilo] * p.MULT.get(lugar["iso2"], 1.0) * usd_brl
    total = diaria * req.dias
    return Custos(moeda_destino=lugar["moeda"] or "?", cambio=cambio_dest, diaria_brl=round(diaria, 2),
                  total_brl=round(total, 2),
                  por_categoria={k: round(total * v, 2) for k, v in p.SPLIT.items()})


async def montar(req: PlanRequest) -> Plan:
    async with httpx.AsyncClient(timeout=p.TIMEOUT, follow_redirects=True) as http:
        lugar = await p.local(http, req.destino)
        usd_brl, cambio_dest, clima, atr, rotas = [ok(x) for x in await asyncio.gather(
            p.cambio(http, "USD", "BRL"), p.cambio(http, "BRL", lugar["moeda"]),
            p.clima(http, lugar["lat"], lugar["lng"], req.dias),
            p.atracoes(http, lugar["lat"], lugar["lng"]),
            p.rotas(http, req.origem, req.destino), return_exceptions=True)]

    contexto = {"pedido": req.model_dump(), "destino": lugar, "clima": clima,
                "atracoes_encontradas": atr, "rotas_encontradas": rotas}
    itin = await gerar_itinerario(SYSTEM, json.dumps(contexto, ensure_ascii=False))
    return Plan(request=req, itinerario=itin,
                custos=calcular_custos(req, lugar, usd_brl, cambio_dest),
                visto=p.visto(req.passaporte, lugar["iso2"]), clima=clima)
