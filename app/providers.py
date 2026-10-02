"""Cada função = uma fonte de dados. Trocar de API = mexer só aqui."""
import csv
import json
import datetime as dt
import os
import unicodedata
from pathlib import Path

import httpx

TIMEOUT = httpx.Timeout(10.0)
DATA = Path(__file__).resolve().parent.parent / "data"

# PLACEHOLDERS em USD/dia por pessoa. Troque por dados reais (Numbeo etc.).
DIARIA_USD = {"economico": 45, "moderado": 110, "luxuoso": 280}
PAISES = json.loads((DATA / "paises.json").read_text(encoding="utf-8"))
MULT = {p["iso2"]: p["mult"] for p in PAISES}  # multiplicadores PLACEHOLDER
SPLIT = {"hospedagem": 0.40, "alimentacao": 0.25, "transporte_local": 0.15, "atividades": 0.20}
AVISO = "Regras mudam. Confirme na embaixada ou no site oficial antes de comprar passagens."


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


async def _awesome(http, moeda):
    """AwesomeAPI: quantos BRL vale 1 unidade de `moeda` (cobre moedas que o BCE não publica)."""
    r = await http.get(f"https://economia.awesomeapi.com.br/json/last/{moeda}-BRL")
    r.raise_for_status()
    return float(r.json()[f"{moeda}BRL"]["bid"])


async def cambio(http, base, alvo):
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


async def clima(http, lat, lng, dias):
    """Open-Meteo: previsão diária (até 16 dias)."""
    r = await http.get("https://api.open-meteo.com/v1/forecast", params={
        "latitude": lat, "longitude": lng, "timezone": "auto", "forecast_days": min(dias, 16),
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max"})
    r.raise_for_status()
    return r.json()["daily"]


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


def visto(passaporte, destino_iso):
    """Lê data/visto.csv. Troque por Travel Buddy / Sherpa / Timatic quando tiver acesso.
    Sempre devolve fonte e data da consulta para mostrar na tela."""
    base = {"consultado_em": dt.date.today().isoformat(), "aviso": AVISO}
    arq = DATA / "visto.csv"
    if arq.exists():
        with arq.open(encoding="utf-8") as f:
            for l in csv.DictReader(f):
                if l["passaporte"] == passaporte and l["destino"] == destino_iso:
                    dias = int(l["estadia_max_dias"]) if l["estadia_max_dias"] else None
                    return {**base, "requisito": l["requisito"], "estadia_max_dias": dias, "fonte": l["fonte"]}
    return {**base, "requisito": "Sem dado verificado. Consulte a embaixada ou o consulado.",
            "estadia_max_dias": None, "fonte": "nenhuma"}
