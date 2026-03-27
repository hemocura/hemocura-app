'use strict';
// ══ EXPORT MODULE ══
window.Export = {
  json(){
    Weeks.save();
    const data={_version:'10',_app:'HEMOCURA',exported:new Date().toISOString(),
      weeks:getAllWeeks(),tasks:State.tasks,reminders:State.reminders,ventas:State.ventas,
      creditos:State.creditos,sucursales:State.sucursales,reuniones:State.reuniones,
      visitas:State.visitas,incidencias:State.incidencias,images:State.images,
      contactos:State.contactos,empresas:State.empresas,clientes:State.clientes};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=`HEMOCURA_v10_${new Date().toISOString().split('T')[0]}.json`;a.click();
    UI.toast('✅ JSON exportado','ok');
  },
  pdf(){
    try{
      const {jsPDF}=window.jspdf;
      const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'letter'});
      const gerente=gv('meta-gerente'),periodo=gv('meta-periodo'),num=gv('meta-num');
      const wk=getCurrentWeekKey();
      doc.setFillColor(92,10,10);doc.rect(0,0,216,30,'F');
      doc.setTextColor(255,255,255);doc.setFontSize(18);doc.setFont('helvetica','bold');
      doc.text('HEMOCURA v10 – Reporte Semanal',108,13,{align:'center'});
      doc.setFontSize(10);doc.setFont('helvetica','normal');
      doc.text(`${gerente} · ${periodo} · ${num}`,108,22,{align:'center'});
      doc.setTextColor(30,30,30);let y=38;
      // KPIs
      const cnt={insp:el('tbody-inspeccion')?.rows.length||0,cont:el('tbody-contactos')?.rows.length||0,jorn:el('tbody-jornadas')?.rows.length||0,acc:el('tbody-acciones')?.rows.length||0};
      doc.setFontSize(12);doc.setFont('helvetica','bold');doc.text('Resumen Ejecutivo',14,y);y+=6;
      [['🔍 Inspecciones',cnt.insp],['🤝 Contactos',cnt.cont],['📋 Jornadas',cnt.jorn],['⚡ Acciones',cnt.acc]].forEach(([l,v],i)=>{
        if(i===2)y+=0;const x=14+(i%2)*100;if(i%2===0&&i>0)y+=12;
        doc.setFillColor(253,232,230);doc.roundedRect(x,y-1,90,11,2,2,'F');
        doc.setFontSize(14);doc.setFont('helvetica','bold');doc.setTextColor(92,10,10);doc.text(String(v),x+5,y+7);
        doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(60,60,80);doc.text(l,x+20,y+7);
      });y+=20;
      // Ventas hemoderivados
      const wv=State.ventas.filter(v=>getWeekKey(v.fecha)===wk);
      if(wv.length){
        doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(30,30,30);doc.text('🩸 Despacho de Hemoderivados',14,y);y+=5;
        doc.autoTable({startY:y,head:[['Sucursal','Turno','Fecha','ST','PG','PL','PA','Total']],
          body:wv.map(v=>[v.sucursal,turnoLabel(v.turno),fmtDate(v.fecha),v.st||0,v.pg||0,v.pl||0,v.pa||0,v.total||0]),
          styles:{fontSize:9,cellPadding:3},headStyles:{fillColor:[92,10,10],textColor:255},alternateRowStyles:{fillColor:[255,245,245]},theme:'striped'});
        y=doc.lastAutoTable.finalY+8;
      }
      // Contactos
      const wContacts=State.contactos.filter(c=>getWeekKey(c.fecha||'')===wk);
      if(wContacts.length&&y<230){
        if(y>210){doc.addPage();y=20}
        doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(30,30,30);doc.text('🤝 Contactos Visitados',14,y);y+=5;
        doc.autoTable({startY:y,head:[['Nombre','Cargo','Empresa','Sucursal','Resultado']],
          body:wContacts.map(c=>[c.nombre||'',c.cargo||'',c.empresa||'',c.sucursal||'',c.resultado||'']),
          styles:{fontSize:9,cellPadding:3},headStyles:{fillColor:[29,78,216],textColor:255},theme:'striped'});
        y=doc.lastAutoTable.finalY+8;
      }
      // Inspecciones
      const rows=Weeks.collectTableData().inspeccion||[];
      if(rows.length){
        doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('Inspecciones',14,y);y+=5;
        doc.autoTable({startY:y,head:[['Sucursal','Responsable','Fecha','Estado']],body:rows.map(r=>[r[1]||'',r[2]||'',r[4]||'',r[7]||'']),styles:{fontSize:9,cellPadding:3},headStyles:{fillColor:[92,10,10],textColor:255},theme:'striped'});
        y=doc.lastAutoTable.finalY+8;
      }
      // Reuniones
      if(State.reuniones.length&&y<230){
        doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('🗣 Reuniones',14,y);y+=5;
        doc.autoTable({startY:y,head:[['Título','Tipo','Fecha','Estado']],body:State.reuniones.map(r=>[r.titulo,r.tipo,fmtDate(r.fecha),r.estado]),styles:{fontSize:9,cellPadding:3},headStyles:{fillColor:[15,118,110],textColor:255},theme:'striped'});
        y=doc.lastAutoTable.finalY+8;
      }
      if(y>230){doc.addPage();y=20}
      // Obs
      doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('Observaciones',14,y);y+=6;
      [['Logros',gv('obs-logros')],['Dificultades',gv('obs-dificultades')],['Próxima Semana',gv('obs-proxima')]].forEach(([l,v])=>{
        if(v){doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(92,10,10);doc.text(l+':',14,y);y+=5;doc.setFont('helvetica','normal');doc.setTextColor(60,60,80);doc.setFontSize(9);const lines=doc.splitTextToSize(v,180);doc.text(lines,14,y);y+=lines.length*5+3}
      });
      const pg=doc.internal.getNumberOfPages();
      for(let i=1;i<=pg;i++){doc.setPage(i);doc.setFillColor(92,10,10);doc.rect(0,270,216,10,'F');doc.setTextColor(255,255,255);doc.setFontSize(8);doc.text(`HEMOCURA v10 · ${new Date().toLocaleDateString('es-DO')} · Pág ${i}/${pg}`,108,277,{align:'center'})}
      doc.save(`HEMOCURA_v10_Reporte_${new Date().toISOString().split('T')[0]}.pdf`);
      UI.toast('📕 PDF generado','ok');
    }catch(e){UI.toast('❌ Error PDF: '+e.message,'err');console.error(e)}
  },
  async docx(){
    try{
      const {Document,Packer,Paragraph,Table,TableRow,TableCell,TextRun,HeadingLevel,WidthType,AlignmentType}=window.docx;
      const gerente=gv('meta-gerente'),periodo=gv('meta-periodo'),num=gv('meta-num');
      const wk=getCurrentWeekKey();
      const wv=State.ventas.filter(v=>getWeekKey(v.fecha)===wk);
      const makeH=(t,c='5C0A0A')=>new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun({text:t,color:c,bold:true,size:26})]});
      const makeP=(t,opts={})=>new Paragraph({children:[new TextRun({text:t,...opts})]});
      const makeCR=()=>new Paragraph({children:[new TextRun({text:'',break:1})]});
      const makeTable=(headers,rows)=>new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[
        new TableRow({children:headers.map(h=>new TableCell({children:[new Paragraph({children:[new TextRun({text:h,bold:true,color:'FFFFFF',size:18})],alignment:AlignmentType.CENTER})],shading:{fill:'5C0A0A'}})),tableHeader:true}),
        ...rows.map(row=>new TableRow({children:row.map(cell=>new TableCell({children:[new Paragraph({children:[new TextRun({text:String(cell||''),size:18})]})]}))}))
      ]});
      const children=[
        new Paragraph({children:[new TextRun({text:'HEMOCURA v10 – Gestión Comercial',bold:true,size:36,color:'5C0A0A'})],alignment:AlignmentType.CENTER}),
        makeP(`${gerente}  ·  ${periodo}  ·  ${num}`,{size:20,color:'6B6B88'}),makeCR()
      ];
      if(wv.length){children.push(makeH('🩸 Hemoderivados Despachados'));children.push(makeTable(['Sucursal','Turno','Fecha','ST','PG','PL','PA','Total'],wv.map(v=>[v.sucursal,turnoLabel(v.turno),fmtDate(v.fecha),v.st||0,v.pg||0,v.pl||0,v.pa||0,v.total||0])));children.push(makeCR())}
      const wkContacts=State.contactos.filter(c=>getWeekKey(c.fecha||'')===wk);
      if(wkContacts.length){children.push(makeH('🤝 Contactos Visitados','1D4ED8'));children.push(makeTable(['Nombre','Cargo','Empresa','Sucursal','Resultado'],wkContacts.map(c=>[c.nombre||'',c.cargo||'',c.empresa||'',c.sucursal||'',c.resultado||''])));children.push(makeCR())}
      const irows=Weeks.collectTableData().inspeccion||[];
      if(irows.length){children.push(makeH('🔍 Inspecciones'));children.push(makeTable(['Sucursal','Responsable','Fecha','Estado'],irows.map(r=>[r[1]||'',r[2]||'',r[4]||'',r[7]||''])));children.push(makeCR())}
      if(State.reuniones.length){children.push(makeH('🗣 Reuniones','0F766E'));children.push(makeTable(['Título','Tipo','Fecha','Estado'],State.reuniones.map(r=>[r.titulo,r.tipo,fmtDate(r.fecha),r.estado])));children.push(makeCR())}
      [['Logros',gv('obs-logros')],['Dificultades',gv('obs-dificultades')],['Próxima Semana',gv('obs-proxima')]].forEach(([l,v])=>{if(v){children.push(makeH(l));children.push(makeP(v,{size:20}));children.push(makeCR())}});
      const doc=new Document({sections:[{properties:{},children}]});
      const blob=await Packer.toBlob(doc);
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`HEMOCURA_v10_${new Date().toISOString().split('T')[0]}.docx`;a.click();
      UI.toast('📘 Word generado','ok');
    }catch(e){UI.toast('❌ Error Word: '+e.message,'err');console.error(e)}
  },
  import(input){
    const file=input.files[0];if(!file)return;
    const r=new FileReader();
    r.onload=e=>{
      try{
        const data=JSON.parse(e.target.result);
        if(!data._app||data._app!=='HEMOCURA'){UI.toast('❌ Archivo no compatible','err');return}
        if(data.weeks)saveAllWeeks({...getAllWeeks(),...data.weeks});
        if(data.tasks){State.tasks=[...State.tasks,...(data.tasks||[]).filter(t=>!State.tasks.find(x=>x.id===t.id))];lsSet(LS_KEYS.tasks,State.tasks)}
        if(data.ventas){State.ventas=[...State.ventas,...(data.ventas||[]).filter(v=>!State.ventas.find(x=>x.id===v.id))];lsSet(LS_KEYS.ventas,State.ventas)}
        if(data.creditos){State.creditos=[...State.creditos,...(data.creditos||[]).filter(c=>!State.creditos.find(x=>x.id===c.id))];lsSet(LS_KEYS.creditos,State.creditos)}
        if(data.sucursales&&data.sucursales.length){State.sucursales=data.sucursales;lsSet(LS_KEYS.sucursales,State.sucursales)}
        if(data.reuniones){State.reuniones=[...State.reuniones,...(data.reuniones||[]).filter(r=>!State.reuniones.find(x=>x.id===r.id))];lsSet(LS_KEYS.reuniones,State.reuniones)}
        if(data.contactos){State.contactos=[...State.contactos,...(data.contactos||[]).filter(c=>!State.contactos.find(x=>x.id===c.id))];lsSet(LS_KEYS.contactos,State.contactos)}
        if(data.empresas&&data.empresas.length){State.empresas=[...new Set([...State.empresas,...data.empresas])].sort();lsSet(LS_KEYS.empresas,State.empresas)}
        if(data.clientes&&data.clientes.length){State.clientes=[...new Set([...( State.clientes||[]),...data.clientes])].sort();lsSet(LS_KEYS.clientes,State.clientes)}
        if(data.incidencias){Object.assign(State.incidencias,data.incidencias);lsSet(LS_KEYS.incidencias,State.incidencias)}
        if(data.images){Object.assign(State.images,data.images);lsSet(LS_KEYS.images,State.images)}
        Weeks.renderList();Weeks.populatePeriodSelect();UI.updateBadges();Reminders.check();
        UI.toast('✅ Datos importados','ok');
      }catch(err){UI.toast('❌ Error importar: '+err.message,'err')}
    };
    r.readAsText(file);input.value='';
  }
};
