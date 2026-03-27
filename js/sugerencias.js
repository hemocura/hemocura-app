'use strict';
// ══ SUGERENCIAS IA MODULE ══
window.Sugerencias = {
  refresh(){
    const c=el('sugerencias-list');if(!c)return;
    c.innerHTML='<div style="text-align:center;padding:20px;color:var(--ink3)"><div style="font-size:28px;animation:spin 1s linear infinite;display:inline-block">💡</div><p style="margin-top:8px">Analizando datos…</p></div>';
    setTimeout(()=>{c.innerHTML=this._generate().map(s=>this._renderCard(s)).join('')},600);
  },
  _generate(){
    const wk=getCurrentWeekKey();
    const wv=State.ventas.filter(v=>getWeekKey(v.fecha)===wk);
    const tasks=State.tasks.filter(t=>!t.weekKey||t.weekKey===wk);
    const done=tasks.filter(t=>t.status==='completada').length;
    const incOpen=Object.values(State.incidencias).filter(i=>i.estado!=='resuelta');
    const credAct=State.creditos.filter(c=>c.estado==='activo'||c.estado==='en-gestion');
    const credVenc=State.creditos.filter(c=>c.estado==='vencido');
    const sugs=[];
    // Análisis de ventas por sucursal
    const bySuc={};
    State.ventas.slice(-50).forEach(v=>{bySuc[v.sucursal]=(bySuc[v.sucursal]||0)+(v.total||0)});
    const sucKeys=Object.keys(bySuc).sort((a,b)=>bySuc[b]-bySuc[a]);
    const topSuc=sucKeys[0],lowSuc=sucKeys[sucKeys.length-1];
    if(topSuc&&lowSuc&&topSuc!==lowSuc){
      sugs.push({priority:'high',category:'Ventas',icon:'🏆',title:`Replicar el éxito de ${topSuc}`,
        desc:`${topSuc} lidera con ${bySuc[topSuc]} unidades totales. Analiza sus prácticas y replica en ${lowSuc} (${bySuc[lowSuc]} unidades).`,
        actions:['Visita a '+ topSuc+' para documentar buenas prácticas','Reunión de seguimiento con responsable de '+lowSuc,'Establecer meta semanal para '+lowSuc]});
    }
    // Turnos bajo rendimiento
    const byTurno={mañana:0,tarde:0,noche:0,completo:0};
    State.ventas.slice(-30).forEach(v=>{byTurno[v.turno]=(byTurno[v.turno]||0)+(v.total||0)});
    const minTurno=Object.entries(byTurno).sort((a,b)=>a[1]-b[1])[0];
    if(minTurno&&minTurno[1]===0){
      sugs.push({priority:'medium',category:'Operaciones',icon:'🕐',title:`Potenciar turno de ${minTurno[0]}`,
        desc:`El turno ${minTurno[0]} no registra unidades en el período reciente. Hay oportunidad de crecimiento.`,
        actions:['Asignar responsable al turno '+minTurno[0],'Verificar disponibilidad de hemoderivados en ese turno','Capacitación al personal de turno']});
    }
    // Créditos vencidos
    if(credVenc.length){
      const total=credVenc.reduce((s,c)=>s+(c.saldo||0),0);
      sugs.push({priority:'high',category:'Cobranza',icon:'💳',title:`Gestionar ${credVenc.length} créditos vencidos`,
        desc:`Hay RD$${fmt$(total)} en créditos vencidos. La recuperación inmediata mejora el flujo de caja.`,
        actions:['Llamar a cada cliente con crédito vencido','Ofrecer plan de pago escalonado','Registrar compromisos de pago con fecha']});
    }
    // Incidencias abiertas
    if(incOpen.length>0){
      sugs.push({priority:incOpen.length>3?'high':'medium',category:'Calidad',icon:'🚨',title:`Resolver ${incOpen.length} incidencia(s) abierta(s)`,
        desc:`Las incidencias sin resolver pueden afectar la relación con clientes y la reputación comercial de HEMOCURA.`,
        actions:['Priorizar incidencias críticas','Comunicar acción correctiva a los centros afectados','Documentar causa raíz para prevenir recurrencia']});
    }
    // Agenda baja cumplimiento
    const pct=tasks.length?Math.round(done/tasks.length*100):100;
    if(tasks.length>0&&pct<60){
      sugs.push({priority:'medium',category:'Productividad',icon:'📅',title:`Mejorar cumplimiento de agenda (${pct}%)`,
        desc:`Solo ${done} de ${tasks.length} tareas completadas esta semana. Una agenda ejecutada = más visitas = más ventas.`,
        actions:['Revisar tareas pendientes cada mañana','Reagendar tareas no críticas','Delegar tareas operativas']});
    }
    // Expansión de contactos
    const wContacts=el('tbody-contactos')?.rows.length||0;
    if(wContacts<3){
      sugs.push({priority:'medium',category:'Prospección',icon:'🤝',title:'Ampliar red de contactos',
        desc:`Solo ${wContacts} contacto(s) esta semana. Cada nuevo contacto en un centro de salud es una oportunidad de venta futura.`,
        actions:['Visitar al menos 2 centros de salud sin historia comercial','Solicitar referidos a contactos actuales','Participar en eventos de salud provinciales']});
    }
    // Producto bajo en demanda
    const prodTotals={st:0,pg:0,pl:0,pa:0};
    wv.forEach(v=>{prodTotals.st+=(v.st||0);prodTotals.pg+=(v.pg||0);prodTotals.pl+=(v.pl||0);prodTotals.pa+=(v.pa||0)});
    const prodLabels={st:'Sangre Total',pg:'Paquete Globular',pl:'Plaquetas',pa:'Plasma'};
    const lowProd=Object.entries(prodTotals).sort((a,b)=>a[1]-b[1])[0];
    if(lowProd&&lowProd[1]<5){
      sugs.push({priority:'low',category:'Producto',icon:'🩸',title:`Impulsar demanda de ${prodLabels[lowProd[0]]}`,
        desc:`${prodLabels[lowProd[0]]} tiene baja demanda esta semana (${lowProd[1]} unidades). Identificar centros con necesidad específica.`,
        actions:['Contactar áreas de quirófano y UCI de los centros','Presentar disponibilidad y pricing de '+prodLabels[lowProd[0]],'Programar capacitación sobre usos clínicos']});
    }
    // Reuniones como herramienta de ventas
    if(State.reuniones.filter(r=>r.estado==='programada').length===0){
      sugs.push({priority:'low',category:'Gestión',icon:'🗣',title:'Programar reuniones de seguimiento',
        desc:'No hay reuniones programadas. Las reuniones periódicas con directivos de centros fortalecen la relación comercial.',
        actions:['Agendar reunión semanal con responsables de sucursales','Preparar reporte de ventas para presentación','Identificar necesidades de cada centro']});
    }
    if(!sugs.length){sugs.push({priority:'low',category:'Excelente',icon:'🌟',title:'¡Semana de alto rendimiento!',desc:'Todos los indicadores están en verde. Mantén el ritmo y comparte las mejores prácticas con el equipo.',actions:['Documentar buenas prácticas de esta semana','Establecer metas más altas para la próxima','Compartir logros con el equipo']})}
    return sugs;
  },
  _renderCard(s){
    const pColors={high:'var(--hemo-d)',medium:'var(--amber)',low:'var(--green)'};
    const pLabels={high:'🔴 ALTA PRIORIDAD',medium:'🟡 PRIORIDAD MEDIA',low:'🟢 BAJA PRIORIDAD'};
    return `<div class="sug-card ${s.priority}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:26px">${s.icon}</span>
        <div>
          <div class="sug-priority" style="color:${pColors[s.priority]}">${pLabels[s.priority]} · ${s.category}</div>
          <div class="sug-title">${escH(s.title)}</div>
        </div>
      </div>
      <div class="sug-desc">${escH(s.desc)}</div>
      <div class="sug-action">
        <div class="sug-action-title">✅ Acciones recomendadas:</div>
        ${s.actions.map(a=>`<div style="font-size:12.5px;color:var(--ink2);padding:3px 0;padding-left:10px;border-left:2px solid var(--teal);margin-bottom:3px">${escH(a)}</div>`).join('')}
      </div>
    </div>`;
  }
};
