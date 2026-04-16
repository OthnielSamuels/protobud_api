'use strict';

const DEFAULT_API_BASE =
  window.location.protocol === 'file:' ? 'http://localhost:3000' : '/api';

// =====================================================
// CONFIG
// =====================================================
const CONFIG = {
  CREDENTIALS: { username: 'admin', password: 'admin' },
  API_BASE: window.API_BASE || DEFAULT_API_BASE,
  SESSION_KEY: 'protobud_session',
  REFRESH_INTERVAL: 30_000,
};

// =====================================================
// STATE
// =====================================================
const state = {
  page: 'dashboard',
  refreshTimers: [],
};

// =====================================================
// AUTH
// =====================================================
const Auth = {
  isLoggedIn() {
    return sessionStorage.getItem(CONFIG.SESSION_KEY) === 'authenticated';
  },
  login(user, pass) {
    if (user === CONFIG.CREDENTIALS.username && pass === CONFIG.CREDENTIALS.password) {
      sessionStorage.setItem(CONFIG.SESSION_KEY, 'authenticated');
      return true;
    }
    return false;
  },
  logout() {
    sessionStorage.removeItem(CONFIG.SESSION_KEY);
  },
};

// =====================================================
// API HELPERS
// =====================================================
const Api = {
  async request(method, path, body) {
    try {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(CONFIG.API_BASE + path, opts);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Could not make a connection');
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      return await res.json();
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error('Could not make a connection');
      }
      throw err;
    }
  },
  get:    (path)       => Api.request('GET',    path),
  post:   (path, body) => Api.request('POST',   path, body),
  patch:  (path, body) => Api.request('PATCH',  path, body),
  delete: (path)       => Api.request('DELETE', path),
};

// =====================================================
// TOAST
// =====================================================
function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  el.innerHTML = `<span style="color:${type==='success'?'var(--green)':type==='error'?'var(--red)':'var(--blue)'}">${icons[type]||'·'}</span>${escHtml(msg)}`;
  c.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function apiErr(err) {
  return err.message === 'Could not make a connection'
    ? 'Could not make a connection'
    : 'Operation failed — please try again';
}

// =====================================================
// MODAL
// =====================================================
const Modal = {
  open(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
  },
};

// =====================================================
// UTILS
// =====================================================
function escHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtCurrency(v) {
  if (v == null) return '—';
  return '$' + Number(v).toFixed(2);
}

// Maps schema enum values to badge classes
function statusBadge(status) {
  const map = {
    // ConversationStatus
    collecting_data:          'badge-blue',
    awaiting_internal_input:  'badge-accent',
    completed:                'badge-green',
    // ProjectStatus
    draft:     'badge-muted',
    active:    'badge-green',
    cancelled: 'badge-red',
    // EstimateStatus
    approved:  'badge-green',
    rejected:  'badge-red',
    // InvoiceStatus
    sent:      'badge-blue',
    paid:      'badge-green',
  };
  const cls = map[(status||'').toLowerCase()] || 'badge-muted';
  return `<span class="badge ${cls}">${escHtml(status||'unknown')}</span>`;
}

// Schema enums — kept in sync with prisma schema
const PRINT_MATERIALS   = ['PLA','PETG','ABS','TPU','RESIN','NYLON','OTHER'];
const PRINT_QUALITIES   = ['draft','standard','high','ultra'];
const PROJECT_STATUSES  = ['draft','active','completed','cancelled'];
const ESTIMATE_STATUSES = ['draft','awaiting_internal_input','approved','rejected'];
const INVOICE_STATUSES  = ['draft','sent','paid','cancelled'];

// =====================================================
// ROUTER
// =====================================================
function navigate(page) {
  state.page = page;
  state.refreshTimers.forEach(clearInterval);
  state.refreshTimers = [];
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  window.location.hash = page;
  renderPage(page);
}

window.addEventListener('hashchange', () => {
  const page = window.location.hash.slice(1) || 'dashboard';
  if (page !== state.page) navigate(page);
});

// =====================================================
// BOOTSTRAP
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-btn').addEventListener('click', doLogin);
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('modal-close').addEventListener('click', Modal.close);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') Modal.close();
  });
  document.getElementById('logout-btn').addEventListener('click', () => {
    Auth.logout();
    showLogin();
  });
  if (Auth.isLoggedIn()) showApp();
  else showLogin();
});

function doLogin() {
  const user = document.getElementById('login-username').value.trim();
  const pass = document.getElementById('login-password').value;
  const err  = document.getElementById('login-error');
  if (Auth.login(user, pass)) {
    err.classList.add('hidden');
    showApp();
  } else {
    err.classList.remove('hidden');
    document.getElementById('login-password').value = '';
  }
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('main-app').classList.add('hidden');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  const page = window.location.hash.slice(1) || 'dashboard';
  navigate(page);
  pollPipelineBadge();
  pollWaStatus();
}

// =====================================================
// BACKGROUND POLLS
// =====================================================
async function pollPipelineBadge() {
  try {
    const data = await Api.get('/pipeline/pending');
    const badge = document.getElementById('pipeline-badge');
    if (badge) badge.textContent = (data||[]).length;
  } catch (_) {}
  setTimeout(pollPipelineBadge, 30_000);
}

async function pollWaStatus() {
  try {
    const data = await Api.get('/whatsapp/health');
    const dot = document.getElementById('wa-status-dot');
    if (dot) dot.className = 'status-dot ' + (data?.connected ? 'online' : 'offline');
  } catch (_) {}
  setTimeout(pollWaStatus, 15_000);
}

// =====================================================
// PAGE RENDERER
// =====================================================
function renderPage(page) {
  const container = document.getElementById('page-container');
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div> Loading…</div>`;
  const pages = { dashboard, clients, projects, estimates, invoices, pipeline, whatsapp, 'send-message': sendMessage };
  const fn = pages[page];
  if (fn) fn(container);
  else container.innerHTML = `<div class="page-loading" style="color:var(--red)">Could not make a connection</div>`;
}

// =====================================================
// DASHBOARD
// =====================================================
async function dashboard(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <div class="page-eyebrow">Overview</div>
        <div class="page-title">Dashboard</div>
      </div>
      <div class="page-actions">
        <span id="dash-refresh-time" class="text-muted text-mono text-sm"></span>
        <button class="btn btn-ghost btn-sm" onclick="navigate('dashboard')">↻ Refresh</button>
      </div>
    </div>
    <div class="page-body">
      <div id="dash-content"><div class="page-loading"><div class="spinner"></div> Fetching data…</div></div>
    </div>`;

  try {
    const [rC, rP, rE, rI, rPipe, rWa] = await Promise.allSettled([
      Api.get('/clients'), Api.get('/projects'), Api.get('/estimates'),
      Api.get('/invoices'), Api.get('/pipeline/pending'), Api.get('/whatsapp/health'),
    ]);
    const C    = rC.value    || [];
    const P    = rP.value    || [];
    const E    = rE.value    || [];
    const I    = rI.value    || [];
    const pipe = rPipe.value || [];
    const wa   = rWa.value;

    const activeProj     = P.filter(p => p.status === 'active');
    const awaitingEst    = E.filter(e => e.status === 'awaiting_internal_input');
    const unpaidInv      = I.filter(i => i.status !== 'paid' && i.status !== 'cancelled');

    document.getElementById('dash-refresh-time').textContent = 'Updated ' + new Date().toLocaleTimeString();
    document.getElementById('dash-content').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Clients</div>
          <div class="stat-value blue">${C.length}</div>
          <div class="stat-sub">registered</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Active Projects</div>
          <div class="stat-value accent">${activeProj.length}</div>
          <div class="stat-sub">of ${P.length} total</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pipeline Queue</div>
          <div class="stat-value ${pipe.length > 0 ? 'accent' : 'green'}">${pipe.length}</div>
          <div class="stat-sub">awaiting review</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Estimates Pending</div>
          <div class="stat-value ${awaitingEst.length > 0 ? 'accent' : ''}">${awaitingEst.length}</div>
          <div class="stat-sub">need operator input</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Unpaid Invoices</div>
          <div class="stat-value ${unpaidInv.length > 0 ? 'red' : 'green'}">${unpaidInv.length}</div>
          <div class="stat-sub">outstanding</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">WhatsApp Bot</div>
          <div class="stat-value ${wa?.connected ? 'green' : 'red'}">${wa?.connected ? 'ON' : 'OFF'}</div>
          <div class="stat-sub">${wa?.connected ? 'connected' : 'disconnected'}</div>
        </div>
      </div>
      <div class="two-col">
        <div>
          <div class="detail-section-title">Recent Clients</div>
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>Name</th><th>Phone</th><th>Company</th><th>Since</th></tr></thead>
              <tbody>
                ${C.slice(-5).reverse().map(cl => `
                  <tr style="cursor:pointer" onclick="navigate('clients')">
                    <td class="primary">${escHtml(cl.name)}</td>
                    <td class="mono">${escHtml(cl.phone)}</td>
                    <td>${escHtml(cl.company||'—')}</td>
                    <td class="mono">${fmtDate(cl.createdAt)}</td>
                  </tr>`).join('') || `<tr><td colspan="4" class="table-empty">No clients yet</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div class="detail-section-title">Pipeline Queue</div>
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>Client</th><th>Status</th><th>Updated</th></tr></thead>
              <tbody>
                ${pipe.slice(0,5).map(conv => `
                  <tr style="cursor:pointer" onclick="navigate('pipeline')">
                    <td class="primary">${escHtml(conv.client?.name||'—')}</td>
                    <td>${statusBadge(conv.status)}</td>
                    <td class="mono">${fmtDate(conv.updatedAt)}</td>
                  </tr>`).join('') || `<tr><td colspan="3" class="table-empty">Queue is clear ✓</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  } catch (_) {
    document.getElementById('dash-content').innerHTML =
      `<div class="page-loading" style="color:var(--red)">Could not make a connection</div>`;
  }
}

// =====================================================
// CLIENTS — schema: name*, phone*(unique), email?, company?, notes?
// =====================================================
async function clients(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <div class="page-eyebrow">Management</div>
        <div class="page-title">Clients</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-accent" onclick="openClientModal()">+ New Client</button>
      </div>
    </div>
    <div class="page-body">
      <div class="table-container">
        <div class="table-toolbar">
          <input type="text" class="table-search" id="client-search" placeholder="Search name, phone, company…" oninput="filterClientTable()" />
          <span id="client-count" class="text-muted text-mono text-sm"></span>
        </div>
        <div id="clients-table-body"><div class="page-loading"><div class="spinner"></div></div></div>
      </div>
    </div>`;
  await loadClientsTable();
}

async function loadClientsTable() {
  const body = document.getElementById('clients-table-body');
  if (!body) return;
  try {
    window._clientsData = await Api.get('/clients');
    renderClientsTable(window._clientsData);
  } catch (_) {
    body.innerHTML = `<div class="table-empty" style="color:var(--red)">Could not make a connection</div>`;
  }
}

function renderClientsTable(data) {
  const body = document.getElementById('clients-table-body');
  if (!body) return;
  const cnt = document.getElementById('client-count');
  if (cnt) cnt.textContent = data.length + ' clients';
  body.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Company</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody>
        ${!data.length ? `<tr><td colspan="6" class="table-empty">No clients found</td></tr>` :
          data.map(cl => `
            <tr>
              <td class="primary">${escHtml(cl.name)}</td>
              <td class="mono">${escHtml(cl.phone)}</td>
              <td>${escHtml(cl.email||'—')}</td>
              <td>${escHtml(cl.company||'—')}</td>
              <td class="mono">${fmtDate(cl.createdAt)}</td>
              <td>
                <div class="action-cell">
                  <button class="btn btn-ghost btn-sm" onclick="openClientModal('${escHtml(cl.id)}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteClient('${escHtml(cl.id)}','${escHtml(cl.name)}')">Del</button>
                </div>
              </td>
            </tr>`).join('')}
      </tbody>
    </table>`;
}

function filterClientTable() {
  const q = document.getElementById('client-search')?.value.toLowerCase() || '';
  renderClientsTable((window._clientsData||[]).filter(c =>
    (c.name||'').toLowerCase().includes(q) ||
    (c.phone||'').toLowerCase().includes(q) ||
    (c.company||'').toLowerCase().includes(q) ||
    (c.email||'').toLowerCase().includes(q)
  ));
}

window.openClientModal = async function(id) {
  let cl = null;
  if (id) { try { cl = await Api.get(`/clients/${id}`); } catch (_) {} }
  Modal.open(cl ? 'Edit Client' : 'New Client', `
    <div class="form-grid form-grid-2">
      <div class="form-field">
        <label class="form-label">Name *</label>
        <input class="form-input" id="f-name" value="${escHtml(cl?.name||'')}" placeholder="Full name" />
      </div>
      <div class="form-field">
        <label class="form-label">Phone (WhatsApp) *</label>
        <input class="form-input" id="f-phone" value="${escHtml(cl?.phone||'')}" placeholder="e.g. 5971234567" style="font-family:var(--font-mono)" />
      </div>
      <div class="form-field">
        <label class="form-label">Email</label>
        <input class="form-input" id="f-email" type="email" value="${escHtml(cl?.email||'')}" placeholder="email@example.com" />
      </div>
      <div class="form-field">
        <label class="form-label">Company</label>
        <input class="form-input" id="f-company" value="${escHtml(cl?.company||'')}" placeholder="Company name" />
      </div>
      <div class="form-field" style="grid-column:1/-1">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="f-notes" placeholder="Internal notes…">${escHtml(cl?.notes||'')}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
      <button class="btn btn-accent" onclick="saveClient('${escHtml(id||'')}')">Save Client</button>
    </div>`);
};

window.saveClient = async function(id) {
  const dto = {
    name:    document.getElementById('f-name').value.trim(),
    phone:   document.getElementById('f-phone').value.trim(),
    email:   document.getElementById('f-email').value.trim()   || undefined,
    company: document.getElementById('f-company').value.trim() || undefined,
    notes:   document.getElementById('f-notes').value.trim()   || undefined,
  };
  if (!dto.name)  { toast('Name is required', 'error'); return; }
  if (!dto.phone) { toast('Phone is required (used for WhatsApp)', 'error'); return; }
  try {
    id ? await Api.patch(`/clients/${id}`, dto) : await Api.post('/clients', dto);
    toast(`Client ${id?'updated':'created'}`, 'success');
    Modal.close();
    await loadClientsTable();
  } catch (err) { toast(apiErr(err), 'error'); }
};

window.deleteClient = async function(id, name) {
  if (!confirm(`Delete client "${name}"? This will affect all related data.`)) return;
  try {
    await Api.delete(`/clients/${id}`);
    toast('Client deleted', 'success');
    await loadClientsTable();
  } catch (err) { toast(apiErr(err), 'error'); }
};

// =====================================================
// PROJECTS — schema: clientId*, name*, description?, status(ProjectStatus),
//   material?(PrintMaterial), quality?(PrintQuality),
//   fileUrl?, weightGrams?, printHours?, notes?
// =====================================================
async function projects(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <div class="page-eyebrow">Management</div>
        <div class="page-title">Projects</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-accent" onclick="openProjectModal()">+ New Project</button>
      </div>
    </div>
    <div class="page-body">
      <div class="table-container">
        <div class="table-toolbar">
          <input type="text" class="table-search" id="proj-search" placeholder="Search name, client, material…" oninput="filterProjectTable()" />
          <span id="proj-count" class="text-muted text-mono text-sm"></span>
        </div>
        <div id="projects-table-body"><div class="page-loading"><div class="spinner"></div></div></div>
      </div>
    </div>`;
  await loadProjectsTable();
}

async function loadProjectsTable() {
  const body = document.getElementById('projects-table-body');
  if (!body) return;
  try {
    const [data, clientList] = await Promise.all([Api.get('/projects'), Api.get('/clients')]);
    window._projectsData = data;
    window._clientList   = clientList;
    renderProjectsTable(data);
  } catch (_) {
    body.innerHTML = `<div class="table-empty" style="color:var(--red)">Could not make a connection</div>`;
  }
}

function clientName(id) {
  return (window._clientList||[]).find(c => c.id === id)?.name || '—';
}

// Schema field is `name` (not `title`)
function projectName(id) {
  return (window._projectList||[]).find(p => p.id === id)?.name || '—';
}

function renderProjectsTable(data) {
  const body = document.getElementById('projects-table-body');
  if (!body) return;
  const cnt = document.getElementById('proj-count');
  if (cnt) cnt.textContent = data.length + ' projects';
  body.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Name</th><th>Client</th><th>Status</th><th>Material</th><th>Quality</th><th>Hrs</th><th>Weight</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody>
        ${!data.length ? `<tr><td colspan="9" class="table-empty">No projects found</td></tr>` :
          data.map(p => `
            <tr>
              <td class="primary">${escHtml(p.name||'Untitled')}</td>
              <td>${escHtml(clientName(p.clientId))}</td>
              <td>${statusBadge(p.status)}</td>
              <td class="mono">${escHtml(p.material||'—')}</td>
              <td class="mono">${escHtml(p.quality||'—')}</td>
              <td class="mono">${p.printHours!=null ? p.printHours+'h' : '—'}</td>
              <td class="mono">${p.weightGrams!=null ? p.weightGrams+'g' : '—'}</td>
              <td class="mono">${fmtDate(p.createdAt)}</td>
              <td>
                <div class="action-cell">
                  <button class="btn btn-ghost btn-sm" onclick="openProjectModal('${escHtml(p.id)}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteProject('${escHtml(p.id)}','${escHtml(p.name||'')}')">Del</button>
                </div>
              </td>
            </tr>`).join('')}
      </tbody>
    </table>`;
}

function filterProjectTable() {
  const q = document.getElementById('proj-search')?.value.toLowerCase() || '';
  renderProjectsTable((window._projectsData||[]).filter(p =>
    (p.name||'').toLowerCase().includes(q) ||
    clientName(p.clientId).toLowerCase().includes(q) ||
    (p.material||'').toLowerCase().includes(q)
  ));
}

window.openProjectModal = async function(id) {
  let p = null;
  if (id) { try { p = await Api.get(`/projects/${id}`); } catch (_) {} }
  const cls = window._clientList || await Api.get('/clients').catch(()=>[]);

  const clOpts = cls.map(c =>
    `<option value="${escHtml(c.id)}" ${p?.clientId===c.id?'selected':''}>${escHtml(c.name)}</option>`
  ).join('');
  const statusOpts = PROJECT_STATUSES.map(s =>
    `<option value="${s}" ${(p?.status||'draft')===s?'selected':''}>${s}</option>`
  ).join('');
  const matOpts = `<option value="">— none —</option>` +
    PRINT_MATERIALS.map(m => `<option value="${m}" ${p?.material===m?'selected':''}>${m}</option>`).join('');
  const qualOpts = `<option value="">— none —</option>` +
    PRINT_QUALITIES.map(q => `<option value="${q}" ${p?.quality===q?'selected':''}>${q}</option>`).join('');

  Modal.open(p ? 'Edit Project' : 'New Project', `
    <div class="form-grid form-grid-2">
      <div class="form-field">
        <label class="form-label">Project Name *</label>
        <input class="form-input" id="f-name" value="${escHtml(p?.name||'')}" placeholder="e.g. Phone Stand v2" />
      </div>
      <div class="form-field">
        <label class="form-label">Client *</label>
        <select class="form-select" id="f-clientId"><option value="">— select —</option>${clOpts}</select>
      </div>
      <div class="form-field">
        <label class="form-label">Status</label>
        <select class="form-select" id="f-status">${statusOpts}</select>
      </div>
      <div class="form-field">
        <label class="form-label">Material</label>
        <select class="form-select" id="f-material">${matOpts}</select>
      </div>
      <div class="form-field">
        <label class="form-label">Print Quality</label>
        <select class="form-select" id="f-quality">${qualOpts}</select>
      </div>
      <div class="form-field">
        <label class="form-label">Weight (grams)</label>
        <input class="form-input" id="f-weightGrams" type="number" step="0.01" min="0" value="${p?.weightGrams??''}" placeholder="0.00" />
      </div>
      <div class="form-field">
        <label class="form-label">Print Hours</label>
        <input class="form-input" id="f-printHours" type="number" step="0.01" min="0" value="${p?.printHours??''}" placeholder="0.00" />
      </div>
      <div class="form-field">
        <label class="form-label">File URL (STL / OBJ)</label>
        <input class="form-input" id="f-fileUrl" value="${escHtml(p?.fileUrl||'')}" placeholder="https://…" />
      </div>
      <div class="form-field" style="grid-column:1/-1">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="f-description" placeholder="What needs to be printed…">${escHtml(p?.description||'')}</textarea>
      </div>
      <div class="form-field" style="grid-column:1/-1">
        <label class="form-label">Internal Notes</label>
        <textarea class="form-textarea" id="f-notes" placeholder="Operator notes…">${escHtml(p?.notes||'')}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
      <button class="btn btn-accent" onclick="saveProject('${escHtml(id||'')}')">Save Project</button>
    </div>`);
};

window.saveProject = async function(id) {
  const wg = document.getElementById('f-weightGrams').value;
  const ph = document.getElementById('f-printHours').value;
  const dto = {
    name:        document.getElementById('f-name').value.trim(),
    clientId:    document.getElementById('f-clientId').value,
    status:      document.getElementById('f-status').value,
    material:    document.getElementById('f-material').value  || undefined,
    quality:     document.getElementById('f-quality').value   || undefined,
    weightGrams: wg ? parseFloat(wg) : undefined,
    printHours:  ph ? parseFloat(ph) : undefined,
    fileUrl:     document.getElementById('f-fileUrl').value.trim()     || undefined,
    description: document.getElementById('f-description').value.trim() || undefined,
    notes:       document.getElementById('f-notes').value.trim()       || undefined,
  };
  if (!dto.name)     { toast('Project name is required', 'error'); return; }
  if (!dto.clientId) { toast('Client is required', 'error'); return; }
  try {
    id ? await Api.patch(`/projects/${id}`, dto) : await Api.post('/projects', dto);
    toast(`Project ${id?'updated':'created'}`, 'success');
    Modal.close();
    await loadProjectsTable();
  } catch (err) { toast(apiErr(err), 'error'); }
};

window.deleteProject = async function(id, name) {
  if (!confirm(`Delete project "${name}"?`)) return;
  try {
    await Api.delete(`/projects/${id}`);
    toast('Project deleted', 'success');
    await loadProjectsTable();
  } catch (err) { toast(apiErr(err), 'error'); }
};

// =====================================================
// ESTIMATES — schema: projectId*, status(EstimateStatus),
//   notes?, subtotal?, tax?, total?
//   items: EstimateItem[] → description, quantity, unitPrice?, totalPrice?
//   Totals are set by the operator. NOT auto-computed by LLM.
// =====================================================
async function estimates(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <div class="page-eyebrow">Management</div>
        <div class="page-title">Estimates</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-accent" onclick="openEstimateModal()">+ New Estimate</button>
      </div>
    </div>
    <div class="page-body">
      <div class="table-container">
        <div class="table-toolbar">
          <input type="text" class="table-search" id="est-search" placeholder="Search project or status…" oninput="filterEstimateTable()" />
          <span id="est-count" class="text-muted text-mono text-sm"></span>
        </div>
        <div id="estimates-table-body"><div class="page-loading"><div class="spinner"></div></div></div>
      </div>
    </div>`;
  await loadEstimatesTable();
}

async function loadEstimatesTable() {
  const body = document.getElementById('estimates-table-body');
  if (!body) return;
  try {
    const [data, projs] = await Promise.all([Api.get('/estimates'), Api.get('/projects')]);
    window._estimatesData = data;
    window._projectList   = projs;
    renderEstimatesTable(data);
  } catch (_) {
    body.innerHTML = `<div class="table-empty" style="color:var(--red)">Could not make a connection</div>`;
  }
}

function renderEstimatesTable(data) {
  const body = document.getElementById('estimates-table-body');
  if (!body) return;
  const cnt = document.getElementById('est-count');
  if (cnt) cnt.textContent = data.length + ' estimates';
  body.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Project</th><th>Status</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Items</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody>
        ${!data.length ? `<tr><td colspan="8" class="table-empty">No estimates found</td></tr>` :
          data.map(e => `
            <tr>
              <td class="primary">${escHtml(projectName(e.projectId))}</td>
              <td>${statusBadge(e.status)}</td>
              <td class="mono">${fmtCurrency(e.subtotal)}</td>
              <td class="mono">${fmtCurrency(e.tax)}</td>
              <td class="mono" style="color:var(--accent);font-weight:600">${fmtCurrency(e.total)}</td>
              <td class="mono">${(e.items||[]).length}</td>
              <td class="mono">${fmtDate(e.createdAt)}</td>
              <td>
                <div class="action-cell">
                  <button class="btn btn-ghost btn-sm" onclick="viewEstimate('${escHtml(e.id)}')">View</button>
                  <button class="btn btn-ghost btn-sm" onclick="openEstimateModal('${escHtml(e.id)}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteEstimate('${escHtml(e.id)}')">Del</button>
                </div>
              </td>
            </tr>`).join('')}
      </tbody>
    </table>`;
}

function filterEstimateTable() {
  const q = document.getElementById('est-search')?.value.toLowerCase() || '';
  renderEstimatesTable((window._estimatesData||[]).filter(e =>
    projectName(e.projectId).toLowerCase().includes(q) ||
    (e.status||'').toLowerCase().includes(q)
  ));
}

window.viewEstimate = async function(id) {
  try {
    const est = await Api.get(`/estimates/${id}`);
    // EstimateItem uses `totalPrice` (not `total`) per schema
    const itemRows = (est.items||[]).map(item => `
      <tr>
        <td>${escHtml(item.description)}</td>
        <td class="mono">${item.quantity}</td>
        <td class="mono">${fmtCurrency(item.unitPrice)}</td>
        <td class="mono">${fmtCurrency(item.totalPrice)}</td>
      </tr>`).join('');
    Modal.open(`Estimate — ${escHtml(projectName(est.projectId))}`, `
      <div class="detail-grid" style="margin-bottom:16px">
        <div class="detail-item"><div class="detail-item-label">Status</div><div>${statusBadge(est.status)}</div></div>
        <div class="detail-item"><div class="detail-item-label">Subtotal</div><div class="detail-item-value">${fmtCurrency(est.subtotal)}</div></div>
        <div class="detail-item"><div class="detail-item-label">Tax</div><div class="detail-item-value">${fmtCurrency(est.tax)}</div></div>
        <div class="detail-item"><div class="detail-item-label">Total</div>
          <div class="detail-item-value" style="color:var(--accent);font-size:20px;font-weight:700">${fmtCurrency(est.total)}</div>
        </div>
      </div>
      ${est.notes ? `<p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">${escHtml(est.notes)}</p>` : ''}
      <div class="detail-section-title">Line Items</div>
      <table class="estimate-items-table">
        <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
        <tbody>${itemRows || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:12px">No line items</td></tr>'}</tbody>
      </table>
      <div class="form-actions"><button class="btn btn-ghost" onclick="Modal.close()">Close</button></div>`);
  } catch (_) { toast('Could not make a connection', 'error'); }
};

window.openEstimateModal = async function(id) {
  let est = null;
  if (id) { try { est = await Api.get(`/estimates/${id}`); } catch (_) {} }
  const projs = window._projectList || await Api.get('/projects').catch(()=>[]);
  const projOpts = projs.map(p =>
    `<option value="${escHtml(p.id)}" ${est?.projectId===p.id?'selected':''}>${escHtml(p.name)}</option>`
  ).join('');
  const statusOpts = ESTIMATE_STATUSES.map(s =>
    `<option value="${s}" ${(est?.status||'draft')===s?'selected':''}>${s.replace(/_/g,' ')}</option>`
  ).join('');

  Modal.open(est ? 'Edit Estimate' : 'New Estimate', `
    <div class="form-grid form-grid-2">
      <div class="form-field" style="grid-column:1/-1">
        <label class="form-label">Project *</label>
        <select class="form-select" id="f-projectId"><option value="">— select project —</option>${projOpts}</select>
      </div>
      <div class="form-field">
        <label class="form-label">Status</label>
        <select class="form-select" id="f-status">${statusOpts}</select>
      </div>
      <div class="form-field">
        <label class="form-label">Subtotal</label>
        <input class="form-input" id="f-subtotal" type="number" step="0.01" min="0" value="${est?.subtotal??''}" placeholder="0.00" />
      </div>
      <div class="form-field">
        <label class="form-label">Tax</label>
        <input class="form-input" id="f-tax" type="number" step="0.01" min="0" value="${est?.tax??''}" placeholder="0.00" />
      </div>
      <div class="form-field">
        <label class="form-label">Total</label>
        <input class="form-input" id="f-total" type="number" step="0.01" min="0" value="${est?.total??''}" placeholder="0.00" />
      </div>
      <div class="form-field" style="grid-column:1/-1">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="f-notes" placeholder="Operator notes on this estimate…">${escHtml(est?.notes||'')}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
      <button class="btn btn-accent" onclick="saveEstimate('${escHtml(id||'')}')">Save Estimate</button>
    </div>`);

  // Auto-compute total from subtotal + tax
  function autoTotal() {
    const s = parseFloat(document.getElementById('f-subtotal').value) || 0;
    const t = parseFloat(document.getElementById('f-tax').value) || 0;
    if (s || t) document.getElementById('f-total').value = (s + t).toFixed(2);
  }
  document.getElementById('f-subtotal').addEventListener('input', autoTotal);
  document.getElementById('f-tax').addEventListener('input', autoTotal);
};

window.saveEstimate = async function(id) {
  const sub = document.getElementById('f-subtotal').value;
  const tax = document.getElementById('f-tax').value;
  const tot = document.getElementById('f-total').value;
  const dto = {
    projectId: document.getElementById('f-projectId').value,
    status:    document.getElementById('f-status').value,
    subtotal:  sub ? parseFloat(sub) : undefined,
    tax:       tax ? parseFloat(tax) : undefined,
    total:     tot ? parseFloat(tot) : undefined,
    notes:     document.getElementById('f-notes').value.trim() || undefined,
  };
  if (!dto.projectId) { toast('Project is required', 'error'); return; }
  try {
    id ? await Api.patch(`/estimates/${id}`, dto) : await Api.post('/estimates', dto);
    toast(`Estimate ${id?'updated':'created'}`, 'success');
    Modal.close();
    await loadEstimatesTable();
  } catch (err) { toast(apiErr(err), 'error'); }
};

window.deleteEstimate = async function(id) {
  if (!confirm('Delete this estimate?')) return;
  try {
    await Api.delete(`/estimates/${id}`);
    toast('Estimate deleted', 'success');
    await loadEstimatesTable();
  } catch (err) { toast(apiErr(err), 'error'); }
};

// =====================================================
// INVOICES — schema: estimateId*(unique FK), clientId*, status(InvoiceStatus),
//   invoiceNumber?(unique), dueDate?, paidAt?, notes?
//   NOTE: Invoice has NO total field — total lives on the linked Estimate.
//         Only approved estimates should be invoiced.
// =====================================================
async function invoices(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <div class="page-eyebrow">Management</div>
        <div class="page-title">Invoices</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-accent" onclick="openInvoiceModal()">+ New Invoice</button>
      </div>
    </div>
    <div class="page-body">
      <div class="table-container">
        <div class="table-toolbar">
          <input type="text" class="table-search" id="inv-search" placeholder="Search client, invoice #, status…" oninput="filterInvoiceTable()" />
          <span id="inv-count" class="text-muted text-mono text-sm"></span>
        </div>
        <div id="invoices-table-body"><div class="page-loading"><div class="spinner"></div></div></div>
      </div>
    </div>`;
  await loadInvoicesTable();
}

async function loadInvoicesTable() {
  const body = document.getElementById('invoices-table-body');
  if (!body) return;
  try {
    const [data, clientList, estimateList] = await Promise.all([
      Api.get('/invoices'), Api.get('/clients'), Api.get('/estimates'),
    ]);
    window._invoicesData  = data;
    window._clientList    = clientList;
    window._estimateList  = estimateList;
    renderInvoicesTable(data);
  } catch (_) {
    body.innerHTML = `<div class="table-empty" style="color:var(--red)">Could not make a connection</div>`;
  }
}

function estimateForInvoice(estimateId) {
  return (window._estimateList||[]).find(e => e.id === estimateId);
}

function renderInvoicesTable(data) {
  const body = document.getElementById('invoices-table-body');
  if (!body) return;
  const cnt = document.getElementById('inv-count');
  if (cnt) cnt.textContent = data.length + ' invoices';
  body.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Invoice #</th><th>Client</th><th>Project</th><th>Status</th><th>Total (est.)</th><th>Due Date</th><th>Paid At</th><th>Actions</th></tr></thead>
      <tbody>
        ${!data.length ? `<tr><td colspan="8" class="table-empty">No invoices found</td></tr>` :
          data.map(inv => {
            const est = estimateForInvoice(inv.estimateId);
            return `
            <tr>
              <td class="mono">${escHtml(inv.invoiceNumber||'—')}</td>
              <td class="primary">${escHtml(clientName(inv.clientId))}</td>
              <td>${escHtml(est ? projectName(est.projectId) : '—')}</td>
              <td>${statusBadge(inv.status)}</td>
              <td class="mono" style="color:var(--accent)">${fmtCurrency(est?.total)}</td>
              <td class="mono">${fmtDate(inv.dueDate)}</td>
              <td class="mono">${fmtDate(inv.paidAt)}</td>
              <td>
                <div class="action-cell">
                  <button class="btn btn-ghost btn-sm" onclick="openInvoiceModal('${escHtml(inv.id)}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteInvoice('${escHtml(inv.id)}')">Del</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
      </tbody>
    </table>`;
}

function filterInvoiceTable() {
  const q = document.getElementById('inv-search')?.value.toLowerCase() || '';
  renderInvoicesTable((window._invoicesData||[]).filter(inv =>
    clientName(inv.clientId).toLowerCase().includes(q) ||
    (inv.invoiceNumber||'').toLowerCase().includes(q) ||
    (inv.status||'').toLowerCase().includes(q)
  ));
}

window.openInvoiceModal = async function(id) {
  let inv = null;
  if (id) { try { inv = await Api.get(`/invoices/${id}`); } catch (_) {} }
  const clients   = window._clientList   || await Api.get('/clients').catch(()=>[]);
  const estimates = window._estimateList || await Api.get('/estimates').catch(()=>[]);
  // Only show approved estimates (or the one already on this invoice)
  const eligible = estimates.filter(e => e.status === 'approved' || e.id === inv?.estimateId);

  const clOpts = clients.map(c =>
    `<option value="${escHtml(c.id)}" ${inv?.clientId===c.id?'selected':''}>${escHtml(c.name)}</option>`
  ).join('');
  const estOpts = `<option value="">— select approved estimate —</option>` + eligible.map(e =>
    `<option value="${escHtml(e.id)}" ${inv?.estimateId===e.id?'selected':''}>
      ${escHtml(projectName(e.projectId))} — ${fmtCurrency(e.total)}
    </option>`
  ).join('');
  const statusOpts = INVOICE_STATUSES.map(s =>
    `<option value="${s}" ${(inv?.status||'draft')===s?'selected':''}>${s}</option>`
  ).join('');

  Modal.open(inv ? 'Edit Invoice' : 'New Invoice', `
    <div class="form-grid form-grid-2">
      <div class="form-field">
        <label class="form-label">Client *</label>
        <select class="form-select" id="f-clientId"><option value="">— select —</option>${clOpts}</select>
      </div>
      <div class="form-field">
        <label class="form-label">Estimate (approved) *</label>
        <select class="form-select" id="f-estimateId">${estOpts}</select>
      </div>
      <div class="form-field">
        <label class="form-label">Status</label>
        <select class="form-select" id="f-status">${statusOpts}</select>
      </div>
      <div class="form-field">
        <label class="form-label">Invoice Number</label>
        <input class="form-input" id="f-invoiceNumber" value="${escHtml(inv?.invoiceNumber||'')}" placeholder="INV-0001" style="font-family:var(--font-mono)" />
      </div>
      <div class="form-field">
        <label class="form-label">Due Date</label>
        <input class="form-input" id="f-dueDate" type="date" value="${inv?.dueDate?.substring(0,10)||''}" />
      </div>
      <div class="form-field">
        <label class="form-label">Paid At</label>
        <input class="form-input" id="f-paidAt" type="date" value="${inv?.paidAt?.substring(0,10)||''}" />
      </div>
      <div class="form-field" style="grid-column:1/-1">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="f-notes" placeholder="Invoice notes…">${escHtml(inv?.notes||'')}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
      <button class="btn btn-accent" onclick="saveInvoice('${escHtml(id||'')}')">Save Invoice</button>
    </div>`);
};

window.saveInvoice = async function(id) {
  const dto = {
    clientId:      document.getElementById('f-clientId').value,
    estimateId:    document.getElementById('f-estimateId').value,
    status:        document.getElementById('f-status').value,
    invoiceNumber: document.getElementById('f-invoiceNumber').value.trim() || undefined,
    dueDate:       document.getElementById('f-dueDate').value  || undefined,
    paidAt:        document.getElementById('f-paidAt').value   || undefined,
    notes:         document.getElementById('f-notes').value.trim() || undefined,
  };
  if (!dto.clientId)   { toast('Client is required', 'error'); return; }
  if (!dto.estimateId) { toast('Estimate is required', 'error'); return; }
  try {
    id ? await Api.patch(`/invoices/${id}`, dto) : await Api.post('/invoices', dto);
    toast(`Invoice ${id?'updated':'created'}`, 'success');
    Modal.close();
    await loadInvoicesTable();
  } catch (err) { toast(apiErr(err), 'error'); }
};

window.deleteInvoice = async function(id) {
  if (!confirm('Delete this invoice?')) return;
  try {
    await Api.delete(`/invoices/${id}`);
    toast('Invoice deleted', 'success');
    await loadInvoicesTable();
  } catch (err) { toast(apiErr(err), 'error'); }
};

// =====================================================
// PIPELINE — GET /pipeline/pending → Conversation[]
//   GET /pipeline/conversations/:id → full detail
//   POST /pipeline/finalize   { conversationId, estimateId, subtotal, tax, total }
//   POST /pipeline/notify     { conversationId, phone, message }
//   POST /pipeline/estimates/:id/reject { reason }
//
// ConversationStatus: collecting_data | awaiting_internal_input | completed
// Conversations have messages (MessageRole: user | assistant | system)
// =====================================================
async function pipeline(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <div class="page-eyebrow">Operations</div>
        <div class="page-title">Pipeline Queue</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="navigate('pipeline')">↻ Refresh</button>
      </div>
    </div>
    <div class="page-body" id="pipeline-body">
      <div class="page-loading"><div class="spinner"></div></div>
    </div>`;
  await loadPipeline();
}

async function loadPipeline() {
  const body = document.getElementById('pipeline-body');
  if (!body) return;
  try {
    const data = await Api.get('/pipeline/pending');
    const badge = document.getElementById('pipeline-badge');
    if (badge) badge.textContent = data.length;

    if (!data.length) {
      body.innerHTML = `
        <div style="text-align:center;padding:60px 0">
          <div style="font-size:40px;margin-bottom:12px">✓</div>
          <div style="font-size:18px;font-weight:700;color:var(--text-primary);margin-bottom:6px">Queue is clear</div>
          <div class="text-muted text-mono text-sm">No conversations awaiting operator review</div>
        </div>`;
      return;
    }

    body.innerHTML = data.map(conv => `
      <div class="pipeline-card" onclick="viewConversation('${escHtml(conv.id)}')">
        <div class="pipeline-card-header">
          <div>
            <div class="pipeline-client-name">${escHtml(conv.client?.name||'Unknown Client')}</div>
            <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);margin-top:3px">${escHtml(conv.client?.phone||conv.phone||'')}</div>
          </div>
          ${statusBadge(conv.status)}
        </div>
        <div class="pipeline-card-meta">
          <span>📅 ${fmtDate(conv.updatedAt)}</span>
          ${conv.projects?.length  ? `<span>📁 ${conv.projects.length} project(s)</span>` : ''}
          ${conv.estimates?.length ? `<span>📄 ${conv.estimates.length} estimate(s)</span>` : ''}
        </div>
      </div>`).join('');
  } catch (_) {
    body.innerHTML = `<div class="page-loading" style="color:var(--red)">Could not make a connection</div>`;
  }
}

window.viewConversation = async function(id) {
  const container = document.getElementById('pipeline-body');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;
  try {
    const detail = await Api.get(`/pipeline/conversations/${id}`);

    // Messages: role = user | assistant | system
    const messages = (detail.messages||[]).map(m => `
      <div class="conv-msg ${m.role==='assistant'?'assistant':m.role==='system'?'system':''}">
        <div class="conv-msg-meta">${escHtml(m.role?.toUpperCase())} · ${fmtDate(m.createdAt)}</div>
        <div class="conv-msg-body">${escHtml(m.content)}</div>
      </div>`).join('');

    // Projects — show 3D printing details
    const projRows = (detail.projects||[]).map(p => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg-elevated);border-radius:var(--radius-sm);margin-bottom:6px;gap:12px">
        <div>
          <div style="font-weight:600">${escHtml(p.name)}</div>
          ${p.description ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">${escHtml(p.description)}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;flex-shrink:0">
          ${p.material   ? `<span class="badge badge-muted">${escHtml(p.material)}</span>` : ''}
          ${p.quality    ? `<span class="badge badge-muted">${escHtml(p.quality)}</span>`  : ''}
          ${p.printHours ? `<span class="badge badge-muted">${p.printHours}h</span>` : ''}
          ${p.weightGrams? `<span class="badge badge-muted">${p.weightGrams}g</span>` : ''}
          ${statusBadge(p.status)}
        </div>
      </div>`).join('');

    // Estimates — subtotal / tax / total breakdown
    const estRows = (detail.estimates||[]).map(est => `
      <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:12px">
          <div>
            <div style="font-weight:600;margin-bottom:4px">${escHtml(projectName(est.projectId))}</div>
            <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">
              Subtotal: ${fmtCurrency(est.subtotal)} &nbsp;·&nbsp;
              Tax: ${fmtCurrency(est.tax)} &nbsp;·&nbsp;
              <span style="color:var(--accent)">Total: ${fmtCurrency(est.total)}</span>
            </div>
          </div>
          ${statusBadge(est.status)}
        </div>
        ${est.notes ? `<p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${escHtml(est.notes)}</p>` : ''}
        ${est.status !== 'approved' && est.status !== 'rejected' ? `
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-success btn-sm" onclick="openFinalizeModal('${escHtml(id)}','${escHtml(est.id)}',${est.subtotal||0},${est.tax||0})">
              ✓ Finalize &amp; Approve
            </button>
            <button class="btn btn-danger btn-sm" onclick="rejectEstimate('${escHtml(est.id)}','${escHtml(id)}')">
              ✕ Reject
            </button>
          </div>` : ''}
      </div>`).join('');

    container.innerHTML = `
      <div class="fullpage-back" onclick="loadPipeline()">← Back to Queue</div>
      <div class="detail-section">
        <div class="detail-section-title">Client</div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-item-label">Name</div><div class="detail-item-value">${escHtml(detail.client?.name||'—')}</div></div>
          <div class="detail-item"><div class="detail-item-label">Phone</div><div class="detail-item-value" style="font-family:var(--font-mono)">${escHtml(detail.client?.phone||'—')}</div></div>
          <div class="detail-item"><div class="detail-item-label">Company</div><div class="detail-item-value">${escHtml(detail.client?.company||'—')}</div></div>
          <div class="detail-item"><div class="detail-item-label">Conversation</div><div>${statusBadge(detail.status)}</div></div>
        </div>
      </div>

      ${projRows ? `<div class="detail-section"><div class="detail-section-title">Projects</div>${projRows}</div>` : ''}

      <div class="detail-section">
        <div class="detail-section-title">Conversation History</div>
        <div class="conv-messages">${messages||'<div style="color:var(--text-muted);font-family:var(--font-mono);font-size:12px;padding:8px">No messages</div>'}</div>
      </div>

      ${estRows ? `<div class="detail-section"><div class="detail-section-title">Estimates</div>${estRows}</div>` : ''}

      <div style="display:flex;gap:10px;flex-wrap:wrap;padding-top:8px">
        <button class="btn btn-accent" onclick="openNotifyModal('${escHtml(id)}','${escHtml(detail.client?.phone||'')}')">
          📱 Notify Client via WhatsApp
        </button>
        <button class="btn btn-ghost" onclick="loadPipeline()">← Back</button>
      </div>`;
  } catch (_) {
    container.innerHTML = `<div class="page-loading" style="color:var(--red)">Could not make a connection</div>`;
  }
};

// Finalize modal — operator fills in subtotal/tax/total before approving
window.openFinalizeModal = function(convId, estimateId, curSubtotal, curTax) {
  Modal.open('Finalize Estimate', `
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
      Set final pricing. This will mark the estimate as <strong>approved</strong> and trigger invoice creation.
    </p>
    <div class="form-grid form-grid-2">
      <div class="form-field">
        <label class="form-label">Subtotal *</label>
        <input class="form-input" id="ff-subtotal" type="number" step="0.01" min="0" value="${curSubtotal||''}" placeholder="0.00" />
      </div>
      <div class="form-field">
        <label class="form-label">Tax</label>
        <input class="form-input" id="ff-tax" type="number" step="0.01" min="0" value="${curTax||''}" placeholder="0.00" />
      </div>
      <div class="form-field" style="grid-column:1/-1">
        <label class="form-label">Total *</label>
        <input class="form-input" id="ff-total" type="number" step="0.01" min="0" placeholder="0.00" />
        <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);margin-top:3px">Auto-computed from Subtotal + Tax</div>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
      <button class="btn btn-success" onclick="submitFinalize('${escHtml(convId)}','${escHtml(estimateId)}')">
        ✓ Approve &amp; Finalize
      </button>
    </div>`);

  function autoTotal() {
    const s = parseFloat(document.getElementById('ff-subtotal').value) || 0;
    const t = parseFloat(document.getElementById('ff-tax').value) || 0;
    document.getElementById('ff-total').value = (s + t).toFixed(2);
  }
  document.getElementById('ff-subtotal').addEventListener('input', autoTotal);
  document.getElementById('ff-tax').addEventListener('input', autoTotal);
  autoTotal();
};

window.submitFinalize = async function(convId, estimateId) {
  const subtotal = parseFloat(document.getElementById('ff-subtotal').value);
  const tax      = parseFloat(document.getElementById('ff-tax').value) || 0;
  const total    = parseFloat(document.getElementById('ff-total').value);
  if (!subtotal || isNaN(subtotal)) { toast('Subtotal is required', 'error'); return; }
  if (!total    || isNaN(total))    { toast('Total is required', 'error'); return; }
  try {
    await Api.post('/pipeline/finalize', { conversationId: convId, estimateId, subtotal, tax, total });
    toast('Estimate approved & finalized ✓', 'success');
    Modal.close();
    await viewConversation(convId);
  } catch (err) { toast(apiErr(err), 'error'); }
};

window.rejectEstimate = async function(estimateId, convId) {
  Modal.open('Reject Estimate', `
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Provide a reason — this will be stored with the estimate.</p>
    <div class="form-field">
      <label class="form-label">Reason *</label>
      <textarea class="form-textarea" id="rej-reason" placeholder="e.g. Material not available, price out of range…"></textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
      <button class="btn btn-danger" onclick="submitReject('${escHtml(estimateId)}','${escHtml(convId)}')">Confirm Rejection</button>
    </div>`);
};

window.submitReject = async function(estimateId, convId) {
  const reason = document.getElementById('rej-reason').value.trim();
  if (!reason) { toast('Reason is required', 'error'); return; }
  try {
    await Api.post(`/pipeline/estimates/${estimateId}/reject`, { reason });
    toast('Estimate rejected', 'success');
    Modal.close();
    await viewConversation(convId);
  } catch (err) { toast(apiErr(err), 'error'); }
};

window.openNotifyModal = function(convId, phone) {
  Modal.open('Notify Client via WhatsApp', `
    <div class="form-grid">
      <div class="form-field">
        <label class="form-label">Phone Number</label>
        <input class="form-input" id="notif-phone" value="${escHtml(phone)}" style="font-family:var(--font-mono)" />
      </div>
      <div class="form-field">
        <label class="form-label">Message *</label>
        <textarea class="form-textarea" id="notif-msg" style="min-height:100px" placeholder="Message to send…"></textarea>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('notif-msg').value='Hi! Your 3D print quote is ready. Please let us know if you have any questions.'">Quote Ready</button>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('notif-msg').value='Your print job is complete and ready for pickup/delivery. Thank you for choosing Protobud!'">Job Done</button>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
      <button class="btn btn-accent" onclick="submitNotify('${escHtml(convId)}')">Send Message</button>
    </div>`);
};

window.submitNotify = async function(convId) {
  const phone   = document.getElementById('notif-phone').value.trim();
  const message = document.getElementById('notif-msg').value.trim();
  if (!message) { toast('Message is required', 'error'); return; }
  try {
    await Api.post('/pipeline/notify', { conversationId: convId, phone, message });
    toast('Client notified ✓', 'success');
    Modal.close();
  } catch (err) { toast(apiErr(err), 'error'); }
};

// =====================================================
// WHATSAPP MONITOR — GET /whatsapp/health, GET /health
// =====================================================
async function whatsapp(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <div class="page-eyebrow">System</div>
        <div class="page-title">WhatsApp Monitor</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="refreshWaStatus()">↻ Refresh</button>
      </div>
    </div>
    <div class="page-body">
      <div class="monitor-grid">
        <div class="monitor-card">
          <div class="monitor-card-title">Bot Connection</div>
          <div class="status-indicator">
            <div class="status-big-dot" id="wa-big-dot"></div>
            <div class="status-label" id="wa-status-label">Checking…</div>
          </div>
          <div style="margin-top:12px" id="wa-meta"></div>
        </div>
        <div class="monitor-card">
          <div class="monitor-card-title">Backend Health</div>
          <div class="status-indicator">
            <div class="status-big-dot" id="backend-big-dot"></div>
            <div class="status-label" id="backend-status-label">Checking…</div>
          </div>
          <div style="margin-top:12px" id="backend-meta"></div>
        </div>
      </div>
      <div style="margin-bottom:20px">
        <div class="detail-section-title">Activity Log</div>
        <div class="log-box" id="activity-log"><div class="log-line">System initialized…</div></div>
      </div>
      <div>
        <div class="detail-section-title">Quick Actions</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-ghost" onclick="navigate('send-message')">📤 Send Message</button>
          <button class="btn btn-ghost" onclick="navigate('pipeline')">📋 View Pipeline</button>
        </div>
      </div>
    </div>`;

  await refreshWaStatus();
  const t = setInterval(refreshWaStatus, 15_000);
  state.refreshTimers.push(t);
}

window.refreshWaStatus = async function() {
  const log = document.getElementById('activity-log');
  function logLine(msg, type='') {
    if (!log) return;
    const el = document.createElement('div');
    el.className = `log-line ${type}`;
    el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    while (log.children.length > 50) log.removeChild(log.firstChild);
  }

  try {
    const wa = await Api.get('/whatsapp/health');
    const ok = wa?.connected;
    const dot = document.getElementById('wa-big-dot');
    const lbl = document.getElementById('wa-status-label');
    const meta = document.getElementById('wa-meta');
    const navDot = document.getElementById('wa-status-dot');
    if (dot)    dot.className = `status-big-dot ${ok?'online':'offline'}`;
    if (lbl)  { lbl.textContent = ok ? 'Connected' : 'Disconnected'; lbl.style.color = ok ? 'var(--green)' : 'var(--red)'; }
    if (meta)   meta.innerHTML = `<span class="text-muted text-mono text-sm">Last check: ${new Date().toLocaleTimeString()}</span>`;
    if (navDot) navDot.className = `status-dot ${ok?'online':'offline'}`;
    logLine(`WhatsApp bot: ${ok?'CONNECTED':'DISCONNECTED'}`, ok?'':'err');
  } catch (_) {
    logLine('Could not make a connection — WhatsApp bot unreachable', 'err');
    const dot = document.getElementById('wa-big-dot');
    const lbl = document.getElementById('wa-status-label');
    if (dot) dot.className = 'status-big-dot offline';
    if (lbl) { lbl.textContent = 'Unreachable'; lbl.style.color = 'var(--red)'; }
  }

  try {
    const health = await Api.get('/health');
    const dot = document.getElementById('backend-big-dot');
    const lbl = document.getElementById('backend-status-label');
    const meta = document.getElementById('backend-meta');
    if (dot)  dot.className = 'status-big-dot online';
    if (lbl)  { lbl.textContent = 'Healthy'; lbl.style.color = 'var(--green)'; }
    if (meta) meta.innerHTML = `<span class="text-muted text-mono text-sm">${escHtml(health?.timestamp||'')}</span>`;
    logLine('Backend health: OK');
  } catch (_) {
    logLine('Could not make a connection — backend unreachable', 'err');
    const dot = document.getElementById('backend-big-dot');
    const lbl = document.getElementById('backend-status-label');
    if (dot) dot.className = 'status-big-dot offline';
    if (lbl) { lbl.textContent = 'Unreachable'; lbl.style.color = 'var(--red)'; }
  }
};

// =====================================================
// SEND MESSAGE — POST /whatsapp/send { phone, message }
// =====================================================
async function sendMessage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <div class="page-eyebrow">System</div>
        <div class="page-title">Send Message</div>
      </div>
    </div>
    <div class="page-body">
      <div class="send-box">
        <div class="form-grid">
          <div class="form-field">
            <label class="form-label">Select Client (auto-fill phone)</label>
            <select class="form-select" id="sm-client" onchange="fillPhoneFromClient()">
              <option value="">— or enter phone manually —</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">WhatsApp Number *</label>
            <input class="form-input" id="sm-phone" placeholder="e.g. 5971234567" style="font-family:var(--font-mono)" />
          </div>
          <div class="form-field" style="grid-column:1/-1">
            <label class="form-label">Message *</label>
            <textarea class="form-textarea" id="sm-message" style="min-height:120px" placeholder="Type your message…"></textarea>
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:4px">
              <span id="sm-char-count">0</span> / 4000 characters
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-accent" id="sm-send-btn" onclick="doSendMessage()">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2L9 14l-2-5-5-2 12-5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Send via WhatsApp
          </button>
        </div>
      </div>
      <div style="margin-top:24px">
        <div class="detail-section-title">Message Templates</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${[
            ['Quote Ready',    'Hi! Your 3D print quote is ready. Please let us know if you have any questions.'],
            ['Follow Up',      'Hi! Just following up on your inquiry with Protobud. Are you still interested in our 3D printing services?'],
            ['Print Complete', 'Great news! Your 3D print job is complete and ready for pickup/delivery. Thank you for choosing Protobud!'],
            ['Invoice Sent',   'Your invoice has been sent. Please review at your earliest convenience. Thank you!'],
          ].map(([lbl, txt]) =>
            `<button class="btn btn-ghost btn-sm" onclick="useTemplate(${JSON.stringify(txt)})">${lbl}</button>`
          ).join('')}
        </div>
      </div>
    </div>`;

  try {
    const clients = await Api.get('/clients');
    const sel = document.getElementById('sm-client');
    if (sel) clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.phone || '';
      opt.textContent = `${c.name}${c.phone ? ' · ' + c.phone : ''}`;
      sel.appendChild(opt);
    });
  } catch (_) {}

  document.getElementById('sm-message')?.addEventListener('input', function() {
    const cnt = document.getElementById('sm-char-count');
    if (cnt) cnt.textContent = this.value.length;
  });
}

window.fillPhoneFromClient = function() {
  const sel = document.getElementById('sm-client');
  const inp = document.getElementById('sm-phone');
  if (sel?.value) inp.value = sel.value;
};

window.useTemplate = function(text) {
  const ta = document.getElementById('sm-message');
  if (ta) {
    ta.value = text;
    const cnt = document.getElementById('sm-char-count');
    if (cnt) cnt.textContent = text.length;
  }
};

window.doSendMessage = async function() {
  const phone   = document.getElementById('sm-phone').value.trim();
  const message = document.getElementById('sm-message').value.trim();
  if (!phone)   { toast('Phone number is required', 'error'); return; }
  if (!message) { toast('Message is required', 'error'); return; }

  const btn = document.getElementById('sm-send-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Sending…';

  try {
    await Api.post('/whatsapp/send', { phone, message });
    toast('Message sent successfully ✓', 'success');
    document.getElementById('sm-message').value = '';
    const cnt = document.getElementById('sm-char-count');
    if (cnt) cnt.textContent = '0';
  } catch (err) {
    toast(apiErr(err), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2L9 14l-2-5-5-2 12-5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Send via WhatsApp`;
  }
};