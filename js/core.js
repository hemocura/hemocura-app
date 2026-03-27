'use strict';
// ══ HEMOCURA v10 — Core: State, LS, Weeks, Tables, UI ══

const APP = { version:'10', name:'HEMOCURA' };

const LS_KEYS = {
  weeks:'hemo_v10_weeks', tasks:'hemo_v10_tasks', reminders:'hemo_v10_reminders',
  ventas:'hemo_v10_ventas', creditos:'hemo_v10_creditos', sucursales:'hemo_v10_sucursales',
  reuniones:'hemo_v10_reuniones', visitas:'hemo_v10_visitas', images:'hemo_v10_images',
  incidencias:'hemo_v10_inc', incFiles:'hemo_v10_incfiles', evalScores:'hemo_v10_eval',
  contactos:'hemo_v10_contactos', empresas:'hemo_v10_empresas',
  dashConfig:'hemo_v10_dashconfig', clientes:'hemo_v10_clientes'
};

const QUOTES = [
  '"El liderazgo no es una posición, es una acción." — Donald McGannon',
  '"La función del liderazgo es producir más líderes, no más seguidores." — Ralph Nader',
  '"Un líder es alguien que conoce el camino, lo recorre y lo muestra." — John C. Maxwell',
  '"La diferencia entre un líder y un jefe: el líder lleva al equipo, el jefe lo empuja." — T. Roosevelt',
  '"El éxito no es definitivo; lo que cuenta es el coraje de continuar." — Winston Churchill',
  '"La visión sin acción es un sueño. La acción sin visión es una pesadilla." — Proverbio japonés',
  '"El mejor momento para actuar fue ayer. El segundo mejor momento es ahora." — Proverbio chino',
  '"Un equipo alineado en propósito supera a cualquier individuo de talento aislado." — Pat Riley',
  '"La disciplina es el puente entre metas y logros." — Jim Rohn',
  '"No lideres personas; lidera causas que inspiren a personas." — Simon Sinek',
  '"Las ventas son sobre construir confianza, no solo sobre cerrar tratos." — Siva Devaki',
  '"La excelencia no es un acto, es un hábito." — Aristóteles',
  '"El cliente es la razón por la que existimos; el servicio es la razón por la que regresa." — Anónimo',
  '"Cada visita a una sucursal es una oportunidad de construir lealtad." — Ing. G. Espaillat D.',
  '"Los datos son el mapa; la ejecución es el viaje." — Anónimo'
];

const TABLE_CONFIG = {
  inspeccion:{ types:['num','suc-sel','text','tel','date','time','textarea','sel-estado','del'] },
  jornadas:{ types:['num','suc-sel','text','date','time','sel-modal','number','sel-estado','textarea','del'] },
  acciones:{ types:['num','sel-acc','text','suc-sel','text','date','sel-estado','textarea','del'] }
};
const SEL_OPTS = {
  'sel-estado':['Activa','Pendiente','Cancelada','Realizada'],
  'sel-modal':['Presencial','Virtual','Híbrida'],
  'sel-acc':['Insumo','Servicio','Jornada','Visita','Reunión','Otro']
};

// State
window.State = {
  tasks:[], reminders:[], ventas:[], creditos:[], sucursales:[],
  reuniones:[], visitas:[], images:{}, incidencias:{}, incFiles:{},
  contactos:[], empresas:[], clientes:[],
  evalScores:{insp:0,cont:0,jorn:0,club:0},
  editVenta:null, editCredito:null, editSucursal:null, editReunion:null,
  editTask:null, editInc:null, editContacto:null,
  pendingIncFiles:[], creditoView:'semanal',
  dashConfig:null,
  charts:{}, autoSaveTimer:null, currentTab:'inicio'
};

// LS helpers
function lsGet(k,fb=null){try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb}catch{return fb}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){if(e.name==='QuotaExceededError')UI.toast('⚠️ Almacenamiento lleno','warn');return false}}
function getAllWeeks(){return lsGet(LS_KEYS.weeks,{})}
function saveAllWeeks(w){lsSet(LS_KEYS.weeks,w)}

// Date/week helpers
function getWeekKey(date){
  const d=date?new Date(date+'T00:00:00'):new Date();
  const y=d.getFullYear(),s=new Date(y,0,1);
  const w=Math.ceil(((d-s)/86400000+s.getDay()+1)/7);
  return `${y}-W${String(w).padStart(2,'0')}`;
}
function getCurrentWeekKey(){const f=el('meta-fecha')?.value;return f?getWeekKey(f):getWeekKey()}
function escH(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function fmt$(n){return Number(n||0).toLocaleString('es-DO',{minimumFractionDigits:2,maximumFractionDigits:2})}
function fmtDate(d){if(!d)return'';try{return new Date(d+'T00:00:00').toLocaleDateString('es-DO',{day:'2-digit',month:'short',year:'numeric'})}catch{return d}}
function turnoLabel(t){
  const m={
    dia:'☀️ Día', noche:'🌙 Noche',
    // Legacy support for old records
    mañana:'☀️ Día', tarde:'☀️ Día', completo:'☀️ Día'
  };
  return m[t]||t||'';
}
function uid(){return Date.now()+'_'+Math.random().toString(36).slice(2,7)}
function el(id){return document.getElementById(id)}
function gv(id){return el(id)?.value||''}
function sv(id,val){const e=el(id);if(e)e.value=val}
function st(id,txt){const e=el(id);if(e)e.textContent=txt}

// Auto-save
function scheduleAutoSave(){clearTimeout(State.autoSaveTimer);State.autoSaveTimer=setTimeout(()=>Weeks.save(),2500)}
document.addEventListener('input',scheduleAutoSave);
document.addEventListener('change',scheduleAutoSave);

// ══ UI MODULE ══
window.UI = {
  currentTab:'inicio',
  switchTab(btn){
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); this.currentTab=btn.dataset.tab;
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    const p=el('panel-'+this.currentTab); if(p)p.classList.add('active');
    this._onTab(this.currentTab);
    this.closeSidebar();
  },
  switchTabByName(name){const b=document.querySelector(`[data-tab="${name}"]`);if(b)this.switchTab(b)},
  _onTab(tab){
    if(tab==='contactos')Contactos.render()
    if(tab==='ventas'){Ventas.render();setTimeout(()=>Ventas.buildCharts(),80)}
    if(tab==='creditos'){Creditos.render();setTimeout(()=>Creditos.buildChart(),80)}
    if(tab==='sucursales')Sucursales.render()
    if(tab==='reuniones')Reuniones.render()
    if(tab==='agenda'){Agenda.renderTasks();Agenda.renderWeek();Agenda.updateKPIs();Reminders.renderList()}
    if(tab==='evaluacion'){Eval.init();Eval.buildTaskComp()}
    if(tab==='dashboard')setTimeout(()=>Dashboard.build(),80)
    if(tab==='galeria'){Galeria.render();this.updateBadges()}
    if(tab==='incidencias')Incidencias.render()
    if(tab==='resumen')this.buildResumen()
    if(tab==='sugerencias')Sugerencias.refresh()
    if(tab==='noticias')Noticias.load()
  },
  openModal(id){el(id).classList.add('open')},
  closeModal(id){el(id).classList.remove('open')},
  toggleSidebar(){const n=el('sidenav'),o=el('sidebar-ov');n.classList.toggle('open');o.classList.toggle('show')},
  closeSidebar(){el('sidenav').classList.remove('open');el('sidebar-ov').classList.remove('show')},
  toggleExportMenu(){el('export-menu').classList.toggle('open')},
  _toastTimer:null,
  toast(msg,type=''){
    const t=el('toast');t.textContent=msg;t.className=type?type:'';
    void t.offsetWidth;t.classList.add('show');
    clearTimeout(this._toastTimer);this._toastTimer=setTimeout(()=>t.classList.remove('show'),3500)
  },
  openLightbox(src,cap){el('lb-img').src=src;el('lb-cap').textContent=cap||'';el('lightbox').style.display='flex'},
  closeLightbox(){el('lightbox').style.display='none'},
  updateBadges(){
    const wk=getCurrentWeekKey();
    const tbCounts={inspeccion:0,jornadas:0,acciones:0};
    Object.keys(tbCounts).forEach(id=>{tbCounts[id]=el('tbody-'+id)?.rows.length||0});
    st('nb-insp',tbCounts.inspeccion);
    st('nb-jorn',tbCounts.jornadas);st('nb-acc',tbCounts.acciones);
    st('k-insp',tbCounts.inspeccion);
    // Contactos from State
    const wContacts=State.contactos.filter(c=>c.weekKey===wk).length;
    st('nb-cont',wContacts);st('k-cont',wContacts);
    // Ventas
    const wv=State.ventas.filter(v=>getWeekKey(v.fecha)===wk);
    const tu=wv.reduce((s,v)=>s+(v.st||0)+(v.pg||0)+(v.pl||0)+(v.pa||0),0);
    st('nb-ventas',wv.length);st('k-unidades',tu);
    // Creditos
    const ca=State.creditos.filter(c=>c.estado==='activo'||c.estado==='en-gestion').length;
    st('nb-cred',ca);
    // Reuniones
    const rt=State.reuniones.length;
    const rp=State.reuniones.filter(r=>r.estado==='programada'&&r.fecha>=new Date().toISOString().split('T')[0]).length;
    st('nb-reun',rt);st('k-reun',rt);
    // Galeria
    const wvis=State.visitas.filter(v=>v.weekKey===wk);
    const ti=wvis.reduce((s,v)=>s+(State.images[v.id]?.length||0),0);
    st('nb-imgs',ti);
    // Incidencias
    const ia=Object.values(State.incidencias).filter(i=>i.estado!=='resuelta').length;
    st('nb-inc',ia);
    // Agenda
    const pend=State.tasks.filter(t=>t.status!=='completada').length;
    st('nb-agenda',pend);
    // Reminders badge
    const today=new Date().toISOString().split('T')[0];
    const ov=State.tasks.filter(t=>t.status!=='completada'&&t.date&&t.date<today).length;
    const ar=State.reminders.filter(r=>!r.dismissed&&(!r.date||r.date<=today)).length;
    const nb=el('notif-badge'); if(nb){nb.textContent=ov+ar;nb.style.display=ov+ar>0?'flex':'none'}
  },
  buildResumen(){
    const c=el('resumen-content');if(!c)return;
    const wk=getCurrentWeekKey();
    const wv=State.ventas.filter(v=>getWeekKey(v.fecha)===wk);
    const tu=wv.reduce((s,v)=>s+(v.st||0)+(v.pg||0)+(v.pl||0)+(v.pa||0),0);
    const tasks=State.tasks.filter(t=>!t.weekKey||t.weekKey===wk);
    const done=tasks.filter(t=>t.status==='completada').length;
    const pct=tasks.length?Math.round(done/tasks.length*100):0;
    c.innerHTML=`<div class="card">
      <div style="text-align:center;padding:6px 0 16px">
        <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--hemo-m);margin-bottom:4px">HEMOCURA – Gestión Comercial v10</div>
        <div style="font-family:'Syne',sans-serif;font-size:21px;font-weight:800;color:var(--hemo-d)">Reporte Semanal</div>
        <div style="font-size:13px;color:var(--ink3);margin-top:2px">${gv('meta-gerente')} · ${gv('meta-periodo')} · ${gv('meta-num')}</div>
      </div>
      <div class="kpi-row" style="grid-template-columns:repeat(4,1fr)">
        <div class="kpi accent"><div class="kv">${el('tbody-inspeccion')?.rows.length||0}</div><div class="kl">Inspecciones</div></div>
        <div class="kpi blue"><div class="kv">${State.contactos.filter(c=>c.weekKey===wk).length}</div><div class="kl">Contactos</div></div>
        <div class="kpi green"><div class="kv">${tu}</div><div class="kl">Unidades Hemo</div></div>
        <div class="kpi amber"><div class="kv">${pct}%</div><div class="kl">Agenda</div></div>
      </div>
    </div>
    <div class="card"><div class="card-hd"><div class="card-title">🩸 Despacho de Hemoderivados</div></div>
      ${wv.length?`<table style="font-size:12px;width:100%;border-collapse:collapse">${wv.map(v=>`<tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 8px"><strong>${escH(v.sucursal)}</strong></td><td style="padding:6px 8px">${turnoLabel(v.turno)}</td><td>${fmtDate(v.fecha)}</td><td style="padding:6px 8px">ST:${v.st||0} PG:${v.pg||0} PL:${v.pl||0} PA:${v.pa||0}</td></tr>`).join('')}</table>`:'<p style="color:var(--ink4);font-size:13px">Sin ventas esta semana.</p>'}
    </div>
    <div class="card"><div class="card-hd"><div class="card-title">Observaciones</div></div>
      <div class="obs-grid">${['logros','dificultades','proxima','reco'].map(f=>{const v=gv('obs-'+f);const h={logros:'✅ Logros',dificultades:'🚧 Dificultades',proxima:'🎯 Próxima Semana',reco:'💡 Recomendaciones'};return v?`<div class="obs-box"><div class="obs-hd">${h[f]}</div><div style="padding:10px 12px;font-size:13px;color:var(--ink2)">${escH(v)}</div></div>`:''}).join('')}</div>
    </div>`;
  }
};

// ══ WEEKS MODULE ══
window.Weeks = {
  updatePeriod(){
    const f=gv('meta-fecha');if(!f)return;
    const d=new Date(f+'T00:00:00');
    const mon=new Date(d);mon.setDate(d.getDate()-d.getDay()+1);
    const fri=new Date(mon);fri.setDate(mon.getDate()+4);
    const fmt=x=>x.toLocaleDateString('es-DO',{day:'2-digit',month:'short'});
    sv('meta-periodo',`${fmt(mon)} – ${fmt(fri)}, ${d.getFullYear()}`);
    el('topbar-period').textContent=`${fmt(mon)} – ${fmt(fri)}`;
    this.renderList(); this.populatePeriodSelect();
    Greeting.update();
  },
  collectTableData(){
    const r={};
    Object.keys(TABLE_CONFIG).forEach(id=>{
      const tb=el('tbody-'+id);if(!tb)return;
      r[id]=Array.from(tb.rows).map(tr=>Array.from(tr.cells).map((td,i)=>{
        if(i===0||i===tr.cells.length-1)return'';
        const inp=td.querySelector('input,select,textarea');return inp?inp.value:td.textContent;
      }));
    });
    return r;
  },
  save(){
    const key=getCurrentWeekKey();if(!key)return;
    const weeks=getAllWeeks();
    weeks[key]={
      meta:{gerente:gv('meta-gerente'),fecha:gv('meta-fecha'),periodo:gv('meta-periodo'),num:gv('meta-num')},
      tables:this.collectTableData(),
      eval:{scores:{...State.evalScores},logros:gv('obs-logros'),dificultades:gv('obs-dificultades'),proxima:gv('obs-proxima'),reco:gv('obs-reco')},
      saved:new Date().toISOString()
    };
    saveAllWeeks(weeks);
    lsSet(LS_KEYS.tasks,State.tasks);lsSet(LS_KEYS.reminders,State.reminders);
    lsSet(LS_KEYS.ventas,State.ventas);lsSet(LS_KEYS.creditos,State.creditos);
    lsSet(LS_KEYS.reuniones,State.reuniones);lsSet(LS_KEYS.visitas,State.visitas);
    lsSet(LS_KEYS.incidencias,State.incidencias);lsSet(LS_KEYS.sucursales,State.sucursales);
    lsSet(LS_KEYS.evalScores,State.evalScores);
    lsSet(LS_KEYS.contactos,State.contactos);lsSet(LS_KEYS.empresas,State.empresas);
    lsSet(LS_KEYS.clientes,State.clientes);
    if(State.dashConfig)lsSet(LS_KEYS.dashConfig,State.dashConfig);
    this.renderList();this.populatePeriodSelect();UI.updateBadges();
    // Schedule debounced sync (only calls API after 5 min of inactivity)
    if(typeof Sync !== 'undefined') Sync.scheduleUpload();
  },
  load(key){
    const data=getAllWeeks()[key];if(!data)return;
    if(data.meta){['gerente','fecha','periodo','num'].forEach(f=>{const e=el('meta-'+f);if(e&&data.meta[f])e.value=data.meta[f]});this.updatePeriod()}
    Object.keys(TABLE_CONFIG).forEach(id=>{
      const tb=el('tbody-'+id);if(!tb)return;tb.innerHTML='';
      const rows=data.tables?.[id]||[];
      if(!rows.length){Tables.addRow(id);return}
      rows.forEach(r=>Tables.addRow(id,r));
    });
    if(data.eval){State.evalScores=data.eval.scores||{insp:0,cont:0,jorn:0,club:0};['logros','dificultades','proxima','reco'].forEach(f=>{const e=el('obs-'+f);if(e)e.value=data.eval[f]||''});}
    UI.updateBadges();this.populatePeriodSelect();
    UI.toast(`📂 ${data.meta?.periodo||key} cargada`,'inf');
  },
  openNew(){sv('nw-fecha',new Date().toISOString().split('T')[0]);sv('nw-num','');sv('nw-notas','');UI.openModal('modal-new-week')},
  create(){
    const f=gv('nw-fecha');if(!f){UI.toast('⚠️ Selecciona fecha','warn');return}
    this.save();
    Object.keys(TABLE_CONFIG).forEach(id=>{const tb=el('tbody-'+id);if(tb)tb.innerHTML='';Tables.addRow(id)});
    State.evalScores={insp:0,cont:0,jorn:0,club:0};
    ['logros','dificultades','proxima','reco'].forEach(f=>{const e=el('obs-'+f);if(e)e.value=''});
    sv('meta-fecha',f);sv('meta-num',gv('nw-num'));this.updatePeriod();UI.updateBadges();
    UI.closeModal('modal-new-week');UI.toast('✅ Nueva semana creada','ok');
  },
  confirmClear(){if(!confirm('¿Limpiar datos de la semana actual?'))return;Object.keys(TABLE_CONFIG).forEach(id=>{const tb=el('tbody-'+id);if(tb)tb.innerHTML='';Tables.addRow(id)});UI.updateBadges();UI.toast('🗑 Semana limpiada','err')},
  renderList(){
    const c=el('week-list');if(!c)return;
    const weeks=getAllWeeks(),keys=Object.keys(weeks).sort().reverse().slice(0,15);
    const cur=getCurrentWeekKey();
    if(!keys.length){c.innerHTML='<p style="font-size:11px;color:var(--ink4);padding:6px 10px">Sin semanas guardadas</p>';return}
    c.innerHTML=keys.map(k=>{const w=weeks[k];const cnt=Object.values(w.tables||{}).reduce((s,r)=>s+r.length,0);
      return `<div class="week-chip ${k===cur?'active':''}" onclick="Weeks.load('${k}')">
        <div class="wc-dot"></div>
        <div class="wc-info"><div class="wc-title">${w.meta?.periodo||k}</div><div class="wc-meta">${cnt} reg · ${w.meta?.num||''}</div></div>
        <button class="wc-del" onclick="event.stopPropagation();Weeks.delete('${k}')">✕</button>
      </div>`;}).join('');
  },
  delete(k){if(!confirm('¿Eliminar semana del historial?'))return;const w=getAllWeeks();delete w[k];saveAllWeeks(w);this.renderList();this.populatePeriodSelect();UI.toast('Semana eliminada','err')},
  populatePeriodSelect(){
    const sel=el('period-jump');if(!sel)return;
    const weeks=getAllWeeks(),cur=getCurrentWeekKey();
    const keys=Object.keys(weeks).sort().reverse();
    sel.innerHTML='<option value="">📅 Historial…</option>'+keys.map(k=>{const w=weeks[k];return`<option value="${k}"${k===cur?' selected':''}>${w.meta?.periodo||k}${k===cur?' ✓':''}</option>`}).join('');
  },
  jumpTo(key){if(!key)return;this.save();this.load(key);el('period-jump').value=''},
  openLoadHistory(){
    const weeks=getAllWeeks(),keys=Object.keys(weeks).sort().reverse();
    const sel=el('hist-sel');sel.innerHTML='<option value="">-- Seleccionar --</option>'+keys.map(k=>`<option value="${k}">${weeks[k]?.meta?.periodo||k}</option>`).join('');
    sv('hist-new-date','');el('hist-preview').innerHTML='Selecciona una semana.';
    UI.openModal('modal-history');
  },
  previewHistory(key){
    const el2=el('hist-preview');if(!el2)return;
    const data=getAllWeeks()[key];if(!data){el2.innerHTML='Selecciona.';return}
    const t=data.tables||{};
    el2.innerHTML=`<div style="display:flex;gap:10px;flex-wrap:wrap">${[['inspeccion','🔍','Insp.'],['contactos','🤝','Cont.'],['jornadas','📋','Jorn.'],['acciones','⚡','Acc.']].map(([id,ico,lbl])=>`<div style="text-align:center;padding:8px 12px;background:var(--white);border-radius:8px;border:1px solid var(--border)"><div>${ico}</div><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--hemo-d)">${t[id]?.length||0}</div><div style="font-size:10px;color:var(--ink4)">${lbl}</div></div>`).join('')}</div><div style="font-size:11.5px;color:var(--ink3);margin-top:8px">Guardado: ${data.saved?new Date(data.saved).toLocaleDateString('es-DO'):'-'}</div>`;
  },
  createHistory(){
    const d=gv('hist-new-date');if(!d){UI.toast('⚠️ Selecciona fecha','warn');return}
    const key=getWeekKey(d),weeks=getAllWeeks();
    if(!weeks[key]){weeks[key]={meta:{fecha:d,periodo:key,num:''},tables:{},eval:{},saved:new Date().toISOString()};saveAllWeeks(weeks)}
    const sel=el('hist-sel');const opt=document.createElement('option');opt.value=key;opt.textContent=key;opt.selected=true;sel.appendChild(opt);
    this.previewHistory(key);UI.toast('Semana creada','ok');
  },
  loadHistory(){
    const key=gv('hist-sel');if(!key){UI.toast('⚠️ Selecciona semana','warn');return}
    this.save();this.load(key);UI.closeModal('modal-history');
  }
};

// ══ TABLES MODULE ══
window.Tables = {
  addRow(tableId, data=[]){
    const tb=el('tbody-'+tableId);if(!tb)return;
    const cfg=TABLE_CONFIG[tableId];if(!cfg)return;
    const rowIdx=tb.rows.length+1;
    const tr=document.createElement('tr');
    cfg.types.forEach((type,ci)=>{
      const td=document.createElement('td'),val=data[ci]||'';
      if(type==='num'){td.textContent=rowIdx}
      else if(type==='del'){td.innerHTML=`<button class="btn-del" onclick="Tables.delRow(this,'${tableId}')" title="Eliminar">🗑</button>`}
      else if(type==='textarea'){const ta=document.createElement('textarea');ta.rows=2;ta.value=val;ta.style.minWidth='90px';ta.addEventListener('input',scheduleAutoSave);td.appendChild(ta)}
      else if(type==='suc-sel'){
        const s=document.createElement('select');s.innerHTML=Sucursales.getOptionsHTML(val);
        s.addEventListener('change',()=>{scheduleAutoSave();UI.updateBadges()});td.appendChild(s);
      }
      else if(type.startsWith('sel')){
        const s=document.createElement('select');
        s.innerHTML=(SEL_OPTS[type]||[]).map(o=>`<option${o===val?' selected':''}>${o}</option>`).join('');
        s.addEventListener('change',scheduleAutoSave);td.appendChild(s);
      }
      else{
        const inp=document.createElement('input');
        inp.type={date:'date',time:'time',number:'number',tel:'tel',email:'email'}[type]||'text';
        inp.value=val;inp.addEventListener('input',()=>{scheduleAutoSave();UI.updateBadges()});td.appendChild(inp);
      }
      tr.appendChild(td);
    });
    tb.appendChild(tr);scheduleAutoSave();UI.updateBadges();
  },
  delRow(btn,tableId){
    const tr=btn.closest('tr');tr.remove();
    const tb=el('tbody-'+tableId);if(!tb)return;
    Array.from(tb.rows).forEach((r,i)=>{const f=r.querySelector('td:first-child');if(f)f.textContent=i+1});
    UI.updateBadges();scheduleAutoSave();
  }
};

// ══ GREETING MODULE ══
window.Greeting = {
  update(){
    const h=new Date().getHours();
    const g=h<12?'Buenos días':h<18?'Buenas tardes':'Buenas noches';
    const gerente=gv('meta-gerente')||'Ing. Gustavo Espaillat D.';
    const ge=el('greeting');if(ge)ge.textContent=`${g}, ${gerente}`;
    const qe=el('daily-quote');if(qe)qe.textContent=QUOTES[new Date().getDay()%QUOTES.length];
  }
};

// ══ REMINDERS MODULE ══
window.Reminders = {
  openModal(){sv('rem-msg','');sv('rem-date',new Date().toISOString().split('T')[0]);sv('rem-type','info');UI.openModal('modal-rem')},
  save(){
    const msg=gv('rem-msg').trim();if(!msg){UI.toast('⚠️ Mensaje obligatorio','warn');return}
    State.reminders.push({id:uid(),msg,date:gv('rem-date'),type:gv('rem-type'),dismissed:false});
    lsSet(LS_KEYS.reminders,State.reminders);UI.closeModal('modal-rem');this.renderList();this.check();UI.toast('🔔 Recordatorio creado','ok');
  },
  dismiss(id){const r=State.reminders.find(x=>x.id===id);if(r)r.dismissed=true;lsSet(LS_KEYS.reminders,State.reminders);this.renderList();this.check()},
  delete(id){State.reminders=State.reminders.filter(x=>x.id!==id);lsSet(LS_KEYS.reminders,State.reminders);this.renderList();this.check()},
  check(){
    const today=new Date().toISOString().split('T')[0];
    const ov=State.tasks.filter(t=>t.status!=='completada'&&t.date&&t.date<today).length;
    const ar=State.reminders.filter(r=>!r.dismissed&&(!r.date||r.date<=today)).length;
    const n=ov+ar,nb=el('notif-badge');if(nb){nb.textContent=n;nb.style.display=n>0?'flex':'none'}
    this._renderInicioAlerts(ov,ar);
  },
  _renderInicioAlerts(ov,ar){
    const c=el('inicio-alerts');if(!c)return;
    const today=new Date().toISOString().split('T')[0];
    const ovTasks=State.tasks.filter(t=>t.status!=='completada'&&t.date&&t.date<today);
    const arRems=State.reminders.filter(r=>!r.dismissed&&(!r.date||r.date<=today));
    let html='';
    ovTasks.forEach(t=>{html+=`<div class="rem-card overdue"><div>⚠️</div><div style="flex:1"><div class="rem-msg">Tarea vencida: ${escH(t.title)}</div><div class="rem-meta">📅 ${fmtDate(t.date)}</div></div><button class="rem-dismiss" onclick="Agenda.complete('${t.id}');Reminders.check()">✓</button></div>`});
    arRems.forEach(r=>{html+=`<div class="rem-card ${r.type}"><div>🔔</div><div style="flex:1"><div class="rem-msg">${escH(r.msg)}</div><div class="rem-meta">${r.date?'📅 '+fmtDate(r.date):''}</div></div><button class="rem-dismiss" onclick="Reminders.dismiss('${r.id}');Reminders.check()">✓</button></div>`});
    c.innerHTML=html||'<p style="color:var(--green);font-size:13px">✅ Sin alertas pendientes.</p>';
  },
  renderList(){
    const c=el('reminders-list');if(!c)return;
    const active=State.reminders.filter(r=>!r.dismissed);
    if(!active.length){c.innerHTML='<p style="color:var(--ink4);font-size:13px;padding:6px 0">Sin recordatorios activos.</p>';return}
    const ICONS={info:'📋',alerta:'⚠️',urgente:'🔴',seguimiento:'🔄'};
    c.innerHTML=active.map(r=>`<div class="rem-card ${r.type}"><div>${ICONS[r.type]||'📋'}</div><div style="flex:1"><div class="rem-msg">${escH(r.msg)}</div><div class="rem-meta">${r.date?'📅 '+fmtDate(r.date):''}</div></div><button class="rem-dismiss" onclick="Reminders.dismiss('${r.id}')">✓</button><button class="rem-dismiss" onclick="Reminders.delete('${r.id}')">✕</button></div>`).join('');
  },
  showPanel(){
    const today=new Date().toISOString().split('T')[0];
    const ovTasks=State.tasks.filter(t=>t.status!=='completada'&&t.date&&t.date<today);
    const arRems=State.reminders.filter(r=>!r.dismissed);
    let html='';
    if(ovTasks.length)html+=`<div style="font-size:10.5px;font-weight:700;color:var(--hemo-d);text-transform:uppercase;margin-bottom:7px">⚠️ Tareas Vencidas (${ovTasks.length})</div>`+ovTasks.map(t=>`<div class="rem-card alerta"><div>📋</div><div style="flex:1"><div class="rem-msg">${escH(t.title)}</div><div class="rem-meta">Venció el ${fmtDate(t.date)}</div></div><button class="rem-dismiss" onclick="Agenda.complete('${t.id}');Reminders.showPanel()">✓</button></div>`).join('');
    if(arRems.length)html+=`<div style="font-size:10.5px;font-weight:700;color:var(--ink3);text-transform:uppercase;margin:10px 0 7px">🔔 Recordatorios (${arRems.length})</div>`+arRems.map(r=>`<div class="rem-card ${r.type}"><div>🔔</div><div style="flex:1"><div class="rem-msg">${escH(r.msg)}</div><div class="rem-meta">${r.date?'📅 '+fmtDate(r.date):''}</div></div><button class="rem-dismiss" onclick="Reminders.dismiss('${r.id}');Reminders.showPanel()">✓</button><button class="rem-dismiss" onclick="Reminders.delete('${r.id}');Reminders.showPanel()">✕</button></div>`).join('');
    if(!html)html='<p style="color:var(--green);text-align:center;padding:20px;font-size:13px">✅ Sin alertas pendientes.</p>';
    el('alerts-body').innerHTML=html;UI.openModal('modal-alerts');
  }
};

document.addEventListener('click',e=>{if(!e.target.closest('.export-dd'))el('export-menu').classList.remove('open')});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){UI.closeLightbox();document.querySelectorAll('.modal-ov.open').forEach(m=>UI.closeModal(m.id))}
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();Weeks.save();UI.toast('💾 Guardado','ok')}
});
document.querySelectorAll('.modal-ov').forEach(ov=>ov.addEventListener('click',e=>{if(e.target===ov)UI.closeModal(ov.id)}));
