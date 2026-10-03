const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const brl=n=>n==null?"indisponível":n.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const ESTILOS=[["mochileiro","Mochileiro","Hostel, ônibus e comida de rua. Improviso e economia.","economico","🎒"],
["confortavel","Confortável","Bons hotéis bem localizados e ritmo tranquilo.","moderado","🛋️"],
["luxuoso","Luxuoso","Alto padrão e experiências exclusivas.","luxuoso","💎"]];
const INTERESSES=[["🥾","Trekking"],["🍜","Gastronomia"],["🏛️","História"],["🏖️","Praias"],["🦜","Natureza e fauna"],["🪂","Aventura"],["🎭","Cultura local"],
["🖼️","Museus"],["📷","Fotografia"],["🌙","Vida noturna"],["🧘","Espiritualidade"],["🤝","Voluntariado"],["🧭","Cidades pouco turísticas"],["🛍️","Compras"]];
const TABS=[["roteiro","🗺️ Roteiro"],["transporte","🚌 Transporte"],["custos","💰 Custos"],["checklist","🎒 Checklist"]];
const CAT={hospedagem:"🛏️ Hospedagem",alimentacao:"🍽️ Alimentação",transporte_local:"🚇 Transporte local",atividades:"🎟️ Atividades",transporte_entre_destinos:"✈️ Entre os destinos"};
const PASSOS=[["🧭","destino"],["📅","datas"],["🎒","estilo"],["✨","interesses"],["✍️","detalhes"]];
const novo=()=>({destinos:[],inicio:"",fim:"",estilo:"mochileiro",interesses:[],detalhes:""});
const codigo=()=>Math.random().toString(16).slice(2,6).toUpperCase();
let S={view:"home",trips:[],paises:[],step:0,f:novo(),trip:null,tab:"roteiro",adding:null,erro:"",save:"",busca:"",cont:"Todos",ia:null,cod:codigo()};
const dias=f=>f.inicio&&f.fim?Math.round((new Date(f.fim)-new Date(f.inicio))/864e5)+1:0;
const estiloOf=id=>ESTILOS.find(e=>e[0]===id||e[3]===id)||ESTILOS[0];
const fmtData=(iso,n=0)=>{if(!iso)return"";const d=new Date(iso+"T12:00:00");d.setDate(d.getDate()+n);return d.toLocaleDateString("pt-BR",{weekday:"short",day:"numeric",month:"short"})};
const rangeTxt=r=>r.data_inicio?`${fmtData(r.data_inicio)} a ${fmtData(r.data_fim)}`:`${r.dias} dias`;
const flag=n=>{const p=S.paises.find(x=>x.nome===n);return p?`<img src="https://flagcdn.com/w40/${p.iso2.toLowerCase()}.png" alt="" loading="lazy" onerror="this.remove()">`:"📍"};
async function api(path,opt){const r=await fetch(path,{headers:{"Content-Type":"application/json"},...opt});
  if(!r.ok){let m="Erro "+r.status;try{m=(await r.json()).detail||m}catch{}throw new Error(m)}return r.json()}

/* ---------- telas ---------- */
function home(){const t=S.trips;
  return `<section class="hero"><span class="blob" style="width:200px;height:200px;background:#FFC93C55;right:-50px;top:-60px"></span><span class="blob" style="width:130px;height:130px;background:#17A2B855;left:42%;bottom:-50px"></span>
  <svg class="trailsvg" viewBox="0 0 420 260" fill="none" aria-hidden="true"><path d="M10 240C90 130 150 290 230 170S360 50 405 120" stroke="#FFC93C" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 16"/>
  <circle cx="10" cy="240" r="11" fill="#fff"/><circle cx="230" cy="170" r="9" fill="#17A2B8" stroke="#fff" stroke-width="4"/><path d="M405 120v-52" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M405 68l42 14-42 14z" fill="#FF8A2B"/></svg>
  <h1>Bora montar sua próxima expedição? 🌎</h1><p>Conta para onde quer ir e como gosta de viajar. A gente desenha o mapa, e você muda o que quiser.</p>
  <button class="btn" data-act="nova">+ nova viagem</button></section>
  <section class="sec"><h2>Suas expedições 🧳</h2>${t.length?`<div class="trips">${t.map(v=>`<div class="tw"><button class="trip" data-act="abrir" data-id="${esc(v.id)}"><h3>${esc(v.request.destinos.join(" → "))}</h3>
  <small>📅 ${esc(rangeTxt(v.request))}</small><small>${estiloOf(v.request.estilo)[4]} ${v.request.dias} dias, ${esc(estiloOf(v.request.estilo)[1])}</small></button>
  <button class="x" data-act="apagar" data-id="${esc(v.id)}" aria-label="Excluir viagem ${esc(v.request.destino)}">×</button></div>`).join("")}</div>`
  :`<div class="empty">Nenhuma expedição por aqui ainda. Clique em "+ nova viagem" e comece a primeira! 🏕️</div>`}
  <p class="small">As viagens ficam salvas enquanto o servidor estiver ligado.</p></section>`}

const trilha=()=>`<ol class="trail" aria-label="Etapa ${S.step+1} de 5">${PASSOS.map((p,i)=>`<li class="${i<=S.step?"on":""}${i===S.step?" now":""}">${p[0]}</li>${i<4?`<i class="${i<S.step?"on":""}"></i>`:""}`).join("")}</ol>`;
function rotaHtml(){const d=S.f.destinos;return `<h3>🗺️ Sua rota</h3>`+(d.length?`<ol>${d.map((n,i)=>`<li><span class="n">${i+1}</span>${flag(n)}<b>${esc(n)}</b>
  ${i?`<button data-act="up" data-i="${i}" aria-label="Subir ${esc(n)}">↑</button>`:""}${i<d.length-1?`<button data-act="down" data-i="${i}" aria-label="Descer ${esc(n)}">↓</button>`:""}<button data-act="rmdest" data-i="${i}" aria-label="Remover ${esc(n)}">✕</button></li>`).join("")}</ol>`
  :`<p>Toque nos lugares abaixo, na ordem em que vai visitar. Dá para escolher vários países!</p>`)}
function gridHtml(){const q=norm(S.busca),ps=S.paises.filter(p=>(S.cont==="Todos"||p.continente===S.cont)&&(!q||norm(p.nome).includes(q)));
  const livre=q&&!S.paises.some(p=>norm(p.nome)===q)?`<button class="pais" data-act="addlivre">➕ Adicionar "${esc(S.busca.trim())}"</button>`:"";
  return livre+ps.map(p=>`<button class="pais" aria-pressed="${S.f.destinos.includes(p.nome)}" data-act="pick" data-n="${esc(p.nome)}">${flag(p.nome)}${esc(p.nome)}</button>`).join("")||`<p>Nada por aqui.</p>`}
function wizard(){const f=S.f,p=PASSOS[S.step][1];let c="";
  if(p==="destino")c=`<h2>Para onde vamos? 🧭</h2><p>Escolha um país ou monte uma rota com vários. Também dá para digitar uma cidade.</p><div class="rota" id="rota">${rotaHtml()}</div>
    <input type="text" id="dest" value="${esc(S.busca)}" placeholder="🔎 Buscar país ou digitar uma cidade" aria-label="Buscar destino" autocomplete="off">
    <div class="conts" role="group" aria-label="Continente">${["Todos",...new Set(S.paises.map(x=>x.continente))].map(x=>`<button type="button" data-act="cont" data-c="${esc(x)}" aria-pressed="${S.cont===x}">${esc(x)}</button>`).join("")}</div><div class="grid" id="grid">${gridHtml()}</div>`;
  if(p==="datas")c=`<h2>Quando você parte? 📅</h2><p>Escolha a ida e a volta. A gente conta os dias.</p>
    <label class="f" for="ini">🛫 Ida</label><input type="date" id="ini" value="${f.inicio}" min="${new Date().toISOString().slice(0,10)}">
    <label class="f" for="fim">🛬 Volta</label><input type="date" id="fim" value="${f.fim}" min="${f.inicio}"><div class="calc" id="calc">${calcTxt()}</div>`;
  if(p==="estilo")c=`<h2>Qual é o seu estilo? 🎒</h2><p>Isso muda onde você dorme, como se move e quanto gasta.</p><div class="opts">${ESTILOS.map(e=>
    `<label class="opt big"><input type="radio" name="estilo" value="${e[0]}"${f.estilo===e[0]?" checked":""}><span><i class="e" style="font-style:normal">${e[4]}</i><b>${e[1]}</b><em>${e[2]}</em></span></label>`).join("")}</div>`;
  if(p==="interesses")c=`<h2>O que te move? ✨</h2><p>Marque o que combina com você. Pode escolher quantos quiser!</p><div class="opts">${INTERESSES.map(x=>
    `<label class="opt"><input type="checkbox" name="int" value="${x[1]}"${f.interesses.includes(x[1])?" checked":""}><span><i class="e" style="font-style:normal">${x[0]}</i><b>${x[1]}</b></span></label>`).join("")}</div>`;
  if(p==="detalhes")c=`<h2>Conte mais sobre sua viagem ✍️</h2><p>Tem algum lugar que quer conhecer? Um restaurante, uma trilha, um hotel onde já vai ficar? Escreva como num caderno de bordo. Pode pular!</p>
    <textarea id="det" class="rule" maxlength="2000" aria-label="Conte mais sobre sua viagem" placeholder="Ex.: ${esc(exemplo())}">${esc(f.detalhes)}</textarea>
    <div class="tcount" id="cnt">${f.detalhes.length}/2000</div>
    <div class="guias">${GUIAS.map(g=>`<button type="button" data-act="ins" data-t="${esc(g[1])}">${g[0]}</button>`).join("")}<button type="button" class="ex" data-act="exemplo">💡 Usar um exemplo</button></div>`;
  return `<div class="wz"><section class="step">${trilha()}${c}<p class="err" role="alert">${esc(S.erro)}</p><div class="nav"><button class="ghost" data-act="voltar">${S.step?"← Voltar":"Cancelar"}</button>
  <button class="btn" data-act="proximo">${S.step===4?"Montar expedição 🚀":"Próximo →"}</button></div></section>${caderno()}</div>`}
const GUIAS=[["📍 Lugares que quero conhecer","Lugares que quero conhecer: "],["🍽️ Restaurantes","Restaurantes: "],["🏨 Onde vou ficar","Hotel ou hostel (com endereço): "],["🥾 Trilhas e passeios","Trilhas e passeios: "]];
const exemplo=()=>`Quero conhecer lugares pouco turísticos por ${S.f.destinos[0]||"o destino"} e fazer pelo menos uma trilha com vista bonita. Gostaria de comer em restaurantes locais e baratos. Já pretendo ficar num hostel perto do centro (Rua Exemplo, 123), então prefiro passeios que dê para fazer a pé ou de transporte público.`;
const longa=iso=>new Date(iso+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"short",year:"numeric"});
function caderno(){const f=S.f,n=dias(f);
  const sec=(i,t,v)=>`<div class="cs${i===S.step?" now":""}"><div class="ct"><span>${t}</span>${i<S.step?`<button class="lnk" data-act="irpasso" data-s="${i}">editar</button>`:""}</div><div class="cv">${i<=S.step&&v?v:`<em>${i===S.step?"definindo agora…":"—"}</em>`}</div></div>`;
  return `<aside class="caderno paper" id="cad" aria-label="Resumo da expedição"><div class="ch"><span>Caderno da expedição</span><b>Nº ${S.cod}</b></div>
  ${sec(0,"Rota",f.destinos.map(x=>`<div>${flag(x)} ${esc(x)}</div>`).join(""))}
  ${sec(1,"Datas",n>0?`${esc(longa(f.inicio))} — ${esc(longa(f.fim))}<br><small class="ok">${n} dias de expedição</small>`:"")}
  ${sec(2,"Estilo",`${estiloOf(f.estilo)[4]} ${esc(estiloOf(f.estilo)[1])}`)}
  ${sec(3,"Interesses",f.interesses.map(x=>{const it=INTERESSES.find(y=>y[1]===x);return `<div>${it?it[0]:""} ${esc(x)}</div>`}).join(""))}
  ${sec(4,"Notas",f.detalhes?esc(f.detalhes.slice(0,90))+(f.detalhes.length>90?"…":""):"")}</aside>`}
const calcTxt=()=>{const n=dias(S.f);return n>0?`🗓️ ${n} ${n>1?"dias":"dia"} e ${n-1} ${n-1===1?"noite":"noites"}`:""};
const carregando=()=>`<section class="load"><svg class="route" viewBox="0 0 260 70" aria-hidden="true"><path d="M8 52C50 4 90 66 130 36S210 6 252 30"/></svg><h2>Escrevendo as primeiras páginas do caderno... ✍️</h2><p>Consultando clima, câmbio e atrações. Pode levar até um minuto.</p></section>`;

const painelDia=i=>{const ia=S.ia&&S.ia.d===i?S.ia:null;
  let h=`<div class="dacts"><button class="addb" data-act="addativ" data-d="${i}">+ Adicionar atividade</button><button class="iab" data-act="ia" data-d="${i}">✨ Pedir ideias à IA</button></div>`;
  if(S.adding===i)h+=`<form class="addf" data-d="${i}"><input type="text" id="novaativ" maxlength="200" placeholder="Ex.: Jantar no mercado central" aria-label="Nova atividade" required><button class="btn">Adicionar</button><button type="button" class="ghost" data-act="canceladd">Cancelar</button></form>`;
  if(ia){const e=ia.estado;h+=e==="form"?`<form class="addf iaf" data-d="${i}"><input type="text" id="iapedido" maxlength="300" value="${esc(ia.pedido)}" placeholder="O que você quer fazer? Ex.: algo ao ar livre e barato à noite" aria-label="O que você quer fazer" required><button class="btn iabtn">Gerar ideia</button><button type="button" class="ghost" data-act="iafechar">Cancelar</button></form>`
    :e==="carregando"?`<div class="iabox" role="status">✨ Pensando em ideias para você...</div>`
    :e==="erro"?`<div class="iabox"><p>😕 ${esc(ia.msg)}</p><button class="ghost" data-act="iaoutra">Tentar de novo</button> <button class="ghost" data-act="iafechar">Fechar</button></div>`
    :`<div class="iabox"><b>💡 ${esc(ia.ideia.atividade)}</b>${ia.ideia.motivo?`<p>${esc(ia.ideia.motivo)}</p>`:""}<div class="iabt"><button class="btn iabtn" data-act="iaincluir">➕ Incluir no dia</button><button class="ghost" data-act="iaoutra">🔄 Outra ideia</button><button class="ghost" data-act="iafechar">Fechar</button></div></div>`}
  return h};
const V={
 roteiro(v){const R=v.itinerario.roteiro,ini=v.request.data_inicio;
  return `<div class="rv"><nav class="tl" aria-label="Linha do tempo dos dias"><h4>Dias</h4>${R.map((d,i)=>`<button data-act="goto" data-d="${i}" class="${i===0?"on":""}"><i>${String(d.dia).padStart(2,"0")}</i><span><b>${esc(d.cidade)}</b><small>${esc(fmtData(ini,i))}</small></span></button>`).join("")}</nav>
  <ol class="days">${R.map((d,i)=>`<li class="day paper" id="dia-${i}" data-i="${i}"><div class="w">${ini?esc(fmtData(ini,i))+" · ":""}📍 ${esc(d.cidade)}</div><h3>Dia ${d.dia}: ${esc(d.titulo)}</h3>
  <ul class="acts">${d.itens.map((a,k)=>`<li><span>${esc(a)}</span><button class="x" data-act="rmativ" data-d="${i}" data-j="${k}" aria-label="Excluir atividade: ${esc(a)}">×</button></li>`).join("")}</ul>${painelDia(i)}
  <label class="nota"><span>📝 Diário de bordo</span><textarea class="rule" rows="3" data-nota="${i}" maxlength="2000" placeholder="Como foi o dia? Anote o que viu, comeu e sentiu.">${esc(d.notas||"")}</textarea></label></li>`).join("")}</ol></div>`},
 transporte(v){const t=v.itinerario.trechos;return t.length?t.map(x=>`<div class="row"><div><b>${esc(x.de)} → ${esc(x.para)}</b><small>${esc(x.modo)}${x.duracao?", "+esc(x.duracao):""}</small></div><div>${x.custo_brl!=null?brl(x.custo_brl):""}</div></div>`).join(""):`<div class="empty">Seu roteiro não tem deslocamentos entre cidades. 🚶</div>`},
 custos(v){const c=v.custos;if(!c)return`<div class="empty">Não consegui estimar os custos agora. Tente de novo em instantes.</div>`;const mx=Math.max(...Object.values(c.por_categoria));
  return `<div class="card"><div class="total">${brl(c.total_brl)}</div><p style="color:var(--mut);margin:6px 0 0">Por pessoa, sem a passagem de ida e volta. Média de ${brl(c.diaria_brl)} por dia.</p></div>
  ${(c.por_destino||[]).length>1?`<div class="card">${c.por_destino.map(d=>`<div class="row"><span>📍 ${esc(d.destino)}</span><span>${d.dias} dias × ${brl(d.diaria_brl)}/dia</span></div>`).join("")}</div>`:""}
  <div class="card">${Object.entries(c.por_categoria).map(([k,x])=>`<div style="margin:10px 0"><div style="display:flex;justify-content:space-between"><span>${CAT[k]||esc(k)}</span><b>${brl(x)}</b></div><div class="bar"><i style="width:${x/mx*100}%"></i></div></div>`).join("")}</div>
  <div class="warn">${c.origem==="ia"?"💡 Estimativa feita pela IA com base no estilo e nos países da rota. ":"⚠️ "}${esc(c.observacao||"")} Os preços mudam: use como referência.</div>`},
 checklist(v){return `<div class="card">${v.itinerario.checklist.map((x,i)=>`<label class="ck"><input type="checkbox"><span>${esc(x)}</span></label>`).join("")}</div>`}
};
function viagem(){const v=S.trip,r=v.request;
  return `<button class="back" data-act="home">← Suas expedições</button><div class="vh"><small class="nb">Caderno de bordo · Nº ${esc((v.id||"").slice(0,4).toUpperCase())}</small><h2>${esc(r.destinos.join(" → "))}</h2>
  <p>📅 ${esc(rangeTxt(r))} · ${estiloOf(r.estilo)[4]} ${esc(estiloOf(r.estilo)[1])} · ${r.dias} dias${v.custos?" · 💰 cerca de "+brl(v.custos.total_brl):""}</p><p class="save" role="status">${esc(S.save)}</p></div>
  <div class="tabs" role="tablist">${TABS.map(([k,n])=>`<button role="tab" aria-selected="${k===S.tab}" data-act="tab" data-t="${k}">${n}</button>`).join("")}</div><div>${V[S.tab](v)}</div>`}
function render(){$("#app").innerHTML={home,wizard,load:carregando,viagem}[S.view]();if(S.adding!==null&&$("#novaativ"))$("#novaativ").focus();if(S.ia&&S.ia.estado==="form"&&$("#iapedido"))$("#iapedido").focus();observar()}
let obs;
function observar(){if(obs)obs.disconnect();if(S.view!=="viagem"||S.tab!=="roteiro")return;const bs=[...document.querySelectorAll(".tl button")];
  obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const i=+e.target.dataset.i;bs.forEach((b,k)=>b.classList.toggle("on",k===i))}}),{rootMargin:"-20% 0px -65% 0px"});
  document.querySelectorAll(".day").forEach(d=>obs.observe(d))}
function refreshDest(grid=true){$("#rota").innerHTML=rotaHtml();const g=$("#grid"),st=g.scrollTop;g.innerHTML=gridHtml();g.scrollTop=st;$("#cad").outerHTML=caderno()}

/* ---------- ações ---------- */
let timer;
function salvar(){S.save="Salvando...";clearTimeout(timer);timer=setTimeout(async()=>{try{await api("/api/viagens/"+S.trip.id,{method:"PUT",body:JSON.stringify(S.trip)});S.save="✔ Salvo"}
  catch(e){S.save="Não foi possível salvar: "+e.message}const el=$(".save");if(el)el.textContent=S.save},400);const el=$(".save");if(el)el.textContent=S.save}
async function pedirIdeia(){const ia=S.ia,r=S.trip.request,d=S.trip.itinerario.roteiro[ia.d];ia.estado="carregando";render();
  try{const x=await api("/api/ideia",{method:"POST",body:JSON.stringify({destinos:r.destinos,cidade:d.cidade,dia:d.dia,titulo:d.titulo,itens:d.itens,estilo:estiloOf(r.estilo)[1],interesses:r.interesses||[],detalhes:r.detalhes||"",pedido:ia.pedido,evitar:ia.evitar})});
    if(S.ia!==ia)return;ia.ideia=x;ia.evitar.push(x.atividade);ia.estado="resultado"}
  catch(e){if(S.ia!==ia)return;ia.estado="erro";ia.msg=e.message||"Falha de conexão com o servidor."}render()}
function lerPasso(){const p=PASSOS[S.step][1],f=S.f;
  if(p==="datas"){f.inicio=$("#ini").value;f.fim=$("#fim").value}
  if(p==="estilo")f.estilo=(document.querySelector("input[name=estilo]:checked")||{}).value||f.estilo;
  if(p==="interesses")f.interesses=[...document.querySelectorAll("input[name=int]:checked")].map(x=>x.value);
  if(p==="detalhes")f.detalhes=$("#det").value.trim()}
function addDest(n){if(!S.f.destinos.some(d=>norm(d)===norm(n)))S.f.destinos.push(n);S.busca=""}
function mover(i,d){const a=S.f.destinos;[a[i],a[i+d]]=[a[i+d],a[i]]}
function validar(){const p=PASSOS[S.step][1],f=S.f,n=dias(f);
  if(p==="destino"&&!f.destinos.length)return"Escolha pelo menos um destino. 🧭";
  if(p==="datas"){if(!f.inicio||!f.fim)return"Informe a ida e a volta. 📅";if(n<1)return"A volta precisa ser depois da ida.";if(n>60)return"Por enquanto o limite é de 60 dias."}return""}
async function criar(){const f=S.f;S.view="load";render();
  try{S.trip=await api("/api/viagens",{method:"POST",body:JSON.stringify({destinos:f.destinos,dias:dias(f),estilo:estiloOf(f.estilo)[3],origem:"Brasil",data_inicio:f.inicio,data_fim:f.fim,interesses:f.interesses,detalhes:f.detalhes})});
    S.trips.unshift(S.trip);S.view="viagem";S.tab="roteiro";S.save="✔ Salvo";S.f=novo();S.step=0;S.busca="";S.cont="Todos"}
  catch(err){S.view="wizard";S.step=4;S.erro="Não foi possível montar a expedição: "+(err.message||"sem conexão com o servidor")+". Tente de novo."}render()}

document.addEventListener("click",async ev=>{const b=ev.target.closest("[data-act]");if(!b)return;const a=b.dataset.act;
  if(["pick","addlivre","up","down","rmdest"].includes(a)){
    if(a==="pick"){const n=b.dataset.n,d=S.f.destinos,i=d.indexOf(n);i>=0?d.splice(i,1):d.push(n)}
    else if(a==="addlivre")addDest(S.busca.trim());else if(a==="up")mover(+b.dataset.i,-1);else if(a==="down")mover(+b.dataset.i,1);else S.f.destinos.splice(+b.dataset.i,1);
    if(a==="addlivre"){$("#dest").value=""}S.erro="";return refreshDest()}
  if(a==="goto"){const el=document.getElementById("dia-"+b.dataset.d);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});return}
  if(a==="ins"||a==="exemplo"){const t=$("#det"),x=a==="ins"?b.dataset.t:exemplo(),v=t.value;t.value=((v&&!v.endsWith("\n")?v+"\n":v)+x).slice(0,2000);t.focus();$("#cnt").textContent=t.value.length+"/2000";return}
  if(a==="home"){ev.preventDefault();S.view="home";S.adding=null}
  else if(a==="nova"){S.f=novo();S.step=0;S.erro="";S.busca="";S.cont="Todos";S.cod=codigo();S.view="wizard"}
  else if(a==="abrir"){S.trip=S.trips.find(t=>t.id===b.dataset.id);S.view="viagem";S.tab="roteiro";S.save="";S.adding=null;S.ia=null}
  else if(a==="apagar"){const v=S.trips.find(t=>t.id===b.dataset.id);if(!confirm("Excluir a viagem "+v.request.destino+"?"))return;S.trips=S.trips.filter(t=>t!==v);try{await api("/api/viagens/"+v.id,{method:"DELETE"})}catch{}}
  else if(a==="cont")S.cont=b.dataset.c;
  else if(a==="voltar"){if(S.step){lerPasso();S.step--}else S.view="home";S.erro=""}
  else if(a==="proximo"){lerPasso();S.erro=validar();if(!S.erro){if(S.step===4)return criar();S.step++}}
  else if(a==="tab")S.tab=b.dataset.t;else if(a==="addativ"){S.adding=+b.dataset.d;S.ia=null}
  else if(a==="ia"){S.ia={d:+b.dataset.d,estado:"form",pedido:"",evitar:[]};S.adding=null}
  else if(a==="iafechar")S.ia=null;
  else if(a==="iaoutra")return pedirIdeia();
  else if(a==="iaincluir"){S.trip.itinerario.roteiro[S.ia.d].itens.push(S.ia.ideia.atividade);S.ia=null;salvar()}
  else if(a==="irpasso"){lerPasso();S.step=+b.dataset.s;S.erro=""}else if(a==="canceladd")S.adding=null;
  else if(a==="rmativ"){S.trip.itinerario.roteiro[+b.dataset.d].itens.splice(+b.dataset.j,1);salvar()}
  render()});
document.addEventListener("submit",ev=>{const q=ev.target.closest(".iaf");if(q){ev.preventDefault();S.ia.pedido=$("#iapedido").value.trim();if(S.ia.pedido)pedirIdeia();return}
  const f=ev.target.closest(".addf");if(!f)return;ev.preventDefault();const t=$("#novaativ").value.trim();if(!t)return;
  S.trip.itinerario.roteiro[+f.dataset.d].itens.push(t);S.adding=null;salvar();render()});
document.addEventListener("input",ev=>{const id=ev.target.id;
  if(id==="det")$("#cnt").textContent=ev.target.value.length+"/2000";
  if(ev.target.dataset.nota!==undefined){S.trip.itinerario.roteiro[+ev.target.dataset.nota].notas=ev.target.value;salvar()}
  if(id==="dest"){S.busca=ev.target.value;$("#grid").innerHTML=gridHtml()}
  if(id==="ini"||id==="fim"){S.f.inicio=$("#ini").value;S.f.fim=$("#fim").value;if(id==="ini"&&S.f.fim&&S.f.fim<S.f.inicio){S.f.fim="";$("#fim").value=""}$("#fim").min=S.f.inicio;$("#calc").textContent=calcTxt()}});
document.addEventListener("keydown",ev=>{if(ev.key!=="Enter"||ev.target.id!=="dest")return;ev.preventDefault();const q=norm(S.busca);if(!q)return;
  const m=S.paises.filter(p=>(S.cont==="Todos"||p.continente===S.cont)&&norm(p.nome).includes(q));
  const n=m.length===1?m[0].nome:(m.find(p=>norm(p.nome)===q)||{}).nome;
  if(n){if(!S.f.destinos.includes(n))S.f.destinos.push(n);S.busca=""}else addDest(S.busca.trim());ev.target.value="";refreshDest()});

(async()=>{try{[S.paises,S.trips]=await Promise.all([api("/api/paises"),api("/api/viagens")])}catch(e){render();
  $("#app").insertAdjacentHTML("afterbegin",`<div class="warn">Não consegui falar com o servidor. Rode: python -m uvicorn app.main:app --reload --port 8000</div>`);return}render()})();
