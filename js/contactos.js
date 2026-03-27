'use strict';
// ══ CONTACTOS MODULE v10.1 ══
// • Agrupado por centro/empresa
// • Empresa = <select> desplegable con lista previa + agregar nueva inline
// • Nombre y centro con historial autocompletado
// • Historial de contactos reutilizable en edición

window.Contactos = {

  _defaultEmpresas: [
    'Cura-Santiago','Hemocura-Pto Pta','Hemocura-Tenares','Hemocura-SFM',
    'Hospital José M. Cabral y Báez','Hospital Metropolitano de Santiago (HOMS)',
    'Hospital Infantil Dr. Arturo Grullón','Hospital Dr. Ricardo Limardo',
    'Hospital Provincial Hermanas Mirabal','Hospital Dr. Luis E. Aybar',
    'Hospital Infantil SFM','Clínica Corominas','Clínica Especialidades del Atlántico',
    'Centro Médico Puerto Plata','Clínica Central SFM','Cruz Roja Dominicana',
    'Ministerio de Salud Pública','Banco Nacional de Sangre',
    'Farmacia Carol','Clínica Abreu'
  ],

  init() {
    if (!State.empresas || !State.empresas.length) {
      State.empresas = [...this._defaultEmpresas];
      lsSet(LS_KEYS.empresas, State.empresas);
    }
  },

  refreshSelects() {
    this._buildSucSelect('cont-sucursal');
    this._buildEmpresaSelect('cont-empresa-sel');
  },

  _buildSucSelect(id) {
    const s = el(id); if (!s) return;
    const cur = s.value;
    s.innerHTML = '<option value="">— Sin sucursal HEMOCURA —</option>' +
      State.sucursales.map(x =>
        `<option value="${escH(x.nombre)}"${x.nombre===cur?' selected':''}>${escH(x.nombre)}</option>`
      ).join('');
  },

  // Build the empresa <select> dropdown
  _buildEmpresaSelect(id, selected='') {
    const s = el(id); if (!s) return;
    s.innerHTML = '<option value="">— Seleccionar empresa / institución —</option>' +
      State.empresas.map(e =>
        `<option value="${escH(e)}"${e===selected?' selected':''}>${escH(e)}</option>`
      ).join('') +
      '<option value="__nueva__">➕ Agregar nueva empresa…</option>';
  },

  // ── Handle empresa select change ─────────────────────
  onEmpresaChange() {
    const sel = el('cont-empresa-sel');
    const val = sel?.value;
    const wrap = el('nueva-empresa-wrap');
    if (val === '__nueva__') {
      if (wrap) wrap.style.display = 'flex';
      el('nueva-empresa-input')?.focus();
    } else {
      if (wrap) wrap.style.display = 'none';
    }
  },

  // Confirm new empresa from inline input
  confirmNuevaEmpresa() {
    const inp = el('nueva-empresa-input'); if (!inp) return;
    const name = inp.value.trim();
    if (!name) { UI.toast('⚠️ Escribe el nombre', 'warn'); return; }
    if (!State.empresas.includes(name)) {
      State.empresas.push(name);
      State.empresas.sort();
      lsSet(LS_KEYS.empresas, State.empresas);
    }
    this._buildEmpresaSelect('cont-empresa-sel', name);
    inp.value = '';
    const wrap = el('nueva-empresa-wrap');
    if (wrap) wrap.style.display = 'none';
    UI.toast(`✅ "${name}" agregada`, 'ok');
  },

  // ── Nombre autocomplete from contact history ─────────
  _buildNombreDatalist() {
    const dl = el('nombres-datalist'); if (!dl) return;
    const seen = new Set();
    const opts = [];
    // Most recent first
    const sorted = [...State.contactos].sort((a,b) => (b.created||'').localeCompare(a.created||''));
    sorted.forEach(c => {
      if (c.nombre && !seen.has(c.nombre.toLowerCase())) {
        seen.add(c.nombre.toLowerCase());
        opts.push(`<option value="${escH(c.nombre)}" data-id="${c.id}">`);
      }
    });
    dl.innerHTML = opts.join('');
  },

  // When nombre typed and matches history → auto-fill remaining fields
  onNombreInput() {
    const nombre = (el('cont-nombre')?.value || '').trim();
    if (!nombre) return;
    const match = State.contactos
      .filter(c => c.nombre.toLowerCase() === nombre.toLowerCase())
      .sort((a,b) => (b.created||'').localeCompare(a.created||''))[0];
    if (match && !State.editContacto) {
      // Prefill from most recent record of this person
      sv('cont-cargo',     match.cargo     || '');
      sv('cont-telefono',  match.telefono  || '');
      sv('cont-email',     match.email     || '');
      sv('cont-sucursal',  match.sucursal  || '');
      this._buildEmpresaSelect('cont-empresa-sel', match.empresa || '');
      this.onEmpresaChange();
      // Show subtle hint
      const hint = el('cont-nombre-hint');
      if (hint) { hint.textContent = `↑ Datos de visita anterior (${fmtDate(match.fecha)})`; hint.style.display='block'; }
    } else {
      const hint = el('cont-nombre-hint');
      if (hint) hint.style.display = 'none';
    }
  },

  // ── MODAL ──────────────────────────────────────────────
  openModal(id = null) {
    State.editContacto = id;
    const today = new Date().toISOString().split('T')[0];
    el('cont-modal-title').textContent = id ? '✏️ Editar Contacto' : '🤝 Nuevo Contacto';
    const hint = el('cont-nombre-hint');
    if (hint) hint.style.display = 'none';

    this._buildSucSelect('cont-sucursal');
    this._buildNombreDatalist();

    if (id) {
      const c = State.contactos.find(x => x.id === id); if (!c) return;
      sv('cont-nombre',      c.nombre      || '');
      sv('cont-cargo',       c.cargo       || '');
      sv('cont-telefono',    c.telefono    || '');
      sv('cont-email',       c.email       || '');
      sv('cont-sucursal',    c.sucursal    || '');
      sv('cont-fecha',       c.fecha       || today);
      sv('cont-tipo',        c.tipo        || 'presencial');
      sv('cont-resultado',   c.resultado   || '');
      sv('cont-seguimiento', c.seguimiento || '');
      sv('cont-notas',       c.notas       || '');
      sv('cont-estado',      c.estado      || 'activo');
      this._buildEmpresaSelect('cont-empresa-sel', c.empresa || '');
    } else {
      ['cont-nombre','cont-cargo','cont-telefono','cont-email',
       'cont-resultado','cont-seguimiento','cont-notas'].forEach(x => sv(x, ''));
      sv('cont-sucursal', '');
      sv('cont-fecha', today);
      sv('cont-tipo', 'presencial');
      sv('cont-estado', 'activo');
      this._buildEmpresaSelect('cont-empresa-sel', '');
    }

    const wrap = el('nueva-empresa-wrap');
    if (wrap) { wrap.style.display = 'none'; sv('nueva-empresa-input', ''); }

    UI.openModal('modal-contacto');
  },

  save() {
    const nombre = (el('cont-nombre')?.value || '').trim();
    if (!nombre) { UI.toast('⚠️ Nombre es obligatorio', 'warn'); return; }

    let empresa = gv('cont-empresa-sel');
    if (empresa === '__nueva__') {
      empresa = (el('nueva-empresa-input')?.value || '').trim();
      if (!empresa) { UI.toast('⚠️ Escribe el nombre de la empresa', 'warn'); return; }
    }

    // Auto-register new empresa
    if (empresa && !State.empresas.includes(empresa)) {
      State.empresas.push(empresa);
      State.empresas.sort();
      lsSet(LS_KEYS.empresas, State.empresas);
    }

    const existing = State.editContacto
      ? State.contactos.find(x => x.id === State.editContacto)
      : null;

    const c = {
      id:          existing?.id || 'cont_' + uid(),
      nombre,
      cargo:       gv('cont-cargo'),
      empresa,
      sucursal:    gv('cont-sucursal'),
      telefono:    gv('cont-telefono'),
      email:       gv('cont-email'),
      fecha:       gv('cont-fecha'),
      tipo:        gv('cont-tipo'),
      resultado:   gv('cont-resultado'),
      seguimiento: gv('cont-seguimiento'),
      notas:       gv('cont-notas'),
      estado:      gv('cont-estado'),
      weekKey:     getCurrentWeekKey(),
      created:     existing?.created || new Date().toISOString()
    };

    if (State.editContacto) {
      const i = State.contactos.findIndex(x => x.id === State.editContacto);
      if (i > -1) State.contactos[i] = c;
    } else {
      State.contactos.push(c);
    }

    lsSet(LS_KEYS.contactos, State.contactos);
    UI.closeModal('modal-contacto');
    this.render();
    UI.updateBadges();
    UI.toast(State.editContacto ? '✅ Contacto actualizado' : '✅ Contacto registrado', 'ok');
    State.editContacto = null;
  },

  delete(id) {
    if (!confirm('¿Eliminar este contacto?')) return;
    State.contactos = State.contactos.filter(x => x.id !== id);
    lsSet(LS_KEYS.contactos, State.contactos);
    this.render();
    UI.updateBadges();
    UI.toast('Contacto eliminado', 'err');
  },

  // ── EMPRESA MANAGER MODAL ─────────────────────────────
  openEmpresasManager() {
    this._renderEmpresasList();
    UI.openModal('modal-empresas');
  },

  _renderEmpresasList() {
    const c = el('empresas-manager-body'); if (!c) return;
    c.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <input class="fc" id="nueva-empresa-mgr" placeholder="Nueva empresa o institución…" style="flex:1"
          onkeydown="if(event.key==='Enter')Contactos.addEmpresaMgr()">
        <button class="btn primary sm" onclick="Contactos.addEmpresaMgr()">➕ Agregar</button>
      </div>
      <div style="max-height:340px;overflow-y:auto;border:1px solid var(--border);border-radius:9px;overflow:hidden">
        ${State.empresas.map((e, i) => {
          const count = State.contactos.filter(c => c.empresa === e).length;
          return `<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--border);background:var(--white);transition:background .15s" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='var(--white)'">
            <span style="font-size:18px">🏢</span>
            <span style="flex:1;font-size:13px;font-weight:500">${escH(e)}</span>
            <span style="font-size:11px;color:var(--ink4);background:var(--bg2);padding:2px 7px;border-radius:9px">${count} contacto${count!==1?'s':''}</span>
            <button class="btn-del" onclick="Contactos.removeEmpresa(${i})" title="Eliminar">🗑</button>
          </div>`;
        }).join('')}
      </div>
      <p style="font-size:11.5px;color:var(--ink4);margin-top:10px">Las empresas con contactos registrados no deberían eliminarse para mantener el historial.</p>`;
  },

  addEmpresaMgr() {
    const inp = el('nueva-empresa-mgr'); if (!inp) return;
    const name = inp.value.trim();
    if (!name) { UI.toast('⚠️ Escribe el nombre', 'warn'); return; }
    if (State.empresas.includes(name)) { UI.toast('Ya existe en el listado', 'warn'); return; }
    State.empresas.push(name);
    State.empresas.sort();
    lsSet(LS_KEYS.empresas, State.empresas);
    inp.value = '';
    this._renderEmpresasList();
    UI.toast(`✅ "${name}" agregada`, 'ok');
  },

  removeEmpresa(idx) {
    const name = State.empresas[idx];
    const inUse = State.contactos.some(c => c.empresa === name);
    if (inUse && !confirm(`"${name}" tiene contactos asociados. ¿Eliminar de todas formas?`)) return;
    State.empresas.splice(idx, 1);
    lsSet(LS_KEYS.empresas, State.empresas);
    this._renderEmpresasList();
  },

  // ── RENDER — grouped by empresa/centro ───────────────
  render() {
    const c = el('contactos-list'); if (!c) return;
    const wk = getCurrentWeekKey();
    const search = (gv('search-contactos') || '').toLowerCase();
    const filtro = gv('filtro-contactos') || 'semana';

    let list = [...State.contactos];
    if (filtro === 'semana')   list = list.filter(x => x.weekKey === wk);
    else if (filtro === 'mes') {
      const now = new Date();
      list = list.filter(x => {
        if (!x.fecha) return false;
        const d = new Date(x.fecha + 'T00:00:00');
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }
    if (search) {
      list = list.filter(x =>
        (x.nombre||'').toLowerCase().includes(search) ||
        (x.empresa||'').toLowerCase().includes(search) ||
        (x.sucursal||'').toLowerCase().includes(search) ||
        (x.cargo||'').toLowerCase().includes(search)
      );
    }

    // KPIs
    const wCount = State.contactos.filter(x => x.weekKey === wk).length;
    st('nb-cont', wCount); st('k-cont', wCount);
    st('cont-kpi-total',    State.contactos.length);
    st('cont-kpi-semana',   wCount);
    const byEmpAll = {};
    State.contactos.forEach(x => { if (x.empresa) byEmpAll[x.empresa] = true; });
    st('cont-kpi-empresas',    Object.keys(byEmpAll).length);
    const wSeg = State.contactos.filter(x => x.weekKey === wk && x.seguimiento).length;
    st('cont-kpi-seguimiento', wSeg);

    if (!list.length) {
      c.innerHTML = `<div class="empty-state">
        <div style="font-size:44px;margin-bottom:10px">🤝</div>
        <p style="font-size:14px;font-weight:600;color:var(--ink)">Sin contactos para mostrar</p>
        <p style="font-size:13px;color:var(--ink4);margin-top:4px">Agrega un nuevo contacto o cambia el filtro de período.</p>
        <button class="btn primary" onclick="Contactos.openModal()" style="margin-top:12px">➕ Nuevo Contacto</button>
      </div>`;
      return;
    }

    // Group by empresa (center)
    const groups = {};
    list.forEach(cont => {
      const key = cont.empresa || '(Sin empresa)';
      if (!groups[key]) groups[key] = [];
      groups[key].push(cont);
    });

    // Sort groups: those with most recent contact first
    const sortedGroups = Object.entries(groups).sort((a, b) => {
      const maxA = Math.max(...a[1].map(x => new Date(x.fecha||'2000-01-01').getTime()));
      const maxB = Math.max(...b[1].map(x => new Date(x.fecha||'2000-01-01').getTime()));
      return maxB - maxA;
    });

    const estadoColor = { activo:'bg-green', inactivo:'', seguimiento:'bg-amber', potencial:'bg-blue' };
    const tipoIco = { presencial:'🏢', virtual:'💻', telefonica:'📞', email:'📧' };

    c.innerHTML = sortedGroups.map(([empresa, contacts]) =>
      this._renderGroup(empresa, contacts, estadoColor, tipoIco)
    ).join('');
  },

  _renderGroup(empresa, contacts, estadoColor, tipoIco) {
    const count = contacts.length;
    const sorted = contacts.sort((a, b) => (b.fecha||'').localeCompare(a.fecha||''));
    // Find sucursal association
    const sucursales = [...new Set(contacts.map(c => c.sucursal).filter(Boolean))];

    return `<div class="cont-group" id="cgrp-${btoa(encodeURIComponent(empresa)).slice(0,10)}">
      <div class="cont-group-hd" onclick="Contactos._toggleGroup(this)">
        <div class="cont-group-ico">🏢</div>
        <div class="cont-group-info">
          <div class="cont-group-name">${escH(empresa)}</div>
          <div class="cont-group-meta">
            ${sucursales.length ? `<span class="cont-chip">🏥 ${sucursales.join(', ')}</span>` : ''}
            <span class="cont-chip">👥 ${count} contacto${count!==1?'s':''}</span>
          </div>
        </div>
        <button class="btn primary sm" onclick="event.stopPropagation();Contactos._newInGroup('${escH(empresa)}')" title="Agregar contacto en este centro">➕</button>
        <span class="cont-group-arrow">▼</span>
      </div>
      <div class="cont-group-body">
        ${sorted.map(cont => this._renderCard(cont, estadoColor, tipoIco)).join('')}
      </div>
    </div>`;
  },

  _toggleGroup(hd) {
    const body = hd.nextElementSibling;
    const arrow = hd.querySelector('.cont-group-arrow');
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    if (arrow) arrow.textContent = isOpen ? '▶' : '▼';
  },

  _newInGroup(empresa) {
    this.openModal(null);
    // After modal opens, pre-select the empresa
    setTimeout(() => {
      this._buildEmpresaSelect('cont-empresa-sel', empresa);
      this.onEmpresaChange();
    }, 50);
  },

  _renderCard(c, estadoColor, tipoIco) {
    const hasFollowUp = c.seguimiento && c.seguimiento.trim();
    // Get contact history for this person (other visits)
    const history = State.contactos
      .filter(x => x.nombre === c.nombre && x.id !== c.id)
      .sort((a,b) => (b.fecha||'').localeCompare(a.fecha||''))
      .slice(0, 3);

    return `<div class="cont-card" id="cont-${c.id}">
      <!-- ROW 1: identity + contact details -->
      <div class="cont-row1">
        <div class="cont-avatar" style="background:${this._avatarColor(c.nombre)}">${(c.nombre||'?')[0].toUpperCase()}</div>
        <div class="cont-info">
          <div class="cont-name">${escH(c.nombre)}</div>
          <div class="cont-meta">
            ${c.cargo ? `<span class="cont-chip">💼 ${escH(c.cargo)}</span>` : ''}
            ${c.fecha ? `<span class="cont-chip">📅 ${fmtDate(c.fecha)}</span>` : ''}
            ${c.tipo  ? `<span class="cont-chip">${tipoIco[c.tipo]||'🤝'} ${escH(c.tipo)}</span>` : ''}
            <span class="badge ${estadoColor[c.estado]||''}" style="font-size:10px">${escH(c.estado||'activo')}</span>
          </div>
          <div class="cont-contact-row">
            ${c.telefono ? `<a href="tel:${escH(c.telefono)}" class="cont-link" onclick="event.stopPropagation()">📞 ${escH(c.telefono)}</a>` : ''}
            ${c.email    ? `<a href="mailto:${escH(c.email)}"  class="cont-link" onclick="event.stopPropagation()">✉️ ${escH(c.email)}</a>`    : ''}
          </div>
        </div>
        <div class="cont-actions">
          <button class="btn-del" onclick="Contactos.openModal('${c.id}')" title="Editar">✏️</button>
          <button class="btn-del" onclick="Contactos.delete('${c.id}')" title="Eliminar">🗑</button>
        </div>
      </div>
      <!-- ROW 2: sucursal + resultado + seguimiento -->
      <div class="cont-row2">
        <div class="cont-row2-item ${c.sucursal ? 'has-value' : ''}">
          <div class="cont-row2-lbl">🏥 Sucursal</div>
          <div class="cont-row2-val">${escH(c.sucursal || '—')}</div>
        </div>
        <div class="cont-row2-item ${c.resultado ? 'has-value' : ''}">
          <div class="cont-row2-lbl">📋 Resultado</div>
          <div class="cont-row2-val">${escH(c.resultado || '—')}</div>
        </div>
        ${hasFollowUp ? `<div class="cont-row2-item seguimiento">
          <div class="cont-row2-lbl">🔄 Próximo seguimiento</div>
          <div class="cont-row2-val">${escH(c.seguimiento)}</div>
        </div>` : ''}
        ${c.notas ? `<div class="cont-row2-item full-row">
          <div class="cont-row2-lbl">📝 Notas</div>
          <div class="cont-row2-val">${escH(c.notas)}</div>
        </div>` : ''}
      </div>
      ${history.length ? `<div class="cont-history">
        <div class="cont-history-lbl">🕐 Visitas anteriores de ${escH(c.nombre)}:</div>
        <div class="cont-history-items">
          ${history.map(h => `<span class="cont-history-chip" onclick="Contactos.openModal('${h.id}')" title="Ver visita">${fmtDate(h.fecha)} · ${escH(h.empresa||'—')} · ${escH(h.resultado||'sin resultado')}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>`;
  },

  // Deterministic avatar color per name
  _avatarColor(name) {
    const colors = [
      'linear-gradient(135deg,#1D4ED8,#1a3a8a)',
      'linear-gradient(135deg,#0F766E,#0c4a42)',
      'linear-gradient(135deg,#0D6E3C,#065f30)',
      'linear-gradient(135deg,#B45309,#92400e)',
      'linear-gradient(135deg,#6D28D9,#4c1d95)',
      'linear-gradient(135deg,#0369a1,#0c4a6e)',
    ];
    let hash = 0;
    for (let i = 0; i < (name||'').length; i++) hash = name.charCodeAt(i) + ((hash<<5)-hash);
    return colors[Math.abs(hash) % colors.length];
  }
};
