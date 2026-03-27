'use strict';
// ══ HEMOCURA v10 — INIT ══
document.addEventListener('DOMContentLoaded', () => {

  // ── Load all state from localStorage ──────────────────
  State.tasks       = lsGet(LS_KEYS.tasks,       []);
  State.reminders   = lsGet(LS_KEYS.reminders,   []);
  State.ventas      = lsGet(LS_KEYS.ventas,       []);
  State.creditos    = lsGet(LS_KEYS.creditos,     []);
  State.reuniones   = lsGet(LS_KEYS.reuniones,    []);
  State.visitas     = lsGet(LS_KEYS.visitas,      []);
  State.images      = lsGet(LS_KEYS.images,       {});
  State.incidencias = lsGet(LS_KEYS.incidencias,  {});
  State.incFiles    = lsGet(LS_KEYS.incFiles,     {});
  State.contactos   = lsGet(LS_KEYS.contactos,    []);
  State.empresas    = lsGet(LS_KEYS.empresas,     []);
  State.clientes    = lsGet(LS_KEYS.clientes,     []);
  State.dashConfig  = lsGet(LS_KEYS.dashConfig,   null);
  const savedScores = lsGet(LS_KEYS.evalScores,   null);
  if (savedScores) State.evalScores = savedScores;

  // ── Init sucursales (loads 4 defaults if empty) ────────
  const savedSuc = lsGet(LS_KEYS.sucursales, null);
  if (savedSuc && savedSuc.length) State.sucursales = savedSuc;
  Sucursales.init();

  // ── Init contactos + empresas ──────────────────────────
  Contactos.init();
  Contactos.refreshSelects();
  Creditos.init();

  // ── Set today's date and period ───────────────────────
  el('meta-fecha').valueAsDate = new Date();
  Weeks.updatePeriod();

  // ── Init table rows for generic tables ────────────────
  Object.keys(TABLE_CONFIG).forEach(id => Tables.addRow(id));
  State.evalScores = { insp:0, cont:0, jorn:0, club:0, ...(savedScores||{}) };
  Eval.init();

  // ── Load current/last week ────────────────────────────
  const key   = getCurrentWeekKey();
  const weeks = getAllWeeks();
  if (weeks[key]) {
    Weeks.load(key);
  } else {
    const allKeys = Object.keys(weeks).sort();
    if (allKeys.length > 0) {
      const latest = allKeys[allKeys.length - 1];
      if (confirm(`¿Cargar la última semana guardada?\n${weeks[latest]?.meta?.periodo || latest}`)) {
        Weeks.load(latest);
      }
    }
  }

  // ── Initial renders ───────────────────────────────────
  Weeks.renderList();
  Weeks.populatePeriodSelect();
  UI.updateBadges();
  Reminders.check();
  Reminders.renderList();
  Greeting.update();
  Agenda.updateKPIs();
  Agenda._renderTodayTasks();
  // Don't build charts on load — they'll build when tab is visited
  // But pre-build inicio chart
  setTimeout(() => Ventas.buildCharts(), 200);

  // ── Periodic reminders check every 5 min ─────────────
  setInterval(() => Reminders.check(), 5 * 60 * 1000);

  // ── Start sync poller (checks every 30 min, but only
  //    calls GitHub API when there are pending changes
  //    AND the rate limit window is clear) ───────────────
  if (typeof Sync !== 'undefined') {
    Sync._startPoller();
    // Restore hash from last session so we skip redundant uploads
    const savedCfg = Sync.loadConfig();
    if (savedCfg?.lastHash) Sync._lastHash = savedCfg.lastHash;
    // Update topbar icon on load
    Sync._updateTopbarIcon(Sync.isConfigured() ? 'synced' : 'error');
  }

  // ── Keyboard shortcuts ────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      UI.closeLightbox();
      document.querySelectorAll('.modal-ov.open').forEach(m => UI.closeModal(m.id));
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      Weeks.save();
      UI.toast('💾 Guardado', 'ok');
    }
  });

  // ── Prevent accidental navigation away ───────────────
  window.addEventListener('beforeunload', e => {
    Weeks.save();
  });

  // ── Swipe to open sidebar on mobile ──────────────────
  let touchStartX = 0;
  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    // Swipe right from left edge → open sidebar
    if (touchStartX < 30 && dx > 60) UI.toggleSidebar();
    // Swipe left → close sidebar
    if (dx < -60 && el('sidenav').classList.contains('open')) UI.closeSidebar();
  }, { passive: true });

  console.log('✅ HEMOCURA v10 iniciado — Brave/Mobile ready');
});
