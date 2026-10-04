"""Custos: a IA estima valores por dia e por destino; o Python soma, valida e organiza por categoria."""
from .fontes.locais import MULT
from .schemas import Custos

RESERVA = 0.10                        # fração do subtotal separada como reserva/emergência
DIARIO = ("hospedagem", "alimentacao", "transporte_local", "atividades", "outros")
LIMITE_VOOS, LIMITE_TERRESTRE = 40000, 20000   # BRL por pessoa; acima disso a estimativa é descartada como implausível

# PLACEHOLDERS em USD/dia por pessoa. Troque por dados reais (Numbeo etc.).
DIARIA_USD = {"economico": 45, "moderado": 110, "luxuoso": 280}
SPLIT = {"hospedagem": 0.40, "alimentacao": 0.25, "transporte_local": 0.12, "atividades": 0.18, "outros": 0.05}


def _fechar(cat: dict, solo: float, dias: int, **extra) -> Custos:
    """Soma a reserva e monta o resultado. `solo` = gasto diário somado (sem voos e deslocamentos)."""
    cat["reserva"] = sum(cat.values()) * RESERVA
    return Custos(diaria_brl=round(solo / dias, 2), total_brl=round(sum(cat.values()), 2),
                  por_categoria={n: round(v, 2) for n, v in cat.items()}, reserva_pct=RESERVA, **extra)


def custos_da_ia(req, itin, usd_brl):
    c = itin.custos_ia
    if not c or not c.por_destino:
        return None
    base = sum(x.dias for x in c.por_destino) or 1
    k = req.dias / base                                   # ajusta se a IA errou a soma dos dias
    cat = dict.fromkeys(DIARIO, 0.0)
    por_dest = []
    for x in c.por_destino:
        d = x.dias * k
        diaria = sum(getattr(x, n) for n in DIARIO)
        if usd_brl and not (10 <= diaria / usd_brl <= 1500):   # fora do plausível (US$10 a US$1500/dia)
            return None
        for n in DIARIO:
            cat[n] += getattr(x, n) * d
        por_dest.append({"destino": x.destino, "dias": round(d), "diaria_brl": round(diaria)})
    solo = sum(cat.values())
    for nome, valor, teto in (("voos", c.voos_total, LIMITE_VOOS), ("onibus_trem", c.terrestre_total, LIMITE_TERRESTRE)):
        if 0 < valor <= teto:
            cat[nome] = valor
    return _fechar(cat, solo, req.dias, por_destino=por_dest, observacao=c.observacao, origem="ia")


def custos_padrao(req, lugares, usd_brl):
    """Reserva: tabela provisória, usada só se a IA não trouxer números plausíveis."""
    if usd_brl is None:
        return None
    mult = sum(MULT.get(lg["iso2"], 1.0) for lg in lugares) / len(lugares)
    diaria = DIARIA_USD[req.estilo] * mult * usd_brl
    solo = diaria * req.dias
    return _fechar({n: solo * v for n, v in SPLIT.items()}, solo, req.dias, origem="padrao",
                   observacao="Estimativa genérica: a IA não trouxe valores confiáveis desta vez. "
                              "Voos e deslocamentos entre destinos não estão incluídos.")
