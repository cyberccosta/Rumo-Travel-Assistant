/* Navegação principal. Só "Planejar Expedição" está completa; as demais são estrutura inicial (em desenvolvimento). */
const SECOES=[
 {id:"planejar",nome:"Planejar Expedição"},
 {id:"preparacao",nome:"Preparação",icone:"🎒",lead:"Tudo o que você resolve antes de partir, num só lugar.",
  vem:["Checklists e documentos da expedição","Regras de entrada e vistos do destino","Reservas e confirmações organizadas"]},
 {id:"emviagem",nome:"Em viagem",icone:"📍",lead:"O braço direito do viajante quando a expedição já começou.",
  vem:["O roteiro do dia à mão, mesmo no improviso","Mapas, rotas e deslocamentos","Gastos e anotações durante a viagem"]},
 {id:"recordar",nome:"Recordar",icone:"📓",lead:"Para reviver cada expedição depois que você volta.",
  vem:["Diário de bordo e fotos de cada viagem","Histórico das expedições realizadas","Balanço do que foi planejado e do que aconteceu"]},
 {id:"conta",nome:"Minha conta",icone:"👤",lead:"Seu perfil de viajante.",
  vem:["Seus dados e preferências de viagem","Suas expedições salvas","Configurações do Rumo"]}];
const LOGO=`<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M16 6l4.5 10L16 26l-4.5-10z" fill="#FF8A2B"/><circle cx="16" cy="16" r="2" fill="#fff"/></svg>`;
const secaoDoHash=()=>{const id=location.hash.replace(/^#\//,"");return SECOES.some(s=>s.id===id)?id:"planejar"};
function irSecao(id){if(S.secao!==id){S.secao=id;history.pushState(null,"","#/"+id)}scrollTo(0,0)}
function renderTopo(){$("#topo").innerHTML=`<div class="top-in"><a href="#/planejar" class="logo" data-act="home" aria-label="Rumo, início">${LOGO}<span>Rumo</span><small>braço direito do viajante</small></a>
  <nav class="mnav" aria-label="Principal">${SECOES.map(s=>`<a href="#/${s.id}" data-act="secao" data-s="${s.id}"${s.id==="conta"?' class="conta"':""}${S.secao===s.id?' aria-current="page"':""}>${s.nome}</a>`).join("")}</nav></div>`}
const secaoHtml=id=>{const s=SECOES.find(x=>x.id===id);
  return `<section class="soon"><div class="soon-ic" aria-hidden="true">${s.icone}</div><span class="tag dev">Em desenvolvimento</span><h2>${s.nome}</h2><p class="lead">${s.lead}</p>
  <p class="mut">Esta área ainda está sendo construída e não tem funções ativas por enquanto. O planejamento da expedição já está disponível.</p>
  <div class="vem"><h3>O que vai viver aqui</h3><ul>${s.vem.map(x=>`<li>${x}</li>`).join("")}</ul></div>
  <button class="btn" data-act="secao" data-s="planejar">Ir para Planejar Expedição</button></section>`};
addEventListener("hashchange",()=>{S.secao=secaoDoHash();render();scrollTo(0,0)});
