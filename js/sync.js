'use strict';
// ══════════════════════════════════════════════════════════════════
//  HEMOCURA SYNC MODULE — v2 con Rate Limit Inteligente
//
//  ESTRATEGIA ANTI-RATE-LIMIT:
//  • Máximo 1 llamada real a GitHub cada 5 minutos (DEBOUNCE_MS)
//  • Solo sube si el hash del contenido cambió (evita subidas innecesarias)
//  • Detecta y respeta el header Retry-After en error 429
//  • Backoff exponencial en errores consecutivos
//  • Cola de pending: acumula cambios y sube en lote
//  • El setInterval NUNCA llama directamente a la API, solo agenda
//
//  LÍMITES GITHUB API (autenticado):
//  • 5,000 requests/hora total — usamos ~12/hora máximo con esta impl.
//  • Los Gists cuentan como 1 request por operación (PATCH o GET)
// ══════════════════════════════════════════════════════════════════

const SYNC_LS_KEY    = 'hemo_sync_config';
const SYNC_RATE_KEY  = 'hemo_sync_rate';   // rate limit state
const GIST_FILENAME  = 'hemocura-v10-data.json';
const SYNC_VERSION   = 3;

// Tuning knobs — ajusta aquí el comportamiento
const DEBOUNCE_MS    = 5 * 60 * 1000;   // 5 min mínimo entre subidas
const RETRY_BASE_MS  = 2 * 60 * 1000;   // 2 min primer reintento
const RETRY_MAX_MS   = 30 * 60 * 1000;  // 30 min máximo backoff
const MAX_RETRIES    = 4;               // intentos antes de rendirse
const POLL_MS        = 30 * 60 * 1000;  // 30 min intervalo de revisión
const HASH_SAMPLE    = 500;             // chars del payload para hash rápido

window.Sync = {

  // ── Internal state ──────────────────────────────────────
  _cfg:           null,
  _pendingUpload: false,   // hay cambios sin subir
  _uploadTimer:   null,    // setTimeout para subida diferida
  _retryCount:    0,       // intentos consecutivos fallidos
  _retryTimer:    null,    // setTimeout para reintento
  _lastHash:      null,    // hash del último payload subido con éxito
  _uploading:     false,   // subida en curso (evita llamadas paralelas)

  // ── Config helpers ───────────────────────────────────────
  loadConfig() {
    if (!this._cfg) this._cfg = lsGet(SYNC_LS_KEY, null);
    return this._cfg;
  },

  isConfigured() {
    const c = this.loadConfig();
    return !!(c?.token && c?.pin && c?.gistId);
  },

  _saveConfig(cfg) {
    this._cfg = cfg;
    lsSet(SYNC_LS_KEY, cfg);
  },

  // ── Rate limit state ────────────────────────────────────
  _getRateState() {
    return lsGet(SYNC_RATE_KEY, { retryAfter: 0, consecutiveErrors: 0, lastCall: 0 });
  },
  _saveRateState(s) { lsSet(SYNC_RATE_KEY, s); },

  _canCallApi() {
    const rs = this._getRateState();
    const now = Date.now();
    // Respeta Retry-After si está activo
    if (rs.retryAfter > now) {
      const waitMin = Math.ceil((rs.retryAfter - now) / 60000);
      this._log(`⏳ Rate limit activo — esperar ${waitMin} min más`);
      return false;
    }
    return true;
  },

  _handleRateLimit(res) {
    const rs = this._getRateState();
    if (res.status === 429 || res.status === 403) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '0') * 1000;
      const resetAt    = parseInt(res.headers.get('X-RateLimit-Reset') || '0') * 1000;
      // Use whichever is longer
      const wait = Math.max(retryAfter, resetAt > Date.now() ? resetAt - Date.now() : 0, 60000);
      rs.retryAfter = Date.now() + wait;
      rs.consecutiveErrors = (rs.consecutiveErrors || 0) + 1;
      this._saveRateState(rs);
      const waitMin = Math.ceil(wait / 60000);
      this._log(`⚠️ Rate limit — esperando ${waitMin} min antes de reintentar`);
      this._updateTopbarIcon('rate-limited');
      return true; // was rate limited
    }
    // Success — clear error state
    rs.consecutiveErrors = 0;
    rs.retryAfter = 0;
    rs.lastCall = Date.now();
    this._saveRateState(rs);
    return false;
  },

  // ── Quick hash of payload to detect real changes ────────
  _hashPayload(payloadStr) {
    // Sample beginning, middle, end + length for fast change detection
    const len  = payloadStr.length;
    const mid  = Math.floor(len / 2);
    const sample = payloadStr.slice(0, HASH_SAMPLE) +
                   payloadStr.slice(mid, mid + HASH_SAMPLE) +
                   payloadStr.slice(-HASH_SAMPLE) +
                   len;
    let h = 0;
    for (let i = 0; i < sample.length; i++) {
      h = ((h << 5) - h) + sample.charCodeAt(i);
      h |= 0;
    }
    return h.toString(36);
  },

  // ── Schedule upload (debounced) ─────────────────────────
  // This is called instead of upload() directly from auto-save hooks.
  // It waits DEBOUNCE_MS and only fires one real API call.
  scheduleUpload() {
    if (!this.isConfigured()) return;
    const cfg = this.loadConfig();
    if (!cfg.autoSync) return;

    this._pendingUpload = true;
    this._updateTopbarIcon('pending');

    // Clear any existing timer — debounce
    clearTimeout(this._uploadTimer);
    this._uploadTimer = setTimeout(() => {
      if (this._pendingUpload) this._doUploadIfChanged();
    }, DEBOUNCE_MS);
  },

  // ── Internal upload with change detection ──────────────
  async _doUploadIfChanged(force = false) {
    if (this._uploading) return; // prevent parallel calls
    if (!this.isConfigured()) return;
    if (!this._canCallApi()) {
      // Schedule retry respecting rate limit
      this._scheduleRetry();
      return;
    }

    const cfg = this.loadConfig();
    const payload  = this._collectAllData();
    const payloadStr = JSON.stringify(payload);
    const newHash  = this._hashPayload(payloadStr);

    // Skip if content hasn't changed and not forced
    if (!force && this._lastHash && this._lastHash === newHash) {
      this._pendingUpload = false;
      this._updateTopbarIcon('synced');
      this._log('✓ Sin cambios — subida omitida');
      return;
    }

    this._uploading = true;
    this._updateTopbarIcon('uploading');
    this._log('⬆ Subiendo cambios…');

    try {
      const encrypted = this._encrypt(payloadStr, cfg.pin);
      const content = JSON.stringify({
        _version: SYNC_VERSION,
        _enc:     true,
        data:     encrypted,
        ts:       new Date().toISOString(),
        device:   cfg.deviceName || 'Dispositivo'
      });

      const res = await this._apiPatch(`/gists/${cfg.gistId}`, cfg.token, {
        files: { [GIST_FILENAME]: { content } }
      });

      const wasRateLimited = this._handleRateLimit(res);
      if (wasRateLimited) {
        this._scheduleRetry();
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }

      // Success
      this._lastHash      = newHash;
      this._pendingUpload = false;
      this._retryCount    = 0;
      clearTimeout(this._retryTimer);

      cfg.lastSync = new Date().toISOString();
      cfg.status   = 'ok';
      cfg.lastHash = newHash;
      this._saveConfig(cfg);

      this._updateTopbarIcon('synced');
      this._log(`✅ Sincronizado — ${new Date().toLocaleTimeString('es-DO')}`);
      this._refreshStatusIfOpen();

    } catch (err) {
      this._retryCount++;
      cfg.status = 'error';
      this._saveConfig(cfg);
      this._updateTopbarIcon('error');
      this._log(`❌ Error: ${err.message}`);
      if (this._retryCount <= MAX_RETRIES) this._scheduleRetry();
      else this._log('🛑 Se alcanzó el máximo de reintentos. Sube manualmente.');
    } finally {
      this._uploading = false;
    }
  },

  // ── Exponential backoff retry ───────────────────────────
  _scheduleRetry() {
    clearTimeout(this._retryTimer);
    const wait = Math.min(RETRY_BASE_MS * Math.pow(2, this._retryCount), RETRY_MAX_MS);
    const waitMin = Math.ceil(wait / 60000);
    this._log(`🔄 Reintento en ${waitMin} min (intento ${this._retryCount}/${MAX_RETRIES})`);
    this._retryTimer = setTimeout(() => {
      if (this._pendingUpload) this._doUploadIfChanged();
    }, wait);
  },

  // ── Topbar icon states ──────────────────────────────────
  _updateTopbarIcon(state) {
    const btn = document.getElementById('sync-topbar-btn'); if (!btn) return;
    const dots = { synced:'🟢', pending:'🟡', uploading:'🔵', error:'🔴', 'rate-limited':'🟠' };
    const dot = btn.querySelector('.sync-dot');
    if (dot) dot.textContent = dots[state] || '';
    btn.title = {
      synced:       '☁ Sincronizado',
      pending:      '☁ Cambios pendientes de subir',
      uploading:    '☁ Subiendo…',
      error:        '☁ Error de sincronización — clic para ver',
      'rate-limited':'☁ Límite de API — esperando ventana'
    }[state] || '☁ Sincronización';
  },

  _log(msg) {
    const logEl = document.getElementById('sync-log');
    if (!logEl) return;
    const time = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
    const entry = document.createElement('div');
    entry.textContent = `[${time}] ${msg}`;
    entry.style.cssText = 'margin-bottom:3px;border-bottom:1px solid var(--border);padding-bottom:3px';
    logEl.insertBefore(entry, logEl.firstChild);
    // Keep only 20 log entries
    while (logEl.children.length > 20) logEl.removeChild(logEl.lastChild);
  },

  _refreshStatusIfOpen() {
    if (document.getElementById('modal-sync')?.classList.contains('open')) {
      this._renderSyncStatus();
    }
  },

  // ── PUBLIC: Manual upload ───────────────────────────────
  async upload(silent = false) {
    if (!this.isConfigured()) { UI.toast('⚠️ Sincronización no configurada', 'warn'); return; }
    const logEl = document.getElementById('sync-log');
    const btnEl = document.getElementById('sync-upload-btn');
    if (btnEl) { btnEl.textContent = '⏳ Subiendo…'; btnEl.disabled = true; }
    if (logEl && !silent) logEl.innerHTML = '';

    try {
      await this._doUploadIfChanged(true); // force = true ignores hash check
      if (!silent) UI.toast('✅ Datos subidos a la nube', 'ok');
    } finally {
      if (btnEl) { btnEl.textContent = '⬆ Subir (este → nube)'; btnEl.disabled = false; }
    }
  },

  // ── PUBLIC: Manual download ─────────────────────────────
  async download() {
    if (!this.isConfigured()) { UI.toast('⚠️ Sincronización no configurada', 'warn'); return; }
    if (!this._canCallApi()) { UI.toast('⚠️ Rate limit activo — espera unos minutos', 'warn'); return; }

    const logEl = document.getElementById('sync-log');
    const btnEl = document.getElementById('sync-download-btn');
    const log   = msg => { if (logEl) { const d=document.createElement('div');d.textContent=msg;logEl.insertBefore(d,logEl.firstChild); } };

    if (btnEl) { btnEl.textContent = '⏳ Bajando…'; btnEl.disabled = true; }
    if (logEl) logEl.innerHTML = '';
    log('Conectando con GitHub…');

    const cfg = this.loadConfig();
    try {
      const res = await this._apiGet(`/gists/${cfg.gistId}`, cfg.token);
      this._handleRateLimit(res);
      if (!res.ok) throw new Error(`No se pudo acceder al Gist (HTTP ${res.status})`);

      const gistData = await res.json();
      const raw = gistData.files?.[GIST_FILENAME]?.content;
      if (!raw) throw new Error('No hay datos en el Gist. Sube primero desde el otro dispositivo.');

      const parsed = JSON.parse(raw);
      if (parsed._empty) throw new Error('El Gist está vacío.');
      if (!parsed._enc)  throw new Error('Formato no reconocido.');

      // Show cloud data info before asking PIN
      const cloudTs = parsed.ts ? new Date(parsed.ts).toLocaleString('es-DO') : '—';
      const cloudDevice = parsed.device || '—';

      log(`✓ Datos encontrados: ${cloudTs} desde ${cloudDevice}`);

      const pin = prompt(
        `Datos en la nube:\n• Fecha: ${cloudTs}\n• Dispositivo: ${cloudDevice}\n\nIngresa tu PIN para descifrar:`
      );
      if (!pin) { log('Cancelado.'); return; }

      let decrypted;
      try {
        decrypted = this._decrypt(parsed.data, pin);
      } catch {
        throw new Error('PIN incorrecto — los datos no pudieron descifrarse.');
      }

      const payload = JSON.parse(decrypted);
      if (!payload._app || payload._app !== 'HEMOCURA') throw new Error('Datos no válidos o PIN incorrecto.');

      if (!confirm(
        `¿Reemplazar datos locales con los de la nube?\n\n` +
        `Nube: ${cloudTs}\n` +
        `Este dispositivo: ${cfg.lastSync ? new Date(cfg.lastSync).toLocaleString('es-DO') : 'nunca sincronizado'}\n\n` +
        `⚠️ Los datos locales no sincronizados se perderán.`
      )) { log('Cancelado por el usuario.'); return; }

      log('Aplicando datos…');
      this._applyData(payload);

      cfg.pin      = pin;
      cfg.lastSync = new Date().toISOString();
      cfg.status   = 'ok';
      this._saveConfig(cfg);

      // Update hash so we don't re-upload what we just downloaded
      this._lastHash = this._hashPayload(JSON.stringify(this._collectAllData()));
      this._pendingUpload = false;
      this._updateTopbarIcon('synced');

      log(`✅ Datos aplicados — ${new Date().toLocaleTimeString('es-DO')}`);
      UI.toast('✅ Datos actualizados desde la nube', 'ok');
      this._renderSyncStatus();

      setTimeout(() => location.reload(), 1800);

    } catch (err) {
      log(`❌ ${err.message}`);
      UI.toast('❌ ' + err.message, 'err');
    } finally {
      if (btnEl) { btnEl.textContent = '⬇ Bajar (nube → este)'; btnEl.disabled = false; }
    }
  },

  // ── Periodic health check (NO calls API directly) ───────
  // Called every POLL_MS — only schedules _doUploadIfChanged
  // if there are actual pending changes AND rate limit is clear.
  _startPoller() {
    setInterval(() => {
      if (!this.isConfigured()) return;
      if (!this._pendingUpload) return;
      if (this._uploading) return;
      if (!this._canCallApi()) return;
      this._doUploadIfChanged();
    }, POLL_MS);
  },

  // ── SETUP ────────────────────────────────────────────────
  async setup() {
    const tokenInp = document.getElementById('sync-token-inp');
    const pinInp   = document.getElementById('sync-pin-inp');
    const pin2Inp  = document.getElementById('sync-pin2-inp');
    const gistInp  = document.getElementById('sync-gistid-inp');
    const errEl    = document.getElementById('sync-setup-error');
    const btn      = document.getElementById('sync-setup-btn');

    const token  = (tokenInp?.value || '').trim();
    const pin    = (pinInp?.value   || '').trim();
    const pin2   = (pin2Inp?.value  || '').trim();
    const gistId = (gistInp?.value  || '').trim();

    const showErr = msg => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } };
    if (errEl) errEl.style.display = 'none';

    if (!token)               return showErr('⚠️ Pega tu GitHub Personal Access Token.');
    if (!token.startsWith('gh'))return showErr('⚠️ El token debe comenzar con "gh". Verifica que lo copiaste completo.');
    if (!pin || pin.length<4) return showErr('⚠️ El PIN debe tener al menos 4 dígitos.');
    if (!/^\d+$/.test(pin))   return showErr('⚠️ El PIN solo puede contener números (0–9).');
    if (pin !== pin2)         return showErr('⚠️ Los PINs no coinciden. Vuelve a escribirlos.');

    if (btn) { btn.textContent = '⏳ Verificando token…'; btn.disabled = true; }

    try {
      let resolvedGistId = gistId;

      if (gistId) {
        // Verify provided gist
        if (btn) btn.textContent = '⏳ Verificando Gist…';
        const check = await this._apiGet(`/gists/${gistId}`, token);
        if (!check.ok) throw new Error(`No se pudo acceder al Gist (${check.status}). Verifica el Gist ID y el token.`);
      } else {
        // Create new private gist
        if (btn) btn.textContent = '⏳ Creando espacio en nube…';
        const res = await this._apiPost('/gists', token, {
          description: 'HEMOCURA v10 – Datos Comerciales',
          public: false,
          files: { [GIST_FILENAME]: { content: JSON.stringify({ _version: SYNC_VERSION, _empty: true }) } }
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.message || `No se pudo crear el Gist (${res.status}). Verifica que el token tiene permiso "gist".`);
        }
        const data = await res.json();
        resolvedGistId = data.id;
      }

      const cfg = {
        token, pin, gistId: resolvedGistId,
        deviceName:  navigator.userAgent.includes('Mobile') ? '📱 Móvil' : '💻 PC/Desktop',
        autoSync:    true,
        status:      'configured',
        lastSync:    null,
        lastHash:    null
      };
      this._saveConfig(cfg);

      // Reset rate state
      this._saveRateState({ retryAfter: 0, consecutiveErrors: 0, lastCall: 0 });
      this._retryCount = 0;

      // First upload (force = true)
      if (btn) btn.textContent = '⏳ Subiendo datos iniciales…';
      await this._doUploadIfChanged(true);

      this._renderSyncStatus();
      UI.toast('✅ Sincronización configurada correctamente', 'ok');

    } catch (err) {
      showErr('❌ ' + err.message);
      if (btn) { btn.textContent = '🔗 Conectar y sincronizar'; btn.disabled = false; }
    }
  },

  disconnect() {
    if (!confirm('¿Desconectar sincronización?\nLos datos locales se conservan.')) return;
    clearTimeout(this._uploadTimer);
    clearTimeout(this._retryTimer);
    localStorage.removeItem(SYNC_LS_KEY);
    localStorage.removeItem(SYNC_RATE_KEY);
    this._cfg = null;
    this._pendingUpload = false;
    this._lastHash = null;
    this._updateTopbarIcon('error');
    this._renderSetup();
    UI.toast('🔌 Sincronización desconectada', 'warn');
  },

  // ── UI Panels ────────────────────────────────────────────
  openPanel() {
    this.loadConfig();
    const panel = document.getElementById('sync-panel-body'); if (!panel) return;
    if (this.isConfigured()) {
      this._renderSyncStatus();
    } else {
      this._renderSetup();
    }
    UI.openModal('modal-sync');
  },

  _renderSetup() {
    const p = document.getElementById('sync-panel-body'); if (!p) return;
    p.innerHTML = `
      <div class="sync-intro">
        <div style="font-size:30px;margin-bottom:8px">☁</div>
        <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:var(--ink);margin-bottom:6px">Sincronizar PC ↔ Celular</div>
        <p style="font-size:12.5px;color:var(--ink3);line-height:1.6">Tus datos se guardan en <strong>GitHub Gist</strong> (gratis y privado). Funciona desde cualquier dispositivo con el mismo link, token y PIN.</p>
      </div>
      <div class="sync-steps">
        <div class="sync-step"><div class="sync-step-n">1</div><div>
          <div class="sync-step-title">Token de GitHub *</div>
          <div class="sync-step-desc">Ve a github.com → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token. Marca solo el permiso <code>gist</code>. Copia el token que empieza con <code>ghp_</code>.</div>
          <div style="display:flex;gap:7px;margin-top:8px;align-items:center">
            <input class="fc" id="sync-token-inp" type="password" placeholder="ghp_xxxxxxxxxxxx" autocomplete="off" style="flex:1;font-family:'JetBrains Mono',monospace;font-size:12px">
            <button class="btn ghost sm" onclick="Sync._toggleVis('sync-token-inp')" type="button">👁</button>
          </div>
        </div></div>
        <div class="sync-step"><div class="sync-step-n">2</div><div>
          <div class="sync-step-title">PIN de acceso (4–8 dígitos) *</div>
          <div class="sync-step-desc">Cifra tus datos. Anótalo — lo necesitarás en el otro dispositivo.</div>
          <div style="display:flex;gap:7px;margin-top:8px">
            <input class="fc" id="sync-pin-inp"  type="password" placeholder="PIN (ej: 12345)" maxlength="8" inputmode="numeric" style="flex:1">
            <input class="fc" id="sync-pin2-inp" type="password" placeholder="Confirmar PIN"  maxlength="8" inputmode="numeric" style="flex:1">
          </div>
        </div></div>
        <div class="sync-step"><div class="sync-step-n">3</div><div>
          <div class="sync-step-title">Gist ID (solo si ya configuraste otro dispositivo)</div>
          <div class="sync-step-desc">Déjalo vacío si es la primera vez. Si el otro dispositivo ya tiene sync, pega aquí su Gist ID.</div>
          <input class="fc" id="sync-gistid-inp" placeholder="Dejar vacío para crear nuevo espacio en nube" style="margin-top:8px;width:100%;font-family:'JetBrains Mono',monospace;font-size:11px">
        </div></div>
      </div>
      <div id="sync-setup-error" style="display:none;color:var(--red);font-size:12.5px;margin-top:10px;padding:8px 12px;background:var(--red-l);border-radius:7px"></div>
      <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">
        <button class="btn-cancel" onclick="UI.closeModal('modal-sync')">Cancelar</button>
        <button class="btn-ok" id="sync-setup-btn" onclick="Sync.setup()" style="background:var(--teal);min-width:180px">🔗 Conectar y sincronizar</button>
      </div>`;
  },

  _renderSyncStatus() {
    const p = document.getElementById('sync-panel-body'); if (!p) return;
    const cfg = this.loadConfig();
    const rs  = this._getRateState();
    const lastSync  = cfg.lastSync  ? new Date(cfg.lastSync).toLocaleString('es-DO')  : 'Nunca';
    const rateLimited = rs.retryAfter > Date.now();
    const waitMin   = rateLimited ? Math.ceil((rs.retryAfter - Date.now()) / 60000) : 0;

    p.innerHTML = `
      <div class="sync-status-banner ${cfg.status==='ok'?'ok':'warn'}">
        <span style="font-size:22px">${cfg.status==='ok'?'✅':'⚠️'}</span>
        <div>
          <div style="font-weight:700;font-size:13.5px">${cfg.status==='ok'?'Sincronización activa':'Sin sincronización reciente'}</div>
          <div style="font-size:11.5px;opacity:.8">Última: ${lastSync}</div>
        </div>
      </div>
      ${rateLimited ? `<div style="background:var(--amber-l);border:1px solid var(--amber);border-radius:8px;padding:9px 13px;margin-bottom:12px;font-size:12.5px;color:var(--amber)">
        ⏳ <strong>Rate limit activo</strong> — la API de GitHub pidió esperar ${waitMin} minutos más. Las subidas automáticas se reanudarán solas. No es necesario hacer nada.
      </div>` : ''}
      <div class="sync-info-grid">
        <div class="sync-info-item"><div class="sii-lbl">Dispositivo</div><div class="sii-val">${cfg.deviceName||'—'}</div></div>
        <div class="sync-info-item"><div class="sii-lbl">Auto-sync</div><div class="sii-val">${cfg.autoSync?'✅ Activo (c/5 min)':'⏸ Inactivo'}</div></div>
        <div class="sync-info-item"><div class="sii-lbl">Estado API</div><div class="sii-val">${rateLimited?`🟠 Esperando ${waitMin}min`:rs.consecutiveErrors>2?'🔴 Errores repetidos':'🟢 OK'}</div></div>
        <div class="sync-info-item"><div class="sii-lbl">Cambios pendientes</div><div class="sii-val">${this._pendingUpload?'🟡 Sí — se subirán pronto':'✅ Ninguno'}</div></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.8px;margin:12px 0 7px">Acciones manuales</div>
      <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px">
        <button class="btn primary sm" id="sync-upload-btn" onclick="Sync.upload()" ${rateLimited?'disabled title="Espera que se limpie el rate limit"':''}>⬆ Subir (este → nube)</button>
        <button class="btn outline sm" id="sync-download-btn" onclick="Sync.download()" ${rateLimited?'disabled title="Espera que se limpie el rate limit"':''}>⬇ Bajar (nube → este)</button>
        <button class="btn ghost sm" onclick="Sync._toggleAutoSync()">${cfg.autoSync?'⏸ Pausar auto-sync':'▶ Activar auto-sync'}</button>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Registro de actividad</div>
      <div id="sync-log" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:11px;font-family:'JetBrains Mono',monospace;min-height:50px;max-height:130px;overflow-y:auto;color:var(--ink3)">
        <div>Listo — esperando cambios para sincronizar.</div>
      </div>
      <div style="margin-top:13px;padding-top:12px;border-top:1px solid var(--border);display:flex;flex-wrap:wrap;gap:7px">
        <button class="btn-cancel" onclick="UI.closeModal('modal-sync')">Cerrar</button>
        <button class="btn ghost sm" onclick="Sync._showGistId()">📋 Gist ID (para otro dispositivo)</button>
        <button class="btn ghost sm" style="color:var(--red);margin-left:auto" onclick="Sync.disconnect()">🔌 Desconectar</button>
      </div>`;
  },

  _toggleVis(id) {
    const inp = document.getElementById(id); if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
  },

  _toggleAutoSync() {
    const cfg = this.loadConfig(); if (!cfg) return;
    cfg.autoSync = !cfg.autoSync;
    this._saveConfig(cfg);
    this._renderSyncStatus();
    UI.toast(cfg.autoSync ? '🔄 Auto-sync activado' : '⏸ Auto-sync pausado', cfg.autoSync ? 'ok' : 'warn');
  },

  _showGistId() {
    const id = this._cfg?.gistId; if (!id) return;
    prompt('Copia este Gist ID para configurar otro dispositivo:', id);
  },

  // ── Collect / apply all state ────────────────────────────
  _collectAllData() {
    return {
      _app: 'HEMOCURA', _version: '10', exported: new Date().toISOString(),
      weeks:      getAllWeeks(),
      tasks:      State.tasks,       reminders:  State.reminders,
      ventas:     State.ventas,      creditos:   State.creditos,
      sucursales: State.sucursales,  reuniones:  State.reuniones,
      visitas:    State.visitas,     incidencias:State.incidencias,
      contactos:  State.contactos,   empresas:   State.empresas,
      clientes:   State.clientes,    dashConfig: State.dashConfig
    };
  },

  _applyData(p) {
    if (p.weeks)      saveAllWeeks(p.weeks);
    if (p.tasks)      { State.tasks=p.tasks;           lsSet(LS_KEYS.tasks,      State.tasks);      }
    if (p.reminders)  { State.reminders=p.reminders;   lsSet(LS_KEYS.reminders,  State.reminders);  }
    if (p.ventas)     { State.ventas=p.ventas;          lsSet(LS_KEYS.ventas,     State.ventas);     }
    if (p.creditos)   { State.creditos=p.creditos;      lsSet(LS_KEYS.creditos,   State.creditos);   }
    if (p.sucursales) { State.sucursales=p.sucursales;  lsSet(LS_KEYS.sucursales, State.sucursales); }
    if (p.reuniones)  { State.reuniones=p.reuniones;    lsSet(LS_KEYS.reuniones,  State.reuniones);  }
    if (p.visitas)    { State.visitas=p.visitas;         lsSet(LS_KEYS.visitas,    State.visitas);    }
    if (p.incidencias){ State.incidencias=p.incidencias;lsSet(LS_KEYS.incidencias,State.incidencias);}
    if (p.contactos)  { State.contactos=p.contactos;    lsSet(LS_KEYS.contactos,  State.contactos);  }
    if (p.empresas)   { State.empresas=p.empresas;      lsSet(LS_KEYS.empresas,   State.empresas);   }
    if (p.clientes)   { State.clientes=p.clientes;      lsSet(LS_KEYS.clientes,   State.clientes);   }
    if (p.dashConfig) { State.dashConfig=p.dashConfig;  lsSet(LS_KEYS.dashConfig, State.dashConfig); }
  },

  // ── Encryption ──────────────────────────────────────────
  _encrypt(text, pin) {
    const key = this._expandKey(pin, text.length);
    let r = '';
    for (let i = 0; i < text.length; i++) r += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i));
    return btoa(unescape(encodeURIComponent(r)));
  },
  _decrypt(b64, pin) {
    const text = decodeURIComponent(escape(atob(b64)));
    const key  = this._expandKey(pin, text.length);
    let r = '';
    for (let i = 0; i < text.length; i++) r += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i));
    return r;
  },
  _expandKey(pin, length) {
    const base = pin.split('').map(c => c.charCodeAt(0));
    let k = '';
    for (let i = 0; i < length; i++) k += String.fromCharCode((base[i % base.length] + i * 7 + 31) % 256);
    return k;
  },

  // ── GitHub API helpers ──────────────────────────────────
  _headers(token) {
    return {
      'Authorization': `token ${token}`,
      'Accept':        'application/vnd.github.v3+json',
      'Content-Type':  'application/json'
    };
  },
  async _apiGet(path, token) {
    return fetch(`https://api.github.com${path}`, { headers: this._headers(token) });
  },
  async _apiPost(path, token, body) {
    return fetch(`https://api.github.com${path}`, { method:'POST',  headers: this._headers(token), body: JSON.stringify(body) });
  },
  async _apiPatch(path, token, body) {
    return fetch(`https://api.github.com${path}`, { method:'PATCH', headers: this._headers(token), body: JSON.stringify(body) });
  }
};
