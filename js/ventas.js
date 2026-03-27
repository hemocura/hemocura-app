'use strict';
// ══ VENTAS MODULE — Unidades hemoderivados por turno ══
window.Ventas = {
  _charts:{},
  openModal(id=null){
    State.editVenta=id;
    el('venta-modal-title').textContent=id?'✏️ Editar Despacho':'🩸 Registrar Despacho';
    const today=new Date().toISOString().split('T')[0];
    if(id){
      const v=State.ventas.find(x=>x.id===id);if(!v)return;
      sv('v-sucursal',v.sucursal);sv('v-turno',v.turno);sv('v-fecha',v.fecha);
      sv('v-responsable',v.responsable||'');sv('v-st',v.st||0);sv('v-pg',v.pg||0);sv('v-pl',v.pl||0);sv('v-pa',v.pa||0);sv('v-obs',v.obs||'');
    } else {
      ['v-responsable','v-obs'].forEach(x=>sv(x,''));
      sv('v-fecha',today);sv('v-turno','dia');sv('v-st',0);sv('v-pg',0);sv('v-pl',0);sv('v-pa',0);
      sv('v-sucursal','');
    }
    this.updateTotal();UI.openModal('modal-venta');
  },
  updateTotal(){
    const t=(parseInt(gv('v-st'))||0)+(parseInt(gv('v-pg'))||0)+(parseInt(gv('v-pl'))||0)+(parseInt(gv('v-pa'))||0);
    st('venta-total-prev',t);
  },
  save(){
    const suc=gv('v-sucursal');if(!suc){UI.toast('⚠️ Selecciona sucursal','warn');return}
    const st_=parseInt(gv('v-st'))||0,pg=parseInt(gv('v-pg'))||0,pl=parseInt(gv('v-pl'))||0,pa=parseInt(gv('v-pa'))||0;
    const total=st_+pg+pl+pa;
    if(!total){UI.toast('⚠️ Registra al menos una unidad','warn');return}
    const venta={id:State.editVenta||'v_'+uid(),sucursal:suc,turno:gv('v-turno'),fecha:gv('v-fecha'),
      st:st_,pg,pl,pa,total,responsable:gv('v-responsable'),obs:gv('v-obs'),weekKey:getWeekKey(gv('v-fecha'))};
    if(State.editVenta){const i=State.ventas.findIndex(x=>x.id===State.editVenta);if(i>-1)State.ventas[i]=venta}
    else State.ventas.push(venta);
    lsSet(LS_KEYS.ventas,State.ventas);UI.closeModal('modal-venta');
    this.render();this.buildCharts();UI.updateBadges();
    UI.toast(State.editVenta?'✅ Despacho actualizado':'✅ Despacho registrado','ok');State.editVenta=null;
  },
  delete(id){if(!confirm('¿Eliminar este despacho?'))return;State.ventas=State.ventas.filter(x=>x.id!==id);lsSet(LS_KEYS.ventas,State.ventas);this.render();this.buildCharts();UI.updateBadges();UI.toast('Despacho eliminado','err')},
  _filtered(){
    const periodo=gv('filtro-ventas')||'semana';
    const search=(gv('search-ventas')||'').toLowerCase();
    const now=new Date(),wk=getCurrentWeekKey();
    return State.ventas.filter(v=>{
      const fd=new Date(v.fecha+'T00:00:00');
      if(periodo==='semana')return getWeekKey(v.fecha)===wk;
      if(periodo==='quincena'){const d=fd.getDate();return fd.getMonth()===now.getMonth()&&fd.getFullYear()===now.getFullYear()&&(d<=15?(now.getDate()<=15):(now.getDate()>15))}
      if(periodo==='mes')return fd.getMonth()===now.getMonth()&&fd.getFullYear()===now.getFullYear();
      return true;
    }).filter(v=>!search||v.sucursal.toLowerCase().includes(search));
  },
  render(){
    const filtered=this._filtered();
    // KPIs
    const tots=filtered.reduce((a,v)=>({st:a.st+(v.st||0),pg:a.pg+(v.pg||0),pl:a.pl+(v.pl||0),pa:a.pa+(v.pa||0),tot:a.tot+(v.total||0)}),{st:0,pg:0,pl:0,pa:0,tot:0});
    st('hk-st',tots.st);st('hk-pg',tots.pg);st('hk-pl',tots.pl);st('hk-pa',tots.pa);st('hk-total',tots.tot);
    const tb=el('tbody-ventas');if(!tb)return;
    if(!filtered.length){tb.innerHTML=`<tr><td colspan="12" style="text-align:center;color:var(--ink4);padding:20px">Sin despachos para el período.</td></tr>`;return}
    tb.innerHTML=filtered.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map((v,i)=>`<tr>
      <td>${i+1}</td><td><strong>${escH(v.sucursal)}</strong></td>
      <td>${turnoLabel(v.turno)}</td><td>${fmtDate(v.fecha)}</td>
      <td style="text-align:center;font-weight:700;color:#b91c1c">${v.st||0}</td>
      <td style="text-align:center;font-weight:700;color:#dc2626">${v.pg||0}</td>
      <td style="text-align:center;font-weight:700;color:#d97706">${v.pl||0}</td>
      <td style="text-align:center;font-weight:700;color:#ea580c">${v.pa||0}</td>
      <td style="text-align:center;font-family:'JetBrains Mono',monospace;font-weight:700;background:var(--hemo-ll)">${v.total||0}</td>
      <td>${escH(v.responsable||'—')}</td><td>${escH(v.obs||'')}</td>
      <td style="white-space:nowrap">
        <button class="btn-del" onclick="Ventas.openModal('${v.id}')" title="Editar">✏️</button>
        <button class="btn-del" onclick="Ventas.delete('${v.id}')" title="Eliminar">🗑</button>
      </td></tr>`).join('');
  },
  buildCharts(){
    const filtered=this._filtered();
    // By sucursal — stacked products
    const bySuc={};
    filtered.forEach(v=>{
      if(!bySuc[v.sucursal])bySuc[v.sucursal]={st:0,pg:0,pl:0,pa:0};
      bySuc[v.sucursal].st+=(v.st||0);bySuc[v.sucursal].pg+=(v.pg||0);
      bySuc[v.sucursal].pl+=(v.pl||0);bySuc[v.sucursal].pa+=(v.pa||0);
    });
    const sucLabels=Object.keys(bySuc);
    // By turno — only Día and Noche
    const byTurno={dia:{st:0,pg:0,pl:0,pa:0},noche:{st:0,pg:0,pl:0,pa:0}};
    filtered.forEach(v=>{
      // Map legacy values to dia/noche
      const t=(v.turno==='noche')?'noche':'dia';
      const bt=byTurno[t];
      bt.st+=(v.st||0);bt.pg+=(v.pg||0);bt.pl+=(v.pl||0);bt.pa+=(v.pa||0);
    });

    this._dc('v-suc');this._dc('v-turno');this._dc('inicio-v');
    const datasets=(data)=>[
      {label:'Sangre Total',data,backgroundColor:'rgba(185,28,28,0.8)',borderRadius:4},
      {label:'Paq. Globular',data:data.map((_,i)=>Object.values(Object.values(bySuc)[i]||{})[1]||0),backgroundColor:'rgba(220,38,38,0.7)',borderRadius:4},
      {label:'Plaquetas',data:data.map((_,i)=>Object.values(Object.values(bySuc)[i]||{})[2]||0),backgroundColor:'rgba(217,119,6,0.7)',borderRadius:4},
      {label:'Plasma',data:data.map((_,i)=>Object.values(Object.values(bySuc)[i]||{})[3]||0),backgroundColor:'rgba(234,88,12,0.7)',borderRadius:4},
    ];
    const cSuc=el('chart-v-suc');
    if(cSuc&&sucLabels.length){
      this._charts['v-suc']=new Chart(cSuc,{type:'bar',data:{labels:sucLabels,datasets:[
        {label:'Sangre Total',data:sucLabels.map(s=>bySuc[s].st),backgroundColor:'rgba(185,28,28,0.8)',borderRadius:4},
        {label:'Paq. Globular',data:sucLabels.map(s=>bySuc[s].pg),backgroundColor:'rgba(220,38,38,0.7)',borderRadius:4},
        {label:'Plaquetas',data:sucLabels.map(s=>bySuc[s].pl),backgroundColor:'rgba(217,119,6,0.7)',borderRadius:4},
        {label:'Plasma',data:sucLabels.map(s=>bySuc[s].pa),backgroundColor:'rgba(234,88,12,0.7)',borderRadius:4},
      ]},options:{responsive:true,plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true},y:{stacked:true,ticks:{stepSize:1}}}}});
    }
    const cTurno=el('chart-v-turno');
    if(cTurno){
      const tLabels=['☀️ Turno Día','🌙 Turno Noche'];
      const tKeys=['dia','noche'];
      this._charts['v-turno']=new Chart(cTurno,{type:'bar',data:{labels:tLabels,datasets:[
        {label:'Sangre Total',data:tKeys.map(k=>byTurno[k].st),backgroundColor:'rgba(185,28,28,0.8)',borderRadius:4},
        {label:'Paq. Globular',data:tKeys.map(k=>byTurno[k].pg),backgroundColor:'rgba(220,38,38,0.7)',borderRadius:4},
        {label:'Plaquetas',data:tKeys.map(k=>byTurno[k].pl),backgroundColor:'rgba(217,119,6,0.7)',borderRadius:4},
        {label:'Plasma',data:tKeys.map(k=>byTurno[k].pa),backgroundColor:'rgba(234,88,12,0.7)',borderRadius:4},
      ]},options:{responsive:true,plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true},y:{stacked:true,ticks:{stepSize:1}}}}});
    }
    // Inicio chart (simplified)
    const cI=el('chart-inicio-ventas');
    if(cI&&sucLabels.length){
      this._dc('inicio-v');
      this._charts['inicio-v']=new Chart(cI,{type:'bar',data:{labels:sucLabels,datasets:[{label:'Total unidades',data:sucLabels.map(s=>bySuc[s].st+bySuc[s].pg+bySuc[s].pl+bySuc[s].pa),backgroundColor:'rgba(92,10,10,0.75)',borderRadius:5}]},options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{ticks:{stepSize:1}}}}});
    }
  },
  _dc(id){if(this._charts[id]){this._charts[id].destroy();delete this._charts[id]}}
};
