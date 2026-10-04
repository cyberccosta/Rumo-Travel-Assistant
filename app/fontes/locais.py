"""Locais: países e cidades (moeda e coordenadas), atrações e rotas."""
import json
import os
import unicodedata
from pathlib import Path

import httpx

TIMEOUT = httpx.Timeout(10.0)
DATA = Path(__file__).resolve().parents[2] / "data"
PAISES = json.loads((DATA / "paises.json").read_text(encoding="utf-8"))
MULT = {p["iso2"]: p["mult"] for p in PAISES}  # multiplicadores PLACEHOLDER (usados só na tabela de reserva de custos)


def _norm(t):
    return unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower().strip()


async def local(http, nome):
    """Países da nossa lista vêm de data/paises.json (moeda e coordenadas incluídas, sem rede).
    Outros nomes (cidades) passam pela geocodificação do Open-Meteo."""
    alvo = _norm(nome)
    pais = next((x for x in PAISES if _norm(x["nome"]) == alvo), None)
    if pais:
        return {"nome": pais["nome"], "pais": pais["nome"], "iso2": pais["iso2"],
                "moeda": pais["moeda"], "lat": pais["lat"], "lng": pais["lng"]}
    g = await http.get("https://geocoding-api.open-meteo.com/v1/search",
                       params={"name": nome, "count": 1, "language": "pt"})
    g.raise_for_status()
    res = (g.json().get("results") or [None])[0]
    if not res:
        raise ValueError(f"Destino não encontrado: {nome}")
    iso2 = res["country_code"]
    moeda = next((x["moeda"] for x in PAISES if x["iso2"] == iso2), None)
    if moeda is None:  # país fora da lista: tenta REST Countries, mas não depende dele
        try:
            c = await http.get(f"https://restcountries.com/v3.1/alpha/{iso2}", params={"fields": "currencies"})
            c.raise_for_status()
            j = c.json()
            j = j[0] if isinstance(j, list) else j
            moeda = next(iter(j["currencies"]))
        except Exception:
            moeda = None
    return {"nome": res["name"], "pais": res.get("country"), "iso2": iso2,
            "moeda": moeda, "lat": res["latitude"], "lng": res["longitude"]}


async def atracoes(http, lat, lng, limite=15):
    """OpenTripMap (precisa de chave gratuita)."""
    key = os.getenv("OPENTRIPMAP_KEY")
    if not key:
        return []
    r = await http.get("https://api.opentripmap.com/0.1/en/places/radius", params={
        "radius": 50000, "lon": lng, "lat": lat, "rate": "3", "format": "json",
        "limit": limite, "apikey": key})
    r.raise_for_status()
    return [p["name"] for p in r.json() if p.get("name")]


async def rotas(http, origem, destino):
    """PLUGAR: Rome2rio (parceria), Google Routes ou GTFS.
    Retorne [{modo, duracao_min, custo_brl}]. Vazio = a IA sugere só os modos."""
    return []
