"""Provedores de IA (troque com LLM_PROVIDER no .env): Gemini ou Claude. `gerar` devolve um modelo pydantic validado."""
import asyncio
import json
import os
import re

import httpx
from pydantic import ValidationError


async def _claude(system: str, user: str, modelo) -> dict:
    import anthropic  # import tardio: só exige a chave se você usar Claude

    ai = anthropic.AsyncAnthropic()
    resp = await ai.messages.create(
        model=os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5"), max_tokens=12000, system=system,  # roteiros longos passam de 4000
        tools=[{"name": "entregar", "description": "Entrega a resposta estruturada",
                "input_schema": modelo.model_json_schema()}],
        tool_choice={"type": "tool", "name": "entregar"},
        messages=[{"role": "user", "content": user}])
    return next(b for b in resp.content if b.type == "tool_use").input


async def _gemini(system: str, user: str, formato: dict) -> dict:
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


async def gerar(system: str, user: str, modelo, formato: dict):
    """`modelo` = classe pydantic esperada; `formato` = exemplo de JSON mostrado ao Gemini."""
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
