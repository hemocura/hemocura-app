'use strict';
// ══ GALERÍA MODULE ══
window.Galeria = {
  openNew(){sv('vis-sucursal','');sv('vis-fecha',gv('meta-fecha')||new Date().toISOString().split('T')[0]);sv('vis-tipo','inspeccion');sv('vis-notas','');UI.openModal('modal-visita')},
  createVisita(){
    const suc=gv('vis-sucursal');if(!suc){UI.toast('⚠️ Selecciona sucursal','warn');return}
    const v={id:'vis_'+uid(),weekKey:getCurrentWeekKey(),sucursal:suc,fecha:gv('vis-fecha'),tipo:gv('vis-tipo'),notas:gv('vis-notas'),collapsed:false};
    State.visitas.push(v);lsSet(LS_KEYS.visitas,State.visitas);
    UI.closeModal('modal-visita');this.render();UI.updateBadges();UI.toast('📸 Visita creada','ok');
  },
  handleUpload(input,visitaId=null){
    const files=Array.from(input.files);if(!files.length)return;
    if(!visitaId){
      const auto={id:'vis_'+uid(),weekKey:getCurrentWeekKey(),sucursal:'Carga rápida',fecha:new Date().toISOString().split('T')[0],tipo:'otro',notas:'',collapsed:false};
      State.visitas.push(auto);visitaId=auto.id;lsSet(LS_KEYS.visitas,State.visitas);
    }
    if(!State.images[visitaId])State.images[visitaId]=[];
    let done=0;
    files.forEach(f=>{
      if(f.size>5*1024*1024){UI.toast(`⚠️ ${f.name} supera 5MB`,'warn');done++;if(done===files.length)this._finishUpload(visitaId);return}
      const r=new FileReader();
      r.onload=e=>this._compress(e.target.result,1200,.75).then(c=>{State.images[visitaId].push({name:f.name,data:c,date:new Date().toISOString()});done++;if(done===files.length)this._finishUpload(visitaId)});
      r.readAsDataURL(f);
    });
    input.value='';
  },
  _finishUpload(id){lsSet(LS_KEYS.images,State.images);this.render();UI.updateBadges();UI.toast(`✅ ${State.images[id]?.length||0} imagen(es) guardadas`,'ok')},
  _compress(dataUrl,maxW,q){return new Promise(res=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');const r=Math.min(1,maxW/img.width);c.width=img.width*r;c.height=img.height*r;c.getContext('2d').drawImage(img,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',q))};img.src=dataUrl})},
  deleteImage(vid,idx){if(!confirm('¿Eliminar imagen?'))return;State.images[vid]?.splice(idx,1);lsSet(LS_KEYS.images,State.images);this.render();UI.updateBadges()},
  deleteVisita(id){if(!confirm('¿Eliminar visita y sus imágenes?'))return;State.visitas=State.visitas.filter(x=>x.id!==id);delete State.images[id];lsSet(LS_KEYS.visitas,State.visitas);lsSet(LS_KEYS.images,State.images);this.render();UI.updateBadges();UI.toast('Visita eliminada','err')},
  toggle(id){const v=State.visitas.find(x=>x.id===id);if(v){v.collapsed=!v.collapsed;lsSet(LS_KEYS.visitas,State.visitas);this.render()}},
  render(){
    const c=el('galeria-container');if(!c)return;
    const wk=getCurrentWeekKey(),wv=State.visitas.filter(v=>v.weekKey===wk);
    if(!wv.length){c.innerHTML='<div style="text-align:center;color:var(--ink4);padding:24px"><div style="font-size:36px;margin-bottom:8px">📷</div><p>Sin visitas. Crea una nueva visita.</p></div>';return}
    const tIco={inspeccion:'🔍',jornada:'📋',seguimiento:'🔄',otro:'📍'};
    c.innerHTML=wv.map(vis=>{
      const imgs=State.images[vis.id]||[];
      return `<div class="visita-sec" id="vsec-${vis.id}">
        <div class="visita-hd" onclick="Galeria.toggle('${vis.id}')">
          <div style="font-size:18px">${tIco[vis.tipo]||'📍'}</div>
          <div style="flex:1"><div class="visita-name">${escH(vis.sucursal)}</div><div class="visita-meta">${vis.fecha?fmtDate(vis.fecha):''}${vis.notas?' · '+vis.notas.substring(0,35):''}</div></div>
          <span class="badge bg-teal">${imgs.length} foto${imgs.length!==1?'s':''}</span>
          <span style="color:var(--ink4)">${vis.collapsed?'▶':'▼'}</span>
        </div>
        ${!vis.collapsed?`<div class="visita-body">
          <div class="img-grid">
            ${imgs.map((img,idx)=>`<div class="img-item"><img src="${img.data}" alt="${escH(img.name||'')}" onclick="UI.openLightbox('${img.data}','${escH(img.name||'')}')" loading="lazy"><button class="img-del" onclick="Galeria.deleteImage('${vis.id}',${idx})">✕</button></div>`).join('')}
            <div class="img-add" onclick="document.getElementById('img-add-${vis.id}').click()" title="Agregar">+</div>
          </div>
          <input type="file" id="img-add-${vis.id}" multiple accept="image/*" style="display:none" onchange="Galeria.handleUpload(this,'${vis.id}')">
          <div style="display:flex;justify-content:flex-end"><button class="btn ghost sm" onclick="Galeria.deleteVisita('${vis.id}')">🗑 Eliminar visita</button></div>
        </div>`:''}
      </div>`;
    }).join('');
  }
};
// Drag & drop on upload zone
document.addEventListener('DOMContentLoaded',()=>{
  const uz=el('upload-zone');if(!uz)return;
  uz.addEventListener('dragover',e=>{e.preventDefault();uz.classList.add('drag-over')});
  uz.addEventListener('dragleave',()=>uz.classList.remove('drag-over'));
  uz.addEventListener('drop',e=>{e.preventDefault();uz.classList.remove('drag-over');Galeria.handleUpload({files:e.dataTransfer.files,value:''})});
});
