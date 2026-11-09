/* VICTOTALCOACH V2 · vtc-pdf.js  (v1.0)
   PDF con las miniaturas que YA tiene la aplicación:
     1) Plantilla con fotografías (dorsal, nombre y apellidos, posición)
     2) Ejercicios (imagen, pizarra y toda la ficha)
     3) Sistemas de juego (categorías > subcategorías > acciones, con su imagen/pizarra)
     4) Grupos de trabajo (lista seleccionada, un grupo concreto, o todas las listas)
   Reglas de este módulo:
   - SOLO LECTURA: no escribe en el estado, ni en IndexedDB, ni en localStorage.
   - No sustituye ninguna función existente (printRosterPDF, printSelectedExercisePDF, etc. siguen igual).
   - No busca imágenes fuera de la app y no inventa ninguna. Si una miniatura falta, el PDF lo indica
     en el propio documento (sección «Incidencias») y en la consola del navegador.
   - Las imágenes se imprimen sin deformar (object-fit) y a la mayor resolución almacenada.
   - Si falla, el resto de la aplicación no se ve afectado. */
(function(){
'use strict';
try{

/* ===================== utilidades ===================== */
const ST=()=>(typeof state!=='undefined'?state:null);
const $$=id=>document.getElementById(id);
const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BR=v=>E(v).replace(/\r?\n/g,'<br>');
const T=v=>String(v==null?'':v).trim();
const norm=s=>T(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
function club(){try{return JSON.parse(localStorage.getItem('hc_club_header_v1')||'{}')||{}}catch(e){return{}}}
function sportName(id){const S=window.VTC_SPORTS||{};return (S[id]||S.handball||{name:'Balonmano'}).name}
function activeSport(){const s=ST(),t=s&&(s.teams||[]).find(x=>x.id===s.selectedTeam);return window.vtcActiveSportFilter||(t&&t.sport)||'handball'}
function ageNames(ids){const a=(ST()&&ST().vtcAgeRanges)||[];return (ids||[]).map(i=>{const x=a.find(y=>y.id===i);return x?x.name:''}).filter(Boolean)}
function assoc(e){
  if(typeof exerciseAssociations==='function'){try{return exerciseAssociations(e)}catch(x){}}
  const a=Array.isArray(e&&e.categories)&&e.categories.length?e.categories:[{category:(e&&e.category)||'Otros',subcategory:(e&&e.subcategory)||'General'}];
  return a.filter(x=>x&&x.category);
}
function toast(m,ms){if(typeof window.vtcToast==='function')window.vtcToast(m,ms||4000);else alert(m)}

/* ---- imágenes: lectura de la base de datos de la app (solo lectura) ---- */
function rawGetMedia(key){
  if(typeof getMedia==='function')return getMedia(key);
  return new Promise((res,rej)=>{const r=indexedDB.open('handball_coach_media_v1');
    r.onsuccess=()=>{try{const q=r.result.transaction('media').objectStore('media').get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)}catch(e){rej(e)}};
    r.onerror=()=>rej(r.error)});
}
function blobToDataURL(b){return new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=()=>rej(f.error);f.readAsDataURL(b)})}
let cache=new Map();
async function imgByKey(key){
  if(!key)return null;
  if(cache.has(key))return cache.get(key);
  let r;
  try{
    const b=await rawGetMedia(key);
    if(!b)r={err:'no está en el almacén de imágenes de la aplicación'};
    else if(!b.size)r={err:'el archivo guardado está vacío'};
    else r={url:await blobToDataURL(b)};
  }catch(e){r={err:'error al leerla ('+(e&&e.message||e)+')'}}
  cache.set(key,r);return r;
}

/* ---- documento imprimible ---- */
const CSS=`@page{size:A4 portrait;margin:12mm}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;line-height:1.3;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{padding:0}
.noprint{padding:10px 0 14px}.noprint button{padding:9px 16px;font:600 14px Arial;border-radius:8px;border:1px solid #888;background:#f3f4f6;cursor:pointer}
@media print{.noprint{display:none!important}}
.head{display:flex;gap:12px;align-items:center;border-bottom:2px solid #222;padding-bottom:8px;margin-bottom:12px}
.head img{width:56px;height:56px;object-fit:contain}
.head h1{margin:0 0 2px;font-size:17pt}.head .sub{font-size:9.5pt;color:#333}
h2{font-size:13pt;margin:14px 0 6px}h3{font-size:11.5pt;margin:10px 0 5px}
.muted{color:#555;font-size:9pt}
table{width:100%;border-collapse:collapse;margin:6px 0 12px}th,td{border:1px solid #bbb;padding:5px 7px;text-align:left;font-size:9.5pt;vertical-align:middle}th{background:#eaf2fb}
/* plantilla */
.pl-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px}
.pl{border:1px solid #999;border-radius:4px;padding:5px;text-align:center;break-inside:avoid;page-break-inside:avoid}
.ph{position:relative;width:100%;aspect-ratio:4/5;background:#f1f5f9;border:1px solid #ddd;overflow:hidden;display:flex;align-items:center;justify-content:center}
.ph img{width:100%;height:100%;object-fit:cover;object-position:center;display:block}
.ph .none{font-size:8pt;color:#666;padding:4px}
.dorsal{position:absolute;left:3px;top:3px;min-width:23px;height:23px;border-radius:12px;background:#111;color:#fff;font-weight:bold;font-size:10.5pt;display:flex;align-items:center;justify-content:center;padding:0 6px}
.pn{font-weight:bold;font-size:9.5pt;margin-top:4px;word-break:break-word}.pp{font-size:8.5pt;color:#444;margin-top:1px}
.coach-ph{width:34px;height:34px;object-fit:cover;vertical-align:middle;margin-right:6px;border:1px solid #ccc}
/* plantilla compacta (V2.1.0): tabla de filas con foto pequeña uniforme */
@page{@bottom-center{content:counter(page) " / " counter(pages);font:8pt Arial;color:#666}}
.rt{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;margin:6px 0 10px;border-top:3px solid #0f2a4a}
.rt thead{display:table-header-group}
.rt th{background:#0f2a4a;color:#fff;font-size:8pt;text-transform:uppercase;letter-spacing:.06em;padding:5px 8px;text-align:left;border:0;font-weight:bold}
.rt td{border:0;border-bottom:1px solid #d3dae4;padding:1.4mm 8px;height:16mm;vertical-align:middle;font-size:10.5pt}
.rt tbody tr{break-inside:avoid;page-break-inside:avoid}
.rt tbody tr:nth-child(even) td{background:#f1f5fa}
.rt .c-ph{width:19mm;text-align:center;padding-left:4px;padding-right:4px}.rt .c-no{width:21mm;text-align:center}.rt .c-ps{width:46mm}
.rt .ph2{width:11mm;height:14mm;margin:0 auto;background:#e6ebf2;border:1px solid #b9c3d1;border-radius:1.2mm;overflow:hidden;display:flex;align-items:center;justify-content:center}
.rt .ph2 img{width:100%;height:100%;object-fit:cover;object-position:50% 18%;display:block}
.rt .ph2 .none{font-size:5.5pt;color:#667;text-align:center;line-height:1.1;padding:1px}
.rt .dn{display:inline-flex;min-width:11mm;height:8mm;padding:0 3mm;border-radius:4mm;background:#0f2a4a;color:#fff;font-weight:bold;font-size:13pt;align-items:center;justify-content:center;letter-spacing:.02em}
.rt .dn.nd{background:#cbd3de;color:#4b5565}
.rt .nm{font-weight:bold;font-size:11.5pt;word-break:break-word}
.rt .ps{font-size:10pt;color:#243247}
/* ejercicios / sistemas */
.ex{break-before:page;page-break-before:always}.ex.first{break-before:auto;page-break-before:auto}
.ex h2{font-size:15pt;margin:0 0 5px;border-bottom:1px solid #999;padding-bottom:3px}
.chips{margin:3px 0 6px}.chip{display:inline-block;border:1px solid #999;border-radius:10px;padding:1px 8px;font-size:8.5pt;margin:0 4px 3px 0;background:#f3f4f6}
.meta{font-size:9pt;color:#222;margin:2px 0 8px}
.imgs{display:flex;gap:10px;margin:6px 0 10px;align-items:flex-start}
.imgs figure{margin:0;flex:1 1 0;min-width:0;text-align:center;break-inside:avoid;page-break-inside:avoid}
.imgs figcaption{font-size:8pt;font-weight:bold;text-align:left;margin-bottom:3px}
.imgs img{max-width:100%;max-height:100mm;width:auto;height:auto;object-fit:contain;display:block;margin:0 auto}
.imgs.one img{max-height:120mm}
.noimg{border:1px dashed #999;color:#555;font-size:9pt;padding:18px 8px;text-align:center}
.f{margin:4px 0;font-size:10pt}.f b{color:#111}
.sysact{border:1px solid #999;border-radius:4px;padding:8px 10px;margin:8px 0;break-inside:avoid;page-break-inside:avoid}
.sysact h4{margin:0 0 4px;font-size:11.5pt}
.sysact .imgs{margin:5px 0}.sysact .imgs img{max-height:72mm}
.syscat{break-before:page;page-break-before:always}.syscat.first{break-before:auto;page-break-before:auto}
.syscat>h2{font-size:16pt;margin:0 0 4px;border-bottom:2px solid #222;padding-bottom:3px}
.syssub{margin:8px 0 0}.syssub>h3{background:#eaf2fb;border-left:5px solid #1557a6;padding:3px 8px}
/* grupos */
.glist{break-before:page;page-break-before:always}.glist.first{break-before:auto;page-break-before:auto}
.g-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}
.g{border:1px solid #888;border-left:7px solid var(--c,#1557a6);border-radius:6px;padding:7px 10px;break-inside:avoid;page-break-inside:avoid}
.g h3{margin:0 0 5px;font-size:11.5pt}.g ul{list-style:none;margin:0;padding:0}
.g li{display:flex;gap:7px;align-items:center;padding:2px 0;font-size:10pt}
.g li img{width:11mm;height:14mm;object-fit:cover;border:1px solid #ccc;flex:none}
.g li .gp-empty{display:block;width:11mm;height:14mm;flex:none}
.g small{color:#444}
/* incidencias */
.inc{border:1px solid #b45309;background:#fffbeb;border-radius:6px;padding:8px 12px;margin-top:16px;break-inside:avoid}
.inc h3{margin:0 0 4px;color:#92400e}.inc ul{margin:4px 0 0;padding-left:18px;font-size:9.5pt}`;

function headHTML(title,sub){
  const c=club(),logo=c.logo?'<img src="'+E(c.logo)+'" alt="">':'';
  const d=new Date().toLocaleDateString('es-ES');
  return '<div class="head">'+logo+'<div><h1>'+E(title)+'</h1><div class="sub">'+E([c.club||'',sub||''].filter(Boolean).join(' · '))+'</div><div class="sub">Generado el '+E(d)+'</div></div></div>';
}
function incHTML(inc){
  if(!inc.length)return '';
  return '<div class="inc"><h3>Incidencias de imágenes ('+inc.length+')</h3><div class="muted">Estas imágenes no estaban disponibles en la aplicación. No se ha sustituido ninguna por otra.</div><ul>'+inc.map(x=>'<li>'+E(x)+'</li>').join('')+'</ul></div>';
}
function wrapDoc(title,body){
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+E(title)+'</title><style>'+CSS+'</style></head><body>'+
    '<div class="noprint"><button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button></div>'+body+
    '<scr'+'ipt>window.addEventListener("load",function(){setTimeout(function(){try{if(!(window.opener&&window.opener.__VTC_PDF_NOPRINT))window.print()}catch(e){}},400)})</scr'+'ipt></body></html>';
}
/* La ventana se abre en el mismo gesto del clic (evita el bloqueo de ventanas emergentes) y se rellena después. */
function openDoc(title,build){
  const w=window.open('','_blank');
  if(!w){alert('El navegador ha bloqueado la ventana del PDF. Permite ventanas emergentes para VICTOTALCOACH y vuelve a intentarlo.');return Promise.resolve(null)}
  try{w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+E(title)+'</title></head><body style="font-family:Arial;padding:30px">Preparando el PDF con las imágenes de la aplicación…</body></html>')}catch(e){}
  cache=new Map();
  return Promise.resolve().then(build).then(html=>{
    w.document.open();w.document.write(wrapDoc(title,html));w.document.close();
    window.__vtcPdfLast={title,win:w};
    return w;
  }).catch(err=>{
    console.error('vtc-pdf:',err);
    try{w.document.body.innerHTML='<h3>No se pudo generar el PDF</h3><pre>'+E(err&&err.message||err)+'</pre>'}catch(e){}
    return null;
  }).finally(()=>{cache=new Map()});
}
function report(inc){inc.forEach(x=>console.warn('vtc-pdf · incidencia:',x))}

/* ===================== 1) PLANTILLA CON FOTOGRAFÍAS ===================== */
async function playerPhoto(p,inc){
  const who=(p.name||'Sin nombre')+(p.number?' (dorsal '+p.number+')':'');
  if(p.photoKey){
    const r=await imgByKey(p.photoKey);
    if(r&&r.url)return {url:r.url};
    inc.push('Foto no disponible · '+who+' — '+(r&&r.err||'sin datos'));
    return {miss:'Foto no disponible'};
  }
  if(p.photo)return {url:p.photo};
  inc.push('Sin foto asignada · '+who);
  return {miss:'Sin foto'};
}
async function buildRoster(team){
  const inc=[],pls=team.players||[],cos=team.coaches||[];
  let withPhoto=0,html='';
  const rows=[];
  for(const p of pls){
    const ph=await playerPhoto(p,inc);if(ph.url)withPhoto++;
    const hasNo=T(p.number)!=='';
    rows.push('<tr><td class="c-ph"><div class="ph2">'+(ph.url?'<img src="'+E(ph.url)+'" alt="">':'<span class="none">'+E(ph.miss)+'</span>')+'</div></td>'+
      '<td class="c-no"><span class="dn'+(hasNo?'':' nd')+'">'+E(hasNo?p.number:'—')+'</span></td>'+
      '<td class="nm">'+E(p.name||'Sin nombre')+'</td><td class="ps">'+E(p.position||'Sin posición')+'</td></tr>');
  }
  let coRows='';
  for(const c of cos){
    let im='';
    if(c.photoKey){const r=await imgByKey(c.photoKey);if(r&&r.url)im='<img class="coach-ph" src="'+E(r.url)+'" alt="">';else inc.push('Foto no disponible · entrenador/a '+(c.name||'?')+' — '+(r&&r.err||''))}
    coRows+='<tr><td>'+im+E(c.name||'')+'</td><td>'+E(c.role||'')+'</td></tr>';
  }
  const sub=[team.sex||'',team.sport?sportName(team.sport):'',pls.length+' jugador'+(pls.length===1?'':'es/as')+' · '+withPhoto+' con foto'].filter(Boolean).join(' · ');
  html+=headHTML('Plantilla · '+(team.name||''),sub);
  if(cos.length)html+='<h2>Entrenadores</h2><table><tr><th>Nombre</th><th>Función</th></tr>'+coRows+'</table>';
  html+='<h2>Jugadoras/es</h2>'+(rows.length?'<table class="rt"><thead><tr><th class="c-ph">Foto</th><th class="c-no">Dorsal</th><th>Nombre y apellidos</th><th class="c-ps">Posición</th></tr></thead><tbody>'+rows.join('')+'</tbody></table>':'<p class="muted">Este equipo no tiene jugadores/as.</p>')+incHTML(inc);
  report(inc);
  return html;
}
function rosterPDF(teamId){
  const s=ST();if(!s)return;
  const id=teamId||s.selectedTeam,team=(s.teams||[]).find(x=>x.id===id);
  if(!team){alert('Selecciona primero un equipo.');return}
  return openDoc('Plantilla con fotos - '+team.name,()=>buildRoster(team));
}

/* ===================== 2) EJERCICIOS ===================== */
const KNOWN=new Set(['id','name','category','subcategory','categories','goal','players','duration','organization','description','variants','points','imageKey','videoKey','boardKey','boardObjects','boardCourt','image','video','sport','ageRangeIds','ageStrict','difficulty','contentType','secondaryGoals','spaceMaterial','progressions','adaptations','commonErrors','coachNotes','tags','authorName','createdAt','updatedAt']);
const F=(l,v)=>{const t=T(v);return t?'<div class="f"><b>'+E(l)+':</b> '+BR(t)+'</div>':''};
async function figures(e,o,inc,max){
  const out=[];
  const one=async(key,label)=>{
    const r=await imgByKey(key);
    if(r&&r.url)out.push('<figure><figcaption>'+E(label)+'</figcaption><img src="'+E(r.url)+'" alt="'+E(label)+'"></figure>');
    else{inc.push((label==='Pizarra'?'Pizarra':'Imagen')+' no disponible · '+(e.name||'?')+' — '+(r&&r.err||''));out.push('<figure><figcaption>'+E(label)+'</figcaption><div class="noimg">Imagen no disponible</div></figure>')}
  };
  if(o.img&&e.imageKey)await one(e.imageKey,'Fotografía');
  if(o.board&&e.boardKey)await one(e.boardKey,'Pizarra');
  if(o.board&&!e.boardKey&&Array.isArray(e.boardObjects)&&e.boardObjects.length)inc.push('Pizarra con elementos pero sin imagen guardada · '+(e.name||'?'));
  if(!out.length&&(o.img||o.board)&&!e.imageKey&&!e.boardKey)inc.push('Sin imagen ni pizarra asignada · '+(e.name||'?'));
  return out.length?'<div class="imgs'+(out.length===1?' one':'')+'" style="'+(max?'':'')+'">'+out.join('')+'</div>':'';
}
function otherFields(e){
  return Object.keys(e).filter(k=>!KNOWN.has(k)&&!/(key|id)$/i.test(k)&&k[0]!=='_'&&(typeof e[k]==='string'||typeof e[k]==='number')&&T(e[k])!=='').map(k=>F(k,e[k])).join('');
}
async function exerciseHTML(e,idx,o,inc){
  const cats=assoc(e).map(a=>'<span class="chip">'+E(a.category)+' › '+E(a.subcategory||'General')+'</span>').join('');
  const ages=ageNames(e.ageRangeIds);
  const meta=[e.sport?'<b>Deporte:</b> '+E(sportName(e.sport)):'',ages.length?'<b>Edades:</b> '+E(ages.join(', ')):'',e.difficulty?'<b>Dificultad:</b> '+E(e.difficulty):'',e.contentType?'<b>Contenido:</b> '+E(e.contentType):'',
    T(e.duration)!==''?'<b>Duración:</b> '+E(e.duration)+' min':'',T(e.players)!==''?'<b>Jugadores:</b> '+E(e.players):''].filter(Boolean).join(' · ');
  const figs=await figures(e,o,inc);
  const txt=F('Objetivo',e.goal)+F('Objetivos secundarios',e.secondaryGoals)+F('Organización',e.organization)+F('Descripción',e.description)+F('Variantes',e.variants)+F('Puntos clave',e.points)+
    F('Espacio y material',e.spaceMaterial)+F('Progresiones',e.progressions)+F('Adaptaciones por nivel',e.adaptations)+F('Errores frecuentes',e.commonErrors)+F('Indicaciones del entrenador',e.coachNotes)+
    (Array.isArray(e.tags)&&e.tags.length?F('Etiquetas',e.tags.join(', ')):'')+F('Autor',e.authorName)+
    (e.videoKey?'<div class="f"><b>Vídeo:</b> este ejercicio tiene un vídeo asociado en la aplicación (no se puede imprimir).</div>':'')+
    otherFields(e)+
    (e.createdAt?'<div class="muted" style="margin-top:6px">Creado: '+E(String(e.createdAt).slice(0,10))+(e.updatedAt?' · Última modificación: '+E(String(e.updatedAt).slice(0,10)):'')+'</div>':'');
  return '<section class="ex'+(idx===1?' first':'')+'"><h2>'+idx+'. '+E(e.name||'Sin nombre')+'</h2><div class="chips">'+cats+'</div>'+(meta?'<div class="meta">'+meta+'</div>':'')+figs+txt+'</section>';
}
async function buildExercises(ids,o){
  const s=ST(),inc=[],map=new Map((s.exercises||[]).map(e=>[String(e.id),e]));
  const list=ids.map(i=>map.get(String(i))).filter(Boolean);
  let body='';
  for(let i=0;i<list.length;i++)body+=await exerciseHTML(list[i],i+1,o,inc);
  report(inc);
  return headHTML(list.length===1?'Ejercicio · '+(list[0].name||''):'Ejercicios ('+list.length+')',list.length===1?'':'Banco de ejercicios')+body+incHTML(inc);
}
const exOpts=()=>window.vtcPdfExOpts=window.vtcPdfExOpts||{img:true,board:true};
function exercisesPDF(ids,o){
  if(!ids||!ids.length){alert('Marca al menos un ejercicio.');return}
  const op=Object.assign({img:true,board:true},o||exOpts());
  return openDoc(ids.length===1?'Ejercicio':'Ejercicios',()=>buildExercises(ids,op));
}
function exSorted(){
  return (ST().exercises||[]).filter(e=>!window.VTCISO||VTCISO.exVisible(e,activeSport())).sort((a,b)=>{const ca=(assoc(a)[0]||{}).category||'',cb=(assoc(b)[0]||{}).category||'';return ca.localeCompare(cb,'es')||T(a.name).localeCompare(T(b.name),'es')});
}
function openExDialog(pre){
  const s=ST();if(!s||typeof openModal!=='function')return;
  const all=exSorted();
  if(!all.length){alert('El banco de ejercicios está vacío.');return}
  const cats=[...new Set(all.flatMap(e=>assoc(e).map(a=>a.category)))].sort((a,b)=>a.localeCompare(b,'es'));
  const sel=new Set((pre||[]).map(String)),o=exOpts();
  openModal('<h2>📄 PDF de ejercicios</h2>'+
    '<p class="muted">Marca los ejercicios que quieres exportar. Se usan las imágenes y pizarras que ya tiene la aplicación.</p>'+
    '<div class="vtc-row" style="display:flex;flex-wrap:wrap;gap:8px"><input type="text" id="vtcPxQ" placeholder="Buscar por nombre…" style="flex:1;min-width:160px">'+
    '<select id="vtcPxC"><option value="">Todas las categorías</option>'+cats.map(c=>'<option value="'+E(c)+'">'+E(c)+'</option>').join('')+'</select>'+
    '<button type="button" class="secondary" id="vtcPxAll">Marcar visibles</button><button type="button" class="secondary" id="vtcPxNone">Quitar marcas</button></div>'+
    '<div id="vtcPxList" style="max-height:38vh;overflow:auto;border:1px solid #d6dde6;border-radius:10px;padding:8px;margin-top:8px"></div>'+
    '<div class="muted" id="vtcPxCount" style="margin-top:6px"></div>'+
    '<div class="vtc-row" style="display:flex;gap:14px;margin-top:6px"><label style="font-weight:600"><input type="checkbox" id="vtcPxImg" '+(o.img?'checked':'')+'> Fotografías</label><label style="font-weight:600"><input type="checkbox" id="vtcPxBoard" '+(o.board?'checked':'')+'> Pizarras</label></div>'+
    '<div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button type="button" class="primary" id="vtcPxGo">Generar PDF</button></div>');
  const visible=()=>{const q=norm($$('vtcPxQ').value),c=$$('vtcPxC').value;return all.filter(e=>(!q||norm(e.name).includes(q))&&(!c||assoc(e).some(a=>a.category===c)))};
  const count=()=>{$$('vtcPxCount').textContent=sel.size+' ejercicio(s) marcado(s)'};
  const paint=()=>{
    const v=visible();
    $$('vtcPxList').innerHTML=v.length?v.map(e=>'<label style="display:flex;gap:8px;align-items:center;font-weight:500;padding:3px 0"><input type="checkbox" class="vtcPxK" value="'+E(e.id)+'" '+(sel.has(String(e.id))?'checked':'')+'> <span><b>'+E(e.name||'Sin nombre')+'</b> <span class="muted">· '+E(assoc(e).map(a=>a.category+' › '+a.subcategory).join(' · '))+'</span></span></label>').join(''):'<p class="muted">No hay ejercicios con ese filtro.</p>';
    count();
  };
  $$('vtcPxList').addEventListener('change',ev=>{const k=ev.target;if(k.classList.contains('vtcPxK')){if(k.checked)sel.add(String(k.value));else sel.delete(String(k.value));count()}});
  $$('vtcPxQ').addEventListener('input',paint);$$('vtcPxC').addEventListener('change',paint);
  $$('vtcPxAll').onclick=()=>{visible().forEach(e=>sel.add(String(e.id)));paint()};
  $$('vtcPxNone').onclick=()=>{sel.clear();paint()};
  $$('vtcPxGo').onclick=()=>{
    window.vtcPdfExOpts={img:$$('vtcPxImg').checked,board:$$('vtcPxBoard').checked};
    const ids=all.filter(e=>sel.has(String(e.id))).map(e=>e.id);
    exercisesPDF(ids,window.vtcPdfExOpts);
  };
  paint();
}

/* ===================== 3) SISTEMAS DE JUEGO ===================== */
const SYS_CAT='SISTEMA DE JUEGO';
async function ensureSystemsLoaded(){
  try{
    if(typeof loadIndependentSystemCategories==='function'&&(typeof systemCategoriesLoaded==='undefined'||!systemCategoriesLoaded||systemCategoriesLoadedForTeam!==(ST().selectedTeam||'')))
      await loadIndependentSystemCategories();
  }catch(e){console.warn('vtc-pdf: no se pudieron cargar las categorías de sistemas',e)}
}
/* Devuelve [{cat, subs:[{sub, items:[ejercicio]}]}] solo con categorías/subcategorías que tienen acciones. */
function collectSystems(){
  const s=ST(),sp=activeSport();
  const ex=(s.exercises||[]).filter(e=>window.VTCISO?VTCISO.exVisible(e,sp):(e.sport||'handball')===sp);
  const byLabel=new Map(); // etiqueta "Cat · Sub" -> ejercicios
  ex.forEach(e=>assoc(e).forEach(a=>{if(a.category===SYS_CAT){const l=a.subcategory||'';if(!byLabel.has(l))byLabel.set(l,[]);if(!byLabel.get(l).includes(e))byLabel.get(l).push(e)}}));
  const cats=s.systemCategories||{},order=(Array.isArray(s.systemCategoryOrder)&&s.systemCategoryOrder.length?s.systemCategoryOrder:Object.keys(cats)).filter(k=>cats[k]);
  const used=new Set(),out=[];
  order.forEach(cat=>{
    const subs=[];
    (cats[cat]||[]).forEach(sub=>{const l=cat+' · '+sub,items=byLabel.get(l)||[];if(items.length){used.add(l);subs.push({sub,items})}});
    if(subs.length)out.push({cat,subs});
  });
  // acciones archivadas en subcategorías que ya no figuran en la estructura: no se pierden
  byLabel.forEach((items,l)=>{
    if(used.has(l)||!items.length)return;
    const i=l.indexOf(' · '),cat=i>=0?l.slice(0,i):'Sin categoría',sub=i>=0?l.slice(i+3):(l||'General');
    let g=out.find(x=>x.cat===cat);if(!g){g={cat,subs:[]};out.push(g)}
    g.subs.push({sub,items});
  });
  return out;
}
async function actionHTML(e,o,inc){
  const figs=o.img||o.board?await figures(e,o,inc):'';
  const txt=o.detail?(F('Objetivo',e.goal)+F('Organización',e.organization)+F('Participantes',e.players)+F('Descripción',e.description)+F('Variantes',e.variants)+F('Puntos clave',e.points)+F('Indicaciones del entrenador',e.coachNotes)):F('Objetivo',e.goal);
  return '<div class="sysact"><h4>'+E(e.name||'Sin nombre')+'</h4>'+txt+figs+'</div>';
}
async function buildSystems(data,o,team){
  const inc=[];let body='',n=0;
  for(let i=0;i<data.length;i++){
    const g=data[i];
    body+='<section class="syscat'+(i===0?' first':'')+'"><h2>'+E(g.cat)+'</h2>';
    for(const sb of g.subs){
      body+='<div class="syssub"><h3>'+E(sb.sub)+' <span class="muted">('+sb.items.length+')</span></h3>';
      for(const e of sb.items){body+=await actionHTML(e,o,inc);n++}
      body+='</div>';
    }
    body+='</section>';
  }
  report(inc);
  return headHTML('Sistemas de juego'+(team?' · '+team.name:''),sportName(activeSport())+' · '+data.length+' categoría(s) · '+n+' acción(es)')+body+incHTML(inc);
}
async function openSysDialog(){
  const s=ST();if(!s||typeof openModal!=='function')return;
  await ensureSystemsLoaded();
  const data=collectSystems();
  if(!data.length){alert('No hay acciones archivadas en «Sistema de juego» para este equipo/deporte. Las categorías sin acciones no se exportan.');return}
  const team=(s.teams||[]).find(t=>t.id===s.selectedTeam),o=window.vtcPdfSysOpts=window.vtcPdfSysOpts||{img:true,board:true,detail:true};
  openModal('<h2>📄 PDF de sistemas de juego</h2><p class="muted">Solo aparecen las categorías con acciones. Se usan las imágenes y pizarras que ya tiene la aplicación.</p>'+
    '<div id="vtcPsList" style="border:1px solid #d6dde6;border-radius:10px;padding:8px">'+data.map((g,i)=>'<label style="display:flex;gap:8px;align-items:center;font-weight:600;padding:3px 0"><input type="checkbox" class="vtcPsK" value="'+i+'" checked> '+E(g.cat)+' <span class="muted">· '+g.subs.reduce((a,b)=>a+b.items.length,0)+' acción(es)</span></label>').join('')+'</div>'+
    '<div class="vtc-row" style="display:flex;flex-wrap:wrap;gap:14px;margin-top:8px"><label style="font-weight:600"><input type="checkbox" id="vtcPsImg" '+(o.img?'checked':'')+'> Fotografías</label><label style="font-weight:600"><input type="checkbox" id="vtcPsBoard" '+(o.board?'checked':'')+'> Pizarras</label><label style="font-weight:600"><input type="checkbox" id="vtcPsDet" '+(o.detail?'checked':'')+'> Descripción completa</label></div>'+
    '<div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button type="button" class="primary" id="vtcPsGo">Generar PDF</button></div>');
  $$('vtcPsGo').onclick=()=>{
    const pick=[...document.querySelectorAll('.vtcPsK:checked')].map(k=>data[+k.value]);
    if(!pick.length){alert('Marca al menos una categoría.');return}
    const op=window.vtcPdfSysOpts={img:$$('vtcPsImg').checked,board:$$('vtcPsBoard').checked,detail:$$('vtcPsDet').checked};
    openDoc('Sistemas de juego',()=>buildSystems(pick,op,team));
  };
}
function systemsPDF(catNames,o){
  return ensureSystemsLoaded().then(()=>{
    let data=collectSystems();if(catNames&&catNames.length)data=data.filter(g=>catNames.includes(g.cat));
    if(!data.length){alert('No hay acciones de sistemas de juego para exportar.');return null}
    const s=ST(),team=(s.teams||[]).find(t=>t.id===s.selectedTeam);
    return openDoc('Sistemas de juego',()=>buildSystems(data,Object.assign({img:true,board:true,detail:true},o||{}),team));
  });
}

/* ===================== 4) GRUPOS ===================== */
const COLORS=['#1557a6','#c2410c','#15803d','#7e22ce','#be123c','#0f766e','#a16207','#475569'];
function groupsData(){
  if(typeof window.vtcGroupsExportData!=='function')return null;
  try{return window.vtcGroupsExportData()}catch(e){console.warn('vtc-pdf: grupos',e);return null}
}
async function memberPhotoMap(teamId,inc,cacheMap){
  if(!teamId)return null;
  if(cacheMap.has(teamId))return cacheMap.get(teamId);
  const team=(ST().teams||[]).find(t=>String(t.id)===String(teamId)),m=new Map();
  if(team){
    const by=new Map();(team.players||[]).forEach(p=>{const k=norm(p.name);if(!by.has(k))by.set(k,[]);by.get(k).push(p)});
    for(const [k,arr] of by){
      if(arr.length!==1)continue; // nombre repetido: no se asigna foto para no equivocarse
      const p=arr[0];
      if(p.photoKey){const r=await imgByKey(p.photoKey);if(r&&r.url)m.set(k,r.url);else inc.push('Foto no disponible · '+(p.name||'?')+' (grupos) — '+(r&&r.err||''))}
      else if(p.photo)m.set(k,p.photo);
    }
  }
  cacheMap.set(teamId,m);return m;
}
function memberLI(o,photos){
  const url=photos&&photos.get(norm(o.s));
  return '<li>'+(url?'<img src="'+E(url)+'" alt="">':(photos?'<span class="gp-empty"></span>':''))+'<span><b>'+E(o.n)+'.</b> '+E(o.s)+'<br><small>'+(o.sup?'suplente · ':'')+E(o.p||'')+(o.cov?' · cubre '+E(String(o.cov).toLowerCase()):'')+'</small></span></li>';
}
function card(title,members,color,photos){
  return '<div class="g" style="--c:'+color+'"><h3>'+E(title)+' <small>('+members.length+')</small></h3><ul>'+members.map(o=>memberLI(o,photos)).join('')+'</ul></div>';
}
/* lists: [{name,teamId,res}], pick: índice de grupo (0-based dentro de gs+ex) o null para todos */
async function buildGroups(lists,pick,teamNameOf){
  const inc=[],pc=new Map();let body='',first=true,total=0;
  for(const l of lists){
    const all=(l.res.gs||[]).concat(l.res.ex||[]),nGs=(l.res.gs||[]).length;
    const photos=await memberPhotoMap(l.teamId,inc,pc);
    let cards='';
    all.forEach((m,i)=>{if(pick==null||pick===i){cards+=card('Grupo '+(i+1)+(i>=nGs?' (extra)':''),m,COLORS[i%COLORS.length],photos);total++}});
    if(pick==null&&(l.res.left||[]).length)cards+=card('Sin grupo',l.res.left,'#8a8a8a',photos);
    if(!cards)continue;
    const tn=teamNameOf(l.teamId);
    body+='<section class="glist'+(first?' first':'')+'"><h2>'+E(l.name||'Lista')+(tn?' <span class="muted">· '+E(tn)+'</span>':'')+'</h2><div class="g-grid">'+cards+'</div></section>';
    first=false;
  }
  report(inc);
  return headHTML('Grupos de trabajo',lists.length+' lista(s) · '+total+' grupo(s)')+body+incHTML(inc);
}
function groupsPDF(mode,pick){
  const d=groupsData();
  if(!d){alert('La pestaña Grupos no está disponible.');return}
  let lists=d.lists.filter(l=>l.res&&((l.res.gs||[]).length||(l.res.ex||[]).length));
  const scope=mode==='all'?'todas las listas':'la lista actual';
  if(mode!=='all')lists=lists.filter(l=>l.id===d.curId);
  if(!lists.length){alert(mode==='all'?'Todavía no has creado grupos en ninguna lista. Pulsa «Crear grupos» primero.':'La lista actual aún no tiene grupos. Pulsa «Crear grupos» primero.');return}
  const teamNameOf=id=>{const t=id&&(ST().teams||[]).find(x=>String(x.id)===String(id));return t?t.name:''};
  const skipped=mode==='all'?d.lists.length-lists.length:0;
  if(skipped)toast(skipped+' lista(s) sin grupos creados no se incluyen.',3500);
  return openDoc('Grupos - '+scope,()=>buildGroups(lists,mode==='all'?null:(pick===''||pick==null?null:Number(pick)),teamNameOf));
}
function syncGroupsBar(){
  const sec=$$('groups');if(!sec)return;
  const msg=sec.querySelector('#vgMsg');if(!msg)return;
  let bar=$$('vtcGrpPdfBar');
  if(!bar){
    bar=document.createElement('div');bar.id='vtcGrpPdfBar';bar.className='toolbar';bar.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0';
    bar.innerHTML='<select id="vtcGrpPick" title="Grupo que se exporta con «Exportar grupo seleccionado»"></select>'+
      '<button type="button" class="secondary" id="vtcGrpPdfCur">📄 Exportar grupo seleccionado</button>'+
      '<button type="button" class="secondary" id="vtcGrpPdfAll">📄 Exportar todos los grupos</button>';
    msg.parentNode.insertBefore(bar,msg);
    $$('vtcGrpPdfCur').addEventListener('click',()=>groupsPDF('cur',$$('vtcGrpPick').value));
    $$('vtcGrpPdfAll').addEventListener('click',()=>groupsPDF('all'));
  }
  const d=groupsData(),cur=d&&d.lists.find(l=>l.id===d.curId),n=cur&&cur.res?((cur.res.gs||[]).length+(cur.res.ex||[]).length):0;
  const sel=$$('vtcGrpPick');
  if(sel.dataset.n!==String(n)){
    const prev=sel.value;
    sel.innerHTML='<option value="">Toda la lista actual</option>'+Array.from({length:n},(_,i)=>'<option value="'+i+'">Grupo '+(i+1)+'</option>').join('');
    if(prev!==''&&+prev<n)sel.value=prev;
    sel.dataset.n=String(n);
  }
}

/* ===================== integración en la interfaz ===================== */
let lastExId=null;
document.addEventListener('click',ev=>{
  try{
    const b=ev.target.closest&&ev.target.closest('[onclick]');if(!b)return;
    const m=/(?:selectExercise|hcOpenExerciseDetail|hcOpenExercise)\(\s*['"]([^'"]+)['"]\s*\)/.exec(b.getAttribute('onclick')||'');
    if(m)lastExId=m[1];
  }catch(e){}
},true);

function ensureButtons(){
  try{
    // Plantilla
    const rb=document.querySelector('button[onclick="printRosterPDF()"]');
    if(rb&&!$$('vtcPdfRosterBtn')){
      rb.insertAdjacentHTML('afterend',' <button type="button" class="secondary" id="vtcPdfRosterBtn">📄 PDF plantilla con fotos</button>');
      $$('vtcPdfRosterBtn').addEventListener('click',()=>rosterPDF());
    }
    // Ejercicios
    const ex=document.querySelector('#exercises .toolbar');
    if(ex&&!$$('vtcPdfExBtn')){
      ex.insertAdjacentHTML('beforeend','<button type="button" class="secondary" id="vtcPdfExBtn">📄 PDF de ejercicios</button>');
      $$('vtcPdfExBtn').addEventListener('click',()=>openExDialog([]));
    }
    // Sistemas de juego
    const sb=document.querySelector('button[onclick="addSystemCategory()"]');
    if(sb&&!$$('vtcPdfSysBtn')){
      sb.parentNode.insertAdjacentHTML('beforeend','<button type="button" class="secondary" id="vtcPdfSysBtn">📄 PDF sistemas de juego</button>');
      $$('vtcPdfSysBtn').addEventListener('click',()=>openSysDialog());
    }
    // Grupos
    syncGroupsBar();
    // Ficha del ejercicio (ventana «📖 …»)
    const box=$$('modalBox'),h2=box&&box.querySelector('h2');
    if(box&&h2&&/^📖/.test(h2.textContent)&&!box.querySelector('#vtcPdfFicha')){
      const acts=box.querySelector('.form-actions');
      if(acts){
        const title=T(h2.textContent.replace(/^📖\s*/,'')),exs=ST().exercises||[];
        let e=exs.find(x=>String(x.id)===String(lastExId)&&T(x.name)===title)||exs.find(x=>T(x.name)===title);
        if(e){
          acts.insertAdjacentHTML('beforeend','<button type="button" class="primary" id="vtcPdfFicha">📄 PDF del ejercicio</button>');
          const id=e.id;$$('vtcPdfFicha').addEventListener('click',()=>exercisesPDF([id]));
        }
      }
    }
  }catch(err){console.warn('vtc-pdf: botones',err)}
}
let tm=null;
const sched=()=>{clearTimeout(tm);tm=setTimeout(ensureButtons,120)};
new MutationObserver(sched).observe(document.body,{childList:true,subtree:true});
ensureButtons();

/* API pública (también útil para pruebas) */
window.vtcPdf={roster:rosterPDF,exercises:exercisesPDF,exerciseDialog:openExDialog,systems:systemsPDF,systemsDialog:openSysDialog,groups:groupsPDF,
  _build:{roster:buildRoster,exercises:buildExercises,systems:buildSystems,groups:buildGroups,collectSystems}};

}catch(e){console.error('vtc-pdf.js: fallo al cargar el módulo, el resto de la app no se ve afectado.',e)}
})();
