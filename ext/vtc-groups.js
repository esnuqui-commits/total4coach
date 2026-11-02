/* VICTOTALCOACH V2 · vtc-groups.js
   Pestaña «Grupos»: grupos de trabajo al azar por número de '+W('jugadoras','jugadores')+' y por posición.
   - Puede leer la plantilla de cualquier equipo de la app (sin copiar ni modificar a las jugadoras)
     o usar listas propias (escritas o importadas desde Excel, Numbers, CSV, TXT o PDF).
   - Solo guarda su configuración en state.vtcGroups (entra en las copias de seguridad).
   - No toca equipos, jugadores ni ningún otro dato. Si falla, el resto de la app no se ve afectado. */
(function(){
'use strict';
try{
function activeTeam(){
  try{
    const st=ST(); if(!st)return null;
    const l=st.vtcGroups&&st.vtcGroups.lists&&st.vtcGroups.lists[st.vtcGroups.cur];
    if(l&&l.teamId){const t=(st.teams||[]).find(x=>x.id===l.teamId);if(t)return t}
    return (st.teams||[]).find(x=>x.id===st.selectedTeam)||null;
  }catch(e){return null}
}
function sportId(){try{const t=activeTeam();return (t&&t.sport)||'handball'}catch(e){return 'handball'}}
function isFemaleTeam(){const t=activeTeam();const s=String((t&&t.sex)||'Femenino');return !/mascul/i.test(s)}
function W(f,m){return isFemaleTeam()?f:m} /* palabra según sexo del equipo */

function POS(){
  const sp=sportId();
  const S=(window.VTC_SPORTS||{});
  if(S[sp]&&Array.isArray(S[sp].positions)&&S[sp].positions.length)return S[sp].positions.slice();
  // Fallbacks por si vtc-sports aún no cargó
  const fem=isFemaleTeam();
  if(sp==='football')return fem
    ? ['Portera','Defensa central','Lateral','Mediocentro','Extremo','Delantera']
    : ['Portero','Defensa central','Lateral','Mediocentro','Extremo','Delantero'];
  if(sp==='basketball')return ['Base','Escolta','Alero','Ala-pívot','Pívot'];
  if(sp==='volleyball')return fem
    ? ['Colocadora','Opuesta','Central','Receptora-atacante','Líbero']
    : ['Colocador','Opuesto','Central','Receptor-atacante','Líbero'];
  // balonmano
  return fem
    ? ['Portera','Extremo Iz','Extremo Dr','Lateral Iz','Lateral Dr','Central','Pivote']
    : ['Portero','Extremo Iz','Extremo Dr','Lateral Iz','Lateral Dr','Central','Pivote'];
}
function GK_LABELS(){return ['Portera','Portero','Portería','Goalkeeper','Portero/a'];}

const COLORS=['#1769aa','#e76f51','#2a9d8f','#c77dff','#e9a800','#d6336c','#6c8e00','#00a6a6'];
const $$=id=>document.getElementById(id);
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ST=()=>(typeof state!=='undefined'?state:null);
const persist=()=>{try{if(typeof save==='function')save()}catch(e){}};
const nh=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const mapPos=s=>{
  s=nh(s); if(!s)return '';
  const list=POS();
  // match against current sport positions first
  for(const p of list){if(nh(p)===s||s.includes(nh(p))||nh(p).includes(s))return p}
  // heuristics
  if(/port|goal/.test(s)){const g=list.find(p=>/port|goal/i.test(p));return g||list[0]||''}
  if(/later|wing|extrem|ala/.test(s)){const g=list.find(p=>/later|wing|extrem|ala|receptor/i.test(p));return g||''}
  if(/central|pivot|pivote|opuest|coloc/.test(s)){const g=list.find(p=>/central|pivot|opuest|coloc/i.test(nh(p)));return g||''}
  if(/libero/.test(s)){const g=list.find(p=>/liber/i.test(p));return g||''}
  return '';
};
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const byN=(a,b)=>a.n-b.n;
const newList=n=>{const comp={};try{POS().forEach((p,i)=>comp[p]=(i===0?0:1))}catch(e){};return{id:'g_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),name:n,teamId:'',sport:(typeof currentSport==='function'?currentSport():'handball'),players:[],comp}};
function currentSport(){
  try{
    if(window.vtcActiveSportFilter)return window.vtcActiveSportFilter;
    const st=ST();const t=(st.teams||[]).find(x=>x.id===st.selectedTeam);
    return (t&&t.sport)||'handball';
  }catch(e){return 'handball'}
}
function listSport(l){
  if(!l)return currentSport();
  if(l.sport)return l.sport;
  if(l.teamId){
    const t=(ST().teams||[]).find(x=>String(x.id)===String(l.teamId));
    if(t)return t.sport||'handball';
  }
  // Listas propias antiguas sin deporte → balonmano (respaldo original)
  return 'handball';
}
function G(){
  const s=ST();
  if(!s.vtcGroups||!Array.isArray(s.vtcGroups.lists))s.vtcGroups={lists:[],cur:0};
  // No borrar listas de otros deportes: solo asegurar que hay al menos una del deporte actual
  return s.vtcGroups;
}
function listsOfSport(){
  const g=G();const sp=currentSport();
  // Etiquetar listas sin sport
  g.lists.forEach(l=>{if(!l.sport)l.sport=listSport(l)});
  return g.lists.filter(l=>listSport(l)===sp);
}
function L(){
  const g=G();const spLists=listsOfSport();
  if(!spLists.length){
    const nl=newList('Lista 1');nl.sport=currentSport();
    g.lists.push(nl);persist();
    return nl;
  }
  // cur apunta a índice global; encontrar lista visible
  let curL=g.lists[g.cur];
  if(!curL||listSport(curL)!==currentSport()){
    const idx=g.lists.findIndex(l=>listSport(l)===currentSport());
    g.cur=idx>=0?idx:g.lists.indexOf(spLists[0]);
    curL=g.lists[g.cur];
  }
  return curL;
}
/* jugadoras de la lista: de un equipo de la app (solo lectura) o propias */
function plist(l){
  if(l.teamId){const t=(ST().teams||[]).find(x=>x.id===l.teamId);return t?(t.players||[]).map(p=>({n:p.name||'Sin nombre',p:mapPos(p.position)})):[]}
  return l.players;
}
let ABS={},RES={},MSG='';
const absOf=l=>ABS[l.id]||(ABS[l.id]={});
const absText=l=>Object.keys(absOf(l)).map(Number).sort((a,b)=>a-b).join(', ');
function parseAbs(t,n){const set={},bad=[];String(t||'').replace(/\s*[-–]\s*/g,'-').split(/[,;\s]+/).forEach(x=>{
  if(!x||/^y$/i.test(x))return;const m=x.match(/^(\d+)-(\d+)$/);
  if(m){let a=+m[1],b=+m[2];if(a>b)[a,b]=[b,a];for(let i=Math.max(a,1);i<=Math.min(b,n);i++)set[i]=1;if(a<1||b>n)bad.push(x)}
  else if(/^\d+$/.test(x)){const v=+x;if(v>=1&&v<=n)set[v]=1;else bad.push(x)}else bad.push(x)});return{set,bad}}

/* ---------- montaje en la barra de pestañas ---------- */
const nav=document.querySelector('nav'),main=document.querySelector('main');
if(!nav||!main||!ST())return;
const btn=document.createElement('button');btn.dataset.page='groups';btn.textContent='👥 Grupos';
btn.onclick=()=>{showPage('groups');render()};nav.appendChild(btn);
const sec=document.createElement('section');sec.id='groups';sec.className='page';main.appendChild(sec);
const css=document.createElement('style');css.textContent=
'#groups .vg-tabs{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px}#groups .vg-tab{flex:none;border:2px solid var(--line);background:#fff;border-radius:999px;padding:7px 15px;font-weight:700}'+
'#groups .vg-tab.on{background:var(--accent);border-color:var(--accent);color:#fff}#groups .vg-row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin-top:10px}'+
'#groups .vg-pl{display:grid;grid-template-columns:2.2em 1fr 9em auto auto;gap:6px;align-items:center;margin-top:6px}#groups .vg-pl.abs input[type=text]{opacity:.5;text-decoration:line-through}'+
'#groups .vg-pl b{color:var(--accent);text-align:right}#groups .vg-pl label{display:flex;gap:4px;align-items:center;margin:0}#groups input[type=checkbox]{width:20px;height:20px}'+
'#groups input[type=number]{width:90px}#groups .vg-x{border:0;background:transparent;font-size:18px;color:var(--muted)}'+
'#groups .vg-groups{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;margin-top:14px}'+
'#groups .vg-g{border:1px solid var(--line);border-left:8px solid var(--c);border-radius:12px;padding:10px 12px;background:#fafcfe}#groups .vg-g h3{margin:0 0 6px}#groups .vg-g ul{margin:0;padding-left:18px}#groups small{color:var(--muted)}'+
'#groups .vg-ok{color:var(--accent);font-weight:700;min-height:1.4em}';
document.head.appendChild(css);

/* ---------- pantalla ---------- */
function render(){
  const g=G(),l=L();
  const allTeams=ST().teams||[];
  const sportOf=t=>(t&&t.sport)?t.sport:'handball';
  const sp=currentSport();
  const teams=allTeams.filter(t=>sportOf(t)===sp);
  const spLists=listsOfSport();
  // Si la lista apunta a un equipo de otro deporte, desvincular
  if(l&&l.teamId){
    const tt=allTeams.find(x=>String(x.id)===String(l.teamId));
    if(!tt||sportOf(tt)!==sp){l.teamId='';}
  }
  const own=!l||!l.teamId;
  const pos=POS();
  if(l){
    l.comp=l.comp||{};
    l.sport=l.sport||sp;
    pos.forEach(p=>{if(l.comp[p]==null)l.comp[p]=0});
    Object.keys(l.comp).forEach(k=>{if(!pos.includes(k))delete l.comp[k]});
  }

  sec.innerHTML=
  '<h2>👥 Grupos de trabajo</h2><p class="muted">Reparto al azar por número de '+W('jugadoras','jugadores')+' y por posición. Puedes usar la plantilla de un equipo de la app o una lista propia.</p>'+
  '<div class="card"><div class="vg-tabs">'+spLists.map(x=>{const i=g.lists.indexOf(x);return '<button type="button" class="vg-tab'+(i===g.cur?' on':'')+'" data-vg="tab" data-i="'+i+'">'+E(x.name)+'</button>'}).join('')+'<button type="button" class="vg-tab" data-vg="add">+ Lista</button></div>'+
  '<div class="vg-row"><div style="flex:1;min-width:200px"><label for="vgNm">Nombre de la lista</label><input id="vgNm" value="'+E(l.name)+'"></div>'+
  '<div style="flex:1;min-width:220px"><label for="vgSrc">'+W('Origen de las jugadoras','Origen de los jugadores')+'</label><select id="vgSrc"><option value="">Lista propia (escrita o importada)</option>'+teams.map(t=>'<option value="'+E(t.id)+'"'+(t.id===l.teamId?' selected':'')+'>Plantilla: '+E(t.name)+'</option>').join('')+'</select></div>'+
  '<button type="button" class="danger" data-vg="del">Eliminar lista</button></div></div>'+
  (own?'<div class="card" style="margin-top:12px"><div class="vg-row" style="margin-top:0"><button type="button" class="primary" data-vg="imp">Importar desde archivo</button><input type="file" id="vgFile" hidden multiple accept=".xlsx,.xls,.ods,.numbers,.csv,.tsv,.txt,.pdf"><span class="muted" id="vgImpMsg">Excel, Numbers, CSV, TXT o PDF (puedes elegir varios)</span>'+
   '<label style="display:flex;gap:6px;align-items:center;margin:0"><input type="checkbox" id="vgMrg" checked> Unir todos los archivos en esta lista</label></div>'+
   '<details style="margin-top:8px" class="muted"><summary>¿Cómo debe ser el archivo?</summary><p>Tabla con columnas '+W('«Jugadora»','«Jugador»')+' (o «Nombre»), opcionalmente «Apellidos», y «Posición». Con una columna «Equipo» y la casilla desmarcada se crean varias listas. En PDF o TXT, '+W('una jugadora por línea','un jugador por línea')+' con su posición (p. ej. «Ana García - Lateral»); el PDF debe tener texto, no ser un escaneo. Las repetidas no se duplican. Los lectores de Excel y PDF se descargan de internet la primera vez.</p></details></div>':'')+
  '<div class="card" style="margin-top:12px">'+
  (own?'<div class="vg-row" style="margin-top:0"><div style="flex:1;min-width:180px"><label for="vgAn">'+W('Nueva jugadora','Nuevo jugador')+'</label><input id="vgAn" placeholder="Nombre"></div><div style="width:170px"><label for="vgAp">Posición</label><select id="vgAp">'+posOpts('')+'</select></div><button type="button" class="primary" data-vg="addp">Añadir</button></div>':
   '<div class="muted">Plantilla leída del equipo. Para añadir o '+W('cambiar jugadoras','cambiar jugadores')+', hazlo en «Plantillas». Aquí puedes marcar ausentes.</div>')+
  '<div class="muted" id="vgCnt" style="margin-top:10px"></div><div id="vgRows"></div></div>'+
  '<div class="card" style="margin-top:12px"><b>Composición de cada grupo</b><div class="vg-row">'+POS().map(p=>'<div><label for="vgC_'+p+'">'+p+'</label><input type="number" min="0" id="vgC_'+p+'" value="'+(l.comp[p]||0)+'"></div>').join('')+'</div><div class="muted" id="vgInfo" style="margin-top:6px"></div>'+
  '<div class="vg-row"><div style="flex:1;min-width:220px"><label for="vgAb">'+W('Números de las ausentes o lesionadas','Números de los ausentes o lesionados')+' (ej. 3, 7, 10-12)</label><input id="vgAb" inputmode="numeric" placeholder="Ninguna/o" value="'+E(absText(l))+'"><div class="muted" id="vgAbInfo"></div></div></div>'+
  '<div class="vg-row"><div><label for="vgGz">'+W('Jugadoras por grupo (si las posiciones están en 0)','Jugadores por grupo (si las posiciones están en 0)')+'</label><input type="number" min="1" id="vgGz" placeholder="Ej. 5"></div><div><label for="vgNg">Nº de grupos</label><input type="number" min="1" id="vgNg" placeholder="Máx."></div>'+
  '<div style="min-width:250px"><label for="vgSb">'+W('Jugadoras sobrantes','Jugadores sobrantes')+'</label><select id="vgSb"><option value="none">Dejarlas sin grupo</option><option value="sup">Añadirlas como suplentes a los grupos</option><option value="ext">Crear grupos extra sin atender a la posición</option></select></div>'+
  '<label style="display:flex;gap:6px;align-items:center;margin:0"><input type="checkbox" id="vgInc"> '+W('Incluir porteras','Incluir porteros')+'</label></div>'+
  '<div class="toolbar"><button type="button" class="primary" data-vg="go">Crear grupos</button><button type="button" class="secondary" data-vg="copy">Copiar</button></div><div class="vg-ok" id="vgMsg" role="status">'+E(MSG)+'</div><div id="vgRes"></div></div>';
  rows();showRes();
}
function posOpts(sel){return '<option value="">Sin posición</option>'+POS().map(p=>'<option'+(p===sel?' selected':'')+'>'+p+'</option>').join('')}
function rows(){
  const l=L(),pl=plist(l),ab=absOf(l),own=!l.teamId;
  $$('vgRows').innerHTML=pl.map((p,i)=>{const n=i+1;return '<div class="vg-pl'+(ab[n]?' abs':'')+'"><b>'+n+'</b>'+
    (own?'<input type="text" class="vg-pn" data-i="'+i+'" value="'+E(p.n)+'" aria-label="Nombre"><select class="vg-pp" data-i="'+i+'" aria-label="Posición">'+posOpts(p.p)+'</select>':
      '<span>'+E(p.n)+'</span><span class="muted">'+(p.p||'Sin posición')+'</span>')+
    '<label><input type="checkbox" class="vg-pa" data-n="'+n+'"'+(ab[n]?' checked':'')+'> Ausente</label>'+(own?'<button type="button" class="vg-x" data-del="'+i+'" aria-label="Quitar">✕</button>':'<span></span>')+'</div>'}).join('');
  info();
}
function info(){
  const l=L(),pl=plist(l),pa=parseAbs(absText(l),pl.length),k=Object.keys(pa.set).length,N=pl.length,pr={};let np=0;
  POS().forEach(p=>pr[p]=0);pl.forEach((p,i)=>{if(pa.set[i+1])return;if(pr[p.p]!=null)pr[p.p]++;else np++});
  $$('vgCnt').textContent=N+' '+W('jugadora','jugador')+(N===1?'':'es')+' · Participan '+(N-k)+(k?' ('+k+' '+W('ausente','ausente')+(k>1?'s':'')+')':'')+' · '+POS().map(p=>p+': '+pr[p]).join(', ')+(np?' · Sin posición: '+np:'');
  let tot=0,max=0;const nd={};POS().forEach(p=>{nd[p]=l.comp[p]||0;tot+=nd[p]});
  for(let g=1;g<=N;g++){let def=0,sur=np;POS().forEach(p=>{const d=nd[p]*g-pr[p];if((GK_LABELS().some(g=>nh(g)===nh(p))||/port|goal/i.test(p))){if(d>0)def=1e9;return}if(d>0)def+=d;else sur+=-d});if(tot&&def<=sur)max=g;else break}
  $$('vgInfo').textContent=tot?'Grupos de '+tot+' '+W('jugadoras','jugadores')+'. Con '+W('las presentes','los presentes')+', completando huecos con '+W('otras jugadoras','otros jugadores')+' (sin '+W('porteras','porteros')+'), se pueden formar '+max+' grupo'+(max===1?'':'s')+'.':
    'Con todas las posiciones en 0, se formarán grupos al azar con las jugadoras por grupo que indiques abajo (sin porteras).';
  $$('vgAbInfo').textContent=pa.bad.length?'No válidos: '+pa.bad.join(', '):'';
}
function card(h,m,c){return '<div class="vg-g" style="--c:'+c+'"><h3>'+h+' <small>('+m.length+')</small></h3><ul>'+m.map(o=>'<li>'+o.n+'. '+E(o.s)+' <small>'+(o.sup?'suplente · ':'')+o.p+(o.cov?' · cubre '+o.cov.toLowerCase():'')+'</small></li>').join('')+'</ul></div>'}
function showRes(){
  const r=$$('vgRes'),g=RES[L().id];if(!g){r.innerHTML='<p class="muted">Pulsa «Crear grupos» para repartir a las jugadoras.</p>';return}
  const all=g.gs.concat(g.ex||[]);
  r.innerHTML='<div class="vg-groups">'+all.map((m,i)=>card('Grupo '+(i+1)+(i>=g.gs.length?' (extra)':''),m,COLORS[i%COLORS.length])).join('')+(g.left.length?card('Sin grupo',g.left,'#8a8a8a'):'')+'</div>';
}
function say(t){MSG=t;const e=$$('vgMsg');if(e)e.textContent=t}

/* ---------- reparto ---------- */
function make(){
  const l=L(),pl=plist(l),ab=parseAbs(absText(l),pl.length).set,inc=$$('vgInc').checked,mode=$$('vgSb').value,want=parseInt($$('vgNg').value,10)||0;
  const need={};let tot=0;POS().forEach(p=>{need[p]=l.comp[p]||0;tot+=need[p]});
  const present=[];pl.forEach((x,i)=>{if(!ab[i+1])present.push({n:i+1,s:x.n,p:x.p||'Sin posición',raw:x.p})});
  if(!pl.length){say('No hay jugadoras en esta lista.');return}
  let gs=[],extra=[],left=[];
  if(!tot){
    const sz=parseInt($$('vgGz').value,10)||0;if(sz<1){say('Indica cuántas jugadoras por grupo, o cuántas de cada posición.');return}
    let all=shuffle(present.filter(o=>inc||!GK_LABELS().some(g=>nh(g)===nh(o.raw||''))&&!/port|goal/i.test(o.raw||'')));const gk=present.filter(o=>!inc&&(GK_LABELS().some(g=>nh(g)===nh(o.raw||''))||/port|goal/i.test(o.raw||'')));
    let ng=Math.floor(all.length/sz);if(want>0)ng=Math.min(ng,want);
    if(ng<1){say('No hay jugadoras suficientes para un grupo de '+sz+'.');return}
    for(let a=0;a<ng;a++)gs.push(all.splice(0,sz).sort(byN));
    if(mode==='sup'){all.forEach((o,i)=>{o.sup=true;gs[i%gs.length].push(o)});all=[]}
    left=all.concat(gk);
  }else{
    const pool={};POS().forEach(p=>pool[p]=[]);const np=[];
    present.forEach(o=>{if(pool[o.raw])pool[o.raw].push(o);else np.push(o)});
    const feas=g=>{let def=0,sur=np.length;POS().forEach(p=>{const d=need[p]*g-pool[p].length;if((GK_LABELS().some(g=>nh(g)===nh(p))||/port|goal/i.test(p))){if(d>0)def=1e9;else if(inc)sur+=-d;return}if(d>0)def+=d;else sur+=-d});return def<=sur};
    let max=0;for(let q=1;q<=pl.length;q++){if(feas(q))max=q;else break}
    if(max<1){say(W('No hay jugadoras suficientes para formar un grupo, ni completando huecos con otras posiciones (sin porteras).','No hay jugadores suficientes para formar un grupo, ni completando huecos con otras posiciones (sin porteros).'));return}
    const ng=want>0?Math.min(want,max):max;
    POS().forEach(p=>pool[p]=shuffle(pool[p]));
    for(let g=0;g<ng;g++)gs.push([]);
    const holes=[];POS().forEach(p=>{for(let j=0;j<need[p];j++)gs.forEach((m,gi)=>{const o=pool[p].pop();if(o)m.push(o);else holes.push({g:gi,p})})});
    let rest=[],gk=[];POS().forEach(p=>pool[p].forEach(o=>((GK_LABELS().some(g=>nh(g)===nh(p))||/port|goal/i.test(p))&&!inc?gk:rest).push(o)));
    np.forEach(o=>rest.push(o));rest=shuffle(rest);
    holes.forEach(h=>{const o=rest.pop();if(o){o.cov=h.p;gs[h.g].push(o)}});
    if(mode==='sup'){rest.forEach((o,i)=>{o.sup=true;gs[i%gs.length].push(o)});rest=[]}
    else if(mode==='ext'){while(rest.length>=tot){const m=[];for(let j=0;j<tot;j++)m.push(rest.pop());extra.push(m.sort(byN))}}
    left=rest.concat(gk);
  }
  left.sort(byN);RES[l.id]={gs,ex:extra,left};showRes();
  const n=gs.length+extra.length;say(n+' grupo'+(n===1?'':'s')+' creado'+(n===1?'':'s')+(left.length?'; '+left.length+' sin grupo.':'.'));
}

/* ---------- importación ---------- */
const HW=/^(jugadoras?|nombres?|apellidos?|posici[oó]n|equipo|dorsal|n[º°o.]*|n[úu]mero|listado|relaci[oó]n|de|plantilla)$/i;
const cell=(r,i)=>i>=0&&r[i]!=null?String(r[i]).trim():'';
function rowsToLists(rows,def){
  rows=rows.filter(r=>r&&r.some(c=>String(c==null?'':c).trim()!==''));const out={};if(!rows.length)return out;
  let ti=-1,ni=-1,ai=-1,pi=-1,st=1;
  rows[0].map(nh).forEach((h,i)=>{if(ti<0&&/^(equipo|categoria|clase|grupo)/.test(h))ti=i;else if(pi<0&&/^(posicion|puesto)/.test(h))pi=i;else if(ni<0&&/^(jugadora|jugador|nombre|alumn)/.test(h))ni=i;else if(ai<0&&/^apellido/.test(h))ai=i});
  if(ni<0&&ai<0){st=0;ni=0;if(pi<0&&rows[0].length>=2)pi=1}
  let last='';for(let i=st;i<rows.length;i++){const r=rows[i],a=cell(r,ai),n=cell(r,ni),s=a&&n?a+', '+n:(a||n);if(!s)continue;
    const t=cell(r,ti)||last||def;last=t;(out[t]=out[t]||[]).push({n:s,p:mapPos(cell(r,pi))})}
  return out}
function linesToLists(lines,def){
  const out={};let t=def;
  lines.forEach(l=>{l=l.replace(/\s+/g,' ').trim();if(!l)return;
    const m=l.match(/^(equipo|categor[ií]a)\s*[:\-]\s*(.+)$/i);if(m){t=m[2].trim();return}
    const p=mapPos(l);let s=l.replace(/\b(portera|portero|lateral(es)?|central|extremos?|pivote|pivot)(\s+(izquierd[oa]|derech[oa]|izq\.?|dcha?\.?|der\.?))?/ig,' ');
    s=s.replace(/^\s*\d+\s*[.)\-–:]?\s+/,'').replace(/\s+\d+\s*$/,'').replace(/[\s,;:|\-–()\/]+$/,'').replace(/^[\s,;:|\-–()\/]+/,'').replace(/\s+/g,' ').trim();
    if(!s||!/[a-záéíóúñ]/i.test(s))return;
    if(s.split(' ').every(w=>HW.test(w)))return;
    (out[t]=out[t]||[]).push({n:s,p})});
  return out}
function parseCSV(t){t=t.replace(/^\uFEFF/,'');const ls=t.split(/\r?\n/),f=ls[0]||'';let d=';',best=0;[';',',','\t'].forEach(x=>{const n=f.split(x).length;if(n>best){best=n;d=x}});
  return ls.map(line=>{const o=[];let cur='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(ch===d&&!q){o.push(cur);cur=''}else cur+=ch}o.push(cur);return o})}
const loaded={};
function lib(src,test){if(test())return Promise.resolve();return loaded[src]||(loaded[src]=new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>{delete loaded[src];rej(new Error('red'))};document.head.appendChild(s)}))}
const XL='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',PJ='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',PW='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let ERR=[];
function readOne(f){return new Promise(res=>{
  const ext=(f.name.split('.').pop()||'').toLowerCase(),base=f.name.replace(/\.[^.]+$/,''),fr=new FileReader();
  const ok=m=>res(m),fail=t=>{ERR.push(f.name+': '+t);res({})};
  if(['xlsx','xls','xlsm','ods','numbers'].includes(ext)){
    lib(XL,()=>typeof XLSX!=='undefined').then(()=>{fr.onload=()=>{try{const wb=XLSX.read(fr.result,{type:'array'}),map={};
      wb.SheetNames.forEach(n=>{const m=rowsToLists(XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''}),wb.SheetNames.length>1?n:base);Object.keys(m).forEach(k=>(map[k]=map[k]||[]).push(...m[k]))});ok(map)}catch(e){fail('no se pudo leer.')}};fr.readAsArrayBuffer(f)})
      .catch(()=>fail('no se pudo descargar el lector de Excel (¿sin conexión?).'))}
  else if(ext==='csv'||ext==='tsv'){fr.onload=()=>{try{ok(rowsToLists(parseCSV(fr.result),base))}catch(e){fail('no se pudo leer.')}};fr.readAsText(f)}
  else if(ext==='txt'){fr.onload=()=>{try{ok(linesToLists(fr.result.split(/\r?\n/),base))}catch(e){fail('no se pudo leer.')}};fr.readAsText(f)}
  else if(ext==='pdf'){
    lib(PJ,()=>typeof pdfjsLib!=='undefined').then(()=>{pdfjsLib.GlobalWorkerOptions.workerSrc=PW;
      fr.onload=()=>{pdfjsLib.getDocument({data:new Uint8Array(fr.result)}).promise.then(async doc=>{
        const lines=[];for(let n=1;n<=doc.numPages;n++){const tc=await(await doc.getPage(n)).getTextContent(),ys={};
          tc.items.forEach(it=>{const y=Math.round(it.transform[5]/3)*3;(ys[y]=ys[y]||[]).push(it)});
          Object.keys(ys).map(Number).sort((a,b)=>b-a).forEach(y=>{const t=ys[y].sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ').replace(/\s+/g,' ').trim();if(t)lines.push(t)})}
        ok(linesToLists(lines,base))}).catch(()=>fail('no se pudo leer el PDF (¿es un escaneo?).'))};fr.readAsArrayBuffer(f)})
      .catch(()=>fail('no se pudo descargar el lector de PDF (¿sin conexión?).'))}
  else fail('formato no admitido.')})}
function impMsg(t){const e=$$('vgImpMsg');if(e)e.textContent=t}
async function readFiles(files){
  ERR=[];impMsg('Leyendo…');const maps=[];for(const f of files)maps.push(await readOne(f));
  const g=G(),cur=L(),mg=$$('vgMrg')&&$$('vgMrg').checked,all={};
  maps.forEach(m=>Object.keys(m).forEach(k=>{const key=mg?cur.name:k;(all[key]=all[key]||[]).push(...m[k])}));
  const keys=Object.keys(all);if(!keys.length){impMsg(W('No se encontraron jugadoras. ','No se encontraron jugadores. ')+ERR.join(' '));return}
  let ns=0,first=null;
  keys.forEach(name=>{let t=mg?cur:g.lists.find(x=>!x.teamId&&x.name===name);
    if(!t){t=newList(name);if(g.lists.length===1&&!g.lists[0].players.length&&!g.lists[0].teamId&&g.lists[0].name==='Lista 1')g.lists[0]=t;else g.lists.push(t)}
    if(!first)first=t;
    all[name].forEach(o=>{const e=t.players.find(x=>x.n===o.n);if(!e){t.players.push(o);ns++}else if(!e.p&&o.p)e.p=o.p})});
  g.cur=Math.max(0,g.lists.indexOf(first));persist();render();
  impMsg('Importado: '+ns+' '+W('jugadora','jugador')+(ns===1?'':'es')+' en '+keys.length+' lista'+(keys.length===1?'':'s')+'.'+(ERR.length?' Avisos: '+ERR.join(' '):''));
}

/* ---------- eventos ---------- */
sec.addEventListener('click',e=>{
  const el=e.target,a=el.dataset&&el.dataset.vg,g=G(),l=L();
  if(a==='tab'){g.cur=+el.dataset.i;persist();render()}
  else if(a==='add'){g.lists.push(newList('Lista '+(g.lists.length+1)));g.cur=g.lists.length-1;persist();render()}
  else if(a==='del'){if(g.lists.length<2){say('Debe quedar al menos una lista.');return}
    if(confirm('¿Eliminar la lista «'+l.name+'»? (No se borra ningún equipo ni jugador de la app.)')){g.lists.splice(g.cur,1);g.cur=0;persist();render()}}
  else if(a==='imp')$$('vgFile').click();
  else if(a==='addp'){const n=$$('vgAn').value.trim();if(!n){say('Escribe el nombre.');return}l.players.push({n,p:$$('vgAp').value});persist();$$('vgAn').value='';rows();$$('vgAn').focus()}
  else if(a==='go')make();
  else if(a==='copy'){const r=RES[l.id];if(!r){say('Aún no hay grupos.');return}
    const tx=l.name+'\n'+r.gs.concat(r.ex||[]).map((m,k)=>'Grupo '+(k+1)+': '+m.map(o=>o.n+'. '+o.s+' ('+(o.sup?'suplente, ':'')+o.p+(o.cov?', cubre '+o.cov.toLowerCase():'')+')').join(', ')).join('\n');
    (navigator.clipboard?navigator.clipboard.writeText(tx).then(()=>say('Copiado.'),()=>say('No se pudo copiar.')):say('No se pudo copiar.'))}
  else if(el.dataset&&el.dataset.del!=null){l.players.splice(+el.dataset.del,1);ABS[l.id]={};$$('vgAb').value='';persist();rows()}
});
sec.addEventListener('input',e=>{
  const el=e.target,l=L(),i=el.id;
  if(i==='vgNm'){l.name=el.value||'Lista';persist();const tb=sec.querySelector('.vg-tab.on');if(tb)tb.textContent=l.name}
  else if(i==='vgAb'){ABS[l.id]=parseAbs(el.value,plist(l).length).set;rows()}
  else if(el.classList.contains('vg-pn')){l.players[+el.dataset.i].n=el.value;persist()}
  else if(i&&i.indexOf('vgC_')===0){l.comp[i.slice(4)]=Math.max(0,parseInt(el.value,10)||0);persist();info()}
});
sec.addEventListener('change',e=>{
  const el=e.target,l=L();
  if(el.id==='vgFile'&&el.files[0]){readFiles(Array.from(el.files));el.value=''}
  else if(el.id==='vgSrc'){l.teamId=el.value;ABS[l.id]={};RES[l.id]=null;persist();render()}
  else if(el.classList.contains('vg-pp')){l.players[+el.dataset.i].p=el.value;persist();info()}
  else if(el.classList.contains('vg-pa')){const s=absOf(l);if(el.checked)s[el.dataset.n]=1;else delete s[el.dataset.n];$$('vgAb').value=absText(l);rows()}
});
}catch(e){console.error('Pestaña Grupos: fallo al cargar el módulo, el resto de la app no se ve afectado.',e)}
})();
