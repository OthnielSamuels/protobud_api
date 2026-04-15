'use strict';

// =====================================================
// CONFIG
// =====================================================
const CONFIG = {
  CREDENTIALS: { username: 'operator', password: 'ops2024!' },
  API_BASE: window.API_BASE || '',
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
      // Network failures, DNS errors, refused connections
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error('Could not make a connection');
      }
      throw err;
    }
  },
  get: (path)           => Api.request('GET',    path),
  post: (path, body)    => Api.request('POST',   path, body),
  patch: (path, body)   => Api.request('PATCH',  path, body),
  delete: (path)        => Api.request('DELETE', path),
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
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmt(v) { return v ?? '—'; }

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtCurrency(v) {
  if (v == null) return '—';
  return '$' + Number(v).toFixed(2);
}

function statusBadge(status) {
  const map = {
    active:    'badge-green',
    completed: 'badge-blue',
    pending:   'badge-accent',
    rejected:  'badge-red',
    draft:     'badge-muted',
    approved:  'badge-green',
    sent:      'badge-blue',
    paid:      'badge-green',
    overdue:   'badge-red',
    awaiting_operator: 'badge-accent',
    awaiting_client:   'badge-blue',
    new:       'badge-purple',
  };
  const cls = map[(status||'').toLowerCase()] || 'badge-muted';
  return `<span class="badge ${cls}">${escHtml(status||'unknown')}</span>`;
}

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
  // Login button
  document.getElementById('login-btn').addEventListener('click', doLogin);
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  // Modal close
  document.getElementById('modal-close').addEventListener('click', Modal.close);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') Modal.close();
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    Auth.logout();
    showLogin();
  });

  if (Auth.isLoggedIn()) {
    showApp();
  } else {
    showLogin();
  }
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
// PIPELINE BADGE POLL
// =====================================================
async function pollPipelineBadge() {
  try {
    const data = await Api.get('/pipeline/pending');
    const badge = document.getElementById('pipeline-badge');
    if (badge) badge.textContent = (data || []).length;
  } catch (_) {}
  setTimeout(pollPipelineBadge, 30_000);
}

async function pollWaStatus() {
  try {
    const data = await Api.get('/whatsapp/health');
    const dot = document.getElementById('wa-status-dot');
    if (dot) {
      dot.className = 'status-dot ' + (data?.connected ? 'online' : 'offline');
    }
  } catch (_) {}
  setTimeout(pollWaStatus, 15_000);
}

// =====================================================
// PAGE RENDERER
// =====================================================
function renderPage(page) {
  const container = document.getElementById('page-container');
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div> Loading…</div>`;

  const pages = {
    dashboard,
    clients,
    projects,
    estimates,
    invoices,
    pipeline,
    whatsapp,
    'send-message': sendMessage,
  };

  const fn = pages[page];
  if (fn) {
    fn(container);
  } else {
    container.innerHTML = `<div class="page-loading" style="color:var(--red)">Could not make a connection</div>`;
  }
}

// =====================================================
// DASHBOARD PAGE
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
    const [clients, projects, estimates, invoices, pipeline, waHealth] = await Promise.allSettled([
      Api.get('/clients'),
      Api.get('/projects'),
      Api.get('/estimates'),
      Api.get('/invoices'),
      Api.get('/pipeline/pending'),
      Api.get('/whatsapp/health'),
    ]);

    const c  = clients.value  || [];
    const p  = projects.value || [];
    const e  = estimates.value || [];
    const inv = invoices.value || [];
    const pipe = pipeline.value || [];
    const wa   = waHealth.value;

    const activeProjects   = p.filter(x => x.status !== 'completed');
    const pendingEstimates = e.filter(x => x.status === 'pending' || x.status === 'awaiting_operator');
    const unpaidInvoices   = inv.filter(x => x.status !== 'paid');
    const unpaidTotal      = unpaidInvoices.reduce((s,x) => s + (Number(x.total)||0), 0);

    document.getElementById('dash-refresh-time').textContent =
      'Updated ' + new Date().toLocaleTimeString();

    document.getElementById('dash-content').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Clients</div>
          <div class="stat-value blue">${c.length}</div>
          <div class="stat-sub">registered</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Active Projects</div>
          <div class="stat-value accent">${activeProjects.length}</div>
          <div class="stat-sub">of ${p.length} total</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pipeline Queue</div>
          <div class="stat-value ${pipe.length > 0 ? 'accent' : 'green'}">${pipe.length}</div>
          <div class="stat-sub">awaiting review</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pending Estimates</div>
          <div class="stat-value">${pendingEstimates.length}</div>
          <div class="stat-sub">to process</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Outstanding</div>
          <div class="stat-value ${unpaidTotal > 0 ? 'red' : 'green'}">${fmtCurrency(unpaidTotal)}</div>
          <div class="stat-sub">${unpaidInvoices.length} unpaid invoices</div>
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
              <thead><tr><th>Name</th><th>Phone</th><th>Since</th></tr></thead>
              <tbody>
                ${c.slice(-5).reverse().map(cl => `
                  <tr style="cursor:pointer" onclick="navigate('clients')">
                    <td class="primary">${escHtml(cl.name)}</td>
                    <td class="mono">${escHtml(cl.phone)}</td>
                    <td class="mono">${fmtDate(cl.createdAt)}</td>
                  </tr>`).join('') || `<tr><td colspan="3" class="table-empty">No clients yet</td></tr>`}
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
                    <td class="primary">${escHtml(conv.client?.name || conv.clientId)}</td>
                    <td>${statusBadge(conv.status)}</td>
                    <td class="mono">${fmtDate(conv.updatedAt)}</td>
                  </tr>`).join('') || `<tr><td colspan="3" class="table-empty">Queue is clear ✓</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    document.getElementById('dash-content').innerHTML =
      `<div class="page-loading" style="color:var(--red)">Could not make a connection</div>`;
  }
}

// =====================================================
// CLIENTS PAGE
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
          <input type="text" class="table-search" id="client-search" placeholder="Search clients…" oninput="filterClientTable()" />
          <span id="client-count" class="text-muted text-mono text-sm"></span>
        </div>
        <div id="clients-table-body">
          <div class="page-loading"><div class="spinner"></div></div>
        </div>
      </div>
    </div>`;

  await loadClientsTable();
}

async function loadClientsTable() {
  const body = document.getElementById('clients-table-body');
  if (!body) return;
  try {
    const data = await Api.get('/clients');
    window._clientsData = data;
    renderClientsTable(data);
  } catch (err) {
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
      <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody>
        ${data.length === 0 ? `<tr><td colspan="5" class="table-empty">No clients found</td></tr>` :
          data.map(cl => `
            <tr>
              <td class="primary">${escHtml(cl.name)}</td>
              <td class="mono">${escHtml(cl.phone || '—')}</td>
              <td>${escHtml(cl.email || '—')}</td>
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
  const filtered = (window._clientsData || []).filter(c =>
    (c.name||'').toLowerCase().includes(q) ||
    (c.phone||'').toLowerCase().includes(q) ||
    (c.email||'').toLowerCase().includes(q)
  );
  renderClientsTable(filtered);
}

window.openClientModal = async function(id) {
  let client = null;
  if (id) {
    try { client = await Api.get(`/clients/${id}`); } catch (_) {}
  }
  const title = client ? 'Edit Client' : 'New Client';
  Modal.open(title, `
    <div class="form-grid">
      <div class="form-field">
        <label class="form-label">Name *</label>
        <input class="form-input" id="f-name" value="${escHtml(client?.name||'')}" placeholder="Full name" />
      </div>
      <div class="form-field">
        <label class="form-label">Phone</label>
        <input class="form-input" id="f-phone" value="${escHtml(client?.phone||'')}" placeholder="e.g. 5971234567" />
      </div>
      <div class="form-field">
        <label class="form-label">Email</label>
        <input class="form-input" id="f-email" value="${escHtml(client?.email||'')}" placeholder="email@example.com" />
      </div>
      <div class="form-field">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="f-notes" placeholder="Optional notes">${escHtml(client?.notes||'')}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
      <button class="btn btn-accent" onclick="saveClient('${escHtml(id||'')}')">Save Client</button>
    </div>`);
};

window.saveClient = async function(id) {
  const body = {
    name:  document.getElementById('f-name').value.trim(),
    phone: document.getElementById('f-phone').value.trim(),
    email: document.getElementById('f-email').value.trim(),
    notes: document.getElementById('f-notes').value.trim(),
  };
  if (!body.name) { toast('Name is required', 'error'); return; }
  try {
    if (id) {
      await Api.patch(`/clients/${id}`, body);
      toast('Client updated', 'success');
    } else {
      await Api.post('/clients', body);
      toast('Client created', 'success');
    }
    Modal.close();
    await loadClientsTable();
  } catch (err) { toast(err.message === 'Could not make a connection' ? 'Could not make a connection' : 'Operation failed — please try again', 'error'); }
};

window.deleteClient = async function(id, name) {
  if (!confirm(`Delete client "${name}"? This may affect related data.`)) return;
  try {
    await Api.delete(`/clients/${id}`);
    toast('Client deleted', 'success');
    await loadClientsTable();
  } catch (err) { toast(err.message === 'Could not make a connection' ? 'Could not make a connection' : 'Operation failed — please try again', 'error'); }
};

// =====================================================
// PROJECTS PAGE
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
          <input type="text" class="table-search" id="proj-search" placeholder="Search projects…" oninput="filterProjectTable()" />
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
    renderProjectsTable(data, clientList);
  } catch (err) {
    body.innerHTML = `<div class="table-empty" style="color:var(--red)">Could not make a connection</div>`;
  }
}

function clientName(id) {
  return (window._clientList || []).find(c => c.id === id)?.name || id;
}

function renderProjectsTable(data, clients) {
  const body = document.getElementById('projects-table-body');
  if (!body) return;
  const cnt = document.getElementById('proj-count');
  if (cnt) cnt.textContent = data.length + ' projects';
  body.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Title</th><th>Client</th><th>Status</th><th>Description</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody>
        ${data.length === 0 ? `<tr><td colspan="6" class="table-empty">No projects found</td></tr>` :
          data.map(p => `
            <tr>
              <td class="primary">${escHtml(p.title||p.name||'Untitled')}</td>
              <td>${escHtml(clientName(p.clientId))}</td>
              <td>${statusBadge(p.status)}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(p.description||'—')}</td>
              <td class="mono">${fmtDate(p.createdAt)}</td>
              <td>
                <div class="action-cell">
                  <button class="btn btn-ghost btn-sm" onclick="openProjectModal('${escHtml(p.id)}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteProject('${escHtml(p.id)}','${escHtml(p.title||p.name||'')}')">Del</button>
                </div>
              </td>
            </tr>`).join('')}
      </tbody>
    </table>`;
}

function filterProjectTable() {
  const q = document.getElementById('proj-search')?.value.toLowerCase() || '';
  const filtered = (window._projectsData || []).filter(p =>
    (p.title||p.name||'').toLowerCase().includes(q) ||
    clientName(p.clientId).toLowerCase().includes(q)
  );
  renderProjectsTable(filtered, window._clientList || []);
}

window.openProjectModal = async function(id) {
  let proj = null;
  if (id) {
    try { proj = await Api.get(`/projects/${id}`); } catch (_) {}
  }
  const clients = window._clientList || await Api.get('/clients').catch(() => []);
  const clientOptions = clients.map(c =>
    `<option value="${escHtml(c.id)}" ${proj?.clientId===c.id?'selected':''}>${escHtml(c.name)}</option>`
  ).join('');
  const statuses = ['pending','active','completed','on_hold'];
  const statusOptions = statuses.map(s =>
    `<option value="${s}" ${proj?.status===s?'selected':''}>${s}</option>`
  ).join('');

  Modal.open(proj ? 'Edit Project' : 'New Project', `
    <div class="form-grid">
      <div class="form-field">
        <label class="form-label">Title *</label>
        <input class="form-input" id="f-title" value="${escHtml(proj?.title||proj?.name||'')}" placeholder="Project title" />
      </div>
      <div class="form-field">
        <label class="form-label">Client *</label>
        <select class="form-select" id="f-clientId"><option value="">— select —</option>${clientOptions}</select>
      </div>
      <div class="form-field">
        <label class="form-label">Status</label>
        <select class="form-select" id="f-status">${statusOptions}</select>
      </div>
      <div class="form-field" style="grid-column:1/-1">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="f-description" placeholder="Project details…">${escHtml(proj?.description||'')}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
      <button class="btn btn-accent" onclick="saveProject('${escHtml(id||'')}')">Save Project</button>
    </div>`);
};

window.saveProject = async function(id) {
  const body = {
    title:       document.getElementById('f-title').value.trim(),
    clientId:    document.getElementById('f-clientId').value,
    status:      document.getElementById('f-status').value,
    description: document.getElementById('f-description').value.trim(),
  };
  if (!body.title)    { toast('Title is required', 'error'); return; }
  if (!body.clientId) { toast('Client is required', 'error'); return; }
  try {
    if (id) {
      await Api.patch(`/projects/${id}`, body);
      toast('Project updated', 'success');
    } else {
      await Api.post('/projects', body);
      toast('Project created', 'success');
    }
    Modal.close();
    await loadProjectsTable();
  } catch (err) { toast(err.message === 'Could not make a connection' ? 'Could not make a connection' : 'Operation failed — please try again', 'error'); }
};

window.deleteProject = async function(id, name) {
  if (!confirm(`Delete project "${name}"?`)) return;
  try {
    await Api.delete(`/projects/${id}`);
    toast('Project deleted', 'success');
    await loadProjectsTable();
  } catch (err) { toast(err.message === 'Could not make a connection' ? 'Could not make a connection' : 'Operation failed — please try again', 'error'); }
};

// =====================================================
// ESTIMATES PAGE
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
          <input type="text" class="table-search" id="est-search" placeholder="Search estimates…" oninput="filterEstimateTable()" />
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
    const [data, projects] = await Promise.all([Api.get('/estimates'), Api.get('/projects')]);
    window._estimatesData = data;
    window._projectList   = projects;
    renderEstimatesTable(data);
  } catch (err) {
    body.innerHTML = `<div class="table-empty" style="color:var(--red)">Could not make a connection</div>`;
  }
}

function projectName(id) {
  return (window._projectList || []).find(p => p.id === id)?.title ||
         (window._projectList || []).find(p => p.id === id)?.name || id;
}

function renderEstimatesTable(data) {
  const body = document.getElementById('estimates-table-body');
  if (!body) return;
  const cnt = document.getElementById('est-count');
  if (cnt) cnt.textContent = data.length + ' estimates';
  body.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Project</th><th>Status</th><th>Total</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody>
        ${data.length === 0 ? `<tr><td colspan="5" class="table-empty">No estimates found</td></tr>` :
          data.map(e => `
            <tr>
              <td class="primary">${escHtml(projectName(e.projectId))}</td>
              <td>${statusBadge(e.status)}</td>
              <td class="mono">${fmtCurrency(e.total)}</td>
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
  const filtered = (window._estimatesData || []).filter(e =>
    projectName(e.projectId).toLowerCase().includes(q) ||
    (e.status||'').toLowerCase().includes(q)
  );
  renderEstimatesTable(filtered);
}

window.viewEstimate = async function(id) {
  try {
    const est = await Api.get(`/estimates/${id}`);
    const items = (est.items || []).map(item => `
      <tr>
        <td>${escHtml(item.description)}</td>
        <td class="mono">${fmtCurrency(item.unitPrice)}</td>
        <td class="mono">${item.quantity}</td>
        <td class="mono">${fmtCurrency(item.total)}</td>
      </tr>`).join('');
    Modal.open(`Estimate — ${projectName(est.projectId)}`, `
      <div class="detail-grid" style="margin-bottom:16px">
        <div class="detail-item"><div class="detail-item-label">Status</div><div>${statusBadge(est.status)}</div></div>
        <div class="detail-item"><div class="detail-item-label">Total</div><div class="detail-item-value" style="color:var(--accent);font-size:20px;font-weight:700">${fmtCurrency(est.total)}</div></div>
        <div class="detail-item"><div class="detail-item-label">Created</div><div class="detail-item-value">${fmtDate(est.createdAt)}</div></div>
      </div>
      ${est.notes ? `<div style="margin-bottom:16px;font-size:13px;color:var(--text-secondary)">${escHtml(est.notes)}</div>` : ''}
      <table class="estimate-items-table">
        <thead><tr><th>Description</th><th>Unit Price</th><th>Qty</th><th>Total</th></tr></thead>
        <tbody>${items || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:12px">No line items</td></tr>'}</tbody>
      </table>
      <div class="form-actions"><button class="btn btn-ghost" onclick="Modal.close()">Close</button></div>`);
  } catch (err) { toast(err.message === 'Could not make a connection' ? 'Could not make a connection' : 'Operation failed — please try again', 'error'); }
};

window.openEstimateModal = async function(id) {
  let est = null;
  if (id) { try { est = await Api.get(`/estimates/${id}`); } catch (_) {} }
  const projects = window._projectList || await Api.get('/projects').catch(() => []);
  const projOptions = projects.map(p =>
    `<option value="${escHtml(p.id)}" ${est?.projectId===p.id?'selected':''}>${escHtml(p.title||p.name)}</option>`
  ).join('');
  const statuses = ['pending','approved','rejected','draft'];
  const sOpts = statuses.map(s => `<option value="${s}" ${est?.status===s?'selected':''}>${s}</option>`).join('');

  Modal.open(est ? 'Edit Estimate' : 'New Estimate', `
    <div class="form-grid">
      <div class="form-field">
        <label class="form-label">Project *</label>
        <select class="form-select" id="f-projectId"><option value="">— select —</option>${projOptions}</select>
      </div>
      <div class="form-field">
        <label class="form-label">Status</label>
        <select class="form-select" id="f-status">${sOpts}</select>
      </div>
      <div class="form-field">
        <label class="form-label">Total</label>
        <input class="form-input" id="f-total" type="number" step="0.01" value="${est?.total||''}" placeholder="0.00" />
      </div>
      <div class="form-field" style="grid-column:1/-1">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="f-notes" placeholder="Estimate notes…">${escHtml(est?.notes||'')}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
      <button class="btn btn-accent" onclick="saveEstimate('${escHtml(id||'')}')">Save Estimate</button>
    </div>`);
};

window.saveEstimate = async function(id) {
  const body = {
    projectId: document.getElementById('f-projectId').value,
    status:    document.getElementById('f-status').value,
    total:     parseFloat(document.getElementById('f-total').value) || 0,
    notes:     document.getElementById('f-notes').value.trim(),
  };
  if (!body.projectId) { toast('Project is required', 'error'); return; }
  try {
    if (id) {
      await Api.patch(`/estimates/${id}`, body);
      toast('Estimate updated', 'success');
    } else {
      await Api.post('/estimates', body);
      toast('Estimate created', 'success');
    }
    Modal.close();
    await loadEstimatesTable();
  } catch (err) { toast(err.message === 'Could not make a connection' ? 'Could not make a connection' : 'Operation failed — please try again', 'error'); }
};

window.deleteEstimate = async function(id) {
  if (!confirm('Delete this estimate?')) return;
  try {
    await Api.delete(`/estimates/${id}`);
    toast('Estimate deleted', 'success');
    await loadEstimatesTable();
  } catch (err) { toast(err.message === 'Could not make a connection' ? 'Could not make a connection' : 'Operation failed — please try again', 'error'); }
};

// =====================================================
// INVOICES PAGE
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
          <input type="text" class="table-search" id="inv-search" placeholder="Search invoices…" oninput="filterInvoiceTable()" />
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
    const [data, clients] = await Promise.all([Api.get('/invoices'), Api.get('/clients')]);
    window._invoicesData = data;
    window._clientList = clients;
    renderInvoicesTable(data);
  } catch (err) {
    body.innerHTML = `<div class="table-empty" style="color:var(--red)">Could not make a connection</div>`;
  }
}

function renderInvoicesTable(data) {
  const body = document.getElementById('invoices-table-body');
  if (!body) return;
  const cnt = document.getElementById('inv-count');
  if (cnt) cnt.textContent = data.length + ' invoices';
  body.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Client</th><th>Status</th><th>Total</th><th>Due Date</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody>
        ${data.length === 0 ? `<tr><td colspan="6" class="table-empty">No invoices found</td></tr>` :
          data.map(inv => `
            <tr>
              <td class="primary">${escHtml(clientName(inv.clientId))}</td>
              <td>${statusBadge(inv.status)}</td>
              <td class="mono">${fmtCurrency(inv.total)}</td>
              <td class="mono">${fmtDate(inv.dueDate)}</td>
              <td class="mono">${fmtDate(inv.createdAt)}</td>
              <td>
                <div class="action-cell">
                  <button class="btn btn-ghost btn-sm" onclick="openInvoiceModal('${escHtml(inv.id)}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteInvoice('${escHtml(inv.id)}')">Del</button>
                </div>
              </td>
            </tr>`).join('')}
      </tbody>
    </table>`;
}

function filterInvoiceTable() {
  const q = document.getElementById('inv-search')?.value.toLowerCase() || '';
  const filtered = (window._invoicesData || []).filter(inv =>
    clientName(inv.clientId).toLowerCase().includes(q) ||
    (inv.status||'').toLowerCase().includes(q)
  );
  renderInvoicesTable(filtered);
}

window.openInvoiceModal = async function(id) {
  let inv = null;
  if (id) { try { inv = await Api.get(`/invoices/${id}`); } catch (_) {} }
  const clients = window._clientList || await Api.get('/clients').catch(() => []);
  const clOpts = clients.map(c =>
    `<option value="${escHtml(c.id)}" ${inv?.clientId===c.id?'selected':''}>${escHtml(c.name)}</option>`
  ).join('');
  const statuses = ['draft','sent','paid','overdue','cancelled'];
  const sOpts = statuses.map(s => `<option value="${s}" ${inv?.status===s?'selected':''}>${s}</option>`).join('');

  Modal.open(inv ? 'Edit Invoice' : 'New Invoice', `
    <div class="form-grid form-grid-2">
      <div class="form-field">
        <label class="form-label">Client *</label>
        <select class="form-select" id="f-clientId"><option value="">— select —</option>${clOpts}</select>
      </div>
      <div class="form-field">
        <label class="form-label">Status</label>
        <select class="form-select" id="f-status">${sOpts}</select>
      </div>
      <div class="form-field">
        <label class="form-label">Total *</label>
        <input class="form-input" id="f-total" type="number" step="0.01" value="${inv?.total||''}" placeholder="0.00" />
      </div>
      <div class="form-field">
        <label class="form-label">Due Date</label>
        <input class="form-input" id="f-dueDate" type="date" value="${inv?.dueDate?.substring(0,10)||''}" />
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
  const body = {
    clientId: document.getElementById('f-clientId').value,
    status:   document.getElementById('f-status').value,
    total:    parseFloat(document.getElementById('f-total').value) || 0,
    dueDate:  document.getElementById('f-dueDate').value || undefined,
    notes:    document.getElementById('f-notes').value.trim(),
  };
  if (!body.clientId) { toast('Client is required', 'error'); return; }
  try {
    if (id) {
      await Api.patch(`/invoices/${id}`, body);
      toast('Invoice updated', 'success');
    } else {
      await Api.post('/invoices', body);
      toast('Invoice created', 'success');
    }
    Modal.close();
    await loadInvoicesTable();
  } catch (err) { toast(err.message === 'Could not make a connection' ? 'Could not make a connection' : 'Operation failed — please try again', 'error'); }
};

window.deleteInvoice = async function(id) {
  if (!confirm('Delete this invoice?')) return;
  try {
    await Api.delete(`/invoices/${id}`);
    toast('Invoice deleted', 'success');
    await loadInvoicesTable();
  } catch (err) { toast(err.message === 'Could not make a connection' ? 'Could not make a connection' : 'Operation failed — please try again', 'error'); }
};

// =====================================================
// PIPELINE PAGE
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
          <div class="text-muted text-mono text-sm">No conversations awaiting review</div>
        </div>`;
      return;
    }

    body.innerHTML = data.map(conv => `
      <div class="pipeline-card" onclick="viewConversation('${escHtml(conv.id)}')">
        <div class="pipeline-card-header">
          <div>
            <div class="pipeline-client-name">${escHtml(conv.client?.name || 'Unknown Client')}</div>
            <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);margin-top:3px">${escHtml(conv.client?.phone || '')}</div>
          </div>
          <div>${statusBadge(conv.status)}</div>
        </div>
        <div class="pipeline-card-meta">
          <span>📅 ${fmtDate(conv.updatedAt)}</span>
          ${conv.projects?.length ? `<span>📁 ${conv.projects.length} project(s)</span>` : ''}
          ${conv.estimates?.length ? `<span>📄 ${conv.estimates.length} estimate(s)</span>` : ''}
        </div>
      </div>`).join('');
  } catch (err) {
    body.innerHTML = `<div class="page-loading" style="color:var(--red)">Could not make a connection</div>`;
  }
}

window.viewConversation = async function(id) {
  const container = document.getElementById('pipeline-body');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;

  try {
    const detail = await Api.get(`/pipeline/conversations/${id}`);

    const messages = (detail.messages || []).map(m => `
      <div class="conv-msg ${m.role === 'assistant' ? 'assistant' : ''}">
        <div class="conv-msg-meta">${m.role?.toUpperCase()} · ${fmtDate(m.createdAt)}</div>
        <div class="conv-msg-body">${escHtml(m.content)}</div>
      </div>`).join('');

    const estimates = (detail.estimates || []);

    container.innerHTML = `
      <div class="fullpage-back" onclick="loadPipeline()">← Back to Queue</div>

      <div class="detail-section">
        <div class="detail-section-title">Client</div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-item-label">Name</div><div class="detail-item-value">${escHtml(detail.client?.name||'—')}</div></div>
          <div class="detail-item"><div class="detail-item-label">Phone</div><div class="detail-item-value">${escHtml(detail.client?.phone||'—')}</div></div>
          <div class="detail-item"><div class="detail-item-label">Status</div><div>${statusBadge(detail.status)}</div></div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Conversation</div>
        <div class="conv-messages">${messages || '<div style="color:var(--text-muted);font-family:var(--font-mono);font-size:12px">No messages</div>'}</div>
      </div>

      ${estimates.length ? `
      <div class="detail-section">
        <div class="detail-section-title">Estimates</div>
        ${estimates.map(est => `
          <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span style="font-weight:600">${escHtml(projectName(est.projectId))}</span>
              <span style="display:flex;gap:8px;align-items:center">${statusBadge(est.status)}<span class="text-mono" style="color:var(--accent)">${fmtCurrency(est.total)}</span></span>
            </div>
            ${est.status !== 'approved' && est.status !== 'rejected' ? `
            <div style="display:flex;gap:8px;margin-top:10px">
              <button class="btn btn-success btn-sm" onclick="finalizeEstimate('${escHtml(id)}','${escHtml(est.id)}')">Finalize & Approve</button>
              <button class="btn btn-danger btn-sm" onclick="rejectEstimate('${escHtml(est.id)}')">Reject</button>
            </div>` : ''}
          </div>`).join('')}
      </div>` : ''}

      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-accent" onclick="notifyClient('${escHtml(id)}','${escHtml(detail.client?.phone||'')}')">
          📱 Notify Client via WhatsApp
        </button>
        <button class="btn btn-ghost" onclick="loadPipeline()">← Back</button>
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="page-loading" style="color:var(--red)">Could not make a connection</div>`;
  }
};

window.finalizeEstimate = async function(convId, estimateId) {
  const amt = prompt('Enter final approved amount ($):');
  if (!amt) return;
  try {
    await Api.post('/pipeline/finalize', { conversationId: convId, estimateId, total: parseFloat(amt) });
    toast('Estimate finalized', 'success');
    await viewConversation(convId);
  } catch (err) { toast(err.message === 'Could not make a connection' ? 'Could not make a connection' : 'Operation failed — please try again', 'error'); }
};

window.rejectEstimate = async function(estimateId) {
  const reason = prompt('Reason for rejection:');
  if (!reason) return;
  try {
    await Api.post(`/pipeline/estimates/${estimateId}/reject`, { reason });
    toast('Estimate rejected', 'success');
  } catch (err) { toast(err.message === 'Could not make a connection' ? 'Could not make a connection' : 'Operation failed — please try again', 'error'); }
};

window.notifyClient = async function(convId, phone) {
  const msg = prompt('Message to send to client:');
  if (!msg) return;
  try {
    await Api.post('/pipeline/notify', { conversationId: convId, phone, message: msg });
    toast('Client notified via WhatsApp ✓', 'success');
  } catch (err) { toast(err.message === 'Could not make a connection' ? 'Could not make a connection' : 'Operation failed — please try again', 'error'); }
};

// =====================================================
// WHATSAPP MONITOR PAGE
// =====================================================
async function whatsapp(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <div class="page-eyebrow">System</div>
        <div class="page-title">WhatsApp Monitor</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" id="wa-refresh-btn" onclick="refreshWaStatus()">↻ Refresh</button>
      </div>
    </div>
    <div class="page-body">
      <div class="monitor-grid">
        <div class="monitor-card">
          <div class="monitor-card-title">Bot Connection Status</div>
          <div class="status-indicator" id="wa-status-indicator">
            <div class="status-big-dot" id="wa-big-dot"></div>
            <div class="status-label" id="wa-status-label">Checking…</div>
          </div>
          <div style="margin-top:16px" id="wa-meta"></div>
        </div>
        <div class="monitor-card">
          <div class="monitor-card-title">Backend Health</div>
          <div class="status-indicator" id="backend-status-indicator">
            <div class="status-big-dot" id="backend-big-dot"></div>
            <div class="status-label" id="backend-status-label">Checking…</div>
          </div>
          <div style="margin-top:16px" id="backend-meta"></div>
        </div>
      </div>

      <div style="margin-bottom:20px">
        <div class="detail-section-title">Activity Log</div>
        <div class="log-box" id="activity-log">
          <div class="log-line">System initialized…</div>
        </div>
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
    const time = new Date().toLocaleTimeString();
    const el = document.createElement('div');
    el.className = `log-line ${type}`;
    el.textContent = `[${time}] ${msg}`;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    // Keep max 50 lines
    while (log.children.length > 50) log.removeChild(log.firstChild);
  }

  // WhatsApp health
  try {
    const wa = await Api.get('/whatsapp/health');
    const connected = wa?.connected;
    const dot   = document.getElementById('wa-big-dot');
    const label = document.getElementById('wa-status-label');
    const meta  = document.getElementById('wa-meta');
    const navDot = document.getElementById('wa-status-dot');

    if (dot)   { dot.className   = `status-big-dot ${connected ? 'online' : 'offline'}`; }
    if (label) { label.textContent = connected ? 'Connected' : 'Disconnected'; label.style.color = connected ? 'var(--green)' : 'var(--red)'; }
    if (meta)  { meta.innerHTML = `<span class="text-muted text-mono text-sm">Last check: ${new Date().toLocaleTimeString()}</span>`; }
    if (navDot){ navDot.className = `status-dot ${connected ? 'online' : 'offline'}`; }

    logLine(`WhatsApp bot: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`, connected ? '' : 'err');

    // Try to fetch live activity from bot dashboard
    try {
      const activity = await fetch('http://whatsapp-bot:3001/activity').then(r => r.json()).catch(() => []);
      if (activity && activity.length > 0) {
        const recent = activity.slice(-5);
        recent.forEach(entry => {
          logLine(`[${entry.type}] ${JSON.stringify(entry.data).substring(0, 60)}`, 'info');
        });
      }
    } catch (e) {
      // Bot dashboard not accessible from frontend network, that's ok
    }
  } catch (err) {
    logLine(`WhatsApp health check failed: ${err.message}`, 'err');
    const dot = document.getElementById('wa-big-dot');
    const label = document.getElementById('wa-status-label');
    if (dot) dot.className = 'status-big-dot offline';
    if (label) { label.textContent = 'Unreachable'; label.style.color = 'var(--red)'; }
  }

  // Backend health
  try {
    const health = await Api.get('/health');
    const dot   = document.getElementById('backend-big-dot');
    const label = document.getElementById('backend-status-label');
    const meta  = document.getElementById('backend-meta');
    if (dot)   dot.className = 'status-big-dot online';
    if (label) { label.textContent = 'Healthy'; label.style.color = 'var(--green)'; }
    if (meta)  meta.innerHTML = `<span class="text-muted text-mono text-sm">${escHtml(health?.timestamp||'')}</span>`;
    logLine(`Backend health: OK`);
  } catch (err) {
    logLine(`Backend health check failed: ${err.message}`, 'err');
    const dot   = document.getElementById('backend-big-dot');
    const label = document.getElementById('backend-status-label');
    if (dot)   dot.className = 'status-big-dot offline';
    if (label) { label.textContent = 'Degraded'; label.style.color = 'var(--red)'; }
  }
};

// =====================================================
// SEND MESSAGE PAGE
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
            <label class="form-label">Select Client (optional)</label>
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
            ['Quote Ready', 'Hi! Your quote is ready for review. Please let us know if you have any questions.'],
            ['Follow Up',   'Hi! Just following up on your recent inquiry. Are you still interested in our services?'],
            ['Invoice Sent','Your invoice has been sent. Please let us know once you have reviewed it.'],
            ['Job Complete','We\'re pleased to inform you that your project has been completed. Thank you for your business!'],
          ].map(([label, text]) =>
            `<button class="btn btn-ghost btn-sm" onclick="useTemplate(${JSON.stringify(text)})">${label}</button>`
          ).join('')}
        </div>
      </div>
    </div>`;

  // Load clients for dropdown
  try {
    const clients = await Api.get('/clients');
    const sel = document.getElementById('sm-client');
    clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.phone || '';
      opt.textContent = `${c.name}${c.phone ? ' · ' + c.phone : ''}`;
      sel.appendChild(opt);
    });
  } catch (_) {}

  // Char count
  document.getElementById('sm-message')?.addEventListener('input', function() {
    document.getElementById('sm-char-count').textContent = this.value.length;
  });
}

window.fillPhoneFromClient = function() {
  const sel = document.getElementById('sm-client');
  const phoneInput = document.getElementById('sm-phone');
  if (sel?.value) phoneInput.value = sel.value;
};

window.useTemplate = function(text) {
  const ta = document.getElementById('sm-message');
  if (ta) {
    ta.value = text;
    document.getElementById('sm-char-count').textContent = text.length;
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
    document.getElementById('sm-char-count').textContent = '0';
  } catch (err) {
    toast(err.message === 'Could not make a connection' ? 'Could not make a connection' : 'Failed to send message', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2L9 14l-2-5-5-2 12-5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Send via WhatsApp`;
  }
};
