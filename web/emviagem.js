/* Em viagem (v1.4): o que o viajante registra enquanto a expedição acontece.
   Quatro módulos por expedição: diário de bordo, mapas e rotas, gastos (em R$) e registros por categoria.
   Tudo é informado manualmente (sem IA). O diário de cada dia fica em roteiro[i].notas, o mesmo campo que o Planejar
   usava antes, então nada do que já foi escrito se perde.
   Mapas: sem biblioteca e sem chave de API. O Rumo organiza locais e deslocamentos e abre o Google Maps com um toque.
   Reaproveita helpers de preparacao.js (rs, parseBRL, soma, uid, opts, contagem, selo, cabecalho, botoesForm...) e de
   app.js (S, rangeTxt, estiloOf, longa, fmtData, salvar, render), todos lidos só na hora de desenhar. */

const EVTABS=[["diario","📓 Diário de bordo"],["mapas","🗺️ Mapas e rotas"],["gastos","💸 Gastos"],["registros","📝 Registros"]];
const MODOS=[["aviao","✈️","Avião"],["onibus","🚌","Ônibus"],["trem","🚆","Trem"],["barco","⛴️","Barco"],["carro","🚗","Carro ou van"],["moto","🛵","Moto"],["a_pe","🚶","A pé"],["outro","📍","Outro"]];
const TIPOS_LOCAL=[["atracao","🏛️","Atração"],["natureza","🌄","Natureza e trilha"],["comida","🍽️","Comida e bebida"],["hospedagem","🛏️","Hospedagem"],["cultura","🎭","Cultura"],["outro","📌","Outro"]];
const GCATS=[["transporte","🚌","Transporte"],["hospedagem","🛏️","Hospedagem"],["alimentacao","🍽️","Alimentação"],["passeios","🎟️","Passeios e experiências"],["compras","🛍️","Compras"],["outros","🧾","Outros"]];
const RCATS=[["dicas","💡","Dicas e descobertas"],["comida","🍜","Comida"],["pessoas","👋","Pessoas e contatos"],["hospedagens","🛏️","Hospedagens"],["transportes","🚌","Transportes"],["aprendizados","⚠️","Perrengues e aprendizados"],["momentos","🌄","Momentos marcantes"],["outros","📌","Outros"]];
const ST_LOCAL=[["quero_ir","Quero visitar"],["visitado","Já visitei"]];

/* ---------- estado e utilidades ---------- */
const evVazio=()=>({id:null,tab:"diario",form:null,fg:"todas",fr:"todas",foco:null});
function evDoHash(){const[s,id,tab]=partesHash(),e=evVazio();if(s==="emviagem"&&id){e.id=id;if(EVTABS.some(t=>t[0]===tab))e.tab=tab}return e}
const E=v=>{const e=v.em_viagem||(v.em_viagem={});["locais","deslocamentos","gastos","registros"].forEach(k=>{e[k]||=[]});return e};
const dd=n=>String(n).padStart(2,"0");
const isoDe=d=>`${d.getFullYear()}-${dd(d.getMonth()+1)}-${dd(d.getDate())}`;
const isoHoje=()=>isoDe(new Date());
const diaIso=(ini,n)=>{const d=new Date(ini+"T12:00:00");d.setDate(d.getDate()+n);return isoDe(d)};
const achar=(arr,id)=>arr.find(x=>x[0]===id)||arr[arr.length-1];
const evViagem=()=>S.trips.find(t=>t.id===S.vi.id);
function abrirEv(id,tab){S.vi={...evVazio(),id,tab:tab||"diario"};S.secao="emviagem";history.pushState(null,"",`#/emviagem/${id}/${S.vi.tab}`);render();scrollTo(0,0)}

/* ---------- mapas: links para o Google Maps (sem chave de API) ---------- */
const encu=encodeURIComponent;
const mapaBusca=q=>`https://www.google.com/maps/search/?api=1&query=${encu(q)}`;
function mapaRota(pts){pts=pts.filter(Boolean).slice(0,11);if(pts.length<2)return null; /* o Maps aceita até 11 pontos por rota */
  return `https://www.google.com/maps/dir/?api=1&origin=${encu(pts[0])}&destination=${encu(pts[pts.length-1])}`+(pts.length>2?`&waypoints=${pts.slice(1,-1).map(encu).join("%7C")}`:"")}
const semRep=a=>a.filter((x,i)=>i===0||norm(x)!==norm(a[i-1]));
const pontos=ts=>ts.length?semRep([ts[0].de,...ts.map(t=>t.para)]):[];
const mesmoTrecho=(a,b)=>norm(a.de)===norm(b.de)&&norm(a.para)===norm(b.para);
const modoDe=t=>{const m=norm(t||"");return /voo|avi|aereo/.test(m)?"aviao":/onibus/.test(m)?"onibus":/trem/.test(m)?"trem":/barco|balsa|ferry|lancha/.test(m)?"barco":/carro|van|aluguel/.test(m)?"carro":/moto/.test(m)?"moto":/a pe|caminh/.test(m)?"a_pe":"outro"};
const linkMapa=(href,txt)=>href?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${txt}</a>`:"";

/* ---------- lista de expedições (cartões) ---------- */
function evMod(v,tab,titulo,txt,frac){return `<button class="mod" data-v="abrir" data-id="${esc(v.id)}" data-tab="${tab}"><b>${titulo}</b><small>${txt}</small>${frac==null?"":`<span class="mini" aria-hidden="true"><i style="width:${Math.round(Math.min(1,frac)*100)}%"></i></span>`}</button>`}
const diasComNota=v=>(v.itinerario.roteiro||[]).filter(d=>(d.notas||"").trim()).length;
function evCartao(v,i){const r=v.request,e=E(v),nd=(v.itinerario.roteiro||[]).length,com=diasComNota(v),tot=soma(e.gastos,g=>g.valor_brl),lg=e.locais.length,ds=e.deslocamentos.length;
  return `<article class="pcard" style="--i:${i}"><div class="pcard-top"><div><h3>${rotaTxt(r.destinos)}</h3><span class="pmeta">📅 ${esc(rangeTxt(r))}</span><span class="pmeta">${estiloOf(r.estilo)[4]} ${esc(estiloOf(r.estilo)[1])} · ${r.dias} dias</span></div>${selo(contagem(r))}</div>
  <div class="mods">${evMod(v,"diario","📓 Diário de bordo",nd?`${com} de ${nd} dias escritos`:"sem dias",nd?com/nd:null)}
  ${evMod(v,"mapas","🗺️ Mapas e rotas",lg||ds?`${pluralN(lg,"local","locais")} · ${pluralN(ds,"trajeto","trajetos")}`:"nada registrado")}
  ${evMod(v,"gastos","💸 Gastos",e.gastos.length?`${rs(tot)} · ${pluralN(e.gastos.length,"lançamento","lançamentos")}`:"nenhum gasto ainda")}
  ${evMod(v,"registros","📝 Registros",e.registros.length?pluralN(e.registros.length,"registro","registros"):"nenhum ainda")}</div></article>`}
function evLista(){const t=S.trips;
  return `<div class="ptit"><h2>Em viagem</h2><span class="hand">anote enquanto vive</span></div>
  <p class="plead">O caderno de campo de cada expedição: diário de bordo, mapas e deslocamentos, gastos por categoria e registros do caminho. Você escreve, o Rumo organiza.</p>
  ${t.length?`<div class="pgrid">${t.map(evCartao).join("")}</div>`
  :`<div class="empty">Você ainda não tem expedições para acompanhar. Planeje a primeira e ela aparece aqui. 🏕️<br><br><button class="btn" data-p="nova">+ nova viagem</button></div>`}
  <p class="small">As viagens e os anexos ficam salvos enquanto o servidor estiver ligado.</p>`}

/* ---------- expedição aberta ---------- */
const EVT={};
function evViagemHtml(v){const r=v.request;
  return `<button class="back" data-v="lista">← Minhas expedições</button>
  <div class="vh prep"><div class="info"><small class="nb">Em viagem · Nº ${esc((v.id||"").slice(0,4).toUpperCase())}</small><h2>${rotaTxt(r.destinos)}</h2>
  <p>📅 ${esc(rangeTxt(r))} · ${estiloOf(r.estilo)[4]} ${esc(estiloOf(r.estilo)[1])} · ${r.dias} dias</p><p class="save" role="status">${esc(S.save)}</p></div>${selo(contagem(r))}</div>
  <div class="tabs" role="tablist">${EVTABS.map(([k,n])=>`<button role="tab" aria-selected="${k===S.vi.tab}" data-v="tab" data-t="${k}">${n}</button>`).join("")}</div>
  <div>${EVT[S.vi.tab](v)}</div>`}
function evHtml(){const v=S.vi.id&&evViagem();return v?evViagemHtml(v):evLista()}
const evBotao=(f,txt)=>S.vi.form===f?"":`<button class="pbtn" data-v="abrirform" data-f="${f}">${txt}</button>`;
const evBotoes=txt=>`<p class="erro" role="alert"></p><div class="acts2 full"><button class="btn">${txt}</button><button type="button" class="ghost" data-v="fechar">Cancelar</button></div>`;
const chips=(chave,lista,itens,sel,getCat)=>itens.length?`<div class="conts" role="group" aria-label="Filtrar por categoria"><button type="button" data-v="${chave}" data-f="todas" aria-pressed="${sel==="todas"}">Todas (${itens.length})</button>${lista.filter(c=>itens.some(x=>getCat(x)===c[0])).map(c=>`<button type="button" data-v="${chave}" data-f="${c[0]}" aria-pressed="${sel===c[0]}">${c[1]} ${c[2]} (${itens.filter(x=>getCat(x)===c[0]).length})</button>`).join("")}</div>`:"";

/* diário de bordo */
EVT.diario=v=>{const R=v.itinerario.roteiro||[],ini=v.request.data_inicio,hoje=isoHoje(),idx=ini?R.findIndex((d,i)=>diaIso(ini,i)===hoje):-1;
  return cabecalho("Diário de bordo","Escreva como num caderno de campo: o que viu, comeu e sentiu em cada dia.",idx>=0?`<button class="pbtn" data-v="hoje" data-i="${idx}">📍 Ir para hoje</button>`:"")+
  `<p class="note" id="dprog">${diasComNota(v)} de ${R.length} dias com anotações</p>`+
  (R.length?`<ol class="days">${R.map((d,i)=>`<li class="day paper" id="ed-${i}"><div class="w">${ini?esc(fmtData(ini,i))+" · ":""}📍 ${esc(d.cidade)}${i===idx?` <span class="tag ok">Hoje</span>`:""}</div><h3>Dia ${d.dia}: ${esc(d.titulo)}</h3>
  ${(d.itens||[]).length?`<details class="plan"><summary>Ver o planejado do dia</summary><ul>${d.itens.map(a=>`<li>${esc(a)}</li>`).join("")}</ul></details>`:""}
  <label class="nota"><span>Diário de bordo</span><textarea class="rule" rows="3" data-dnota="${i}" maxlength="2000" placeholder="Como foi o dia? Anote o que viu, comeu e sentiu.">${esc(d.notas||"")}</textarea></label></li>`).join("")}</ol>`
  :`<div class="empty">Este roteiro não tem dias para escrever. 📓</div>`)};

/* mapas, rotas e deslocamentos */
EVT.mapas=v=>{const e=E(v),plan=v.itinerario.trechos||[],real=[...e.deslocamentos].sort((a,b)=>(a.data||"9999").localeCompare(b.data||"9999")),
    pp=pontos(plan),pr=semRep(real.length?[real[0].de,...real.map(x=>x.para)]:[]),urlP=mapaRota(pp),urlR=mapaRota(pr),
    ultimo=real.length?real[real.length-1].para:(v.request.destinos||[])[0]||"",aberto=S.vi.form,
    quero=e.locais.filter(l=>!l.visitado),visit=e.locais.filter(l=>l.visitado).sort((a,b)=>(b.data||"").localeCompare(a.data||""));
  const itemLocal=l=>{const t=achar(TIPOS_LOCAL,l.tipo);return `<div class="it${l.visitado?" feito":""}"><div class="ic" aria-hidden="true">${t[1]}</div><div class="corpo"><b>${esc(l.nome)}</b>
    <div class="meta"><span class="tag neutro">${t[2]}</span>${l.lugar?`<span>${esc(l.lugar)}</span>`:""}${l.data?`<span>📅 ${esc(longa(l.data))}</span>`:""}${linkMapa(mapaBusca(l.nome+(l.lugar?", "+l.lugar:"")),"📍 Abrir no mapa")}
    <label class="chk"><input type="checkbox" data-vlv="${esc(l.id)}"${l.visitado?" checked":""}> visitado</label></div>${l.nota?`<p class="nt">${esc(l.nota)}</p>`:""}</div>
    <button class="x" data-v="rm" data-k="local" data-id="${esc(l.id)}" aria-label="Excluir local: ${esc(l.nome)}">×</button></div>`};
  const itemReal=r=>{const m=achar(MODOS,r.modo),fora=plan.length&&!plan.some(t=>mesmoTrecho(t,r));
    return `<li><div><b>${esc(r.de)}${SETA}${esc(r.para)}</b><small>${m[1]} ${m[2]}${r.duracao?" · "+esc(r.duracao):""}${r.data?" · "+esc(longa(r.data)):""}</small>${r.nota?`<small>${esc(r.nota)}</small>`:""}
    <span class="trk">${fora?`<span class="tag alerta">Fora do plano</span>`:""}${linkMapa(mapaRota([r.de,r.para]),"🗺️ Rota")}</span></div>
    <button class="x" data-v="rm" data-k="desl" data-id="${esc(r.id)}" aria-label="Excluir trajeto: ${esc(r.de)} para ${esc(r.para)}">×</button></li>`};
  return cabecalho("Mapas, rotas e deslocamentos","Registre onde você foi e compare com o que planejou.")+
  `<div class="dica">🗺️ Nesta versão o Rumo organiza seus locais e trajetos e abre tudo no Google Maps com um toque. Um mapa interativo dentro do Rumo fica para uma próxima versão.</div>`+
  `<h4 class="sub-t">Rota planejada × realizada</h4><div class="comp">
  <section class="card"><h4>🧭 Planejada</h4>${plan.length?`<ol class="trk-l">${plan.map((t,i)=>{const feito=real.some(r=>mesmoTrecho(t,r));
    return `<li><div><b>${esc(t.de)}${SETA}${esc(t.para)}</b><small>${esc(t.modo||"")}${t.duracao?" · "+esc(t.duracao):""}</small><span class="trk">${feito?`<span class="tag ok">Feito</span>`:`<button class="sugere" data-v="fiz" data-i="${i}">✔ Fiz esse trajeto</button>`}</span></div></li>`}).join("")}</ol>`
    :`<p class="mut">O roteiro não tem deslocamentos entre cidades.</p>`}${urlP?`<p>${linkMapa(urlP,"🗺️ Abrir rota planejada no mapa").replace("<a ",'<a class="pbtn" ')}</p>`:""}</section>
  <section class="card"><h4>🥾 Realizada</h4>${real.length?`<ol class="trk-l">${real.map(itemReal).join("")}</ol>`:`<p class="mut">Nenhum trajeto registrado ainda. Use o botão abaixo ou marque um da rota planejada.</p>`}${urlR?`<p>${linkMapa(urlR,"🗺️ Abrir rota realizada no mapa").replace("<a ",'<a class="pbtn" ')}</p>`:""}</section></div>`+
  ((pp.length>11||pr.length>11)?`<p class="small">O Google Maps aceita até 11 pontos por rota; os links mostram os 11 primeiros.</p>`:"")+
  `<div class="mh"><div><h3>Deslocamentos</h3><p class="sub">Cada trajeto entre dois pontos que você já fez.</p></div>${evBotao("desl","＋ Registrar deslocamento")}</div>`+
  (aberto==="desl"?`<form class="pf" data-vform="desl"><label>De<input type="text" id="v-foco" name="de" maxlength="120" required value="${esc(ultimo)}" placeholder="Ex.: Lima"></label><label>Para<input type="text" name="para" maxlength="120" required placeholder="Ex.: Cusco"></label>
  <label>Modo<select name="modo">${opts(MODOS.map(m=>[m[0],`${m[1]} ${m[2]}`]),"onibus")}</select></label><label>Data<input type="date" name="data" value="${isoHoje()}"></label>
  <label>Duração <small>(opcional)</small><input type="text" name="duracao" maxlength="60" placeholder="Ex.: 8h"></label><label class="full">Observação <small>(opcional)</small><input type="text" name="nota" maxlength="500" placeholder="Empresa, preço, como foi..."></label>${evBotoes("Salvar deslocamento")}</form>`:"")+
  `<div class="mh"><div><h3>Locais</h3><p class="sub">Lugares para visitar e histórico do que você já conheceu.</p></div>${evBotao("local","＋ Adicionar local")}</div>`+
  (aberto==="local"?`<form class="pf" data-vform="local"><label class="full">Nome do local<input type="text" id="v-foco" name="nome" maxlength="200" required placeholder="Ex.: Machu Picchu"></label>
  <label>Cidade ou país <small>(ajuda a achar no mapa)</small><input type="text" name="lugar" maxlength="120" placeholder="Ex.: Cusco, Peru"></label><label>Tipo<select name="tipo">${opts(TIPOS_LOCAL.map(t=>[t[0],`${t[1]} ${t[2]}`]),"atracao")}</select></label>
  <label>Situação<select name="situacao">${opts(ST_LOCAL,"quero_ir")}</select></label><label>Data da visita <small>(opcional)</small><input type="date" name="data"></label>
  <label class="full">Observação <small>(opcional)</small><input type="text" name="nota" maxlength="500" placeholder="Horário, ingresso, dica..."></label>${evBotoes("Salvar local")}</form>`:"")+
  (e.locais.length?(quero.length?`<h4 class="sub-t">Quero visitar</h4><div class="lista pgl">${quero.map(itemLocal).join("")}</div>`:"")+(visit.length?`<h4 class="sub-t">Histórico de locais visitados</h4><div class="lista pgl">${visit.map(itemLocal).join("")}</div>`:"")
  :aberto==="local"?"":`<div class="empty">Nenhum local ainda. Adicione o que quer conhecer e marque como visitado quando for. 📍</div>`)};

/* gastos durante a viagem (R$) */
EVT.gastos=v=>{const e=E(v),G=e.gastos,r=v.request,aberto=S.vi.form==="gasto",total=soma(G,g=>g.valor_brl),fl=S.vi.fg,
    comeco=r.data_inicio?Math.round((hojeZero()-new Date(r.data_inicio+"T00:00:00"))/864e5)+1:1,dias=Math.max(1,Math.min(r.dias||1,comeco)),
    porCat=GCATS.map(c=>[c,soma(G.filter(g=>g.categoria===c[0]),g=>g.valor_brl)]).filter(x=>x[1]>0),maior=[...porCat].sort((a,b)=>b[1]-a[1])[0],mx=Math.max(...porCat.map(x=>x[1]),1),
    lista=G.filter(g=>fl==="todas"||g.categoria===fl).sort((a,b)=>(b.data||"").localeCompare(a.data||""));
  return cabecalho("Gastos da viagem","Tudo em reais (R$). Outras moedas chegam em versões futuras.",evBotao("gasto","＋ Adicionar gasto"))+
  `<div class="fin-grid"><div class="kpi"><small>Total gasto</small><b>${rs(total)}</b><em>${pluralN(G.length,"lançamento","lançamentos")}</em></div><div class="kpi"><small>Média por dia</small><b>${comeco>0?rs(Math.round(total/dias*100)/100):"—"}</b><em>${comeco>0?`em ${pluralN(dias,"dia","dias")} de viagem`:"a viagem ainda não começou"}</em></div>
  <div class="kpi"><small>Pesa mais</small><b>${maior?esc(maior[0][2]):"—"}</b><em>${maior?rs(maior[1]):"sem gastos ainda"}</em></div></div>`+
  (aberto?`<form class="pf" data-vform="gasto"><label class="full">Descrição<input type="text" id="v-foco" name="descricao" maxlength="200" required placeholder="Ex.: Almoço no mercado, Táxi para o hostel"></label>
  <label>Categoria<select name="categoria">${opts(GCATS.map(c=>[c[0],`${c[1]} ${c[2]}`]),"alimentacao")}</select></label><label>Valor<span class="rs"><span>R$</span><input type="text" name="valor" inputmode="decimal" placeholder="0,00" required></span></label>
  <label>Data<input type="date" name="data" value="${isoHoje()}"></label>${evBotoes("Salvar gasto")}</form>`:"")+
  (porCat.length?`<div class="card"><h4>Por categoria</h4>${porCat.map(([c,t])=>`<div class="grp"><div class="grow"><span>${c[1]} ${c[2]}</span><b>${rs(t)}</b></div><div class="bar"><i style="width:${t/mx*100}%"></i></div></div>`).join("")}</div>`:"")+
  chips("fg",GCATS,G,fl,g=>g.categoria)+
  (lista.length?`<div class="lista">${lista.map(g=>{const c=achar(GCATS,g.categoria);return `<div class="it"><div class="ic" aria-hidden="true">${c[1]}</div><div class="corpo"><b>${esc(g.descricao)}</b><div class="meta"><span class="tag neutro">${c[2]}</span>${g.data?`<span>📅 ${esc(longa(g.data))}</span>`:""}</div></div>
  <span class="valor">${rs(g.valor_brl)}</span><button class="x" data-v="rm" data-k="gasto" data-id="${esc(g.id)}" aria-label="Excluir gasto: ${esc(g.descricao)}">×</button></div>`}).join("")}</div>`
  :aberto?"":`<div class="empty">Nenhum gasto registrado. Anote cada gasto na hora e veja para onde o dinheiro está indo. 💸</div>`)};

/* registros da viagem, por categoria */
EVT.registros=v=>{const e=E(v),Rg=e.registros,aberto=S.vi.form==="registro",fl=S.vi.fr,lista=Rg.filter(x=>fl==="todas"||x.categoria===fl).sort((a,b)=>(b.data||"").localeCompare(a.data||""));
  return cabecalho("Registros da viagem","Dicas, contatos, aprendizados e momentos, cada um na sua categoria.",evBotao("registro","＋ Novo registro"))+
  (aberto?`<form class="pf" data-vform="registro"><label>Categoria<select name="categoria">${opts(RCATS.map(c=>[c[0],`${c[1]} ${c[2]}`]),"dicas")}</select></label><label>Data<input type="date" name="data" value="${isoHoje()}"></label>
  <label class="full">Título<input type="text" id="v-foco" name="titulo" maxlength="200" required placeholder="Ex.: Café incrível perto da praça"></label>
  <label class="full">Anotação <small>(opcional)</small><textarea name="texto" maxlength="3000" placeholder="Endereço, nome, o que aconteceu, o que você aprendeu..."></textarea></label>${evBotoes("Salvar registro")}</form>`:"")+
  chips("fr",RCATS,Rg,fl,x=>x.categoria)+
  (lista.length?`<div class="lista">${lista.map(x=>{const c=achar(RCATS,x.categoria);return `<div class="it"><div class="ic" aria-hidden="true">${c[1]}</div><div class="corpo"><b>${esc(x.titulo)}</b><div class="meta"><span class="tag neutro">${c[2]}</span>${x.data?`<span>📅 ${esc(longa(x.data))}</span>`:""}</div>${x.texto?`<p class="nt">${esc(x.texto)}</p>`:""}</div>
  <button class="x" data-v="rm" data-k="registro" data-id="${esc(x.id)}" aria-label="Excluir registro: ${esc(x.titulo)}">×</button></div>`}).join("")}</div>`
  :aberto?"":Rg.length?`<div class="empty">Nenhum registro nesta categoria.</div>`:`<div class="empty">Nenhum registro ainda. Guarde aqui o que vale lembrar depois da viagem. 📝</div>`)};

/* ---------- ações ---------- */
const evSalvar=(v,foco)=>{if(foco)S.vi.foco=foco;salvar(v);render()};
function evPos(){if(S.secao!=="emviagem"||!S.vi.foco)return;const el=document.getElementById(S.vi.foco);S.vi.foco=null;if(el)el.focus()}
const LISTAS={local:"locais",desl:"deslocamentos",gasto:"gastos",registro:"registros"};

document.addEventListener("click",ev=>{const b=ev.target.closest("[data-v]");if(!b)return;const a=b.dataset.v,v=evViagem();
  if(a==="lista"){S.vi=evVazio();history.pushState(null,"","#/emviagem");render();return scrollTo(0,0)}
  if(a==="abrir")return abrirEv(b.dataset.id,b.dataset.tab);
  if(a==="tab"){S.vi.tab=b.dataset.t;S.vi.form=null;if(v)history.replaceState(null,"",`#/emviagem/${v.id}/${S.vi.tab}`);return render()}
  if(!v)return;const e=E(v);
  if(a==="abrirform"){S.vi.form=b.dataset.f;S.vi.foco="v-foco"}
  else if(a==="fechar")S.vi.form=null;
  else if(a==="fg")S.vi.fg=b.dataset.f;
  else if(a==="fr")S.vi.fr=b.dataset.f;
  else if(a==="hoje"){const el=document.getElementById("ed-"+b.dataset.i);if(el){el.scrollIntoView&&el.scrollIntoView({behavior:"smooth",block:"start"});const t=el.querySelector("textarea");if(t)t.focus({preventScroll:true})}return}
  else if(a==="fiz"){const t=(v.itinerario.trechos||[])[+b.dataset.i];if(!t)return;
    e.deslocamentos.push({id:uid(),de:String(t.de).slice(0,120),para:String(t.para).slice(0,120),modo:modoDe(t.modo),data:isoHoje(),duracao:String(t.duracao||"").slice(0,60),nota:""});return evSalvar(v)}
  else if(a==="rm"){const lista=e[LISTAS[b.dataset.k]];if(!lista)return;const i=lista.findIndex(x=>x.id===b.dataset.id);if(i<0)return;
    const x=lista[i],nome=x.nome||x.descricao||x.titulo||`${x.de} → ${x.para}`;if(!confirm("Excluir "+nome+"?"))return;lista.splice(i,1);return evSalvar(v)}
  render()});

document.addEventListener("change",ev=>{const el=ev.target;if(!el.matches("[data-vlv]"))return;const v=evViagem();if(!v)return;
  const l=E(v).locais.find(x=>x.id===el.dataset.vlv);if(!l)return;l.visitado=el.checked;if(l.visitado&&!l.data)l.data=isoHoje();evSalvar(v)});

/* o diário salva enquanto você escreve, sem redesenhar a tela (o cursor não sai do lugar) */
document.addEventListener("input",ev=>{const el=ev.target;if(el.dataset.dnota===undefined)return;const v=evViagem();if(!v)return;
  v.itinerario.roteiro[+el.dataset.dnota].notas=el.value;salvar(v);const p=document.getElementById("dprog");if(p)p.textContent=`${diasComNota(v)} de ${v.itinerario.roteiro.length} dias com anotações`});

document.addEventListener("submit",ev=>{const f=ev.target.closest("[data-vform]");if(!f)return;ev.preventDefault();const v=evViagem();if(!v)return;
  const e=E(v),k=f.dataset.vform,d=Object.fromEntries(new FormData(f)),txt=n=>String(d[n]||"").trim(),erro=m=>{const x=f.querySelector(".erro");if(x)x.textContent=m};
  if(k==="desl"){if(!txt("de")||!txt("para"))return erro("Informe de onde e para onde você foi.");
    e.deslocamentos.push({id:uid(),de:txt("de").slice(0,120),para:txt("para").slice(0,120),modo:d.modo||"outro",data:d.data||null,duracao:txt("duracao").slice(0,60),nota:txt("nota").slice(0,500)})}
  else if(k==="local"){if(!txt("nome"))return erro("Dê um nome ao local.");const vis=d.situacao==="visitado";
    e.locais.push({id:uid(),nome:txt("nome").slice(0,200),lugar:txt("lugar").slice(0,120),tipo:d.tipo||"outro",visitado:vis,data:d.data||(vis?isoHoje():null),nota:txt("nota").slice(0,500)})}
  else if(k==="gasto"){const val=parseBRL(d.valor);if(!txt("descricao"))return erro("Descreva o gasto.");if(val===null)return erro("Valor inválido. Use apenas números, como 45,90.");
    e.gastos.push({id:uid(),categoria:d.categoria||"outros",descricao:txt("descricao").slice(0,200),valor_brl:val,data:d.data||null})}
  else if(k==="registro"){if(!txt("titulo"))return erro("Dê um título ao registro.");
    e.registros.push({id:uid(),categoria:d.categoria||"outros",titulo:txt("titulo").slice(0,200),texto:txt("texto").slice(0,3000),data:d.data||null})}
  S.vi.form=null;evSalvar(v)});
