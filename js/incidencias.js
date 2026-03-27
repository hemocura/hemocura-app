'use strict';
// ══ INCIDENCIAS MODULE ══
window.Incidencias = {
  openModal(id=null){
    State.editInc=id;State.pendingIncFiles=[];
    const today=new Date().toISOString().split('T')[0];
    if(id){
      const inc=State.incidencias[id];if(!inc)return;
      ['sucursal','tipo','severidad','descripcion','causa','accion','estado','responsable'].forEach(f=>sv('inc-'+f,inc[f]||''));
      sv('inc-fecha',inc.fecha||today);
      el('inc-files-prev').innerHTML='<p style="font-size:11.5px;color:var(--ink4)">(Archivos existentes se mantienen)</p>';
    } else {
      ['descripcion','causa','accion','responsable'].forEach(f=>sv('inc-'+f,''));
      sv('inc-sucursal','');sv('inc-fecha',today);sv('inc-tipo','queja-cliente');sv('inc-severidad','media');sv('inc-estado','abierta');
      el('inc-files-prev').innerHTML='';
    }
    UI.openModal('modal-incidencia');
  },
  handleFiles(input){
    const files=Array.from(input.files);
    files.forEach(f=>{
      if(f.size>5*1024*1024){UI.toast(`⚠️ ${f.name} supera 5MB`,'warn');return}
      const r=new FileReader();r.onload=e=>{State.pendingIncFiles.push({name:f.name,type:f.type,data:e.target.result,size:f.size});this._renderFilePrev()};r.readAsDataURL(f);
    });input.value='';
  },
  _renderFilePrev(){
    const el2=el('inc-files-prev');if(!el2)return;
    el2.innerHTML=State.pendingIncFiles.map((f,i)=>`<div class="inc-file-prev">${f.type.startsWith('image/')?`<img src="${f.data}">`:''}${f.type.startsWith('audio/')?`<audio controls style="height:28px;flex:1"><source src="${f.data}"></audio>`:''}<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px">${escH(f.name)}</span><span style="font-size:10px;color:var(--ink4);flex-shrink:0">${(f.size/1024).toFixed(0)}KB</span><button onclick="State.pendingIncFiles.splice(${i},1);Incidencias._renderFilePrev()" style="background:none;border:none;color:var(--hemo-d);cursor:pointer">✕</button></div>`).join('');
  },
  save(){
    const suc=gv('inc-sucursal'),desc=gv('inc-descripcion').trim();
    if(!suc||!desc){UI.toast('⚠️ Sucursal y descripción requeridos','warn');return}
    const id=State.editInc||'inc_'+uid();
    const inc={id,sucursal:suc,fecha:gv('inc-fecha'),tipo:gv('inc-tipo'),severidad:gv('inc-severidad'),descripcion:desc,causa:gv('inc-causa'),accion:gv('inc-accion'),estado:gv('inc-estado'),responsable:gv('inc-responsable'),created:State.editInc?State.incidencias[State.editInc]?.created:new Date().toISOString(),weekKey:getCurrentWeekKey()};
    State.incidencias[id]=inc;
    if(State.pendingIncFiles.length){if(!State.incFiles[id])State.incFiles[id]=[];State.incFiles[id]=[...State.incFiles[id],...State.pendingIncFiles];lsSet(LS_KEYS.incFiles,State.incFiles)}
    lsSet(LS_KEYS.incidencias,State.incidencias);UI.closeModal('modal-incidencia');
    this.render();UI.updateBadges();
    UI.toast(State.editInc?'✅ Incidencia actualizada':'🚨 Incidencia registrada','ok');State.editInc=null;State.pendingIncFiles=[];
  },
  delete(id){if(!confirm('¿Eliminar incidencia?'))return;delete State.incidencias[id];delete State.incFiles[id];lsSet(LS_KEYS.incidencias,State.incidencias);lsSet(LS_KEYS.incFiles,State.incFiles);this.render();UI.updateBadges();UI.toast('Incidencia eliminada','err')},
  toggleEstado(id){
    const inc=State.incidencias[id];if(!inc)return;
    const s=['abierta','en-investigacion','resuelta'];inc.estado=s[(s.indexOf(inc.estado)+1)%s.length];
    lsSet(LS_KEYS.incidencias,State.incidencias);this.render();UI.updateBadges();UI.toast(`Estado: ${inc.estado}`,'inf');
  },
  render(){
    const filtro=gv('filtro-inc')||'todas';
    let list=Object.values(State.incidencias);
    if(filtro!=='todas')list=filtro==='critica'?list.filter(i=>i.severidad==='critica'):list.filter(i=>i.estado===filtro);
    const total=Object.values(State.incidencias).length;
    st('i-total',total);st('i-abier',Object.values(State.incidencias).filter(i=>i.estado==='abierta').length);st('i-invest',Object.values(State.incidencias).filter(i=>i.estado==='en-investigacion').length);st('i-resuel',Object.values(State.incidencias).filter(i=>i.estado==='resuelta').length);
    const c=el('incidencias-list');if(!c)return;
    if(!list.length){c.innerHTML='<div style="text-align:center;padding:28px;color:var(--ink4)"><div style="font-size:36px">✅</div><p>Sin incidencias para mostrar.</p></div>';return}
    const tLabel={'queja-cliente':'😡 Queja','error-proceso':'⚙️ Error','no-conformidad':'📋 No Conform.','incidente-seguridad':'🔒 Seguridad','falla-equipos':'🔧 Falla','otro':'📌 Otro'};
    const eB={abierta:'bg-red','en-investigacion':'bg-amber',resuelta:'bg-green'};
    const eL={abierta:'📂 Abierta','en-investigacion':'🔍 Investigando',resuelta:'✅ Resuelta'};
    c.innerHTML=list.sort((a,b)=>{const o={critica:0,alta:1,media:2,baja:3};return(o[a.severidad]||9)-(o[b.severidad]||9)||(b.created||'').localeCompare(a.created||'')}).map(inc=>{
      const files=State.incFiles[inc.id]||[];
      const imgs=files.filter(f=>f.type.startsWith('image/'));
      const audios=files.filter(f=>f.type.startsWith('audio/'));
      const others=files.filter(f=>!f.type.startsWith('image/')&&!f.type.startsWith('audio/'));
      return `<div class="inc-card ${inc.severidad}">
        <div class="inc-hd">
          <div class="inc-dot ${inc.severidad}"></div>
          <div style="flex:1"><strong>${tLabel[inc.tipo]||inc.tipo}</strong> — ${escH(inc.sucursal)}</div>
          <span class="badge ${eB[inc.estado]||''}">${eL[inc.estado]||inc.estado}</span>
          <span class="badge bg-amber" style="text-transform:uppercase">${inc.severidad}</span>
        </div>
        <div class="inc-body">
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:7px"><span style="font-size:11px;color:var(--ink4)">📅 ${fmtDate(inc.fecha)}</span>${inc.responsable?`<span style="font-size:11px;color:var(--ink4)">👤 ${escH(inc.responsable)}</span>`:''}</div>
          <div class="inc-desc">${escH(inc.descripcion)}</div>
          ${inc.causa?`<div class="inc-causa"><strong>🔍 Causa:</strong> ${escH(inc.causa)}</div>`:''}
          ${inc.accion?`<div class="inc-accion"><strong>✅ Acción:</strong> ${escH(inc.accion)}</div>`:''}
          ${files.length?`<div style="margin-top:8px"><div style="font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;margin-bottom:5px">📎 Evidencias (${files.length})</div><div class="inc-evis">${imgs.map(f=>`<img class="inc-evi-img" src="${f.data}" alt="${escH(f.name)}" onclick="UI.openLightbox('${f.data}','${escH(f.name)}')">`).join('')}${audios.map(f=>`<div style="display:flex;flex-direction:column;gap:3px"><span style="font-size:10px;color:var(--ink4)">🎤 ${escH(f.name)}</span><audio controls style="height:26px"><source src="${f.data}"></audio></div>`).join('')}${others.map(f=>`<a class="inc-evi-file" href="${f.data}" download="${escH(f.name)}">📄 ${escH(f.name)}</a>`).join('')}</div></div>`:''}
          <div class="inc-acts">
            <button class="btn outline sm" onclick="Incidencias.toggleEstado('${inc.id}')">🔄 Estado</button>
            <button class="btn ghost sm" onclick="Incidencias.openModal('${inc.id}')">✏️ Editar</button>
            <button class="btn ghost sm" style="color:var(--hemo-d)" onclick="Incidencias.delete('${inc.id}')">🗑</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }
};
