'use strict';
// ══ REUNIONES MODULE ══
window.Reuniones = {
  openModal(id=null){
    State.editReunion=id;
    el('reun-modal-title').textContent=id?'✏️ Editar Reunión':'🗣 Nueva Reunión';
    const today=new Date().toISOString().split('T')[0];
    if(id){
      const r=State.reuniones.find(x=>x.id===id);if(!r)return;
      ['titulo','lugar','participantes'].forEach(f=>sv('r-'+f,r[f]||''));
      sv('r-tipo',r.tipo||'interna');sv('r-fecha',r.fecha||today);sv('r-hora',r.hora||'');
      sv('r-agenda-text',r.agendaText||'');sv('r-apuntes',r.apuntes||'');sv('r-acuerdos',r.acuerdos||'');
      sv('r-proxima',r.proxima||'');sv('r-estado',r.estado||'programada');
    } else {
      ['titulo','lugar','participantes','apuntes','acuerdos'].forEach(f=>sv('r-'+f,''));
      sv('r-tipo','interna');sv('r-fecha',today);sv('r-hora','');
      sv('r-agenda-text','');sv('r-proxima','');sv('r-estado','programada');
    }
    UI.openModal('modal-reunion');
  },
  save(){
    const titulo=gv('r-titulo').trim();if(!titulo){UI.toast('⚠️ Título obligatorio','warn');return}
    const acuerdosRaw=gv('r-acuerdos').trim();
    const acuerdos=acuerdosRaw?acuerdosRaw.split('\n').filter(l=>l.trim()).map(line=>{
      const clean=line.replace(/^[-•*]\s*/,'').trim();
      return {text:clean,done:false,id:uid()};
    }):[];
    const existing=State.editReunion?State.reuniones.find(x=>x.id===State.editReunion):null;
    // Preserve done status if editing
    const mergedAcuerdos=existing?acuerdos.map((a,i)=>({...a,done:existing.acuerdos?.[i]?.done||false})):acuerdos;
    const r={id:State.editReunion||'reun_'+uid(),titulo,tipo:gv('r-tipo'),fecha:gv('r-fecha'),hora:gv('r-hora'),
      lugar:gv('r-lugar'),participantes:gv('r-participantes'),agendaText:gv('r-agenda-text'),
      apuntes:gv('r-apuntes'),acuerdos:mergedAcuerdos,proxima:gv('r-proxima'),
      estado:gv('r-estado'),weekKey:getCurrentWeekKey(),created:existing?.created||new Date().toISOString()};
    if(State.editReunion){const i=State.reuniones.findIndex(x=>x.id===State.editReunion);if(i>-1)State.reuniones[i]=r}
    else State.reuniones.push(r);
    lsSet(LS_KEYS.reuniones,State.reuniones);UI.closeModal('modal-reunion');
    this.render();UI.updateBadges();
    UI.toast(State.editReunion?'✅ Reunión actualizada':'✅ Reunión registrada','ok');State.editReunion=null;
  },
  toggleAcuerdo(reunId,acuerdoId){
    const r=State.reuniones.find(x=>x.id===reunId);if(!r)return;
    const a=r.acuerdos.find(x=>x.id===acuerdoId);if(a)a.done=!a.done;
    lsSet(LS_KEYS.reuniones,State.reuniones);this.render();UI.updateBadges();
  },
  delete(id){if(!confirm('¿Eliminar reunión?'))return;State.reuniones=State.reuniones.filter(x=>x.id!==id);lsSet(LS_KEYS.reuniones,State.reuniones);this.render();UI.updateBadges();UI.toast('Reunión eliminada','err')},
  _updateKPIs(){
    const total=State.reuniones.length;
    const today=new Date().toISOString().split('T')[0];
    const pend=State.reuniones.reduce((s,r)=>s+(r.acuerdos||[]).filter(a=>!a.done).length,0);
    const cerr=State.reuniones.reduce((s,r)=>s+(r.acuerdos||[]).filter(a=>a.done).length,0);
    const prox=State.reuniones.filter(r=>r.estado==='programada'&&r.fecha>=today).length;
    st('r-total',total);st('r-pend',pend);st('r-cerr',cerr);st('r-prox',prox);
    st('nb-reun',total);
  },
  render(){
    this._updateKPIs();
    const c=el('reuniones-list');if(!c)return;
    if(!State.reuniones.length){c.innerHTML='<div style="text-align:center;padding:32px;color:var(--ink4)"><div style="font-size:40px;margin-bottom:8px">🗣</div><p>Sin reuniones registradas.</p><button class="btn primary" onclick="Reuniones.openModal()" style="margin-top:10px">➕ Nueva Reunión</button></div>';return}
    const tipoLabel={interna:'🏢',sucursal:'🏥',cliente:'🤝',proveedor:'📦',directiva:'👔'};
    const estadoBadge={programada:'bg-blue',realizada:'bg-green',cancelada:'bg-red',pospuesta:'bg-amber'};
    const estadoLabel={programada:'📅 Programada',realizada:'✅ Realizada',cancelada:'❌ Cancelada',pospuesta:'⏳ Pospuesta'};
    c.innerHTML=State.reuniones.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(r=>{
      const totalA=(r.acuerdos||[]).length;
      const doneA=(r.acuerdos||[]).filter(a=>a.done).length;
      const pct=totalA?Math.round(doneA/totalA*100):0;
      return `<div class="reun-card" id="reun-${r.id}">
        <div class="reun-hd">
          <span style="font-size:20px">${tipoLabel[r.tipo]||'🗣'}</span>
          <div style="flex:1">
            <div class="reun-title">${escH(r.titulo)}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px">
              <span style="font-size:11px;color:var(--ink4)">📅 ${fmtDate(r.fecha)}${r.hora?' 🕐 '+r.hora:''}</span>
              ${r.lugar?`<span style="font-size:11px;color:var(--ink4)">📍 ${escH(r.lugar)}</span>`:''}
              ${r.participantes?`<span style="font-size:11px;color:var(--ink4)">👥 ${escH(r.participantes)}</span>`:''}
            </div>
          </div>
          <span class="badge ${estadoBadge[r.estado]||''}">${estadoLabel[r.estado]||r.estado}</span>
        </div>
        <div class="reun-body">
          ${r.agendaText?`<div class="reun-section"><div class="reun-section-title">📋 Agenda</div><div class="reun-text">${escH(r.agendaText)}</div></div>`:''}
          ${r.apuntes?`<div class="reun-section"><div class="reun-section-title">📝 Apuntes</div><div class="reun-text">${escH(r.apuntes)}</div></div>`:''}
          ${totalA?`<div class="reun-section">
            <div class="reun-section-title">✅ Acuerdos y Seguimiento — ${doneA}/${totalA} cerrados (${pct}%)</div>
            <div class="prog-wrap" style="margin-bottom:8px"><div class="prog-bar green" style="width:${pct}%"></div></div>
            ${(r.acuerdos||[]).map(a=>`
              <div class="acuerdo-item ${a.done?'done':''}">
                <button class="punto-check ${a.done?'done':''}" onclick="Reuniones.toggleAcuerdo('${r.id}','${a.id}')" title="${a.done?'Reabrir':'Marcar como cerrado'}">${a.done?'✓':''}</button>
                <span>${escH(a.text)}</span>
              </div>`).join('')}
          </div>`:''}
          ${r.proxima?`<div style="margin-top:8px;padding:6px 10px;background:var(--blue-l);border-radius:7px;font-size:12px;color:var(--blue)">📅 Próxima reunión: <strong>${fmtDate(r.proxima)}</strong></div>`:''}
          <div class="inc-acts">
            <button class="btn outline sm" onclick="Reuniones.openModal('${r.id}')">✏️ Editar</button>
            <button class="btn ghost sm" onclick="Reuniones.delete('${r.id}')">🗑 Eliminar</button>
            ${r.estado==='programada'?`<button class="btn ghost sm teal-btn" onclick="Reuniones._marcarRealizada('${r.id}')" style="color:#fff">✅ Marcar realizada</button>`:''}
          </div>
        </div>
      </div>`;
    }).join('');
  },
  _marcarRealizada(id){const r=State.reuniones.find(x=>x.id===id);if(r){r.estado='realizada';lsSet(LS_KEYS.reuniones,State.reuniones);this.render();UI.toast('✅ Marcada como realizada','ok')}}
};
