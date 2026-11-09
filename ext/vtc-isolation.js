/* TOTAL4COACH · vtc-isolation.js (V2.1.0)
   Aislamiento por deporte. Cada deporte es un entorno independiente.
   REGLAS DE SEGURIDAD DE DATOS:
   - Este módulo NO borra, NO migra y NO reescribe registros existentes. Filtra únicamente lo que se MUESTRA.
   - Los registros antiguos sin deporte se LEEN como «balonmano» (la app era solo de balonmano antes de V2). No se les escribe nada;
     solo se etiquetan los registros NUEVOS (o los que el entrenador clasifique expresamente).
   - Cambiar de deporte limpia la pantalla (fichas, selecciones, ventanas), nunca los datos almacenados. */
(function(){
'use strict';
const IDS=['handball','football','basketball','volleyball'];
const LEGACY='handball';
const ST=()=>(typeof state!=='undefined'?state:null);
const ok=x=>IDS.indexOf(x)>=0;
const $=id=>document.getElementById(id);
const clone=o=>JSON.parse(JSON.stringify(o));
const S=()=>window.VTC_SPORTS||{};
const sName=id=>(S()[id]?S()[id].icon+' '+S()[id].name:id);

/* ---------- 1) Una única fuente de verdad: el deporte activo (persistido en state.activeSport) ---------- */
let _active=null;
(function init(){
  const s=ST();if(!s)return;
  if(ok(s.activeSport))_active=s.activeSport;
  else{const t=(s.teams||[]).find(x=>x.id===s.selectedTeam);_active=(t&&ok(t.sport))?t.sport:LEGACY;s.activeSport=_active}
  Object.defineProperty(window,'vtcActiveSportFilter',{configurable:true,
    get:function(){return _active},
    set:function(v){if(ok(v)){_active=v;const st=ST();if(st)st.activeSport=v}}});
  s.lastTeamBySport=(s.lastTeamBySport&&typeof s.lastTeamBySport==='object')?s.lastTeamBySport:{};
})();
const active=()=>_active||LEGACY;

/* ---------- 2) Deporte de cada tipo de registro (SOLO LECTURA) ---------- */
const teamSportOf=t=>(t&&ok(t.sport))?t.sport:LEGACY;
const teamById=id=>(ST().teams||[]).find(t=>String(t.id)===String(id));
const teamsOf=sp=>(ST().teams||[]).filter(t=>teamSportOf(t)===sp);
function microSports(m){
  if(ok(m&&m.sport))return[m.sport];
  const ids=[m&&m.teamId].concat(((m&&m.sessions)||[]).map(z=>z&&z.teamId)).filter(Boolean);
  const set={};ids.forEach(id=>{const t=teamById(id);if(t)set[teamSportOf(t)]=1});
  return Object.keys(set);
}
function seasonSports(se){
  if(ok(se&&se.sport))return[se.sport];
  const set={};((se&&se.micros)||[]).forEach(m=>microSports(m).forEach(x=>set[x]=1));
  return Object.keys(set);
}
const seasonVisible=(se,sp)=>{const l=seasonSports(se);return l.length?l.indexOf(sp)>=0:sp===LEGACY};
const microVisible=(m,se,sp)=>{const l=microSports(m);if(l.length)return l.indexOf(sp)>=0;const sl=seasonSports(se);return sl.length?sl.indexOf(sp)>=0:sp===LEGACY};
const isShared=e=>!!e&&(e.shared===true||e.sport==='shared');
const classified=e=>isShared(e)||ok(e&&e.sport);
const exVisible=(e,sp)=>{if(!e)return false;if(isShared(e))return true;return(ok(e.sport)?e.sport:LEGACY)===sp};
const matchSport=m=>{const t=m&&teamById(m.teamId);return t?teamSportOf(t):(ok(m&&m.sport)?m.sport:LEGACY)};
function projSport(p){
  if(ok(p&&p.sport))return p.sport;
  const d=(p&&p.data)||{};const names=[d.teamA,d.teamB].filter(Boolean);
  for(let i=0;i<names.length;i++){const t=(ST().teams||[]).find(x=>x.name===names[i]);if(t)return teamSportOf(t)}
  return LEGACY;
}
const tplSport=t=>ok(t&&t.sport)?t.sport:LEGACY;
window.VTCISO={active,teamSportOf,teamsOf,seasonVisible,microVisible,exVisible,isShared,classified,matchSport,projSport,tplSport,LEGACY};

/* ---------- 3) Selecciones coherentes con el deporte activo ---------- */
function guardSelections(){
  const s=ST();if(!s)return;const sp=active();
  const t=teamById(s.selectedTeam);
  if(s.selectedTeam&&(!t||teamSportOf(t)!==sp)){const last=teamById(s.lastTeamBySport&&s.lastTeamBySport[sp]);s.selectedTeam=(last&&teamSportOf(last)===sp)?last.id:(teamsOf(sp)[0]?teamsOf(sp)[0].id:null)}
  if(!s.selectedTeam&&teamsOf(sp).length){s.selectedTeam=teamsOf(sp)[0].id}
  const t2=teamById(s.selectedTeam);
  if(s.selectedPlayer&&(!t2||!(t2.players||[]).some(p=>String(p.id)===String(s.selectedPlayer))))s.selectedPlayer=null;
  const se=(s.seasons||[]).find(x=>x.id===s.selectedSeason);
  if(s.selectedSeason&&(!se||!seasonVisible(se,sp))){s.selectedSeason=null;s.selectedMicro=null;s.selectedSession=null}
  if(s.selectedMicro&&se){const m=(se.micros||[]).find(x=>x.id===s.selectedMicro);if(!m||!microVisible(m,se,sp)){s.selectedMicro=null;s.selectedSession=null}}
  if(s.selectedMatch){const m=(s.matches||[]).find(x=>String(x.id)===String(s.selectedMatch));if(!m||matchSport(m)!==sp)s.selectedMatch=null}
  if(s.selectedMatchesTeam){const mt=teamById(s.selectedMatchesTeam);if(!mt||teamSportOf(mt)!==sp)s.selectedMatchesTeam=s.selectedTeam||null}
  if(s.selectedExercise){const e=(s.exercises||[]).find(x=>String(x.id)===String(s.selectedExercise));if(!e||!exVisible(e,sp))s.selectedExercise=null}
  if(s.selectedEvaluation){const ev=(s.evaluations||[]).find(x=>String(x.id)===String(s.selectedEvaluation));const et=ev&&teamById(ev.teamId);if(!ev||(et&&teamSportOf(et)!==sp))s.selectedEvaluation=null}
}

/* ---------- 4) Planificación: temporadas y microciclos del deporte activo (solo al dibujar) ---------- */
function wrapRender(){
  const orig=window.render;if(typeof orig!=='function'||orig._iso)return;
  const w=function(){
    const s=ST();if(!s)return orig.apply(this,arguments);
    guardSelections();
    const full=s.seasons,sp=active();
    s.seasons=(full||[]).filter(x=>seasonVisible(x,sp)).map(x=>Object.assign({},x,{micros:(x.micros||[]).filter(m=>microVisible(m,x,sp))}));
    try{return orig.apply(this,arguments)}finally{s.seasons=full}
  };w._iso=true;window.render=w;
}

/* ---------- 5) Ejercicios: clasificación explícita (específico de un deporte / compartido) ---------- */
function tagNewCategories(before){
  const s=ST();s.exerciseCategorySport=s.exerciseCategorySport||{};
  Object.keys(s.exerciseCategories||{}).forEach(c=>{if(!before.has(c)&&!s.exerciseCategorySport[c])s.exerciseCategorySport[c]=active()});
}
function wrapEx(){
  if(typeof window.ensureExerciseCategories==='function'||typeof ensureExerciseCategories==='function'){
    window.vtcVisibleExerciseCategories=function(){
      try{ensureExerciseCategories()}catch(e){}
      const s=ST(),sp=active(),tag=s.exerciseCategorySport||{},has={};
      (s.exercises||[]).forEach(e=>{if(exVisible(e,sp))(Array.isArray(e.categories)&&e.categories.length?e.categories:[{category:e.category}]).forEach(a=>{if(a&&a.category)has[a.category]=1})});
      const out=(s.exerciseCategoryOrder||[]).filter(c=>tag[c]?(tag[c]===sp):(has[c]||sp===LEGACY));
      /* Un ejercicio nunca debe quedar invisible: si usa una categoría que no está en el orden (p. ej. «Otros»), se muestra igualmente */
      Object.keys(has).forEach(c=>{if(out.indexOf(c)<0&&!(tag[c]&&tag[c]!==sp))out.push(c)});
      return out;
    };
  }
  const _add=window.addExerciseCategory;
  if(typeof _add==='function')window.addExerciseCategory=function(){
    const before=new Set(Object.keys(ST().exerciseCategories||{}));const r=_add.apply(this,arguments);tagNewCategories(before);setTimeout(filterCatSelect,0);return r};
  const _save=window.saveExercise;
  if(typeof _save==='function')window.saveExercise=async function(id){
    const s=ST(),shared=$('vtcExShared')?$('vtcExShared').checked:null,ids=new Set((s.exercises||[]).map(x=>x.id)),cats=new Set(Object.keys(s.exerciseCategories||{}));
    const r=await _save.apply(this,arguments);
    try{
      const e=id?s.exercises.find(x=>x.id===id):s.exercises.find(x=>!ids.has(x.id));
      if(e){if(shared!==null){if(shared)e.shared=true;else delete e.shared}if(!ok(e.sport)&&!e.shared)e.sport=active()}
      tagNewCategories(cats);window.save&&window.save();
    }catch(x){console.warn('Etiquetado de ejercicio:',x)}
    return r;
  };
}
function filterCatSelect(){
  const sel=$('exCategory');if(!sel)return;const keep=sel.value;const vis=new Set(window.vtcVisibleExerciseCategories?window.vtcVisibleExerciseCategories():[]);
  [].slice.call(sel.options).forEach(o=>{if(!vis.has(o.value)&&o.value!==keep)o.remove()});
}
function decorateExerciseModal(){
  filterCatSelect();
  const spW=$('vtcExSport');
  if(spW&&!$('vtcExShared')){
    const wrap=spW.closest('div')||spW.parentElement;
    const id=(ST().selectedExercise&&window._vtcEditingExId)||null;
    const d=document.createElement('div');
    d.innerHTML='<label style="display:flex;gap:8px;align-items:center;margin-top:6px"><input type="checkbox" id="vtcExShared"> 🔁 Ejercicio compartido (visible en todos los deportes)</label><div class="muted" style="font-size:12px">Si no lo marcas, solo aparecerá en el deporte indicado arriba.</div>';
    wrap.after(d);
  }
}
const _origOpenEx=null;
function patchOpenExercise(){
  const o=window.openExercise;if(typeof o!=='function'||o._iso)return;
  const w=async function(id){window._vtcEditingExId=id||null;const r=await o.apply(this,arguments);
    setTimeout(function(){decorateExerciseModal();const e=id&&(ST().exercises||[]).find(x=>x.id===id),c=$('vtcExShared');if(c&&e)c.checked=isShared(e)},0);return r};
  w._iso=true;window.openExercise=w;
}
function classifyModal(){
  const s=ST();const list=(s.exercises||[]).filter(e=>!classified(e));
  const opts=['<option value="">— dejar sin clasificar —</option>'].concat(IDS.map(i=>'<option value="'+i+'">'+sName(i)+'</option>')).concat(['<option value="shared">🔁 Compartido (todos los deportes)</option>']).join('');
  const rows=list.map(e=>'<tr><td style="padding:4px 8px"><b>'+esc(e.name||'(sin nombre)')+'</b><div class="muted" style="font-size:12px">'+esc(e.category||'')+'</div></td><td><select data-vtcclass="'+esc(e.id)+'">'+opts+'</select></td></tr>').join('');
  openModal('<h2>🏷️ Clasificar ejercicios sin deporte</h2><p class="muted">Estos ejercicios son anteriores al aislamiento por deporte y se muestran en balonmano. Nada se cambia hasta que elijas y pulses «Aplicar».</p><div style="max-height:55vh;overflow:auto"><table style="width:100%">'+rows+'</table></div><div class="form-actions"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="primary" id="vtcClassApply">Aplicar</button></div>');
  $('vtcClassApply').onclick=function(){
    let n=0;document.querySelectorAll('[data-vtcclass]').forEach(sel=>{
      if(!sel.value)return;const e=s.exercises.find(x=>String(x.id)===sel.getAttribute('data-vtcclass'));if(!e)return;
      if(sel.value==='shared'){e.shared=true;if(!ok(e.sport))delete e.sport}else{e.sport=sel.value;delete e.shared}n++});
    closeModal();if(n){save();renderExercises()}if(window.vtcToast)vtcToast(n+' ejercicio(s) clasificado(s).');
  };
}
function injectClassifyBtn(){
  const f=$('vtcFilters');if(!f)return;let b=$('vtcClassifyBtn');
  const n=(ST().exercises||[]).filter(e=>!classified(e)).length;
  const show=active()===LEGACY&&n>0;
  if(show&&!b){b=document.createElement('button');b.type='button';b.id='vtcClassifyBtn';b.className='secondary';b.onclick=classifyModal;f.appendChild(b)}
  if(b){if(show){b.textContent='🏷️ Clasificar ejercicios ('+n+' sin deporte)';b.style.display=''}else b.style.display='none'}
}

/* ---------- 6) Selectores de equipos: solo los del deporte activo (red de seguridad general) ---------- */
function filterTeamSelects(){
  const s=ST();if(!s||!s.teams)return;const ids=new Set(s.teams.map(t=>String(t.id))),sp=active();
  document.querySelectorAll('select').forEach(sel=>{
    if(sel.id==='vtcSportSelect'||sel.id==='vtcTeamSelect')return;
    const os=[].slice.call(sel.options).filter(o=>o.value!=='');if(!os.length||!os.every(o=>ids.has(String(o.value))))return;
    let removed=false;os.forEach(o=>{const t=teamById(o.value);if(t&&teamSportOf(t)!==sp){o.remove();removed=true}});
    if(removed){const left=[].slice.call(sel.options).filter(o=>o.value!=='');
      if(!left.length){sel.innerHTML='<option value="">Sin equipos de este deporte</option>'}
      else if(!left.some(o=>o.value===sel.value))sel.value=left[0].value}
  });
}

/* Selectores de partidos (p. ej. «Partido asociado» en Scouting): solo partidos del deporte activo */
function filterMatchSelects(){
  const s=ST();if(!s||!s.matches)return;const sp=active();
  document.querySelectorAll('#scMatch').forEach(sel=>{
    [].slice.call(sel.options).forEach(o=>{if(o.value==='')return;const m=s.matches.find(x=>String(x.id)===String(o.value));if(m&&matchSport(m)!==sp)o.remove()});
  });
}
/* ---------- 7) Scouting / toma de datos propia de cada deporte ---------- */
const SC=['buttons','links','events','teamA','teamB'];
const scDef=k=>(k==='teamA'||k==='teamB')?'':[];
function stash(sp){const s=ST();if(!s.scouting)return;s.scoutingBySport=s.scoutingBySport||{};const o={};SC.forEach(k=>{o[k]=clone(s.scouting[k]===undefined?scDef(k):s.scouting[k])});s.scoutingBySport[sp]=o}
function unstash(sp){const s=ST();if(!s.scouting)return;const o=(s.scoutingBySport||{})[sp];SC.forEach(k=>{s.scouting[k]=(o&&o[k]!==undefined)?clone(o[k]):scDef(k)});s.scouting.running=false;s.scouting.startedAt=0;s.scouting.elapsed=0}
(function scInit(){const s=ST();if(!s||!s.scouting)return;
  if(!s.scoutingBySport){s.scoutingBySport={};stash(LEGACY);if(active()!==LEGACY)unstash(active())}
  else if(active()!==LEGACY&&typeof SCOUT_DEFAULT!=='undefined'&&JSON.stringify((s.scouting.buttons||[]).map(b=>[b.name,b.cat]))===JSON.stringify(SCOUT_DEFAULT.buttons.map(b=>[b.name,b.cat]))){
    /* El código original rellena una botonera vacía con los botones de balonmano al arrancar: en otros deportes se respeta lo guardado */
    unstash(active())}})();

function wrapScouting(){
  // Equipos A/B del scouting: solo los del deporte activo
  const _tsel=window.scRenderTeamSelectors;
  if(typeof _tsel==='function'&&!_tsel._iso){const w=function(){const s=ST(),full=s.teams;s.teams=teamsOf(active());try{return _tsel.apply(this,arguments)}finally{s.teams=full}};w._iso=true;window.scRenderTeamSelectors=w}
  // Proyectos: se etiquetan al guardar y solo se listan los del deporte activo
  if(typeof hcScProjectPut==='function'&&!hcScProjectPut._iso){const _p=hcScProjectPut;const w=function(p){if(p&&!ok(p.sport))p.sport=active();return _p.apply(this,arguments)};w._iso=true;window.hcScProjectPut=w;try{hcScProjectPut=w}catch(e){}}
  if(typeof hcScProjectAll==='function'&&!hcScProjectAll._iso){const _a=hcScProjectAll;const w=function(){return _a.apply(this,arguments).then(function(L){return(L||[]).filter(function(p){return projSport(p)===active()})})};w._iso=true;window.hcScProjectAll=w;try{hcScProjectAll=w}catch(e){}}
  // Botoneras guardadas: etiquetadas por deporte; no se permite pisar la de otro deporte con el mismo nombre
  if(typeof scTemplatesPut==='function'&&!scTemplatesPut._iso){const _t=scTemplatesPut;const w=async function(item){
      if(item){const ex=(typeof scTemplates!=='undefined')&&scTemplates[item.name];
        if(ex&&tplSport(ex)!==(ok(item.sport)?item.sport:active())){alert('Ya existe una botonera llamada «'+item.name+'» en otro deporte. Usa otro nombre para no sobrescribirla.');return}
        if(!ok(item.sport))item.sport=active()}
      return _t.apply(this,arguments)};w._iso=true;window.scTemplatesPut=w;try{scTemplatesPut=w}catch(e){}}
  const _rt=window.scRenderTemplates;
  if(typeof _rt==='function'&&!_rt._iso){const w=function(){const full=scTemplates,f={};Object.keys(full).forEach(k=>{if(tplSport(full[k])===active())f[k]=full[k]});scTemplates=f;try{return _rt.apply(this,arguments)}finally{scTemplates=full}};w._iso=true;window.scRenderTemplates=w;try{scRenderTemplates=w}catch(e){}}
  // Acciones de partido: balonmano conserva las suyas; el resto de deportes empieza VACÍO y las define el entrenador
  const _acts=window.matchActionsForSport;
  if(typeof _acts==='function'&&!_acts._iso){const w=function(sp){if(sp==='handball')return _acts.apply(this,arguments);return flatActions(sp)};w._iso=true;window.matchActionsForSport=w;try{matchActionsForSport=w}catch(e){}}
  // Botonera de scouting de otros deportes: sin categoría impuesta («Ataque» es de balonmano) y reordenable
  const _add=window.scAddButton;
  if(typeof _add==='function'&&!_add._iso){const w=function(){
      if(active()===LEGACY)return _add.apply(this,arguments);
      const name=(prompt('Nombre del botón')||'').trim();if(!name)return;
      const known=[];(ST().scouting.buttons||[]).forEach(x=>{if(x.cat&&known.indexOf(x.cat)<0)known.push(x.cat)});
      const cat=(prompt('Categoría del botón (opcional, vacío = sin categoría)'+(known.length?'\nExistentes: '+known.join(', '):''),'')||'').trim();
      ST().scouting.buttons.push({name:name,cat:cat,color:(typeof scCategoryColor==='function'?scCategoryColor(cat):'#2563eb'),before:5,after:5});
      try{scSave()}catch(e){}try{scRender()}catch(e){console.error(e)}};
    w._iso=true;window.scAddButton=w;try{scAddButton=w}catch(e){}}
  window.vtcScMove=function(i,d){
    const s=ST(),B=s.scouting.buttons,j=i+d;if(!B[i]||!B[j])return;
    const swap=x=>x===i?j:(x===j?i:x);
    (s.scouting.links||[]).forEach(l=>{l.from=swap(Number(l.from));l.to=swap(Number(l.to))});
    const t=B[i];B[i]=B[j];B[j]=t;scSave();scRender()};
  const _sr=window.scRender;
  if(typeof _sr==='function'&&!_sr._iso){const w=function(){const r=_sr.apply(this,arguments);try{
      if(active()!==LEGACY)document.querySelectorAll('#scButtonEditor .sc-editor-row').forEach(function(row,i){
        if(row.dataset.vtcCat)return;row.dataset.vtcCat='1';const x=ST().scouting.buttons[i];if(!x)return;
        row.insertAdjacentHTML('afterbegin','<input class="vtc-sccat" placeholder="Categoría" value="'+esc(x.cat||'')+'" style="max-width:140px" onchange="scEditButton('+i+',\'cat\',this.value)"><button type="button" class="secondary" title="Subir" onclick="vtcScMove('+i+',-1)">▲</button><button type="button" class="secondary" title="Bajar" onclick="vtcScMove('+i+',1)">▼</button>')});
    }catch(e){}return r};w._iso=true;window.scRender=w;try{scRender=w}catch(e){}}
}

/* ---------- 8) EL CAMBIO DE DEPORTE (guardar → activar → cerrar → limpiar → cargar → refrescar) ---------- */
let switching=false;
window.vtcSwitchSport=async function(newSp){
  if(!ok(newSp)||switching)return;switching=true;
  const s=ST(),old=active();
  try{
    /* 1. Guardar lo pendiente del deporte actual (sin borrar nada) */
    try{if(typeof hcScCurrentProject!=='undefined'&&hcScCurrentProject&&typeof hcScCloseProject==='function')await hcScCloseProject()}catch(e){console.warn('Cierre de proyecto de scouting:',e)}
    try{if(typeof saveIndependentSystemCategories==='function'&&typeof systemCategoriesLoaded!=='undefined'&&systemCategoriesLoaded)await saveIndependentSystemCategories()}catch(e){console.warn('Sistemas de juego:',e)}
    stash(old);
    const cur=teamById(s.selectedTeam);if(cur&&teamSportOf(cur)===old)s.lastTeamBySport[old]=cur.id;
    try{if(typeof save==='function')save()}catch(e){}
    /* 2. Actualizar el deporte activo */
    window.vtcActiveSportFilter=newSp;
    /* 3. Cerrar fichas, ventanas y selecciones del deporte anterior */
    try{if(typeof closeModal==='function')closeModal()}catch(e){}
    ['clubHeaderModal'].forEach(id=>{const e=$(id);if(e)e.style.display='none'});
    document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open'));
    s.selectedPlayer=null;s.selectedMicro=null;s.selectedSession=null;s.selectedMatch=null;s.selectedExercise=null;s.selectedEvaluation=null;s.sessionExerciseDraft=null;
    s.selectedSeason=null;
    const vs=(s.seasons||[]).filter(x=>seasonVisible(x,newSp));if(vs.length)s.selectedSeason=vs[0].id;
    /* 4. Limpiar datos temporales de la interfaz */
    window._loadSelectedPlayerId='';window.vtcBoardSport=null;window.vtcShowZones=false;
    if(window.vtcEF)window.vtcEF.sport='auto';
    const sp=$('sessionsPanel');if(sp)sp.style.display='none';
    const md=$('matchDetail');if(md)md.innerHTML='';
    /* 5. Cargar exclusivamente los datos del nuevo deporte */
    const last=teamById(s.lastTeamBySport[newSp]);
    s.selectedTeam=(last&&teamSportOf(last)===newSp)?last.id:(teamsOf(newSp)[0]?teamsOf(newSp)[0].id:null);
    s.selectedMatchesTeam=s.selectedTeam;
    unstash(newSp);
    try{if(typeof scSave==='function')await scSave()}catch(e){}
    try{systemCategoriesReady=null;systemCategoriesLoadedForTeam=undefined;
      if(typeof loadIndependentSystemCategories==='function')await loadIndependentSystemCategories()}catch(e){console.warn('Carga de sistemas:',e)}
    try{if(typeof save==='function')save()}catch(e){}
    /* 6. Actualizar todas las secciones y pestañas */
    window._vtcStatusBusy=false;window._vtcForceStatusRefresh=true;
    try{window.vtcRefreshStatus&&window.vtcRefreshStatus()}catch(e){}
    const run=function(n){try{if(typeof window[n]==='function')window[n]()}catch(e){console.warn(n,e)}};
    ['render','renderSystem','renderExercises','renderMatches','renderEvaluation','renderLoadDashboard','renderScouting','renderClubHeader','scRenderTemplates'].forEach(run);
    try{const on=document.querySelector('nav button.active');const pg=(on&&on.dataset.page)||'home';if(typeof showPage==='function')showPage(pg)}catch(e){}
    try{filterTeamSelects();filterMatchSelects()}catch(e){}
    if(window.vtcToast){const t=teamById(s.selectedTeam);vtcToast('Deporte: '+sName(newSp)+(t?' · Equipo: '+t.name:' · Sin equipos todavía')+'. Los datos de '+sName(old)+' siguen guardados.',4000)}
  }finally{switching=false}
};


/* ---------- 9) Toma de datos de partido: categorías y acciones propias de cada deporte (vacío por defecto; balonmano conserva la suya) ---------- */
function cfg(sp){const c=ST().matchConfigBySport&&ST().matchConfigBySport[sp];return(c&&Array.isArray(c.cats))?c:{cats:[]}}
function flatActions(sp){const o=[];cfg(sp).cats.forEach(c=>(c.actions||[]).forEach(a=>o.push([a.key,a.label])));return o}
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let draft=null;
function drawEditor(){
  const box=$('vtcCfgBox');if(!box)return;
  const mv=(op,c,a)=>'<button type="button" class="secondary" data-op="'+op+'" data-c="'+c+'"'+(a!==undefined?' data-a="'+a+'"':'')+'>';
  box.innerHTML=draft.cats.length?draft.cats.map((c,ci)=>'<div class="card" style="margin:8px 0;padding:10px"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><input data-f="cat" data-c="'+ci+'" value="'+esc(c.name)+'" placeholder="Nombre de la categoría" style="flex:1;min-width:160px;font-weight:bold">'+mv('catUp',ci)+'▲</button>'+mv('catDown',ci)+'▼</button>'+mv('catDel',ci)+'🗑️</button></div>'+
    (c.actions||[]).map((a,ai)=>'<div style="display:flex;gap:6px;align-items:center;margin:5px 0 0 18px"><input data-f="act" data-c="'+ci+'" data-a="'+ai+'" value="'+esc(a.label)+'" placeholder="Nombre de la acción" style="flex:1">'+mv('actUp',ci,ai)+'▲</button>'+mv('actDown',ci,ai)+'▼</button>'+mv('actDel',ci,ai)+'🗑️</button></div>').join('')+
    '<div style="margin:8px 0 0 18px">'+mv('actAdd',ci)+'＋ Acción</button></div></div>').join(''):'<div class="empty">Todavía no hay categorías. Crea la primera para empezar a definir tus acciones.</div>';
}
function moveIn(arr,i,d){const j=i+d;if(i<0||j<0||j>=arr.length)return;const t=arr[i];arr[i]=arr[j];arr[j]=t}
function actionsEditor(){
  const s=ST(),sp=active();draft=clone(cfg(sp));
  openModal('<h2>⚙️ Toma de datos · '+esc(sName(sp))+'</h2><p class="muted">Define tus propias categorías y acciones. Solo valen para este deporte; no afectan a los partidos ya registrados.</p><div id="vtcCfgBox"></div><div style="margin-top:8px"><button type="button" class="secondary" data-op="catAdd">＋ Categoría</button></div><div class="form-actions"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="primary" id="vtcCfgSave">Guardar</button></div>');
  drawEditor();
  const mb=$('modalBox');
  mb.oninput=function(e){const t=e.target,f=t.dataset&&t.dataset.f;if(!f)return;const c=draft.cats[+t.dataset.c];if(f==='cat')c.name=t.value;else c.actions[+t.dataset.a].label=t.value};
  mb.onclick=function(e){const b=e.target.closest&&e.target.closest('[data-op]');if(!b||!draft)return;const op=b.dataset.op,ci=+b.dataset.c,ai=+b.dataset.a,c=draft.cats[ci];
    if(op==='catAdd')draft.cats.push({id:uid('c_'),name:'',actions:[]});
    else if(op==='catUp')moveIn(draft.cats,ci,-1);else if(op==='catDown')moveIn(draft.cats,ci,1);
    else if(op==='catDel'){if(!(c.actions||[]).length||confirm('¿Eliminar la categoría «'+c.name+'» y sus acciones? Los partidos ya registrados conservan sus datos.'))draft.cats.splice(ci,1)}
    else if(op==='actAdd')c.actions.push({key:uid('a_'),label:''});
    else if(op==='actUp')moveIn(c.actions,ai,-1);else if(op==='actDown')moveIn(c.actions,ai,1);
    else if(op==='actDel')c.actions.splice(ai,1);
    drawEditor();
    if(op==='catAdd'||op==='actAdd'){const L=mb.querySelectorAll(op==='catAdd'?'[data-f=cat]':'[data-f=act][data-c="'+ci+'"]');if(L.length)L[L.length-1].focus()}};
  $('vtcCfgSave').onclick=function(){
    draft.cats=draft.cats.filter(c=>String(c.name).trim()||(c.actions||[]).some(a=>String(a.label).trim()));
    draft.cats.forEach(c=>{c.name=String(c.name).trim()||'Sin nombre';c.actions=(c.actions||[]).filter(a=>String(a.label).trim()).map(a=>({key:a.key,label:String(a.label).trim()}))});
    s.matchConfigBySport=s.matchConfigBySport||{};s.matchConfigBySport[sp]=draft;draft=null;mb.oninput=null;mb.onclick=null;
    closeModal();save();if(typeof renderMatchDetail==='function')renderMatchDetail();
  };
}
function wrapMatchSummary(){
  const o=window.renderMatchSummary;if(typeof o!=='function'||o._iso)return;
  const w=function(m,t){
    const sp=matchSport(m);if(sp==='handball')return o.apply(this,arguments);
    const ev=m.events||[],n=k=>ev.filter(e=>e.action===k&&e.team==='own').length,c=cfg(sp).cats;
    return '<div class="card"><h3>📊 Resumen · '+esc(S()[sp]?S()[sp].name:sp)+'</h3>'+(c.length?c.map(k=>'<div style="margin:6px 0"><b>'+esc(k.name)+'</b><div class="match-grid">'+(k.actions||[]).map(a=>'<div class="match-stat"><b>'+esc(a.label)+'</b><br>'+n(a.key)+'</div>').join('')+'</div></div>').join(''):'<div class="muted">Todavía no has definido acciones para este deporte. Usa «Configurar toma de datos».</div>')+'</div>';
  };w._iso=true;window.renderMatchSummary=w;try{renderMatchSummary=w}catch(e){}
}
function wrapMatchDetail(){
  const o=window.renderMatchDetail;if(typeof o!=='function'||o._iso)return;
  const w=function(){const r=o.apply(this,arguments);try{
    const s=ST(),m=(s.matches||[]).find(x=>String(x.id)===String(s.selectedMatch)),el=$('matchDetail');
    if(m&&el&&matchSport(m)!=='handball'){
      const tb=el.querySelector('.toolbar');
      if(tb&&!$('vtcActBtn')){const b=document.createElement('button');b.type='button';b.id='vtcActBtn';b.className='secondary';b.textContent='⚙️ Configurar toma de datos';b.onclick=actionsEditor;tb.appendChild(b)}
      const cats=cfg(matchSport(m)).cats.filter(c=>(c.actions||[]).length),tr=el.querySelector('table thead tr');
      if(tr&&cats.length&&!tr.previousElementSibling){tr.insertAdjacentHTML('beforebegin','<tr><th></th>'+cats.map(c=>'<th colspan="'+c.actions.length+'" style="font-size:11px;background:#dbe7f5;border:1px solid #bbb">'+esc(c.name)+'</th>').join('')+'<th></th></tr>')}
      if(!flatActions(matchSport(m)).length&&tb&&!$('vtcActHint'))tb.insertAdjacentHTML('afterend','<div id="vtcActHint" class="muted" style="margin:8px 0">Este deporte empieza sin acciones. Pulsa «Configurar toma de datos» para crear tus categorías y acciones.</div>');
    }
  }catch(e){console.warn(e)}return r};w._iso=true;window.renderMatchDetail=w;try{renderMatchDetail=w}catch(e){}
}

/* ---------- Arranque ---------- */
let raf=0;
function sweep(){cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){try{filterTeamSelects();filterMatchSelects();injectClassifyBtn();filterCatSelect()}catch(e){}})}
function boot(){
  try{
    wrapRender();wrapEx();patchOpenExercise();wrapScouting();wrapMatchSummary();wrapMatchDetail();
    // Aplicar el flujo de aislamiento a lo que ya se pintó al arrancar (sin tocar datos)
    guardSelections();
    const _ss=window.saveSeason;
    if(typeof _ss==='function'&&!_ss._iso){const w=function(id){const s=ST(),before=new Set((s.seasons||[]).map(x=>x.id));const r=_ss.apply(this,arguments);
      (s.seasons||[]).forEach(x=>{if(!before.has(x.id)&&!ok(x.sport))x.sport=active()});try{save()}catch(e){}return r};w._iso=true;window.saveSeason=w}
    // El renderizado de ejercicios debe reflejar también el botón de clasificación
    const _re=window.renderExercises;
    if(typeof _re==='function'&&!_re._iso){const w=function(){const r=_re.apply(this,arguments);try{injectClassifyBtn()}catch(e){}return r};w._iso=true;window.renderExercises=w}
    if(typeof window.render==='function')window.render();
    try{window.vtcRefreshStatus&&window.vtcRefreshStatus()}catch(e){}
  }catch(e){console.error('vtc-isolation:',e)}
}
new MutationObserver(sweep).observe(document.body,{childList:true,subtree:true});
if(document.readyState==='complete')setTimeout(boot,700);else window.addEventListener('load',function(){setTimeout(boot,700)});
})();
