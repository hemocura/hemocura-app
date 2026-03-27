'use strict';
// ══ SUCURSALES MODULE ══
window.Sucursales = {
  _defaults:[
    {id:'suc_cura_stg',nombre:'Cura-Santiago',codigo:'CUR-STG',provincia:'Santiago',direccion:'Santiago de los Caballeros',telefono:'809-000-0001',responsable:'',email:'',estado:'activa',notas:'Sucursal principal en Santiago'},
    {id:'suc_hemo_pp',nombre:'Hemocura-Pto Pta',codigo:'HEM-PP',provincia:'Puerto Plata',direccion:'Puerto Plata',telefono:'809-000-0002',responsable:'',email:'',estado:'activa',notas:'Centro de Puerto Plata'},
    {id:'suc_hemo_ten',nombre:'Hemocura-Tenares',codigo:'HEM-TEN',provincia:'Hermanas Mirabal',direccion:'Tenares, Hermanas Mirabal',telefono:'809-000-0003',responsable:'',email:'',estado:'activa',notas:'Centro de Tenares'},
    {id:'suc_hemo_sfm',nombre:'Hemocura-SFM',codigo:'HEM-SFM',provincia:'San Francisco de Macorís',direccion:'San Francisco de Macorís',telefono:'809-000-0004',responsable:'',email:'',estado:'activa',notas:'Centro de San Francisco de Macorís'}
  ],
  init(){
    if(!State.sucursales||!State.sucursales.length){
      State.sucursales=[...this._defaults];lsSet(LS_KEYS.sucursales,State.sucursales);
    }
    this._updateSelects();
    if(typeof Contactos !== 'undefined') Contactos.refreshSelects();
  },
  _updateSelects(){
    const opts='<option value="">Seleccionar…</option>'+State.sucursales.map(s=>`<option value="${escH(s.nombre)}">${escH(s.nombre)}</option>`).join('');
    ['v-sucursal','c-sucursal','inc-sucursal','vis-sucursal'].forEach(id=>{const e=el(id);if(e)e.innerHTML=opts});
    // Update table suc-sel selects
    document.querySelectorAll('td select[data-suc-sel]').forEach(s=>{const cur=s.value;s.innerHTML=this.getOptionsHTML(cur)});
  },
  getOptionsHTML(selected=''){
    return '<option value="">Seleccionar…</option>'+State.sucursales.map(s=>`<option value="${escH(s.nombre)}"${s.nombre===selected?' selected':''}>${escH(s.nombre)}</option>`).join('');
  },
  openModal(id=null){
    State.editSucursal=id;
    el('suc-modal-title').textContent=id?'✏️ Editar Sucursal':'🏥 Nueva Sucursal';
    if(id){
      const s=State.sucursales.find(x=>x.id===id);if(!s)return;
      ['nombre','codigo','direccion','telefono','responsable','email','notas'].forEach(f=>sv('s-'+f,s[f]||''));
      sv('s-provincia',s.provincia||'');sv('s-estado',s.estado||'activa');
    } else {
      ['nombre','codigo','direccion','telefono','responsable','email','notas'].forEach(f=>sv('s-'+f,''));
      sv('s-provincia','');sv('s-estado','activa');
    }
    UI.openModal('modal-sucursal');
  },
  save(){
    const nombre=gv('s-nombre').trim();if(!nombre){UI.toast('⚠️ Nombre obligatorio','warn');return}
    const suc={id:State.editSucursal||'suc_'+uid(),nombre,codigo:gv('s-codigo'),provincia:gv('s-provincia'),
      direccion:gv('s-direccion'),telefono:gv('s-telefono'),responsable:gv('s-responsable'),
      email:gv('s-email'),estado:gv('s-estado'),notas:gv('s-notas')};
    if(State.editSucursal){const i=State.sucursales.findIndex(x=>x.id===State.editSucursal);if(i>-1)State.sucursales[i]=suc}
    else State.sucursales.push(suc);
    lsSet(LS_KEYS.sucursales,State.sucursales);
    this._updateSelects();
    if(typeof Contactos !== 'undefined') Contactos.refreshSelects();
    UI.closeModal('modal-sucursal');this.render();
    UI.toast(State.editSucursal?'✅ Sucursal actualizada':'✅ Sucursal registrada','ok');State.editSucursal=null;
  },
  delete(id){
    if(!confirm('¿Eliminar esta sucursal?'))return;
    State.sucursales=State.sucursales.filter(x=>x.id!==id);
    lsSet(LS_KEYS.sucursales,State.sucursales);this._updateSelects();this.render();UI.toast('Sucursal eliminada','err');
  },
  render(){
    const c=el('sucursales-grid');if(!c)return;
    const estadoBadge={activa:'bg-green',inactiva:'',nueva:'bg-blue'};
    const estadoLabel={activa:'✅ Activa',inactiva:'⏸ Inactiva',nueva:'🆕 Nueva'};
    c.innerHTML=`<div class="suc-grid">${State.sucursales.map(s=>`
      <div class="suc-card ${s.estado}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px">
          <div><div class="suc-name">${escH(s.nombre)}</div><div class="suc-prov">📍 ${escH(s.provincia||'—')}</div></div>
          <span class="badge ${estadoBadge[s.estado]||''}">${estadoLabel[s.estado]||s.estado}</span>
        </div>
        ${s.codigo?`<div class="suc-detail">🏷 <strong>${escH(s.codigo)}</strong></div>`:''}
        ${s.direccion?`<div class="suc-detail">📍 ${escH(s.direccion)}</div>`:''}
        ${s.telefono?`<div class="suc-detail">📞 <a href="tel:${escH(s.telefono)}">${escH(s.telefono)}</a></div>`:''}
        ${s.responsable?`<div class="suc-detail">👤 ${escH(s.responsable)}</div>`:''}
        ${s.email?`<div class="suc-detail">✉️ <a href="mailto:${escH(s.email)}">${escH(s.email)}</a></div>`:''}
        ${s.notas?`<div class="suc-detail" style="margin-top:6px;font-style:italic;color:var(--ink3)">${escH(s.notas)}</div>`:''}
        <div class="suc-acts">
          <button class="btn outline sm" onclick="Sucursales.openModal('${s.id}')">✏️ Editar</button>
          <button class="btn ghost sm" onclick="Sucursales.delete('${s.id}')">🗑</button>
        </div>
      </div>`).join('')}</div>`;
  }
};
