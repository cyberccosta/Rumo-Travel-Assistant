/* Abas de dados da viagem: resumo da rota, clima e custos (com "Sobre o dinheiro").
   Cada bloco mostra de onde vem o dado (campo `fonte`): hoje "ia"; quando uma API entrar, vira "api" e a tela se ajusta sozinha.
   Depende de app.js (estiloOf, INTERESSES, flag), lido só na hora de desenhar. */
const FONTE={ia:["Estimado pela IA","ia"],api:["Dado de API","api"]};
const tagFonte=f=>{const[t,c]=FONTE[f]||FONTE.ia;return `<span class="tag ${c}">${t}</span>`};
const kv=rows=>{const r=rows.filter(x=>x[1]);return r.length?`<dl class="kv">${r.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`:""};
const num=(n,d=2)=>n.toLocaleString("pt-BR",{maximumFractionDigits:d});
const real=n=>"R$ "+n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const pct=x=>Math.round(x*100);
const motivo=(v,k)=>v.avisos&&v.avisos[k]?`<br><small>Motivo: ${esc(v.avisos[k])}</small>`:"";

/* ---------- resumo da rota (topo do roteiro) ---------- */
const rotaResumo=v=>{const c=v.itinerario.cidades||[];
  return c.length?`<div class="rres" role="list" aria-label="Resumo da rota">${c.map(x=>`<div class="rc" role="listitem"><b>📍 ${esc(x.nome)}</b><small>${x.dias} ${x.dias>1?"dias":"dia"}</small><span>${(x.destaques||[]).slice(0,3).map(esc).join(" · ")}</span></div>`).join("")}</div>`:""};

/* ---------- clima ---------- */
const COMPAT={boa:["✅","Boa época para o seu estilo de viagem","ok"],regular:["🌤️","Época com ressalvas para o que você quer fazer","mid"],baixa:["🌧️","Época menos favorável para este tipo de viagem","low"]};
const CHUVA={baixa:"💧 Baixa",moderada:"🌦️ Moderada",alta:"🌧️ Alta"};
const faixaTemp=d=>d.temp_min_c!=null&&d.temp_max_c!=null?`${Math.round(d.temp_min_c)}° a ${Math.round(d.temp_max_c)}°C`:"—";
const climaDestino=d=>`<article class="card cld"><h4>${flag(d.destino)} ${esc(d.destino)}</h4>
  <div class="kv3"><div><small>Temperaturas médias</small><b>${faixaTemp(d)}</b></div><div><small>Chance de chuva</small><b>${CHUVA[d.chuva]||esc(d.chuva||"—")}</b></div><div><small>Estação</small><b>${esc(d.estacao||"—")}</b></div></div>
  ${d.chuva_descricao?`<p>${esc(d.chuva_descricao)}</p>`:""}${d.condicoes?`<p>${esc(d.condicoes)}</p>`:""}</article>`;
const alternativa=a=>`<section class="card alt"><small class="eyebrow">Só uma possibilidade</small><h3>Uma alternativa que pode fazer mais sentido</h3>
  ${kv([["Período sugerido",a.periodo],["Por quê",a.motivo],["Impacto esperado no clima",a.impacto_clima],["Relação com as suas preferências",a.relacao_preferencias]])}
  <div class="altbt"><button class="ghost" data-act="outrasdatas">📅 Escolher outras datas</button><span>Suas datas atuais não foram alteradas. A decisão é sua.</span></div></section>`;
function abaClima(v){const c=v.clima,r=v.request;
  if(!c)return `<div class="empty">Não consegui estimar o clima desta vez. Tente criar a expedição de novo.${motivo(v,"clima")}</div>`;
  const k=COMPAT[c.compatibilidade]||["🧭","Análise do clima para a sua viagem","mid"],e=estiloOf(r.estilo);
  const prefs=[`${e[4]} ${e[1]}`,...(r.interesses||[]).map(x=>{const it=INTERESSES.find(y=>y[1]===x);return `${it?it[0]+" ":""}${x}`})];
  return `<div class="cl-head"><div><h3>Clima historicamente esperado</h3>${c.periodo?`<p class="sub">Você está planejando sua viagem para <b>${esc(c.periodo)}</b>.</p>`:""}</div>${tagFonte(c.fonte)}</div>
  <p class="note">É o que costuma acontecer nessa época do ano, segundo registros históricos. <b>Não é previsão do tempo.</b></p>
  <div class="chips" aria-label="Preferências consideradas"><small>Analisado para</small>${prefs.map(x=>`<span>${esc(x)}</span>`).join("")}</div>
  <div class="compat ${k[2]}"><span class="ci" aria-hidden="true">${k[0]}</span><div><b>${k[1]}</b>${c.avaliacao?`<p>${esc(c.avaliacao)}</p>`:""}</div></div>
  ${c.destinos.map(climaDestino).join("")}${c.alternativa&&c.alternativa.periodo?alternativa(c.alternativa):""}`}

/* ---------- custos ---------- */
const GRUPOS=[["✈️ Transporte",["voos","onibus_trem","transporte_local"]],["🛏️ Hospedagem",["hospedagem"]],["🍽️ Alimentação",["alimentacao"]],
 ["🎟️ Passeios e experiências",["atividades"]],["🧾 Outros",["outros"]],["🛟 Reserva / emergência",["reserva"]]];
const SUB={voos:"Voos",onibus_trem:"Ônibus, trem e barco",transporte_local:"Transporte local"};
const NIVEL_CUSTO={baixo:"Baixo",moderado:"Moderado",alto:"Alto","muito alto":"Muito alto"};
function fmtCambio(c){if(!c||!c.taxa)return"indisponível";if(c.para==="BRL")return"mesma moeda (R$)";
  return c.taxa>=1?`R$ 1 ≈ ${num(c.taxa,c.taxa>=100?0:2)} ${esc(c.para)}`:`1 ${esc(c.para)} ≈ ${real(1/c.taxa)}`}
const notaCambio=c=>c&&c.fonte==="api"?`Cotação consultada em ${esc(c.consultado_em?new Date(c.consultado_em+"T12:00:00").toLocaleDateString("pt-BR"):"data indisponível")}.`
  :"Valores de câmbio são aproximados e podem variar. Em breve o Rumo usará uma API de câmbio para trazer dados atualizados.";
const dinheiroDestino=d=>{const dicas=(d.dicas_economia||[]).filter(Boolean);
  return `<article class="card dn"><h4>${flag(d.destino)} ${esc(d.destino)}${d.moeda_nome||d.moeda?` <small>${esc(d.moeda_nome)}${d.moeda?` (${esc(d.moeda)})`:""}</small>`:""}</h4>
  <div class="kv3"><div><small>Câmbio aproximado</small><b>${fmtCambio(d.cambio)}</b>${tagFonte(d.cambio.fonte)}</div><div><small>Nível geral de custo</small><b>${esc(NIVEL_CUSTO[d.nivel_custo]||d.nivel_custo||"—")}</b></div></div>
  ${d.percepcao?`<p>${esc(d.percepcao)}</p>`:""}
  ${kv([["💳 Cartões",d.cartoes],["💵 Dinheiro em espécie",d.dinheiro_especie],["⚠️ Quando o dinheiro físico pesa mais",d.quando_especie],["📉 Variação cambial",d.variacao_cambial],["🧾 Taxas e cuidados",d.taxas_cuidados]])}
  ${dicas.length?`<div class="dicas"><b>🎒 Para gastar menos</b><ul>${dicas.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:""}</article>`};
function dinheiroHtml(v){const f=v.financas;
  if(!f||!f.destinos.length)return `<div class="empty">O contexto financeiro (câmbio, cartões e dinheiro em espécie) não ficou disponível desta vez.${motivo(v,"financas")}</div>`;
  return `<section class="money"><div class="cl-head"><h3>💵 Sobre o dinheiro</h3>${tagFonte("ia")}</div>
  <p class="note">${f.usd_brl.taxa?`Referência: US$ 1 ≈ ${real(f.usd_brl.taxa)}. `:""}${esc(notaCambio(f.usd_brl))}</p>${f.destinos.map(dinheiroDestino).join("")}</section>`}
function grupoCustos(g,pc,mx,c){const[t,ks]=g,total=ks.reduce((s,k)=>s+(pc[k]||0),0);
  const sub=t.includes("Transporte")?`<div class="subs">${ks.filter(k=>pc[k]>0).map(k=>`<div><span>${SUB[k]}</span><span>${brl(pc[k])}</span></div>`).join("")}${pc.voos?"":`<div class="mut"><span>Voos</span><span>não incluídos</span></div>`}</div>`
    :t.includes("Reserva")?`<small class="mut">${pct(c.reserva_pct)}% do subtotal, como colchão para imprevistos</small>`:"";
  return `<div class="grp"><div class="grow"><span>${t}</span><b>${brl(total)}</b></div><div class="bar"><i style="width:${total/mx*100}%"></i></div>${sub}</div>`}
function abaCustos(v){const c=v.custos;
  if(!c)return `<div class="empty">Não consegui estimar os custos agora. Tente de novo em instantes.</div>${dinheiroHtml(v)}`;
  const pc=c.por_categoria||{},mx=Math.max(...GRUPOS.map(g=>g[1].reduce((s,k)=>s+(pc[k]||0),0)),1);
  return `<div class="card"><div class="total">${brl(c.total_brl)}</div><p class="mut" style="margin:6px 0 0">Por pessoa${pc.voos?", incluindo voos estimados":", sem passagens aéreas"}. Média de ${brl(c.diaria_brl)} por dia no destino.</p></div>
  ${(c.por_destino||[]).length>1?`<div class="card">${c.por_destino.map(d=>`<div class="row"><span>📍 ${esc(d.destino)}</span><span>${d.dias} dias × ${brl(d.diaria_brl)}/dia</span></div>`).join("")}</div>`:""}
  <div class="card">${GRUPOS.filter(g=>g[1].some(k=>pc[k]>0)||g[0].includes("Transporte")).map(g=>grupoCustos(g,pc,mx,c)).join("")}</div>
  <div class="warn">${c.origem==="ia"?"💡 Estimativa feita pela IA com base no estilo e nos países da rota. ":"⚠️ "}${esc(c.observacao||"")} Os preços mudam e os voos variam muito com a antecedência: use como referência.</div>
  ${dinheiroHtml(v)}`}
