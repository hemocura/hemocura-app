'use strict';
// ══ DASHBOARD MODULE — Widgets configurables ══
window.Dashboard = {
  _charts:{},
  _WIDGETS:[
    {id:'kpi-summary',   label:'KPIs Resumen',          type:'kpi',   icon:'📊',default:true},
    {id:'actividad',     label:'Actividad Semanal',      type:'chart', icon:'📈',default:true},
    {id:'productos',     label:'Hemoderivados/Semana',   type:'chart', icon:'🩸',default:true},
    {id:'logros-suc',    label:'Logros por Sucursal',    type:'chart', icon:'🏥',default:true},
    {id:'hemo-hist',     label:'Historial Unidades',     type:'chart', icon:'📉',default:true},
    {id:'ventas-turno',  label:'Ventas por Turno',       type:'chart', icon:'🕐',default:false},
    {id:'creditos-pie',  label:'Estado Créditos',        type:'chart', icon:'💳',default:false},
    {id:'contactos-bar', label:'Contactos por Empresa',  type:'chart', icon:'🤝',default:false},
    {id:'top-contactos', label:'Contactos Recientes',    type:'table', icon:'👥',default:true},
    {id:'reuniones-tbl', label:'Reuniones Programadas',  type:'table', icon:'🗣',default:false},
    {id:'incidencias-tbl',label:'Incidencias Abiertas',  type:'table', icon:'🚨',default:false},
    {id:'tareas-tbl',    label:'Tareas Pendientes',      type:'table', icon:'📅',default:false},
  ],

  _cfg(){
    if(State.dashConfig)return State.dashConfig;
    const c={};this._WIDGETS.forEach(w=>{c[w.id]=w.default});
    State.dashConfig=c;return c;
  },

  openConfig(){
    const cfg=this._cfg(),c=el('dash-cfg-body');if(!c)return;
    c.innerHTML=`<p style="font-size:12.5px;color:var(--ink3);margin-bottom:14px">Activa o desactiva los bloques del Dashboard.</p>
      <div class="dash-cfg-grid">${this._WIDGETS.map(w=>`
        <label class="dw-toggle ${cfg[w.id]?'on':''}" id="dwt-${w.id}">
          <input type="checkbox" ${cfg[w.id]?'checked':''} onchange="Dashboard._toggle('${w.id}',this.checked)" style="display:none">
          <span class="dwt-ico">${w.icon}</span>
          <div class="dwt-body">
            <div class="dwt-lbl">${w.label}</div>
            <div class="dwt-sub">${w.type==='kpi'?'KPI':w.type==='chart'?'Gráfica':'Tabla'}</div>
          </div>
          <span class="dwt-ck">${cfg[w.id]?'✓':''}</span>
        </label>`).join('')}
      </div>`;
    UI.openModal('modal-dash-cfg');
  },

  _toggle(id,on){
    const cfg=this._cfg();cfg[id]=on;State.dashConfig=cfg;lsSet(LS_KEYS.dashConfig,cfg);
    const lbl=el('dwt-'+id);if(!lbl)return;
    lbl.classList.toggle('on',on);
    const ck=lbl.querySelector('.dwt-ck');if(ck)ck.textContent=on?'✓':'';
  },

  applyConfig(){UI.closeModal('modal-dash-cfg');this.build();UI.toast('✅ Dashboard actualizado','ok')},

  _dc(id){if(this._charts[id]){this._charts[id].destroy();delete this._charts[id]}},

  build(){
    const n=parseInt(gv('dash-range')||12);
    const weeks=getAllWeeks(),keys=Object.keys(weeks).sort().slice(-n);
    const cfg=this._cfg();
    const wrap=el('dash-widgets');if(!wrap)return;

    // Aggregate data
    let tI=0,tC=0,tJ=0,tA=0;
    const labels=[],iD=[],cD=[],jD=[],prodHist={st:[],pg:[],pl:[],pa:[]};
    keys.forEach(k=>{
      const d=weeks[k],t=d.tables||{};
      const wI=t.inspeccion?.length||0;
      const wC=Math.max(State.contactos.filter(c=>c.weekKey===k).length,t.contactos?.length||0);
      const wJ=t.jornadas?.length||0,wA=t.acciones?.length||0;
      tI+=wI;tC+=wC;tJ+=wJ;tA+=wA;
      labels.push(d.meta?.periodo?.split('–')[0]?.trim()||k.slice(-4));
      iD.push(wI);cD.push(wC);jD.push(wJ);
      const wv=State.ventas.filter(v=>v.weekKey===k);
      prodHist.st.push(wv.reduce((s,v)=>s+(v.st||0),0));prodHist.pg.push(wv.reduce((s,v)=>s+(v.pg||0),0));
      prodHist.pl.push(wv.reduce((s,v)=>s+(v.pl||0),0));prodHist.pa.push(wv.reduce((s,v)=>s+(v.pa||0),0));
    });

    this._WIDGETS.filter(w=>w.type==='chart').forEach(w=>this._dc(w.id));

    // Build HTML
    const sections=[];

    if(cfg['kpi-summary']){
      sections.push(`<div class="dw-block full">
        <div class="card-hd"><div class="card-title">📊 Acumulado (${n} semanas)</div></div>
        <div class="kpi-row">
          <div class="kpi accent"><div class="kv">${tI}</div><div class="kl">Inspecciones</div></div>
          <div class="kpi blue"><div class="kv">${tC}</div><div class="kl">Contactos</div></div>
          <div class="kpi green"><div class="kv">${tJ}</div><div class="kl">Jornadas</div></div>
          <div class="kpi amber"><div class="kv">${tA}</div><div class="kl">Acciones</div></div>
        </div></div>`);
    }

    // Pair charts into 2-col rows
    const chartWidgets=this._WIDGETS.filter(w=>w.type==='chart'&&cfg[w.id]);
    for(let i=0;i<chartWidgets.length;i+=2){
      const w1=chartWidgets[i],w2=chartWidgets[i+1];
      if(w2){
        sections.push(`<div class="dw-row-2">
          <div class="card" id="dw-${w1.id}"><div class="card-hd"><div class="card-title">${w1.icon} ${w1.label}</div></div><canvas id="chart-${w1.id}" height="220"></canvas></div>
          <div class="card" id="dw-${w2.id}"><div class="card-hd"><div class="card-title">${w2.icon} ${w2.label}</div></div><canvas id="chart-${w2.id}" height="220"></canvas></div>
        </div>`);
      }else{
        sections.push(`<div class="card" id="dw-${w1.id}"><div class="card-hd"><div class="card-title">${w1.icon} ${w1.label}</div></div><canvas id="chart-${w1.id}" height="160"></canvas></div>`);
      }
    }

    // Tables
    if(cfg['top-contactos'])sections.push(this._tblContactos());
    if(cfg['reuniones-tbl'])sections.push(this._tblReuniones());
    if(cfg['incidencias-tbl'])sections.push(this._tblIncidencias());
    if(cfg['tareas-tbl'])sections.push(this._tblTareas());

    if(!sections.length){wrap.innerHTML=`<div class="empty-state"><div style="font-size:40px">📊</div><p>Sin bloques visibles. Configura el Dashboard.</p><button class="btn primary" onclick="Dashboard.openConfig()" style="margin-top:10px">⚙️ Configurar</button></div>`;return}
    wrap.innerHTML=sections.join('');

    if(!keys.length)return;

    // Render charts after DOM settles
    setTimeout(()=>{
      if(cfg['actividad']){const c=el('chart-actividad');if(c)this._charts['actividad']=new Chart(c,{type:'bar',data:{labels,datasets:[{label:'Inspecciones',data:iD,backgroundColor:'rgba(139,0,0,0.75)',borderRadius:4},{label:'Contactos',data:cD,backgroundColor:'rgba(29,78,216,0.75)',borderRadius:4},{label:'Jornadas',data:jD,backgroundColor:'rgba(13,110,60,0.75)',borderRadius:4}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}})}

      if(cfg['productos']){const c=el('chart-productos');if(c)this._charts['productos']=new Chart(c,{type:'bar',data:{labels,datasets:[{label:'Sangre Total',data:prodHist.st,backgroundColor:'rgba(185,28,28,0.85)',borderRadius:4},{label:'Paq. Globular',data:prodHist.pg,backgroundColor:'rgba(220,38,38,0.75)',borderRadius:4},{label:'Plaquetas',data:prodHist.pl,backgroundColor:'rgba(217,119,6,0.75)',borderRadius:4},{label:'Plasma',data:prodHist.pa,backgroundColor:'rgba(234,88,12,0.75)',borderRadius:4}]},options:{responsive:true,plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true},y:{stacked:true}}}})}

      if(cfg['logros-suc']){const sucMap={};keys.forEach(k=>{(weeks[k]?.tables?.inspeccion||[]).forEach(r=>{const s=r[1];if(s)sucMap[s]=(sucMap[s]||0)+1})});const c=el('chart-logros-suc');if(c&&Object.keys(sucMap).length){const sk=Object.keys(sucMap).sort((a,b)=>sucMap[b]-sucMap[a]).slice(0,10);this._charts['logros-suc']=new Chart(c,{type:'bar',data:{labels:sk,datasets:[{label:'Visitas',data:sk.map(s=>sucMap[s]),backgroundColor:['#5C0A0A','#B71C1C','#1D4ED8','#0D6E3C','#B45309','#6D28D9','#0F766E','#374151','#92400e','#065f30'],borderRadius:6}]},options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}}}})}}

      if(cfg['hemo-hist']){const c=el('chart-hemo-hist');const tot=keys.map((_,i)=>(prodHist.st[i]||0)+(prodHist.pg[i]||0)+(prodHist.pl[i]||0)+(prodHist.pa[i]||0));if(c)this._charts['hemo-hist']=new Chart(c,{type:'line',data:{labels,datasets:[{label:'Total Unidades',data:tot,borderColor:'rgba(139,0,0,0.9)',tension:.4,fill:true,backgroundColor:'rgba(139,0,0,0.08)',pointBackgroundColor:'rgba(139,0,0,0.9)'}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{stepSize:1}}}}})}

      if(cfg['ventas-turno']){const c=el('chart-ventas-turno');if(c){const byT={dia:0,noche:0};State.ventas.forEach(v=>{const t=(v.turno==='noche')?'noche':'dia';byT[t]+=(v.total||0)});this._charts['ventas-turno']=new Chart(c,{type:'doughnut',data:{labels:['☀️ Turno Día','🌙 Turno Noche'],datasets:[{data:[byT.dia,byT.noche],backgroundColor:['#f59e0b','#3b82f6'],borderWidth:0}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}})}}

      if(cfg['creditos-pie']){const c=el('chart-creditos-pie');if(c){const counts=[State.creditos.filter(x=>x.estado==='activo').length,State.creditos.filter(x=>x.estado==='vencido').length,State.creditos.filter(x=>x.estado==='pagado').length,State.creditos.filter(x=>x.estado==='en-gestion').length];this._charts['creditos-pie']=new Chart(c,{type:'pie',data:{labels:['Activo','Vencido','Pagado','En Gestión'],datasets:[{data:counts,backgroundColor:['#f59e0b','#ef4444','#22c55e','#3b82f6'],borderWidth:0}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}})}}

      if(cfg['contactos-bar']){const c=el('chart-contactos-bar');if(c){const byEmp={};State.contactos.forEach(x=>{const e=x.empresa||'Sin empresa';byEmp[e]=(byEmp[e]||0)+1});const sorted=Object.entries(byEmp).sort((a,b)=>b[1]-a[1]).slice(0,8);this._charts['contactos-bar']=new Chart(c,{type:'bar',data:{labels:sorted.map(x=>x[0]),datasets:[{label:'Contactos',data:sorted.map(x=>x[1]),backgroundColor:'rgba(29,78,216,0.75)',borderRadius:5}]},options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}}}})}}
    },80);
  },

  _tblContactos(){
    const list=State.contactos.slice().sort((a,b)=>(b.created||'').localeCompare(a.created||'')).slice(0,8);
    if(!list.length)return`<div class="card"><div class="card-hd"><div class="card-title">👥 Contactos Recientes</div></div><p class="empty-msg">Sin contactos.</p></div>`;
    return`<div class="card"><div class="card-hd"><div class="card-title">👥 Contactos Recientes</div><button class="btn ghost sm" onclick="UI.switchTabByName('contactos')">Ver todos</button></div>
      <div class="tbl-wrap"><table><thead><tr><th>Nombre</th><th>Cargo</th><th>Empresa</th><th>Sucursal</th><th>Resultado</th><th>Fecha</th></tr></thead>
      <tbody>${list.map(c=>`<tr><td><strong>${escH(c.nombre)}</strong></td><td>${escH(c.cargo||'—')}</td><td>${escH(c.empresa||'—')}</td><td>${escH(c.sucursal||'—')}</td><td>${escH(c.resultado||'—')}</td><td>${c.fecha?fmtDate(c.fecha):'—'}</td></tr>`).join('')}</tbody></table></div></div>`;
  },
  _tblReuniones(){
    const list=State.reuniones.filter(r=>r.estado==='programada').slice(0,8);
    if(!list.length)return`<div class="card"><div class="card-hd"><div class="card-title">🗣 Reuniones Programadas</div></div><p class="empty-msg">Sin reuniones programadas.</p></div>`;
    return`<div class="card"><div class="card-hd"><div class="card-title">🗣 Reuniones Programadas</div><button class="btn ghost sm" onclick="UI.switchTabByName('reuniones')">Ver todas</button></div>
      <div class="tbl-wrap"><table><thead><tr><th>Título</th><th>Tipo</th><th>Fecha</th><th>Lugar</th><th>Acuerdos</th></tr></thead>
      <tbody>${list.map(r=>`<tr><td><strong>${escH(r.titulo)}</strong></td><td>${escH(r.tipo)}</td><td>${fmtDate(r.fecha)}</td><td>${escH(r.lugar||'—')}</td><td>${r.acuerdos?.length||0}</td></tr>`).join('')}</tbody></table></div></div>`;
  },
  _tblIncidencias(){
    const list=Object.values(State.incidencias).filter(i=>i.estado!=='resuelta').slice(0,8);
    if(!list.length)return`<div class="card"><div class="card-hd"><div class="card-title">🚨 Incidencias Abiertas</div></div><p class="empty-msg" style="color:var(--green)">✅ Sin incidencias abiertas.</p></div>`;
    return`<div class="card"><div class="card-hd"><div class="card-title">🚨 Incidencias Abiertas</div><button class="btn ghost sm" onclick="UI.switchTabByName('incidencias')">Ver todas</button></div>
      <div class="tbl-wrap"><table><thead><tr><th>Sucursal</th><th>Tipo</th><th>Severidad</th><th>Estado</th><th>Fecha</th></tr></thead>
      <tbody>${list.sort((a,b)=>{const o={critica:0,alta:1,media:2,baja:3};return(o[a.severidad]||9)-(o[b.severidad]||9)}).map(i=>`<tr><td><strong>${escH(i.sucursal)}</strong></td><td>${escH(i.tipo)}</td><td><span class="badge ${i.severidad==='critica'?'bg-red':i.severidad==='alta'?'bg-amber':'bg-green'}">${i.severidad}</span></td><td>${escH(i.estado)}</td><td>${fmtDate(i.fecha)}</td></tr>`).join('')}</tbody></table></div></div>`;
  },
  _tblTareas(){
    const wk=getCurrentWeekKey();
    const list=State.tasks.filter(t=>t.status!=='completada'&&(!t.weekKey||t.weekKey===wk)).slice(0,10);
    if(!list.length)return`<div class="card"><div class="card-hd"><div class="card-title">📅 Tareas Pendientes</div></div><p class="empty-msg" style="color:var(--green)">✅ Sin tareas pendientes.</p></div>`;
    return`<div class="card"><div class="card-hd"><div class="card-title">📅 Tareas Pendientes</div><button class="btn ghost sm" onclick="UI.switchTabByName('agenda')">Ver agenda</button></div>
      <div class="tbl-wrap"><table><thead><tr><th>Tarea</th><th>Prioridad</th><th>Fecha</th><th>Categoría</th></tr></thead>
      <tbody>${list.sort((a,b)=>{const p={alta:0,media:1,baja:2};return(p[a.priority]||1)-(p[b.priority]||1)}).map(t=>`<tr><td><strong>${escH(t.title)}</strong></td><td><span class="badge ${t.priority==='alta'?'bg-red':t.priority==='media'?'bg-amber':'bg-green'}">${t.priority}</span></td><td>${t.date?fmtDate(t.date):'—'}</td><td>${escH(t.category||'')}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
};
