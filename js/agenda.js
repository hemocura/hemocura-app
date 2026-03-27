'use strict';
// ══ AGENDA MODULE ══
window.Agenda = {
  _weekTasks(){const k=getCurrentWeekKey();return State.tasks.filter(t=>!t.weekKey||t.weekKey===k)},
  openTask(id=null){
    State.editTask=id;
    el('task-modal-title').textContent=id?'✏️ Editar Tarea':'➕ Nueva Tarea';
    if(id){const t=State.tasks.find(x=>x.id===id);if(!t)return;sv('t-title',t.title);sv('t-date',t.date);sv('t-time',t.time||'');sv('t-priority',t.priority);sv('t-cat',t.category);sv('t-status',t.status);sv('t-desc',t.desc||'')}
    else{sv('t-title','');sv('t-date',gv('meta-fecha')||'');sv('t-time','');sv('t-priority','media');sv('t-cat','visita');sv('t-status','pendiente');sv('t-desc','')}
    UI.openModal('modal-task');
  },
  saveTask(){
    const title=gv('t-title').trim();if(!title){UI.toast('⚠️ Título obligatorio','warn');return}
    const t={id:State.editTask||'task_'+uid(),weekKey:getCurrentWeekKey(),title,date:gv('t-date'),time:gv('t-time'),priority:gv('t-priority'),category:gv('t-cat'),status:gv('t-status'),desc:gv('t-desc')};
    if(State.editTask){const i=State.tasks.findIndex(x=>x.id===State.editTask);if(i>-1)State.tasks[i]=t}
    else State.tasks.push(t);
    lsSet(LS_KEYS.tasks,State.tasks);UI.closeModal('modal-task');
    this.renderTasks();this.renderWeek();this.updateKPIs();this._renderTodayTasks();
    UI.toast(State.editTask?'✅ Tarea actualizada':'✅ Tarea creada','ok');State.editTask=null;
  },
  delete(id){if(!confirm('¿Eliminar tarea?'))return;State.tasks=State.tasks.filter(t=>t.id!==id);lsSet(LS_KEYS.tasks,State.tasks);this.renderTasks();this.renderWeek();this.updateKPIs();this._renderTodayTasks()},
  complete(id){const t=State.tasks.find(x=>x.id===id);if(t)t.status=t.status==='completada'?'pendiente':'completada';lsSet(LS_KEYS.tasks,State.tasks);this.renderTasks();this.renderWeek();this.updateKPIs();this._renderTodayTasks()},
  openReminder(){Reminders.openModal()},
  updateKPIs(){
    const tasks=this._weekTasks(),total=tasks.length,done=tasks.filter(t=>t.status==='completada').length;
    const pend=tasks.filter(t=>t.status!=='completada').length,pct=total?Math.round(done/total*100):0;
    st('ag-tot',total);st('ag-done',done);st('ag-pend',pend);st('ag-pct',pct+'%');st('nb-agenda',total);
    const ev=el('ev-tasks');if(ev)ev.textContent=pct+'%';
    const ec=el('ev-cont');if(ec)ec.textContent=el('tbody-contactos')?.rows.length||0;
    this._renderTodayTasks();
  },
  _renderTodayTasks(){
    const c=el('today-tasks');if(!c)return;
    const today=new Date().toISOString().split('T')[0];
    const todayT=State.tasks.filter(t=>t.date===today);
    if(!todayT.length){c.innerHTML='<p style="color:var(--ink4);font-size:13px">Sin tareas programadas para hoy.</p>';return}
    c.innerHTML=todayT.map(t=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:7px;background:${t.status==='completada'?'var(--green-l)':'var(--bg)'};margin-bottom:4px">
      <div class="t-dot ${t.priority}"></div>
      <div style="flex:1;font-size:12.5px;font-weight:600;${t.status==='completada'?'text-decoration:line-through;color:var(--ink4)':''}">${escH(t.title)}</div>
      ${t.time?`<span style="font-size:10.5px;color:var(--ink4)">${t.time}</span>`:''}
      <button class="t-btn done-btn" onclick="Agenda.complete('${t.id}')" style="font-size:10px">${t.status==='completada'?'↩':'✓'}</button>
    </div>`).join('');
  },
  renderTasks(){
    const c=el('task-list');if(!c)return;
    const fil=gv('filter-tasks')||'';
    let tasks=this._weekTasks();
    if(fil==='alta')tasks=tasks.filter(t=>t.priority==='alta');
    else if(fil)tasks=tasks.filter(t=>t.status===fil);
    tasks.sort((a,b)=>{const p={alta:0,media:1,baja:2};if(a.status==='completada'&&b.status!=='completada')return 1;if(b.status==='completada'&&a.status!=='completada')return-1;return(p[a.priority]||0)-(p[b.priority]||0)});
    if(!tasks.length){c.innerHTML='<p style="text-align:center;color:var(--ink4);font-size:13px;padding:18px">Sin tareas.</p>';return}
    const today=new Date().toISOString().split('T')[0];
    const CATS={visita:'🔍',reunion:'🤝',llamada:'📞',jornada:'📋',admin:'📁',otro:'📌'};
    c.innerHTML=tasks.map(t=>{
      const ov=t.status!=='completada'&&t.date&&t.date<today;
      return `<div class="task-card ${t.status==='completada'?'done':ov?'ov':t.status==='en-progreso'?'prog':''}">
        <div class="t-dot ${t.priority}"></div>
        <div class="t-info">
          <div class="t-title" style="${t.status==='completada'?'text-decoration:line-through;color:var(--ink4)':''}">${escH(t.title)}</div>
          <div class="t-meta">
            ${t.date?`<span style="font-size:11px">📅 ${fmtDate(t.date)}</span>`:''}${t.time?`<span style="font-size:11px">🕐 ${t.time}</span>`:''}
            <span class="t-tag">${CATS[t.category]||'📌'} ${t.category}</span>
            <span class="t-tag" style="${t.status==='completada'?'background:var(--green-l);color:var(--green)':t.status==='en-progreso'?'background:var(--amber-l);color:var(--amber)':''}">${t.status==='completada'?'✅ Hecho':t.status==='en-progreso'?'🔄 En curso':'⏳ Pendiente'}</span>
            ${ov?'<span style="color:var(--hemo-d);font-weight:700;font-size:10px">⚠️ VENCIDA</span>':''}
          </div>
          ${t.desc?`<div style="font-size:11.5px;color:var(--ink3);margin-top:2px">${escH(t.desc)}</div>`:''}
        </div>
        <div class="t-acts">
          <button class="t-btn done-btn" onclick="Agenda.complete('${t.id}')">${t.status==='completada'?'↩':'✓'}</button>
          <button class="t-btn" onclick="Agenda.openTask('${t.id}')">✏️</button>
          <button class="t-btn" onclick="Agenda.delete('${t.id}')" style="color:var(--hemo-d)">🗑</button>
        </div>
      </div>`;
    }).join('');
  },
  renderWeek(){
    const c=el('agenda-week');if(!c)return;
    const tasks=this._weekTasks(),today=new Date();
    const base=gv('meta-fecha')?new Date(gv('meta-fecha')+'T00:00:00'):today;
    const mon=new Date(base);mon.setDate(base.getDate()-base.getDay()+1);
    const days=['Lun','Mar','Mié','Jue','Vie'];
    let html='<div class="week-grid">';
    for(let i=0;i<5;i++){
      const d=new Date(mon);d.setDate(mon.getDate()+i);
      const ds=d.toISOString().split('T')[0],isTod=ds===today.toISOString().split('T')[0];
      const dt=tasks.filter(t=>t.date===ds);
      html+=`<div class="day-col"><div class="day-hd${isTod?' today':''}">${days[i]} ${d.getDate()}</div>
        <div class="day-body">${dt.length?dt.map(t=>`<div class="day-chip ${t.status==='completada'?'done':t.priority}" onclick="Agenda.openTask('${t.id}')" title="${escH(t.title)}">${t.time?`<strong>${t.time}</strong> `:''}${t.title.substring(0,20)}</div>`).join(''):'<div style="font-size:10px;color:var(--ink4);text-align:center;padding:4px">Libre</div>'}
        <button onclick="Agenda.openTask();setTimeout(()=>{sv('t-date','${ds}')},50)" style="width:100%;margin-top:2px;padding:2px;border:1px dashed var(--border);background:none;border-radius:3px;color:var(--ink4);font-size:10px;cursor:pointer">＋</button>
        </div></div>`;
    }
    html+='</div>';c.innerHTML=html;
  }
};
