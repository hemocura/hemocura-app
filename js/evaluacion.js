'use strict';
// ══ EVALUACIÓN MODULE ══
window.Eval = {
  _areas:[{key:'insp',label:'🔍 Inspecciones'},{key:'cont',label:'🤝 Contactos'},{key:'jorn',label:'📋 Jornadas'},{key:'club',label:'🏆 Acciones'}],
  init(){
    const c=el('eval-areas');if(!c)return;
    c.innerHTML=this._areas.map(a=>`<div class="eval-row"><div class="eval-row-hd">
      <div class="eval-lbl">${a.label}</div>
      <div class="stars" id="stars-${a.key}">${[1,2,3,4,5].map(n=>`<span class="star ${n<=(State.evalScores[a.key]||0)?'':'off'}" onclick="Eval.setStars('${a.key}',${n})" onmouseover="Eval.prev('${a.key}',${n})" onmouseout="Eval.reset('${a.key}')">⭐</span>`).join('')}</div>
      <span class="badge" id="ev-badge-${a.key}">${this._label(State.evalScores[a.key]||0)}</span>
      <span class="score-n" id="sn-${a.key}">${State.evalScores[a.key]||0}/5</span>
    </div></div>`).join('');
    this.calcScore();
  },
  setStars(area,n){State.evalScores[area]=n;this._updateStars(area,n);const nl=el('sn-'+area);if(nl)nl.textContent=n+'/5';const b=el('ev-badge-'+area);if(b){b.textContent=this._label(n);b.className='badge '+(n>=4?'bg-green':n>=3?'bg-amber':'bg-red');}this.calcScore()},
  prev(a,n){this._updateStars(a,n)},
  reset(a){this._updateStars(a,State.evalScores[a]||0)},
  _updateStars(a,n){const c=el('stars-'+a);if(!c)return;c.querySelectorAll('.star').forEach((s,i)=>{s.classList.toggle('off',i>=n)})},
  _label(n){const l=['','Deficiente','Regular','Aceptable','Bueno','Excelente'];return l[n]||'—'},
  calcScore(){const avg=Object.values(State.evalScores).reduce((a,b)=>a+b,0)/4;const pct=Math.round(avg*20);st('ev-score',pct+'%')},
  buildTaskComp(){
    const c=el('eval-tasks-comp');if(!c)return;
    const tasks=State.tasks.filter(t=>!t.weekKey||t.weekKey===getCurrentWeekKey());
    const total=tasks.length,done=tasks.filter(t=>t.status==='completada').length;
    const pct=total?Math.round(done/total*100):0;
    st('ev-tasks',pct+'%');
    c.innerHTML=total?`<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;font-weight:700;color:var(--ink3)">CUMPLIMIENTO</span><span style="font-size:12px;font-weight:700;color:${pct>=80?'var(--green)':pct>=50?'var(--amber)':'var(--hemo-d)'}">${done}/${total} (${pct}%)</span></div><div class="prog-wrap"><div class="prog-bar ${pct>=80?'green':pct>=50?'amber':''}" style="width:${pct}%"></div></div></div>${tasks.map(t=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:7px;background:${t.status==='completada'?'var(--green-l)':'var(--bg)'};margin-bottom:3px"><span>${t.status==='completada'?'✅':'⏳'}</span><div style="flex:1;font-size:12.5px;font-weight:600;${t.status==='completada'?'text-decoration:line-through;color:var(--ink4)':''}">${escH(t.title)}</div></div>`).join('')}`:'<p style="color:var(--ink4);font-size:13px;padding:8px 0">Sin tareas esta semana.</p>';
  },
  save(){this.calcScore();scheduleAutoSave();UI.toast('✅ Evaluación guardada','ok')}
};
