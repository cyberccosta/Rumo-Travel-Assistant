/* Utilidades compartilhadas (carregado antes dos demais scripts). */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const brl=n=>n==null?"indisponível":n.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
