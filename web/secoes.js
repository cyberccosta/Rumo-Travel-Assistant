/* Navegação principal. "Planejar Expedição", "Preparação" e "Em viagem" estão completas; as demais são estrutura inicial (em desenvolvimento). */
const SECOES=[
 {id:"planejar",nome:"Planejar Expedição"},
 {id:"preparacao",nome:"Preparação"},
 {id:"emviagem",nome:"Em viagem"},
 {id:"recordar",nome:"Recordar",icone:"📓",lead:"Para reviver cada expedição depois que você volta.",
  vem:["Diário de bordo e fotos de cada viagem","Histórico das expedições realizadas","Balanço do que foi planejado e do que aconteceu"]},
 {id:"conta",nome:"Minha conta",icone:"👤",lead:"Seu perfil de viajante.",
  vem:["Seus dados e preferências de viagem","Suas expedições salvas","Configurações do Rumo"]}];
const LOGO=`<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="2.5"/><g class="agulha"><path d="M16 6l4.5 10L16 26l-4.5-10z" fill="#FF8A2B"/></g><circle cx="16" cy="16" r="2" fill="#fff"/></svg>`;
/* Seta-trilha usada entre destinos: pontos que viram seta, como um caminho no mapa. */
const SETA=`<svg class="seta" viewBox="0 0 28 12" aria-hidden="true"><path d="M1.5 6h19" stroke-dasharray="0.1 5"/><path d="M20 1.5L26 6l-6 4.5"/></svg><span class="sr"> e depois </span>`;
const rotaTxt=a=>(a||[]).map(esc).join(SETA);
const partesHash=()=>location.hash.replace(/^#\//,"").split("/");
const secaoDoHash=()=>{const id=partesHash()[0];return SECOES.some(s=>s.id===id)?id:"planejar"};
function irSecao(id){if(S.secao!==id){S.secao=id;history.pushState(null,"","#/"+id)}scrollTo(0,0)}
function renderTopo(){$("#topo").innerHTML=`<div class="top-in"><a href="#/planejar" class="logo" data-act="home" aria-label="Rumo, início">${LOGO}<span>Rumo</span><small>braço direito do viajante</small></a>
  <nav class="mnav" aria-label="Principal">${SECOES.map(s=>`<a href="#/${s.id}" data-act="secao" data-s="${s.id}"${s.id==="conta"?' class="conta"':""}${S.secao===s.id?' aria-current="page"':""}>${s.nome}</a>`).join("")}</nav></div>`}
const secaoHtml=id=>{const s=SECOES.find(x=>x.id===id);
  return `<section class="soon"><div class="soon-ic" aria-hidden="true">${s.icone}</div><span class="tag dev">Em desenvolvimento</span><h2>${s.nome}</h2><p class="lead">${s.lead}</p>
  <p class="mut">Esta área ainda está sendo construída e não tem funções ativas por enquanto. O planejamento da expedição já está disponível.</p>
  <div class="vem"><h3>O que vai viver aqui</h3><ul>${s.vem.map(x=>`<li>${x}</li>`).join("")}</ul></div>
  <button class="btn" data-act="secao" data-s="planejar">Ir para Planejar Expedição</button></section>`};
addEventListener("hashchange",()=>{S.secao=secaoDoHash();S.prep=prepDoHash();S.vi=evDoHash();render();scrollTo(0,0)});
