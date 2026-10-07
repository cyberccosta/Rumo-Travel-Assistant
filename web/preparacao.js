/* Preparação (v1.4): tudo o que o viajante resolve antes de partir. Cada expedição vira um cartão com contagem regressiva
   e cinco módulos: checklist, documentos, regras de entrada e vistos, reservas e finanças.
   Tudo é informado ou anexado manualmente (sem IA). Finanças só em R$ (BRL) por enquanto.
   Os dados ficam em `viagem.preparacao` e seguem o mesmo caminho de salvamento do roteiro (salvar() em app.js).
   Depende de util.js, secoes.js, abas.js (real, GRUPOS) e app.js (S, flag, estiloOf, rangeTxt, longa, salvar, render), todos lidos só na hora de desenhar. */

const PTABS=[["checklist","✅ Checklist"],["documentos","📄 Documentos"],["regras","🌐 Regras e vistos"],["reservas","🎫 Reservas"],["financas","💰 Finanças"]];
const TIPOS_DOC=[["passaporte","🛂","Passaporte"],["visto","📑","Visto"],["identidade","🆔","Documento de identidade"],["seguro","🛡️","Seguro viagem"],["vacina","💉","Vacinação"],["habilitacao","🚗","Habilitação ou PID"],["comprovante","🧾","Comprovante"],["outro","📄","Outro"]];
const TIPOS_RES=[["voo","✈️","Voo"],["onibus","🚌","Ônibus, trem ou barco"],["hospedagem","🏨","Hospedagem"],["passeio","🎟️","Passeio ou ingresso"],["outro","📌","Outro"]];
const STATUS_RES=[["a_reservar","A reservar"],["reservada","Reservada"],["paga","Paga"]];
/* mesma ordem de GRUPOS (abas.js), para poder comparar com a estimativa do Rumo */
const CATS=[["transporte","✈️ Transporte"],["hospedagem","🛏️ Hospedagem"],["alimentacao","🍽️ Alimentação"],["passeios","🎟️ Passeios e experiências"],["outros","🧾 Outros"],["reserva","🛟 Reserva / emergência"]];
const CAT_DA_RESERVA={voo:"transporte",onibus:"transporte",hospedagem:"hospedagem",passeio:"passeios",outro:"outros"};
const ASSUNTOS=["Visto","Estadia máxima","Validade do passaporte","Vacinas e certificados","Seguro obrigatório","Passagem de saída","Comprovante de recursos","Taxa de entrada","Formulário de imigração"];
const LIMITE_ANEXO=8*1024*1024;

/* ---------- estado e utilidades ---------- */
const prepVazio=()=>({id:null,tab:"checklist",form:null,filtro:"todas",foco:null,aviso:""});
function prepDoHash(){const[s,id,tab]=partesHash(),p=prepVazio();if(s==="preparacao"&&id){p.id=id;if(PTABS.some(t=>t[0]===tab))p.tab=tab}return p}
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-3);
function P(v){const p=v.preparacao||(v.preparacao={});["checklist","documentos","regras","reservas"].forEach(k=>{p[k]||=[]});
  const f=p.financeiro||(p.financeiro={});f.lancamentos||=[];f.guardado_brl??=0;f.meta_brl??=null;return p}
const soma=(a,f)=>a.reduce((s,x)=>s+(f(x)||0),0);
const rs=n=>(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:Number.isInteger(n||0)?0:2,maximumFractionDigits:2});
const nIn=n=>n?n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}):"";
function parseBRL(t){t=String(t||"").replace(/[^\d.,-]/g,"");if(!t)return null;
  if(t.includes(","))t=t.replace(/\./g,"").replace(",",".");else if(/^\d{1,3}(\.\d{3})+$/.test(t))t=t.replace(/\./g,"");
  const n=parseFloat(t);return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:null}
const urlOk=u=>/^https?:\/\/\S+$/i.test(u||"");
const tam=b=>b<1024?b+" B":b<1048576?Math.round(b/1024)+" KB":(b/1048576).toFixed(1).replace(".",",")+" MB";
const opts=(arr,sel)=>arr.map(([v,l])=>`<option value="${esc(v)}"${v===sel?" selected":""}>${esc(l)}</option>`).join("");
const hojeZero=()=>{const h=new Date();h.setHours(0,0,0,0);return h};
const pluralN=(n,a,b)=>`${n} ${n===1?a:b}`;

/* ---------- contagem regressiva ---------- */
function contagem(r){if(!r.data_inicio)return null;const h=hojeZero(),ini=new Date(r.data_inicio+"T00:00:00"),fim=new Date((r.data_fim||r.data_inicio)+"T00:00:00");
  const n=Math.round((ini-h)/864e5),f=Math.round((fim-h)/864e5);
  if(n>1)return{cls:"",html:`<small>faltam</small><b>${n}</b><small>dias</small>`,txt:`Faltam ${n} dias para a partida`};
  if(n===1)return{cls:"",html:`<small>falta</small><b>1</b><small>dia</small>`,txt:"Falta 1 dia: a partida é amanhã"};
  if(n===0)return{cls:"hoje",html:`<b class="sm">Hoje!</b><small>partida</small>`,txt:"A partida é hoje"};
  if(f>=0){const tot=Math.round((fim-ini)/864e5)+1;return{cls:"agora",html:`<small>dia</small><b>${-n+1}</b><small>de ${tot}</small>`,txt:`Em viagem: dia ${-n+1} de ${tot}`}}
  return{cls:"fim",html:`<b class="sm">Volta feita</b><small>expedição</small>`,txt:"Expedição concluída"}}
const selo=c=>c?`<div class="selo ${c.cls}" role="img" aria-label="${esc(c.txt)}">${c.html}</div>`:"";

/* ---------- números das finanças (R$) ---------- */
function totais(v){const p=P(v),f=p.financeiro,res=soma(p.reservas,r=>r.valor_brl),lan=soma(f.lancamentos,l=>l.valor_brl),guardado=f.guardado_brl||0;
  const pago=soma(p.reservas.filter(r=>r.status==="paga"),r=>r.valor_brl)+soma(f.lancamentos.filter(l=>l.pago),l=>l.valor_brl);
  return{res,lan,pago,guardado,meta:f.meta_brl||null,previsto:res+lan,saldo:guardado-(res+lan)}}
function porCategoria(v){const p=P(v),m=Object.fromEntries(CATS.map(c=>[c[0],0]));
  p.reservas.forEach(r=>{const k=CAT_DA_RESERVA[r.tipo]||"outros";m[k]+=r.valor_brl||0});
  p.financeiro.lancamentos.forEach(l=>{m[m[l.categoria]===undefined?"outros":l.categoria]+=l.valor_brl||0});return m}
const estimativaCat=(v,i)=>{const pc=(v.custos&&v.custos.por_categoria)||{};return GRUPOS[i][1].reduce((s,k)=>s+(pc[k]||0),0)};

/* ---------- navegação interna ---------- */
function abrirPrep(id,tab){S.prep={...prepVazio(),id,tab:tab||"checklist"};S.secao="preparacao";history.pushState(null,"",`#/preparacao/${id}/${S.prep.tab}`);render();scrollTo(0,0)}
const anexoUrl=(vid,a)=>`/api/viagens/${encodeURIComponent(vid)}/anexos/${encodeURIComponent(a.id)}`;
const linkAnexo=(v,a)=>a?`<a href="${anexoUrl(v.id,a)}" target="_blank" rel="noopener">📎 ${esc(a.nome)} (${tam(a.tamanho||0)})</a>`:"";
async function subirAnexo(vid,file){const r=await fetch(`/api/viagens/${encodeURIComponent(vid)}/anexos`,{method:"POST",headers:{"Content-Type":file.type||"application/octet-stream","X-Nome":encodeURIComponent(file.name)},body:file});
  if(!r.ok){let m="Erro "+r.status;try{m=(await r.json()).detail||m}catch{}throw new Error(m)}return r.json()}
const apagarAnexo=(vid,a)=>a?fetch(anexoUrl(vid,a),{method:"DELETE"}).catch(()=>{}):null;

/* ---------- lista de expedições (cartões) ---------- */
function mod(v,tab,titulo,txt,frac,wide){return `<button class="mod${wide?" wide":""}" data-p="abrir" data-id="${esc(v.id)}" data-tab="${tab}"><b>${titulo}</b><small>${txt}</small>${frac==null?"":`<span class="mini" aria-hidden="true"><i style="width:${Math.round(Math.min(1,frac)*100)}%"></i></span>`}</button>`}
function cartao(v,i){const r=v.request,p=P(v),t=totais(v),ck=p.checklist.length,okc=p.checklist.filter(x=>x.feito).length,nr=p.regras.length,okr=p.regras.filter(x=>x.resolvido).length,
    pend=p.reservas.filter(x=>x.status==="a_reservar").length,nd=p.documentos.length,nres=p.reservas.length;
  const fin=t.meta?`${rs(t.guardado)} de ${rs(t.meta)}`:t.guardado>0?`${rs(t.guardado)} guardados`:"defina seu orçamento";
  return `<article class="pcard" style="--i:${i}"><div class="pcard-top"><div><h3>${rotaTxt(r.destinos)}</h3><span class="pmeta">📅 ${esc(rangeTxt(r))}</span><span class="pmeta">${estiloOf(r.estilo)[4]} ${esc(estiloOf(r.estilo)[1])} · ${r.dias} dias</span></div>${selo(contagem(r))}</div>
  <div class="mods">${mod(v,"checklist","✅ Checklist",ck?`${okc} de ${ck} prontos`:"nenhum item ainda",ck?okc/ck:null)}
  ${mod(v,"documentos","📄 Documentos",nd?pluralN(nd,"documento","documentos"):"nenhum ainda")}
  ${mod(v,"regras","🌐 Regras e vistos",nr?`${okr} de ${nr} resolvidas`:"nenhuma anotada",nr?okr/nr:null)}
  ${mod(v,"reservas","🎫 Reservas",nres?pluralN(nres,"reserva","reservas")+(pend?` · ${pend} a reservar`:""):"nenhuma ainda")}
  ${mod(v,"financas","💰 Finanças",fin,t.meta?t.guardado/t.meta:null,true)}</div>
  <button class="ghost" data-p="editar" data-id="${esc(v.id)}">✏️ Editar roteiro</button>
  <button class="ghost danger" data-p="excluir" data-id="${esc(v.id)}">🗑️ Excluir roteiro</button></article>`}
function prepLista(){const t=S.trips;
  return `<div class="ptit"><h2>Preparação</h2><span class="hand">um passo de cada vez</span></div>
  <p class="plead">Tudo o que você resolve antes de partir, expedição por expedição: checklist, documentos, regras de entrada, reservas e o dinheiro da viagem. Você anota e anexa, e o Rumo mantém tudo no mesmo lugar.</p>
  ${t.length?`<div class="pgrid">${t.map(cartao).join("")}</div>`
  :`<div class="empty">Você ainda não tem expedições para preparar. Planeje a primeira e ela aparece aqui. 🏕️<br><br><button class="btn" data-p="nova">+ nova viagem</button></div>`}
  <p class="small">As viagens e os anexos ficam salvos enquanto o servidor estiver ligado.</p>`}

/* ---------- expedição aberta ---------- */
const PT={};
function prepViagem(v){const r=v.request;
  return `<button class="back" data-p="lista">← Minhas expedições</button>
  <div class="vh prep"><div class="info"><small class="nb">Preparação · Nº ${esc((v.id||"").slice(0,4).toUpperCase())}</small><h2>${rotaTxt(r.destinos)}</h2>
  <p>📅 ${esc(rangeTxt(r))} · ${estiloOf(r.estilo)[4]} ${esc(estiloOf(r.estilo)[1])} · ${r.dias} dias</p><p class="save" role="status">${esc(S.save)}</p>
  <div class="acoes"><button class="ghost" data-p="editar" data-id="${esc(v.id)}">✏️ Editar roteiro</button><button class="ghost danger" data-p="excluir" data-id="${esc(v.id)}">🗑️ Excluir roteiro</button></div></div>${selo(contagem(r))}</div>
  <div class="tabs" role="tablist">${PTABS.map(([k,n])=>`<button role="tab" aria-selected="${k===S.prep.tab}" data-p="tab" data-t="${k}">${n}</button>`).join("")}</div>
  <div>${PT[S.prep.tab](v)}</div>`}
function prepHtml(){const v=S.prep.id&&S.trips.find(t=>t.id===S.prep.id);return v?prepViagem(v):prepLista()}
const cabecalho=(t,sub,botao)=>`<div class="mh"><div><h3>${t}</h3>${sub?`<p class="sub">${sub}</p>`:""}</div>${botao||""}</div>`;
const botaoForm=(f,txt)=>S.prep.form===f?"":`<button class="pbtn" data-p="abrirform" data-f="${f}">${txt}</button>`;
const botoesForm=txt=>`<p class="erro" role="alert"></p><div class="acts2 full"><button class="btn">${txt}</button><button type="button" class="ghost" data-p="fechar">Cancelar</button></div>`;

/* checklist */
PT.checklist=v=>{const p=P(v),L=p.checklist,f=L.filter(x=>x.feito).length,sug=(v.itinerario&&v.itinerario.checklist)||[],pode=!p.sugestoes_importadas&&sug.length>0;
  return cabecalho("Checklist","O que levar e o que resolver antes de partir.",pode?`<button class="pbtn" data-p="importar">＋ Trazer ${pluralN(sug.length,"sugestão","sugestões")} do roteiro</button>`:"")+
  (L.length?`<div class="prog"><div class="bar" role="progressbar" aria-label="Itens prontos" aria-valuemin="0" aria-valuemax="${L.length}" aria-valuenow="${f}"><i style="width:${f/L.length*100}%"></i></div><b>${f}/${L.length}</b></div>`:"")+
  `<form class="paddf" data-pform="check"><input type="text" id="p-foco" name="texto" maxlength="200" placeholder="Ex.: Comprar adaptador de tomada" aria-label="Novo item do checklist" required><button class="btn">Adicionar</button></form>`+
  (L.length?`<div class="lista">${L.map(x=>`<div class="it${x.feito?" feito":""}"><input class="ck2" type="checkbox" data-pchk="${esc(x.id)}"${x.feito?" checked":""} aria-label="${esc(x.texto)}"><div class="corpo"><b>${esc(x.texto)}</b></div><button class="x" data-p="rmcheck" data-id="${esc(x.id)}" aria-label="Excluir item: ${esc(x.texto)}">×</button></div>`).join("")}</div>`
  :`<div class="empty">Seu checklist está vazio. Adicione o primeiro item acima${pode?" ou traga as sugestões do roteiro":""}. 🎒</div>`)};

/* documentos */
function avisoValidade(d,r){if(!d.validade)return null;const h=hojeZero(),val=new Date(d.validade+"T00:00:00"),fim=new Date((r.data_fim||r.data_inicio||d.validade)+"T00:00:00");
  if(val<h)return["alerta","Vencido"];if(val<fim)return["alerta","Vence antes do fim da viagem"];
  if(d.tipo==="passaporte"){const lim=new Date(fim);lim.setMonth(lim.getMonth()+6);if(val<lim)return["alerta","Vence menos de 6 meses após a volta: confira a exigência do destino"]}
  return["ok","Válido durante a viagem"]}
PT.documentos=v=>{const p=P(v),D=p.documentos,aberto=S.prep.form==="doc";
  return cabecalho("Documentos","Registre o que precisa levar e anexe uma cópia, se quiser.",botaoForm("doc","＋ Adicionar documento"))+
  `<div class="dica">🔒 Por enquanto os arquivos ficam só no computador que roda o Rumo e são apagados quando o servidor reinicia. Anexe apenas o que for útil ter à mão.</div>`+
  (aberto?`<form class="pf" data-pform="doc"><label class="full">Nome do documento<input type="text" id="p-foco" name="nome" maxlength="200" required placeholder="Ex.: Passaporte, Seguro viagem"></label>
  <label>Tipo<select name="tipo">${opts(TIPOS_DOC.map(t=>[t[0],`${t[1]} ${t[2]}`]),"outro")}</select></label>
  <label>Validade <small>(opcional)</small><input type="date" name="validade"></label>
  <label class="full">Observação <small>(opcional)</small><input type="text" name="nota" maxlength="500" placeholder="Onde está guardado, número da apólice..."></label>
  <label class="full">Anexo <small>(opcional, até 8 MB)</small><input type="file" name="arquivo"></label>${botoesForm("Salvar documento")}</form>`:"")+
  (D.length?`<div class="lista">${D.map(d=>{const t=TIPOS_DOC.find(x=>x[0]===d.tipo)||TIPOS_DOC[7],a=avisoValidade(d,v.request);
    return `<div class="it"><div class="ic" aria-hidden="true">${t[1]}</div><div class="corpo"><b>${esc(d.nome)}</b><div class="meta"><span class="tag neutro">${t[2]}</span>${d.validade?`<span>Validade: ${esc(longa(d.validade))}</span>`:""}${a?`<span class="tag ${a[0]}">${a[1]}</span>`:""}${d.anexo?linkAnexo(v,d.anexo):`<span>sem anexo</span>`}</div>${d.nota?`<p class="nt">${esc(d.nota)}</p>`:""}</div><button class="x" data-p="rmdoc" data-id="${esc(d.id)}" aria-label="Excluir documento: ${esc(d.nome)}">×</button></div>`}).join("")}</div>`
  :aberto?"":`<div class="empty">Nenhum documento registrado ainda. Passaporte, seguro viagem e vacinas costumam ser os primeiros. 🛂</div>`)};

/* regras de entrada e vistos */
PT.regras=v=>{const p=P(v),R=p.regras,aberto=S.prep.form==="regra",ds=v.request.destinos||[];
  const ordem=[...ds,...R.map(x=>x.pais).filter(x=>x&&!ds.includes(x)),""],grupos=[...new Set(ordem)].filter(g=>R.some(x=>x.pais===g));
  return cabecalho("Regras de entrada e vistos","Anote o que cada país exige e acompanhe o que já resolveu.",botaoForm("regra","＋ Anotar regra"))+
  `<div class="dica">⚠️ As regras mudam. Confira sempre no site oficial do governo ou do consulado do país e anote aqui o que encontrar. O Rumo não verifica essas informações.</div>`+
  (aberto?`<form class="pf" data-pform="regra"><label>País<select name="pais">${opts([...ds.map(d=>[d,d]),["","Geral / outro"]],ds[0]||"")}</select></label>
  <label>Assunto<input type="text" id="p-foco" name="assunto" list="p-assuntos" maxlength="120" required placeholder="Ex.: Visto, Estadia máxima"><datalist id="p-assuntos">${ASSUNTOS.map(a=>`<option value="${esc(a)}">`).join("")}</datalist></label>
  <label class="full">O que você descobriu<textarea name="detalhes" maxlength="1500" placeholder="Prazo, taxa, documentos exigidos, onde solicitar..."></textarea></label>
  <label class="full">Link da fonte oficial <small>(opcional)</small><input type="url" name="link" maxlength="500" placeholder="https://..."></label>
  <label class="chk full"><input type="checkbox" name="resolvido"> Já resolvi isso</label>${botoesForm("Salvar regra")}</form>`:"")+
  (R.length?grupos.map(g=>`<h4 class="pais-g">${g?flag(g)+" "+esc(g):"🌍 Geral"}</h4><div class="lista pgl">${R.filter(x=>x.pais===g).map(x=>
    `<div class="it${x.resolvido?" feito":""}"><input class="ck2" type="checkbox" data-prok="${esc(x.id)}"${x.resolvido?" checked":""} aria-label="Resolvido: ${esc(x.assunto)}"><div class="corpo"><b>${esc(x.assunto)}</b>
    <div class="meta"><span class="tag ${x.resolvido?"ok":"alerta"}">${x.resolvido?"Resolvido":"A resolver"}</span>${urlOk(x.link)?`<a href="${esc(x.link)}" target="_blank" rel="noopener noreferrer">🔗 Fonte oficial</a>`:""}</div>${x.detalhes?`<p class="nt">${esc(x.detalhes)}</p>`:""}</div>
    <button class="x" data-p="rmregra" data-id="${esc(x.id)}" aria-label="Excluir regra: ${esc(x.assunto)}">×</button></div>`).join("")}</div>`).join("")
  :aberto?"":`<div class="empty">Nenhuma regra anotada ainda. Comece pelo visto e pelo tempo máximo de estadia de cada país da rota. 🌐</div>`)};

/* reservas */
const dataRes=r=>r.data?(r.data_fim&&r.data_fim!==r.data?`${longa(r.data)} → ${longa(r.data_fim)}`:longa(r.data)):"";
PT.reservas=v=>{const p=P(v),Rs=p.reservas,aberto=S.prep.form==="reserva",fl=S.prep.filtro,
    lista=Rs.filter(r=>fl==="todas"||r.tipo===fl).sort((a,b)=>(a.data||"9999").localeCompare(b.data||"9999")),
    comValor=Rs.filter(r=>r.valor_brl),t=totais(v);
  return cabecalho("Reservas","Voos, ônibus, hospedagens, passeios e o que mais você já fechou.",botaoForm("reserva","＋ Adicionar reserva"))+
  (aberto?`<form class="pf" data-pform="reserva"><label>Tipo<select name="tipo">${opts(TIPOS_RES.map(t=>[t[0],`${t[1]} ${t[2]}`]),"voo")}</select></label>
  <label class="full">Título<input type="text" id="p-foco" name="titulo" maxlength="200" required placeholder="Ex.: Voo São Paulo → Lima, Hostel no centro"></label>
  <label>Data <small>(início)</small><input type="date" name="data"></label><label>Até <small>(opcional)</small><input type="date" name="data_fim"></label>
  <label>Código da reserva <small>(opcional)</small><input type="text" name="codigo" maxlength="80"></label>
  <label>Valor <small>(opcional)</small><span class="rs"><span>R$</span><input type="text" name="valor" inputmode="decimal" placeholder="0,00"></span></label>
  <label>Situação<select name="status">${opts(STATUS_RES,"reservada")}</select></label>
  <label class="full">Observação <small>(opcional)</small><input type="text" name="nota" maxlength="500" placeholder="Horário, endereço, política de cancelamento..."></label>
  <label class="full">Comprovante <small>(opcional, até 8 MB)</small><input type="file" name="arquivo"></label>${botoesForm("Salvar reserva")}</form>`:"")+
  (Rs.length?`<div class="conts" role="group" aria-label="Filtrar por tipo"><button type="button" data-p="filtro" data-f="todas" aria-pressed="${fl==="todas"}">Todas (${Rs.length})</button>${TIPOS_RES.filter(x=>Rs.some(r=>r.tipo===x[0])).map(x=>`<button type="button" data-p="filtro" data-f="${x[0]}" aria-pressed="${fl===x[0]}">${x[1]} ${x[2]} (${Rs.filter(r=>r.tipo===x[0]).length})</button>`).join("")}</div>`:"")+
  (comValor.length?`<div class="auto"><span>Total das reservas com valor: <b>${rs(t.res)}</b> · pagas: <b>${rs(soma(Rs.filter(r=>r.status==="paga"),r=>r.valor_brl))}</b></span><span class="mut">entra sozinho nas Finanças</span></div>`:"")+
  (lista.length?`<div class="lista">${lista.map(r=>{const t=TIPOS_RES.find(x=>x[0]===r.tipo)||TIPOS_RES[4];
    return `<div class="it"><div class="ic" aria-hidden="true">${t[1]}</div><div class="corpo"><b>${esc(r.titulo)}</b><div class="meta"><span class="tag neutro">${t[2]}</span>${r.data?`<span>📅 ${esc(dataRes(r))}</span>`:""}${r.codigo?`<span>🔑 ${esc(r.codigo)}</span>`:""}
    <select data-pst="${esc(r.id)}" aria-label="Situação da reserva: ${esc(r.titulo)}">${opts(STATUS_RES,r.status)}</select>${r.anexo?linkAnexo(v,r.anexo):""}</div>${r.nota?`<p class="nt">${esc(r.nota)}</p>`:""}</div>
    ${r.valor_brl?`<span class="valor">${rs(r.valor_brl)}</span>`:""}<button class="x" data-p="rmres" data-id="${esc(r.id)}" aria-label="Excluir reserva: ${esc(r.titulo)}">×</button></div>`}).join("")}</div>`
  :aberto?"":Rs.length?`<div class="empty">Nenhuma reserva deste tipo.</div>`:`<div class="empty">Nenhuma reserva ainda. Guarde aqui voos, ônibus, hospedagens e passeios, com código e comprovante. 🎫</div>`)};

/* finanças (só R$) */
const campoRs=(nome,val,rotulo)=>`<span class="rs"><span>R$</span><input type="text" inputmode="decimal" data-pfin="${nome}" value="${nIn(val)}" placeholder="0,00" aria-label="${rotulo}"></span>`;
PT.financas=v=>{const p=P(v),f=p.financeiro,t=totais(v),aberto=S.prep.form==="lancamento",est=v.custos?Math.round(v.custos.total_brl):0,pct=t.meta?Math.round(t.guardado/t.meta*100):0,
    cat=porCategoria(v),linhas=CATS.map((c,i)=>[c,cat[c[0]],estimativaCat(v,i)]).filter(x=>x[1]>0||x[2]>0),mx=Math.max(...linhas.map(x=>Math.max(x[1],x[2])),1);
  return cabecalho("Finanças da viagem","Tudo em reais (R$). Outras moedas e conversão chegam em versões futuras.")+
  `${S.prep.aviso?`<p class="erro-fin" role="alert">${esc(S.prep.aviso)}</p>`:""}
  <div class="dinheiro-in"><label>Quanto já tenho guardado${campoRs("guardado",f.guardado_brl,"Quanto já tenho guardado, em reais")}</label>
  <label>Orçamento da viagem (meta)${campoRs("meta",f.meta_brl,"Orçamento da viagem, em reais")}${est&&est!==f.meta_brl?`<button class="sugere" data-p="usarestimativa">Usar a estimativa do Rumo (${rs(est)} por pessoa)</button>`:""}</label></div>
  ${t.meta?`<div class="card"><div class="legenda"><span>Guardado <b>${rs(t.guardado)}</b> de ${rs(t.meta)}</span><b>${pct}%</b></div><div class="pbig${pct>=100?" cheia":""}" role="progressbar" aria-label="Quanto da meta já foi guardado" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100,pct)}"><i style="width:${Math.min(100,pct)}%"></i></div>
  <div class="legenda"><span>${t.guardado>=t.meta?"Meta batida! 🎉":`Faltam ${rs(t.meta-t.guardado)} para a meta`}</span></div></div>`:`<div class="dica">Informe o orçamento da viagem para acompanhar quanto falta guardar.</div>`}
  <div class="fin-grid"><div class="kpi"><small>Previsto</small><b>${rs(t.previsto)}</b><em>reservas + outros gastos</em></div><div class="kpi"><small>Já pago</small><b>${rs(t.pago)}</b><em>${t.previsto?Math.round(t.pago/t.previsto*100):0}% do previsto</em></div>
  <div class="kpi${t.saldo<0?" neg":""}"><small>Saldo</small><b>${rs(t.saldo)}</b><em>${t.saldo<0?"previsto passa do guardado":"guardado menos previsto"}</em></div></div>
  ${linhas.length?`<div class="card"><h4>Por categoria</h4>${linhas.map(([c,prev,e])=>`<div class="grp"><div class="grow"><span>${c[1]}</span><b>${rs(prev)}</b></div><div class="bar"><i style="width:${prev/mx*100}%"></i></div>${e?`<small class="mut">Estimativa do Rumo: ${rs(Math.round(e))} por pessoa</small>`:""}</div>`).join("")}</div>`:""}
  <div class="auto"><span>🎫 Reservas com valor: <b>${rs(t.res)}</b> (somadas sozinhas)</span><button class="sugere" data-p="abrir" data-id="${esc(v.id)}" data-tab="reservas">Ver reservas</button></div>
  ${cabecalho("Outros gastos previstos","O que não é reserva: alimentação, seguro, passeios no destino...",botaoForm("lancamento","＋ Adicionar gasto"))}
  ${aberto?`<form class="pf" data-pform="lancamento"><label class="full">Descrição<input type="text" id="p-foco" name="descricao" maxlength="200" required placeholder="Ex.: Alimentação no Peru, Seguro viagem"></label>
  <label>Categoria<select name="categoria">${opts(CATS,"outros")}</select></label><label>Valor<span class="rs"><span>R$</span><input type="text" name="valor" inputmode="decimal" placeholder="0,00" required></span></label>
  <label class="chk full"><input type="checkbox" name="pago"> Já paguei</label>${botoesForm("Salvar gasto")}</form>`:""}
  ${f.lancamentos.length?`<div class="lista">${f.lancamentos.map(l=>{const c=CATS.find(x=>x[0]===l.categoria)||CATS[4];
    return `<div class="it"><div class="ic" aria-hidden="true">${c[1].split(" ")[0]}</div><div class="corpo"><b>${esc(l.descricao)}</b><div class="meta"><span class="tag neutro">${c[1].split(" ").slice(1).join(" ")}</span><label class="chk"><input type="checkbox" data-plpago="${esc(l.id)}"${l.pago?" checked":""}> pago</label></div></div>
    <span class="valor">${rs(l.valor_brl)}</span><button class="x" data-p="rmlan" data-id="${esc(l.id)}" aria-label="Excluir gasto: ${esc(l.descricao)}">×</button></div>`}).join("")}</div>`:aberto?"":`<div class="empty">Nenhum gasto lançado. Use esta lista para o que não é reserva. 💸</div>`}`};

/* ---------- ações ---------- */
const viagemAtual=()=>S.trips.find(t=>t.id===S.prep.id);
const sem=(lista,id)=>{const i=lista.findIndex(x=>x.id===id);return i>=0?lista.splice(i,1)[0]:null};
function aposMudar(v,foco){if(foco)S.prep.foco=foco;salvar(v);render()}
function prepPos(){if(S.secao!=="preparacao"||!S.prep.foco)return;const el=document.getElementById(S.prep.foco);S.prep.foco=null;if(el)el.focus()}

document.addEventListener("click",async ev=>{const b=ev.target.closest("[data-p]");if(!b)return;const a=b.dataset.p,v=viagemAtual();
  if(a==="excluir"){const t=S.trips.find(x=>x.id===b.dataset.id);return t&&abrirExcluir(t,b)}
  if(a==="cancelarexcluir")return fecharModal();
  if(a==="confirmarexcluir")return excluirViagem(b);
  if(a==="lista"){S.prep=prepVazio();history.pushState(null,"","#/preparacao");render();return scrollTo(0,0)}
  if(a==="abrir")return abrirPrep(b.dataset.id||S.prep.id,b.dataset.tab);
  if(a==="preparar")return abrirPrep(S.trip.id,"checklist");
  if(a==="voltarprep")return abrirPrep(S.trip.id,S.prep.id===S.trip.id?S.prep.tab:"checklist");
  if(a==="editar"){const t=S.trips.find(x=>x.id===b.dataset.id);if(!t)return;S.trip=t;S.view="viagem";S.tab="roteiro";S.save="";S.adding=null;S.ia=null;S.editData=null;S.dePrep=true;irSecao("planejar");return render()}
  if(a==="nova"){iniciarNova();irSecao("planejar");return render()}
  if(a==="tab"){S.prep.tab=b.dataset.t;S.prep.form=null;S.prep.aviso="";if(v)history.replaceState(null,"",`#/preparacao/${v.id}/${S.prep.tab}`);return render()}
  if(!v)return;const p=P(v);
  if(a==="abrirform"){S.prep.form=b.dataset.f;S.prep.foco="p-foco"}
  else if(a==="fechar")S.prep.form=null;
  else if(a==="filtro")S.prep.filtro=b.dataset.f;
  else if(a==="rmcheck"){sem(p.checklist,b.dataset.id);return aposMudar(v)}
  else if(a==="rmlan"){sem(p.financeiro.lancamentos,b.dataset.id);return aposMudar(v)}
  else if(a==="rmdoc"||a==="rmregra"||a==="rmres"){const lista=a==="rmdoc"?p.documentos:a==="rmregra"?p.regras:p.reservas,x=lista.find(i=>i.id===b.dataset.id);if(!x)return;
    if(!confirm("Excluir "+(x.nome||x.assunto||x.titulo)+"?"))return;sem(lista,x.id);apagarAnexo(v.id,x.anexo);return aposMudar(v)}
  else if(a==="importar"){const tem=new Set(p.checklist.map(x=>norm(x.texto)));
    (v.itinerario.checklist||[]).forEach(t=>{if(!tem.has(norm(t))){p.checklist.push({id:uid(),texto:String(t).slice(0,200),feito:false});tem.add(norm(t))}});p.sugestoes_importadas=true;return aposMudar(v)}
  else if(a==="usarestimativa"){p.financeiro.meta_brl=Math.round(v.custos.total_brl);S.prep.aviso="";return aposMudar(v)}
  render()});

document.addEventListener("change",ev=>{const el=ev.target;if(!el.matches("[data-pchk],[data-prok],[data-plpago],[data-pst],[data-pfin]"))return;const v=viagemAtual();if(!v)return;const p=P(v),d=el.dataset;
  if(d.pchk!==undefined){const x=p.checklist.find(i=>i.id===d.pchk);if(x)x.feito=el.checked}
  else if(d.prok!==undefined){const x=p.regras.find(i=>i.id===d.prok);if(x)x.resolvido=el.checked}
  else if(d.plpago!==undefined){const x=p.financeiro.lancamentos.find(i=>i.id===d.plpago);if(x)x.pago=el.checked}
  else if(d.pst!==undefined){const x=p.reservas.find(i=>i.id===d.pst);if(x)x.status=el.value}
  else if(d.pfin!==undefined){const n=el.value.trim()?parseBRL(el.value):(d.pfin==="meta"?null:0);
    if(n===null&&el.value.trim()){S.prep.aviso="Valor inválido. Use apenas números, como 2.500,00.";return render()}
    p.financeiro[d.pfin==="meta"?"meta_brl":"guardado_brl"]=n;S.prep.aviso=""}
  aposMudar(v)});

document.addEventListener("submit",async ev=>{const f=ev.target.closest("[data-pform]");if(!f)return;ev.preventDefault();const v=viagemAtual();if(!v)return;
  const p=P(v),k=f.dataset.pform,d=Object.fromEntries(new FormData(f)),txt=n=>String(d[n]||"").trim(),
    erro=m=>{const e=f.querySelector(".erro");if(e)e.textContent=m};
  if(k==="check"){if(!txt("texto"))return;p.checklist.push({id:uid(),texto:txt("texto").slice(0,200),feito:false});return aposMudar(v,"p-foco")}
  if(k==="lancamento"){const val=parseBRL(d.valor);if(!txt("descricao"))return erro("Descreva o gasto.");if(val===null)return erro("Valor inválido. Use apenas números, como 250,00.");
    p.financeiro.lancamentos.push({id:uid(),categoria:d.categoria||"outros",descricao:txt("descricao").slice(0,200),valor_brl:val,pago:!!d.pago});S.prep.form=null;return aposMudar(v)}
  if(k==="regra"){if(!txt("assunto"))return erro("Informe o assunto, como Visto ou Estadia máxima.");if(txt("link")&&!urlOk(txt("link")))return erro("O link precisa começar com http:// ou https://");
    p.regras.push({id:uid(),pais:d.pais||"",assunto:txt("assunto").slice(0,120),detalhes:txt("detalhes").slice(0,1500),link:txt("link").slice(0,500),resolvido:!!d.resolvido});S.prep.form=null;return aposMudar(v)}
  /* documento e reserva podem levar um arquivo: o envio vem antes de guardar a referência */
  const arq=d.arquivo&&d.arquivo.size?d.arquivo:null;let val=null;
  if(k==="doc"){if(!txt("nome"))return erro("Dê um nome ao documento.")}
  else{if(!txt("titulo"))return erro("Dê um título à reserva.");if(txt("valor")){val=parseBRL(d.valor);if(val===null)return erro("Valor inválido. Use apenas números, como 1.250,90.")}
    if(d.data&&d.data_fim&&d.data_fim<d.data)return erro("A data final precisa ser depois da inicial.")}
  if(arq&&arq.size>LIMITE_ANEXO)return erro("O arquivo passa de 8 MB.");
  const btn=f.querySelector(".btn"),rot=btn.textContent;btn.disabled=true;btn.textContent=arq?"Enviando…":"Salvando…";
  try{const anexo=arq?await subirAnexo(v.id,arq):null;
    if(k==="doc")p.documentos.push({id:uid(),nome:txt("nome").slice(0,200),tipo:d.tipo||"outro",validade:d.validade||null,nota:txt("nota").slice(0,500),anexo});
    else p.reservas.push({id:uid(),tipo:d.tipo||"outro",titulo:txt("titulo").slice(0,200),data:d.data||null,data_fim:d.data_fim||null,codigo:txt("codigo").slice(0,80),valor_brl:val,status:d.status||"reservada",nota:txt("nota").slice(0,500),anexo})}
  catch(e){btn.disabled=false;btn.textContent=rot;return erro("Não consegui enviar o arquivo: "+(e.message||"sem conexão com o servidor"))}
  S.prep.form=null;aposMudar(v)});

/* ---------- excluir roteiro (confirmação amigável, ação permanente) ---------- */
let modalEl=null,modalFoco=null;
function fecharModal(){if(!modalEl||modalEl.dataset.ocupado)return;modalEl.remove();modalEl=null;document.body.classList.remove("sem-rolagem");if(modalFoco&&modalFoco.isConnected)modalFoco.focus();modalFoco=null}
function avisar(t){const el=document.createElement("div");el.className="toast";el.setAttribute("role","status");el.textContent=t;document.body.appendChild(el);setTimeout(()=>el.remove(),4500)}
function abrirExcluir(v,origem){modalFoco=origem||null;if(modalEl){modalEl.remove();modalEl=null}
  const r=v.request,el=document.createElement("div");el.className="modal-fundo";el.dataset.id=v.id;
  el.innerHTML=`<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="m-tit" aria-describedby="m-txt"><div class="m-ic" aria-hidden="true">🧭</div>
  <h3 id="m-tit">Tem certeza que vai deixar essa expedição incrível de lado?</h3>
  <p id="m-txt"><b>${rotaTxt(r.destinos)}</b><br><span class="mut">${esc(rangeTxt(r))} · ${r.dias} dias</span></p>
  <p class="m-aviso">⚠️ <b>Excluir é permanente.</b> Não dá para desfazer nem recuperar depois: o roteiro, o checklist, os documentos e anexos, as reservas, as finanças, o diário, os gastos e os registros desta expedição serão apagados.</p>
  <p class="erro" role="alert"></p>
  <div class="m-btns"><button class="btn" data-p="cancelarexcluir">Voltar para a expedição</button><button class="ghost danger" data-p="confirmarexcluir">Excluir para sempre</button></div></div>`;
  document.body.appendChild(el);document.body.classList.add("sem-rolagem");modalEl=el;el.querySelector('[data-p="cancelarexcluir"]').focus()}
async function excluirViagem(btn){const m=modalEl;if(!m)return;const id=m.dataset.id,btns=[...m.querySelectorAll("button")],err=m.querySelector(".erro");
  m.dataset.ocupado="1";btns.forEach(x=>x.disabled=true);btn.textContent="Excluindo…";err.textContent="";clearTimeout(timers[id]); /* um salvamento pendente não pode ressuscitar a viagem */
  try{await api("/api/viagens/"+encodeURIComponent(id),{method:"DELETE"})}
  catch(e){delete m.dataset.ocupado;btns.forEach(x=>x.disabled=false);btn.textContent="Excluir para sempre";err.textContent="Não consegui excluir agora ("+(e.message||"sem conexão com o servidor")+"). Sua expedição continua salva.";return}
  S.trips=S.trips.filter(t=>t.id!==id);if(S.trip&&S.trip.id===id){S.trip=null;S.view="home"}if(S.vi.id===id)S.vi=evVazio();S.dePrep=false;
  S.prep=prepVazio();history.replaceState(null,"","#/preparacao");delete m.dataset.ocupado;modalFoco=null;fecharModal();render();scrollTo(0,0);avisar("Expedição excluída. Boas rotas pela frente! 🧭")}
document.addEventListener("keydown",ev=>{if(!modalEl)return;
  if(ev.key==="Escape"){ev.preventDefault();return fecharModal()}
  if(ev.key==="Tab"){const f=[...modalEl.querySelectorAll("button:not(:disabled)")];if(!f.length)return;const i=f.indexOf(document.activeElement);
    if(ev.shiftKey&&i<=0){ev.preventDefault();f[f.length-1].focus()}else if(!ev.shiftKey&&(i<0||i===f.length-1)){ev.preventDefault();f[0].focus()}}});
document.addEventListener("click",ev=>{if(modalEl&&ev.target===modalEl)fecharModal()});
