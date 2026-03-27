'use strict';
// ══ CRÉDITOS MODULE v10.1 ══
// • Unidades por producto (ST/PG/PL/PA) igual que ventas
// • Cliente desde lista desplegable con gestión (agregar/eliminar)
// • Monto en RD$ como campo adicional opcional
// • Turno simplificado: Día / Noche
// • Análisis de comportamiento: semanal, quincenal, mensual, turno

window.Creditos = {
  _chart: null,

  // ── Default clients list ──────────────────────────────
  _defaultClientes: [
    'Hospital José M. Cabral y Báez',
    'Hospital Metropolitano de Santiago (HOMS)',
    'Hospital Infantil Dr. Arturo Grullón',
    'Hospital Dr. Ricardo Limardo',
    'Hospital Provincial Hermanas Mirabal',
    'Hospital Dr. Luis E. Aybar',
    'Hospital Infantil SFM',
    'Clínica Corominas',
    'Clínica Especialidades del Atlántico',
    'Centro Médico Puerto Plata',
    'Clínica Central SFM',
    'Cruz Roja Dominicana'
  ],

  init() {
    if (!State.clientes || !State.clientes.length) {
      State.clientes = [...this._defaultClientes];
      lsSet(LS_KEYS.clientes, State.clientes);
    }
  },

  // ── Rebuild client dropdown ───────────────────────────
  _buildClienteSelect(selected = '') {
    const s = el('c-cliente-sel'); if (!s) return;
    s.innerHTML =
      '<option value="">— Seleccionar cliente —</option>' +
      (State.clientes || []).map(c =>
        `<option value="${escH(c)}"${c === selected ? ' selected' : ''}>${escH(c)}</option>`
      ).join('') +
      '<option value="__nuevo__">➕ Agregar nuevo cliente…</option>';
  },

  onClienteChange() {
    const val = gv('c-cliente-sel');
    const wrap = el('nuevo-cliente-wrap');
    if (val === '__nuevo__') {
      if (wrap) { wrap.style.display = 'flex'; el('nuevo-cliente-input')?.focus(); }
    } else {
      if (wrap) wrap.style.display = 'none';
    }
  },

  confirmNuevoCliente() {
    const inp = el('nuevo-cliente-input'); if (!inp) return;
    const name = inp.value.trim();
    if (!name) { UI.toast('⚠️ Escribe el nombre del cliente', 'warn'); return; }
    if (!State.clientes) State.clientes = [];
    if (!State.clientes.includes(name)) {
      State.clientes.push(name);
      State.clientes.sort();
      lsSet(LS_KEYS.clientes, State.clientes);
    }
    this._buildClienteSelect(name);
    inp.value = '';
    const wrap = el('nuevo-cliente-wrap');
    if (wrap) wrap.style.display = 'none';
    UI.toast(`✅ "${name}" agregado`, 'ok');
  },

  updateTotals() {
    const total = (parseInt(gv('c-st'))||0) + (parseInt(gv('c-pg'))||0) +
                  (parseInt(gv('c-pl'))||0) + (parseInt(gv('c-pa'))||0);
    st('cred-total-prev', total);
  },

  // ── Modal ─────────────────────────────────────────────
  openModal(id = null) {
    State.editCredito = id;
    el('cred-modal-title').textContent = id ? '✏️ Editar Crédito' : '💳 Nuevo Crédito — Despacho';
    const today = new Date().toISOString().split('T')[0];

    // Rebuild selects
    if (typeof Sucursales !== 'undefined') {
      const suc = el('c-sucursal');
      if (suc) suc.innerHTML = '<option value="">Seleccionar…</option>' +
        State.sucursales.map(x => `<option value="${escH(x.nombre)}">${escH(x.nombre)}</option>`).join('');
    }
    this._buildClienteSelect('');

    if (id) {
      const c = State.creditos.find(x => x.id === id); if (!c) return;
      sv('c-sucursal',  c.sucursal  || '');
      sv('c-turno',     c.turno     || 'dia');
      sv('c-fecha',     c.fecha     || today);
      sv('c-monto',     c.monto     || 0);
      sv('c-abonado',   c.abonado   || 0);
      sv('c-venc',      c.venc      || '');
      sv('c-estado',    c.estado    || 'activo');
      sv('c-obs',       c.obs       || '');
      sv('c-st',        c.st        || 0);
      sv('c-pg',        c.pg        || 0);
      sv('c-pl',        c.pl        || 0);
      sv('c-pa',        c.pa        || 0);
      this._buildClienteSelect(c.cliente || '');
    } else {
      sv('c-sucursal',''); sv('c-turno','dia'); sv('c-fecha',today);
      sv('c-monto',''); sv('c-abonado',0); sv('c-venc',''); sv('c-estado','activo'); sv('c-obs','');
      sv('c-st',0); sv('c-pg',0); sv('c-pl',0); sv('c-pa',0);
    }

    const wrap = el('nuevo-cliente-wrap');
    if (wrap) { wrap.style.display = 'none'; sv('nuevo-cliente-input',''); }

    this.updateTotals();
    UI.openModal('modal-credito');
  },

  save() {
    const suc = gv('c-sucursal');
    if (!suc) { UI.toast('⚠️ Selecciona la sucursal', 'warn'); return; }

    let cliente = gv('c-cliente-sel');
    if (cliente === '__nuevo__') {
      cliente = (el('nuevo-cliente-input')?.value || '').trim();
      if (!cliente) { UI.toast('⚠️ Escribe el nombre del cliente', 'warn'); return; }
    }
    if (!cliente) { UI.toast('⚠️ Selecciona o agrega un cliente', 'warn'); return; }

    // Auto-register new client
    if (!State.clientes) State.clientes = [];
    if (!State.clientes.includes(cliente)) {
      State.clientes.push(cliente);
      State.clientes.sort();
      lsSet(LS_KEYS.clientes, State.clientes);
    }

    const st_ = parseInt(gv('c-st')) || 0;
    const pg  = parseInt(gv('c-pg')) || 0;
    const pl  = parseInt(gv('c-pl')) || 0;
    const pa  = parseInt(gv('c-pa')) || 0;
    const totalUds = st_ + pg + pl + pa;

    if (!totalUds) { UI.toast('⚠️ Registra al menos una unidad despachada', 'warn'); return; }

    const monto   = parseFloat(gv('c-monto')) || 0;
    const abonado = parseFloat(gv('c-abonado')) || 0;

    const existing = State.editCredito
      ? State.creditos.find(x => x.id === State.editCredito)
      : null;

    const c = {
      id:       existing?.id || 'c_' + uid(),
      sucursal: suc,
      cliente,
      turno:    gv('c-turno'),
      fecha:    gv('c-fecha'),
      st: st_, pg, pl, pa,
      totalUds,
      monto,
      abonado,
      saldo:    Math.max(0, monto - abonado),
      venc:     gv('c-venc'),
      estado:   gv('c-estado'),
      obs:      gv('c-obs'),
      weekKey:  getWeekKey(gv('c-fecha')),
      created:  existing?.created || new Date().toISOString()
    };

    if (State.editCredito) {
      const i = State.creditos.findIndex(x => x.id === State.editCredito);
      if (i > -1) State.creditos[i] = c;
    } else {
      State.creditos.push(c);
    }

    lsSet(LS_KEYS.creditos, State.creditos);
    UI.closeModal('modal-credito');
    this.render();
    this.buildChart();
    UI.updateBadges();
    UI.toast(State.editCredito ? '✅ Crédito actualizado' : '✅ Crédito registrado', 'ok');
    State.editCredito = null;
  },

  abonar(id) {
    const c = State.creditos.find(x => x.id === id); if (!c) return;
    const saldo = c.saldo || 0;
    const input = prompt(
      `💰 Registrar abono\nCliente: ${c.cliente}\nUnidades despachadas: ${c.totalUds||0}\nSaldo RD$: ${fmt$(saldo)}\n\nMonto de abono (RD$):`
    );
    const a = parseFloat(input || 0);
    if (!a || a <= 0) { UI.toast('Monto de abono inválido', 'warn'); return; }
    c.abonado = (c.abonado || 0) + a;
    c.saldo   = Math.max(0, (c.monto || 0) - c.abonado);
    if (c.saldo <= 0 && c.monto > 0) c.estado = 'pagado';
    lsSet(LS_KEYS.creditos, State.creditos);
    this.render();
    this.buildChart();
    UI.updateBadges();
    UI.toast(`✅ Abono RD$${fmt$(a)} registrado`, 'ok');
  },

  delete(id) {
    if (!confirm('¿Eliminar este crédito?')) return;
    State.creditos = State.creditos.filter(x => x.id !== id);
    lsSet(LS_KEYS.creditos, State.creditos);
    this.render();
    this.buildChart();
    UI.updateBadges();
    UI.toast('Crédito eliminado', 'err');
  },

  // ── Clients manager modal ─────────────────────────────
  openClientesManager() {
    this._renderClientesList();
    UI.openModal('modal-clientes');
  },

  _renderClientesList() {
    const c = el('clientes-manager-body'); if (!c) return;
    const clientes = State.clientes || [];
    c.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <input class="fc" id="nuevo-cliente-mgr" placeholder="Nombre del nuevo cliente o institución…" style="flex:1"
          onkeydown="if(event.key==='Enter')Creditos.addClienteMgr()">
        <button class="btn primary sm" onclick="Creditos.addClienteMgr()" type="button">➕ Agregar</button>
      </div>
      <div style="max-height:360px;overflow-y:auto;border:1px solid var(--border);border-radius:9px;overflow:hidden">
        ${clientes.map((cli, i) => {
          const uses = State.creditos.filter(c => c.cliente === cli).length;
          return `<div style="display:flex;align-items:center;gap:9px;padding:9px 13px;border-bottom:1px solid var(--border);background:var(--white);transition:background .12s" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='var(--white)'">
            <span style="font-size:16px">👤</span>
            <span style="flex:1;font-size:13px;font-weight:500;color:var(--ink)">${escH(cli)}</span>
            <span style="font-size:11px;color:var(--ink4);background:var(--bg2);padding:2px 8px;border-radius:9px">${uses} crédito${uses!==1?'s':''}</span>
            <button class="btn-del" onclick="Creditos.removeClienteMgr(${i})" title="Eliminar">🗑</button>
          </div>`;
        }).join('')}
        ${!clientes.length ? '<p style="text-align:center;color:var(--ink4);padding:20px;font-size:13px">Sin clientes registrados.</p>' : ''}
      </div>
      <p style="font-size:11px;color:var(--ink4);margin-top:10px">Los clientes con créditos asociados deberían conservarse para mantener el historial.</p>`;
  },

  addClienteMgr() {
    const inp = el('nuevo-cliente-mgr'); if (!inp) return;
    const name = inp.value.trim();
    if (!name) { UI.toast('⚠️ Escribe el nombre', 'warn'); return; }
    if (!State.clientes) State.clientes = [];
    if (State.clientes.includes(name)) { UI.toast('Ya existe en el listado', 'warn'); return; }
    State.clientes.push(name);
    State.clientes.sort();
    lsSet(LS_KEYS.clientes, State.clientes);
    inp.value = '';
    this._renderClientesList();
    UI.toast(`✅ "${name}" agregado`, 'ok');
  },

  removeClienteMgr(idx) {
    const name = (State.clientes || [])[idx];
    const inUse = State.creditos.some(c => c.cliente === name);
    if (inUse && !confirm(`"${name}" tiene créditos asociados. ¿Eliminar de todas formas?`)) return;
    State.clientes.splice(idx, 1);
    lsSet(LS_KEYS.clientes, State.clientes);
    this._renderClientesList();
  },

  // ── Render table ──────────────────────────────────────
  setView(v, btn) {
    State.creditoView = v;
    document.querySelectorAll('#cred-pills .pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.buildChart();
  },

  render() {
    const filtro = gv('filtro-creditos') || 'activos';
    const search = (gv('search-creditos') || '').toLowerCase();
    const today  = new Date().toISOString().split('T')[0];

    // Auto-update vencidos
    State.creditos.forEach(c => {
      if (c.estado === 'activo' && c.venc && c.venc < today) c.estado = 'vencido';
    });

    let filtered = State.creditos;
    if (filtro === 'activos') filtered = filtered.filter(c => c.estado === 'activo' || c.estado === 'en-gestion');
    else if (filtro !== 'todos') filtered = filtered.filter(c => c.estado === filtro);
    if (search) filtered = filtered.filter(c =>
      (c.sucursal||'').toLowerCase().includes(search) ||
      (c.cliente||'').toLowerCase().includes(search)
    );

    // KPIs
    const totalUds  = State.creditos.reduce((s, c) => s + (c.totalUds || 0), 0);
    const totalMonto = filtered.reduce((s, c) => s + (c.monto || 0), 0);
    const recup     = State.creditos.filter(c => c.estado === 'pagado').reduce((s, c) => s + (c.monto || 0), 0);
    const venc      = State.creditos.filter(c => c.estado === 'vencido').reduce((s, c) => s + (c.saldo || 0), 0);

    st('c-total-uds',   totalUds);
    st('c-total-monto', 'RD$' + fmt$(totalMonto));
    st('c-recup',       'RD$' + fmt$(recup));
    st('c-venc',        'RD$' + fmt$(venc));

    // Badge counts
    const active = State.creditos.filter(c => c.estado === 'activo' || c.estado === 'en-gestion').length;
    const nbEl = el('nb-cred'); if (nbEl) nbEl.textContent = active;

    const tb = el('tbody-creditos'); if (!tb) return;

    if (!filtered.length) {
      tb.innerHTML = `<tr><td colspan="16" style="text-align:center;color:var(--ink4);padding:20px">Sin créditos para mostrar.</td></tr>`;
      return;
    }

    const eBadge = { activo:'bg-amber', pagado:'bg-green', vencido:'bg-red', 'en-gestion':'bg-blue' };
    const eLabel = { activo:'🟡 Activo', pagado:'✅ Pagado', vencido:'🔴 Vencido', 'en-gestion':'🔄 Gestión' };
    const tLabel = { dia:'☀️ Día', noche:'🌙 Noche', mañana:'☀️ Día', tarde:'☀️ Día', completo:'☀️ Día' };

    tb.innerHTML = filtered
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
      .map((c, i) => `<tr>
        <td>${i+1}</td>
        <td><strong>${escH(c.sucursal)}</strong></td>
        <td style="font-weight:600;color:var(--ink)">${escH(c.cliente)}</td>
        <td>${tLabel[c.turno] || c.turno || '—'}</td>
        <td style="text-align:center;font-weight:700;color:#b91c1c">${c.st||0}</td>
        <td style="text-align:center;font-weight:700;color:#dc2626">${c.pg||0}</td>
        <td style="text-align:center;font-weight:700;color:#d97706">${c.pl||0}</td>
        <td style="text-align:center;font-weight:700;color:#ea580c">${c.pa||0}</td>
        <td style="text-align:center;font-family:'JetBrains Mono',monospace;font-weight:700;background:var(--amber-l);color:var(--amber)">${c.totalUds||0}</td>
        <td>${c.monto ? 'RD$'+fmt$(c.monto) : '—'}</td>
        <td style="color:var(--green)">${c.abonado ? 'RD$'+fmt$(c.abonado) : '—'}</td>
        <td><strong style="color:${(c.saldo||0)>0?'var(--hemo-d)':'var(--green)'}">${c.monto ? 'RD$'+fmt$(c.saldo||0) : '—'}</strong></td>
        <td>${c.venc ? fmtDate(c.venc) : '—'}</td>
        <td><span class="badge ${eBadge[c.estado]||''}">${eLabel[c.estado]||c.estado}</span></td>
        <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escH(c.obs||'')}</td>
        <td style="white-space:nowrap">
          <button class="btn-del" onclick="Creditos.abonar('${c.id}')" title="Registrar abono">💰</button>
          <button class="btn-del" onclick="Creditos.openModal('${c.id}')" title="Editar">✏️</button>
          <button class="btn-del" onclick="Creditos.delete('${c.id}')" title="Eliminar">🗑</button>
        </td>
      </tr>`).join('');
  },

  buildChart() {
    if (this._chart) { this._chart.destroy(); this._chart = null; }
    const ctx = el('chart-creditos'); if (!ctx) return;
    const v = State.creditoView || 'semanal';

    let labels = [], data = [], label = '';
    const tLabel = { dia:'☀️ Día', noche:'🌙 Noche', mañana:'☀️ Día', tarde:'☀️ Día', completo:'☀️ Día' };

    if (v === 'semanal') {
      label = 'Unidades por Semana';
      const m = {};
      State.creditos.forEach(c => {
        const k = c.weekKey || getWeekKey(c.fecha);
        m[k] = (m[k] || 0) + (c.totalUds || 0);
      });
      const keys = Object.keys(m).sort().slice(-8);
      labels = keys; data = keys.map(k => m[k]);

    } else if (v === 'quincenal') {
      label = 'Unidades por Quincena';
      const m = {};
      State.creditos.forEach(c => {
        if (!c.fecha) return;
        const d = new Date(c.fecha + 'T00:00:00');
        const q = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()<=15?'1Q':'2Q'}`;
        m[q] = (m[q] || 0) + (c.totalUds || 0);
      });
      const keys = Object.keys(m).sort().slice(-6);
      labels = keys; data = keys.map(k => m[k]);

    } else if (v === 'mensual') {
      label = 'Unidades por Mes';
      const m = {};
      State.creditos.forEach(c => {
        if (!c.fecha) return;
        const d = new Date(c.fecha + 'T00:00:00');
        const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        m[k] = (m[k] || 0) + (c.totalUds || 0);
      });
      const keys = Object.keys(m).sort().slice(-6);
      labels = keys.map(k => {
        const [y, mo] = k.split('-');
        return new Date(+y, +mo-1, 1).toLocaleDateString('es-DO', { month:'short', year:'numeric' });
      });
      data = Object.keys(m).sort().slice(-6).map(k => m[k]);

    } else {
      // By turno (dia / noche)
      label = 'Unidades por Turno';
      const byT = { dia: 0, noche: 0 };
      State.creditos.forEach(c => {
        const t = (c.turno === 'noche') ? 'noche' : 'dia';
        byT[t] += (c.totalUds || 0);
      });
      labels = ['☀️ Turno Día', '🌙 Turno Noche'];
      data   = [byT.dia, byT.noche];
    }

    this._chart = new Chart(ctx, {
      type: v === 'turno' ? 'doughnut' : 'bar',
      data: {
        labels,
        datasets: [{
          label,
          data,
          backgroundColor: v === 'turno'
            ? ['#f59e0b', '#3b82f6']
            : 'rgba(180,83,9,0.75)',
          borderRadius: 5,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: v === 'turno', position: 'bottom' } },
        scales: v === 'turno' ? {} : {
          y: { ticks: { stepSize: 1 }, title: { display: true, text: 'Unidades' } }
        }
      }
    });
  }
};
