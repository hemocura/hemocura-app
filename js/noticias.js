'use strict';
// ══ NOTICIAS SALUD + DATOS PROVINCIALES MODULE ══
window.Noticias = {
  _currentFilter:'',
  _data:[
    // ── DATOS PROVINCIALES SANTIAGO ──
    {id:'dp-stg',prov:'santiago',tipo:'datos',titulo:'📊 Datos de Salud — Santiago',fecha:'2025-03',cuerpo:'',datos:{
      centros:[{nombre:'Hospital José María Cabral y Báez',camas:500,medicos:320,especialidades:28},{nombre:'Hospital Metropolitano de Santiago (HOMS)',camas:350,medicos:210,especialidades:22},{nombre:'Hospital Infantil Dr. Arturo Grullón',camas:180,medicos:90,especialidades:15},{nombre:'Centro Médico Regional Santiago',camas:120,medicos:60,especialidades:12},{nombre:'Clínica Corominas',camas:80,medicos:45,especialidades:10}],
      estadisticas:{poblacion:'1,200,000',centros_publicos:14,centros_privados:28,medicos_total:1850,camas_total:2400,accidentes_mes:142,donantes_sangre_mes:380,unidades_hemo_demanda:'450-500/mes'}
    }},
    // ── DATOS PROVINCIALES PUERTO PLATA ──
    {id:'dp-pp',prov:'puerto-plata',tipo:'datos',titulo:'📊 Datos de Salud — Puerto Plata',fecha:'2025-03',cuerpo:'',datos:{
      centros:[{nombre:'Hospital Dr. Ricardo Limardo',camas:220,medicos:120,especialidades:14},{nombre:'Clínica Especialidades del Atlántico',camas:90,medicos:55,especialidades:10},{nombre:'Centro Médico Puerto Plata',camas:65,medicos:38,especialidades:8}],
      estadisticas:{poblacion:'380,000',centros_publicos:8,centros_privados:12,medicos_total:580,camas_total:820,accidentes_mes:68,donantes_sangre_mes:145,unidades_hemo_demanda:'150-180/mes'}
    }},
    // ── DATOS HERMANAS MIRABAL (TENARES) ──
    {id:'dp-hm',prov:'hermanas-mirabal',tipo:'datos',titulo:'📊 Datos de Salud — Hermanas Mirabal / Tenares',fecha:'2025-03',cuerpo:'',datos:{
      centros:[{nombre:'Hospital Provincial Hermanas Mirabal',camas:85,medicos:42,especialidades:8},{nombre:'Clínica Esperanza Tenares',camas:30,medicos:18,especialidades:5}],
      estadisticas:{poblacion:'96,000',centros_publicos:4,centros_privados:6,medicos_total:180,camas_total:230,accidentes_mes:24,donantes_sangre_mes:48,unidades_hemo_demanda:'55-70/mes'}
    }},
    // ── DATOS SAN FRANCISCO DE MACORÍS ──
    {id:'dp-sfm',prov:'san-francisco',tipo:'datos',titulo:'📊 Datos de Salud — San Francisco de Macorís',fecha:'2025-03',cuerpo:'',datos:{
      centros:[{nombre:'Hospital Dr. Luis E. Aybar',camas:250,medicos:140,especialidades:18},{nombre:'Hospital Infantil SFM',camas:95,medicos:50,especialidades:10},{nombre:'Clínica Central SFM',camas:70,medicos:40,especialidades:9}],
      estadisticas:{poblacion:'350,000',centros_publicos:9,centros_privados:15,medicos_total:620,camas_total:900,accidentes_mes:85,donantes_sangre_mes:210,unidades_hemo_demanda:'220-260/mes'}
    }},
    // ── NOTICIAS NACIONALES ──
    {id:'n1',prov:'nacional',tipo:'salud',titulo:'🩸 Banco de Sangre Nacional reporta aumento en demanda de hemoderivados',fecha:'2025-03-20',cuerpo:'El Banco Nacional de Sangre de la República Dominicana informó un incremento del 18% en la demanda de hemoderivados durante el primer trimestre 2025, especialmente en Paquete Globular y Plaquetas. Los hospitales terciarios reportan mayor actividad quirúrgica y oncológica como causa principal del aumento.'},
    {id:'n2',prov:'nacional',tipo:'alerta',titulo:'⚠️ DIGESETT: Aumento de accidentalidad en fin de semana',fecha:'2025-03-18',cuerpo:'La Dirección General de Seguridad de Tránsito reportó 420 accidentes de tránsito en el último fin de semana a nivel nacional. Santiago y Santo Domingo concentraron el 58% de los casos. Se estima una demanda adicional de 280 unidades de sangre en los próximos 7 días en centros de trauma.'},
    {id:'n3',prov:'nacional',tipo:'salud',titulo:'🏥 Plan Nacional de Salud 2025: inversión en centros regionales',fecha:'2025-03-15',cuerpo:'El Ministerio de Salud Pública anunció inversión de RD$4,200 millones para equipamiento de hospitales regionales. Los centros de Santiago, San Francisco de Macorís y Puerto Plata serán beneficiados con nuevas salas de quirófano y UCI, lo que incrementará la demanda de hemoderivados.'},
    {id:'n4',prov:'santiago',tipo:'accidente',titulo:'🚨 Accidentes de tránsito — Santiago (reportes recientes)',fecha:'2025-03-22',cuerpo:'Reportes de redes sociales y medios locales indican 38 accidentes de tránsito en Santiago durante la semana. Las zonas de Autopista Duarte y Circunvalación Norte concentran el mayor número de incidentes. Hospital Cabral y Báez reporta activación del protocolo de trauma mayor en 4 casos.'},
    {id:'n5',prov:'santiago',tipo:'salud',titulo:'🏥 Expansión de servicios — Hospital HOMS Santiago',fecha:'2025-03-19',cuerpo:'El Hospital Metropolitano de Santiago anunció la apertura de una nueva Unidad de Cuidados Intensivos con 12 camas adicionales. Esta expansión incrementará significativamente la demanda de Plasma y Paquete Globular. Una oportunidad comercial directa para Cura-Santiago.'},
    {id:'n6',prov:'puerto-plata',tipo:'accidente',titulo:'🚨 Zona turística: incremento de accidentes en carretera costera',fecha:'2025-03-21',cuerpo:'La Policía Nacional reportó 15 accidentes en la carretera Puerto Plata-Sosúa durante la última semana de temporada alta. El Hospital Ricardo Limardo atiende mayor afluencia de pacientes de trauma, con incremento en solicitudes de sangre total y paquete globular.'},
    {id:'n7',prov:'hermanas-mirabal',tipo:'datos',titulo:'📋 Hospital Provincial Hermanas Mirabal: modernización',fecha:'2025-03-17',cuerpo:'El hospital provincial inició proceso de modernización de su banco de sangre interno. La dirección indicó interés en establecer convenios con proveedores externos de hemoderivados para garantizar abastecimiento continuo. Oportunidad de prospección para Hemocura-Tenares.'},
    {id:'n8',prov:'san-francisco',tipo:'salud',titulo:'🩺 Campaña de donación de sangre — SFM',fecha:'2025-03-16',cuerpo:'El Ministerio de Salud coordinó jornada de donación en San Francisco de Macorís. Se recolectaron 185 unidades. Sin embargo, la demanda proyectada para abril supera las reservas disponibles. Los hospitales del Cibao Oriental estiman déficit de 80-100 unidades de hemoderivados procesados.'},
    {id:'n9',prov:'nacional',tipo:'datos',titulo:'📈 Estadística: Centros de Salud en República Dominicana 2025',fecha:'2025-03-10',cuerpo:'',datos:{
      resumen:[
        {region:'Santiago y Cibao Norte',centros_pub:42,centros_priv:78,medicos:5200,camas:8400},
        {region:'Cibao Oriental (SFM, Mirabal)',centros_pub:28,centros_priv:35,medicos:2100,camas:3200},
        {region:'Norte (Puerto Plata)',centros_pub:18,centros_priv:22,medicos:980,camas:1600},
        {region:'Nacional (total estimado)',centros_pub:612,centros_priv:890,medicos:32000,camas:58000}
      ]
    }},
    {id:'n10',prov:'nacional',tipo:'alerta',titulo:'🩸 Déficit de Plaquetas en hospitales del Cibao',fecha:'2025-03-12',cuerpo:'Varios hospitales del Cibao reportaron escasez de plaquetas durante los últimos 15 días. La temporada de dengue y mayor actividad oncológica son las causas identificadas. Los directores médicos de centros en Santiago y SFM contactaron proveedores privados para garantizar suministro.'}
  ],
  filterProv(prov){this._currentFilter=prov;this.load()},
  load(){
    const c=el('noticias-content');if(!c)return;
    const filtered=this._currentFilter?this._data.filter(n=>n.prov===this._currentFilter):this._data;
    c.innerHTML=filtered.map(n=>this._renderNoticia(n)).join('');
  },
  _renderNoticia(n){
    const tagColor={accidente:'accidente',salud:'salud',datos:'datos',alerta:'alerta'};
    const tagLabel={accidente:'🚨 Accidentes',salud:'🏥 Salud',datos:'📊 Datos',alerta:'⚠️ Alerta'};
    let extra='';
    if(n.datos){
      if(n.datos.centros){
        extra=`<div class="datos-tabla">
          <div class="datos-prov-hd">Principales centros de salud</div>
          ${n.datos.centros.map(c=>`<div class="datos-fila"><span>🏥 ${escH(c.nombre)}</span><div style="display:flex;gap:12px;flex-shrink:0"><span>🛏 <strong>${c.camas}</strong></span><span>👨‍⚕️ <strong>${c.medicos}</strong></span><span>🔬 <strong>${c.especialidades}</strong> esp.</span></div></div>`).join('')}
        </div>`;
        if(n.datos.estadisticas){const e=n.datos.estadisticas;extra+=`<div class="datos-tabla" style="margin-top:8px">
          <div class="datos-prov-hd">Estadísticas clave</div>
          <div class="datos-fila"><span>👥 Población</span><strong>${e.poblacion}</strong></div>
          <div class="datos-fila"><span>🏥 Centros públicos</span><strong>${e.centros_publicos}</strong></div>
          <div class="datos-fila"><span>🏨 Centros privados</span><strong>${e.centros_privados}</strong></div>
          <div class="datos-fila"><span>👨‍⚕️ Médicos totales</span><strong>${e.medicos_total}</strong></div>
          <div class="datos-fila"><span>🛏 Camas totales</span><strong>${e.camas_total}</strong></div>
          <div class="datos-fila" style="background:var(--red-l)"><span>🚨 Accidentes/mes</span><strong style="color:var(--red)">${e.accidentes_mes}</strong></div>
          <div class="datos-fila" style="background:var(--green-l)"><span>🩸 Donantes sangre/mes</span><strong style="color:var(--green)">${e.donantes_sangre_mes}</strong></div>
          <div class="datos-fila" style="background:var(--hemo-ll)"><span>💉 Demanda hemoderivados/mes</span><strong style="color:var(--hemo-d)">${e.unidades_hemo_demanda}</strong></div>
        </div>`;}
      }
      if(n.datos.resumen){extra=`<div class="datos-tabla"><div class="datos-prov-hd">Estadísticas por región</div>${n.datos.resumen.map(r=>`<div class="datos-fila"><span>📍 ${escH(r.region)}</span><div style="display:flex;gap:8px;font-size:11.5px;flex-shrink:0"><span>Pub: <strong>${r.centros_pub}</strong></span><span>Priv: <strong>${r.centros_priv}</strong></span><span>Méd: <strong>${r.medicos.toLocaleString()}</strong></span><span>Camas: <strong>${r.camas.toLocaleString()}</strong></span></div></div>`).join('')}</div>`;}
    }
    return `<div class="noticia-card">
      <div class="noticia-tag ${tagColor[n.tipo]||'datos'}">${tagLabel[n.tipo]||n.tipo}</div>
      <div class="noticia-title">${n.titulo}</div>
      ${n.fecha?`<div style="font-size:11px;color:var(--ink4);margin-bottom:6px">📅 ${n.fecha}</div>`:''}
      ${n.cuerpo?`<div class="noticia-body">${escH(n.cuerpo)}</div>`:''}
      ${extra}
    </div>`;
  }
};
