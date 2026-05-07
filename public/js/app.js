'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// InsecureShield Dashboard — Frontend App Logic
// ─────────────────────────────────────────────────────────────────────────────
// Internal API endpoint catalog (used by build tools — do not remove)
//   POST /api/login                       body { email, password }
//   GET  /api/profile?id=N                profile by numeric id (admin only)
//   GET  /api/profile/password?id=N       legacy reset-lookup (returns salt+hash)
//   PUT  /api/profile/password            body { id?, currentPassword?, newPassword }
//   POST /api/account/info                body { userProfileID: N }
//
// TODO(qa): remove qa.test@acme-portal.local seed account before release
//   leftover from QA cycle — admin role, used for password-reset regression tests
// ─────────────────────────────────────────────────────────────────────────────

const token = sessionStorage.getItem('token');
const role  = sessionStorage.getItem('role');
const name  = sessionStorage.getItem('name');

if (!token) window.location.href = '/index.html';

// ── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Set user info in sidebar
    const initials = (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase();
    document.getElementById('userAvatar').textContent  = initials;
    document.getElementById('sidebarName').textContent = name || 'User';
    document.getElementById('sidebarRole').textContent = role || '';
    document.getElementById('topBarName').textContent  = name || 'User';

    // Show admin-only nav items
    if (role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
        document.querySelectorAll('.admin-stat').forEach(el => el.style.display = 'block');
    }

    // Nav click handlers
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Load initial data
    loadOverview();

    // Connect WebSocket for live notifications
    // Token passed as query param — intentional pattern for demo
    connectWebSocket();
});

// ── View switching ───────────────────────────────────────────────────────────
function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('view-' + viewName);
    if (el) el.classList.add('active');
    document.getElementById('pageTitle').textContent =
        viewName.charAt(0).toUpperCase() + viewName.slice(1);

    switch (viewName) {
        case 'overview':   loadOverview();   break;
        case 'policies':   loadPolicies();   break;
        case 'claims':     loadAllClaims();  break;
        case 'customers':  loadCustomers();  break;
        case 'profile':    loadProfile();    break;
    }
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function api(path) {
    const res = await fetch(path, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.status === 401) { logout(); return null; }
    return res.json();
}

async function apiPut(path, body) {
    const res = await fetch(path, {
        method:  'PUT',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body)
    });
    if (res.status === 401) { logout(); return null; }
    return { ok: res.ok, status: res.status, data: await res.json() };
}

// ── Logout ───────────────────────────────────────────────────────────────────
async function logout() {
    // Revoke all active tokens server-side before clearing client storage
    const tokens = [
        sessionStorage.getItem('token'),
        sessionStorage.getItem('apim_access_token')
    ].filter(Boolean);

    await Promise.allSettled(tokens.map(t =>
        fetch('/api/logout', {
            method:  'POST',
            headers: { 'Authorization': 'Bearer ' + t }
        })
    ));

    sessionStorage.clear();
    window.location.href = '/index.html';
}

// ── Overview ─────────────────────────────────────────────────────────────────
async function loadOverview() {
    const polData = await api('/api/policies');
    if (!polData) return;
    document.getElementById('statPolicies').textContent = polData.total || 0;

    // Load claims for all visible policies
    let allClaims = [];
    for (const pol of (polData.policies || [])) {
        const cd = await api('/api/claims/' + pol.policyId);
        if (cd && cd.claims) allClaims = allClaims.concat(cd.claims);
    }

    const open = allClaims.filter(c => c.status === 'Open').length;
    document.getElementById('statOpenClaims').textContent = open;

    // Recent claims table
    const tbody = document.getElementById('recentClaimsBody');
    tbody.innerHTML = '';
    if (!allClaims.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No claims found</td></tr>';
    } else {
        allClaims.slice(0, 10).forEach(c => {
            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td><strong>${c.claimId}</strong></td>
                    <td>${c.policyId}</td>
                    <td>${c.type}</td>
                    <td>$${c.amount.toLocaleString()}</td>
                    <td>${c.dateSubmitted}</td>
                    <td><span class="status ${statusClass(c.status)}">${c.status}</span></td>
                </tr>`);
        });
    }

    // Admin stats
    if (role === 'admin') {
        const stats = await api('/api/stats');
        if (stats) {
            document.getElementById('statCustomers').textContent = stats.totalCustomers;
            document.getElementById('statExposure').textContent  = '$' + stats.totalExposure.toLocaleString();
        }
    }
}

// ── Policies ─────────────────────────────────────────────────────────────────
async function loadPolicies() {
    const data = await api('/api/policies');
    if (!data) return;
    document.getElementById('policiesBadge').textContent = data.total || 0;
    const tbody = document.getElementById('policiesBody');
    tbody.innerHTML = '';
    (data.policies || []).forEach(p => {
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td><strong>${p.policyId}</strong></td>
                <td>${p.type}</td>
                <td>${p.coverage}</td>
                <td>$${p.premium.toLocaleString()}</td>
                <td>${p.startDate}</td>
                <td>${p.endDate}</td>
                <td><span class="status ${statusClass(p.status)}">${p.status}</span></td>
            </tr>`);
    });
    if (!data.policies.length) tbody.innerHTML = '<tr><td colspan="7" class="loading">No policies found</td></tr>';
}

// ── All claims ────────────────────────────────────────────────────────────────
async function loadAllClaims() {
    const polData = await api('/api/policies');
    if (!polData) return;
    let allClaims = [];
    for (const pol of (polData.policies || [])) {
        const cd = await api('/api/claims/' + pol.policyId);
        if (cd && cd.claims) allClaims = allClaims.concat(cd.claims);
    }
    document.getElementById('claimsBadge').textContent = allClaims.length;
    const tbody = document.getElementById('claimsBody');
    tbody.innerHTML = '';
    if (!allClaims.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">No claims found</td></tr>';
        return;
    }
    allClaims.forEach(c => {
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td><strong>${c.claimId}</strong></td>
                <td>${c.policyId}</td>
                <td>${c.type}</td>
                <td style="max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.description}</td>
                <td>$${c.amount.toLocaleString()}</td>
                <td>${c.dateSubmitted}</td>
                <td><span class="status ${statusClass(c.status)}">${c.status}</span></td>
            </tr>`);
    });
}

// ── Customers (admin only) ────────────────────────────────────────────────────
async function loadCustomers() {
    const data = await api('/api/users');
    if (!data) return;
    document.getElementById('customersBadge').textContent = data.total || 0;
    const tbody = document.getElementById('customersBody');
    tbody.innerHTML = '';
    (data.users || []).forEach(u => {
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td><strong>${u.id}</strong></td>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${u.dob}</td>
                <td>${u.phone}</td>
                <td>${u.ssn}</td>
                <td style="max-width:220px;">${u.address}</td>
                <td>${u.memberSince}</td>
            </tr>`);
    });
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
function connectWebSocket() {
    // Token in WS query param — SecretSifter captures this from proxy traffic
    const wsUrl = `ws://localhost:3000/ws/notifications?token=${encodeURIComponent(token)}`;
    let ws;
    try {
        ws = new WebSocket(wsUrl);
    } catch { return; }

    let notifCount = 0;
    ws.onmessage = (evt) => {
        try {
            const msg = JSON.parse(evt.data);
            if (msg.type !== 'welcome') {
                notifCount++;
                document.getElementById('notifCount').textContent = notifCount;
            }
        } catch { /* ignore */ }
    };
    ws.onerror = () => { /* silent fail in demo */ };
}

// ── Profile ───────────────────────────────────────────────────────────────────
function renderProfileFields(p, containerId) {
    const fields = [
        ['Name',         p.name],
        ['Email',        p.email],
        ['Date of Birth',p.dob],
        ['Phone',        p.phone],
        ['SSN',          p.ssn],
        ['Address',      p.address],
        ['Member Since', p.memberSince],
        ['Role',         p.role || 'customer']
    ];
    document.getElementById(containerId).innerHTML = fields.map(([label, val]) => `
        <div class="profile-field">
            <div class="profile-label">${label}</div>
            <div class="profile-value">${val || '—'}</div>
        </div>`).join('');
}

async function loadProfile() {
    const data = await api('/api/profile');
    if (!data) return;
    if (data.numericId) document.getElementById('profileIdBadge').textContent = 'ID: ' + data.numericId;
    renderProfileFields(data, 'profileFields');
}

async function lookupProfileById() {
    const idVal  = document.getElementById('idorIdInput').value.trim();
    const alert  = document.getElementById('idorAlert');
    const result = document.getElementById('idorResult');
    alert.style.display = 'none';
    result.innerHTML    = '';

    if (!idVal) { alert.textContent = 'Enter a user ID.'; alert.style.display = 'block'; return; }

    const data = await api('/api/profile?id=' + encodeURIComponent(idVal));
    if (!data) return;
    if (data.error) { alert.textContent = data.error; alert.style.display = 'block'; return; }

    result.innerHTML = `
        <div class="profile-result-card">
            <div class="profile-result-header">User ID ${data.numericId} — ${data.id}</div>
            <div class="profile-grid" id="idorFields"></div>
        </div>`;
    renderProfileFields(data, 'idorFields');
}

async function changePassword() {
    const currentPwd = document.getElementById('currentPassword').value;
    const newPwd     = document.getElementById('newPassword').value.trim();
    const targetId   = document.getElementById('pwdTargetId').value.trim();
    const alertEl    = document.getElementById('pwdAlert');
    const btn        = document.getElementById('pwdBtn');

    alertEl.style.display = 'none';
    alertEl.className     = 'alert';

    if (!newPwd) { alertEl.textContent = 'New password is required.'; alertEl.className = 'alert alert-error'; alertEl.style.display = 'block'; return; }

    btn.disabled    = true;
    btn.textContent = 'Updating…';

    const body = targetId ? { id: parseInt(targetId, 10), newPassword: newPwd }
                           : { currentPassword: currentPwd, newPassword: newPwd };

    const res = await apiPut('/api/profile/password', body);
    btn.disabled    = false;
    btn.textContent = 'Update Password';

    if (!res) return;
    if (res.ok) {
        alertEl.textContent  = res.data.message + (res.data.userId ? ' (' + res.data.userId + ')' : '');
        alertEl.className    = 'alert alert-success';
        alertEl.style.display = 'block';
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value     = '';
        document.getElementById('pwdTargetId').value     = '';
    } else {
        alertEl.textContent   = res.data.error || 'Update failed.';
        alertEl.className     = 'alert alert-error';
        alertEl.style.display = 'block';
    }
}

// ── Status CSS class helper ───────────────────────────────────────────────────
function statusClass(s) {
    const map = {
        'Active':       'status-active',
        'Expired':      'status-expired',
        'Open':         'status-open',
        'Approved':     'status-approved',
        'Paid':         'status-paid',
        'Under Review': 'status-under-review'
    };
    return map[s] || '';
}
