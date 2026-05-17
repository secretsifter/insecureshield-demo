'use strict';

const express            = require('express');
const jwt                = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const http               = require('http');
const path               = require('path');
const cors               = require('cors');
const os                 = require('os');
const { exec }           = require('child_process');
const { customers, policies, claims } = require('./data/db');

function getNetworkIP() {
    for (const ifaces of Object.values(os.networkInterfaces())) {
        for (const iface of ifaces) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'localhost';
}

function openBrowser(url) {
    const cmd = process.platform === 'darwin' ? `open "${url}"`
              : process.platform === 'win32'  ? `start "${url}"`
              : `xdg-open "${url}"`;
    exec(cmd, err => { if (err) console.error('  Could not open browser:', err.message); });
}

const app  = express();
const PORT = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// Hardcoded credentials / secrets (intentional for SecretSifter demo)
// ─────────────────────────────────────────────────────────────────────────────
const JWT_SECRET  = "D3moP0rtal#JWT!2024@TestKey99";          // JWT signing secret
const APIM_KEY    = "a1b2c3d4e5f6789012345678901234ab";        // Azure APIM subscription key
const ADMIN_EMAIL = "admin@acme-portal.com";
const ADMIN_PASS  = "InsecureShield@2024";
const DB_CONN_STR = "Server=prod-db.acme-portal.internal;Database=AcmePortalDB;User Id=sa;Password=X7!kP#9mQvLr3$nBs;";

// Public Azure AD application credentials accepted by /api/auth/generate-token.
// These match the values inside AZURE_AD_CONFIG in public/js/main.js.
// Chain 1: anyone who reads main.js can mint an "admin" token with these.
const AAD_APP_ID       = "8f4e2d1c-9b3a-4f6e-8a7d-2c1b9e5f4a3d";
const AAD_APP_KEY      = "Ins~K3y.qX7vN9bM4dZ8mP2hT5wL1eC6rJ0aFgYi==";
const AAD_RESOURCE_KEY = "R7vN3kQ9pX5tL2cD8fG6hJ1mB4sY0aW7eK3rT9zU1nM5oI8jH2vC6bF4yE7wQ0pA==";

// "Hidden" Azure AD admin app — credentials live INSIDE the CryptoJS blob.
// Chain 2: attacker must decrypt ENCRYPTED_SP_CONFIG to discover these.
// Same /api/auth/generate-token endpoint accepts them, but issues a "superadmin"
// token that can reach /api/admin/* — endpoints the public token cannot.
const AAD_ADMIN_APP_ID       = "9a8b7c6d-5e4f-3a2b-1c0d-ef9876543210";
const AAD_ADMIN_APP_KEY      = "AdmIn~App.Q4-2024.7vR3xW5tY1uO4sD6jF~AcmePortal";
const AAD_ADMIN_RESOURCE_KEY = "AdminRes.K3y.aB2cD3fG4hJ5kL6mN7oP8qR9sT0u1vW==";

app.use(cors());
app.use(express.json());

// Global no-cache for live-demo visibility: every request — static or API —
// returns a full 200 with body, every reload shows a fresh entry in Burp's
// HTTP history, no 304 Not Modified anywhere.
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma',  'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.use(express.static(path.join(__dirname, 'public'), {
    etag:         false,    // no ETag → no If-None-Match revalidation
    lastModified: false     // no Last-Modified → no If-Modified-Since
}));

// In-memory revocation list — tokens added here are rejected even if still JWT-valid
const revokedTokens = new Set();

// ─────────────────────────────────────────────────────────────────────────────
// Auth middleware
// ─────────────────────────────────────────────────────────────────────────────
// Mimics an Azure APIM gateway: every protected route requires BOTH
//   (a) a valid Bearer access_token (issued by /api/auth/generate-token or sp-token)
//   (b) a valid Ocp-Apim-Subscription-Key header
// Either missing → 401. Either wrong → 401. This forces attackers to surface
// both secrets from main.js before reaching any data.
function requireToken(req, res, next) {
    const subKey = req.headers['ocp-apim-subscription-key']
                || req.headers['apim-subscription-key'];
    if (!subKey || subKey !== APIM_KEY) {
        return res.status(401).json({ error: 'Missing or invalid Ocp-Apim-Subscription-Key' });
    }
    const auth  = req.headers['authorization'] || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) return res.status(401).json({ error: 'No Bearer token provided' });
    if (revokedTokens.has(token)) return res.status(401).json({ error: 'Token has been revoked' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

// [1] Standard login — username / password
//     INTENTIONAL: when the email exists but the password is wrong, the response
//     leaks the user's name, profile id, and role. This is the user-enumeration
//     primitive that seeds the rest of the chain.
app.post('/api/login', (req, res) => {
    const { email, password } = req.body || {};
    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
        const token = jwt.sign({ role: 'admin', email }, JWT_SECRET, { expiresIn: '2h' });
        return res.json({ IsSuccess: true, token, role: 'admin', name: 'Admin User' });
    }
    const customer = customers.find(c => c.email === email);
    if (!customer) {
        return res.status(401).json({ IsSuccess: false, error: 'Invalid credentials' });
    }
    if (customer.password !== password) {
        // Verbose error path — leaks user metadata when the email is valid
        const numericId = parseInt(String(customer.id).replace('CUST-', ''), 10);
        return res.status(401).json({
            IsSuccess:    false,
            error:        'Email exists but password is incorrect',
            email:        customer.email,
            userName:     customer.name,
            userProfileID:numericId,
            role:         customer.role || 'customer'
        });
    }
    const token = jwt.sign(
        { role: 'customer', customerId: customer.id, email },
        JWT_SECRET, { expiresIn: '2h' }
    );
    res.json({ IsSuccess: true, token, role: 'customer', name: customer.name, customerId: customer.id });
});

// [1b] Logout — revoke the current Bearer token server-side
//      POST /api/logout
//      Header: Authorization: Bearer <token>
app.post('/api/logout', (req, res) => {
    const auth  = req.headers['authorization'] || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (token) revokedTokens.add(token);
    res.json({ message: 'Logged out. Token revoked.' });
});

// [2] Azure AD client_credentials → Bearer token  (Attack Chain 1 Step 2)
//     POST /api/auth/generate-token
//     Headers (preferred):  appId, appKey, resourceKey      ← all three from AZURE_AD_CONFIG
//     Body (fallback):      { appId, appKey, resourceKey }
//     Returns:              { access_token, resource_key, token_type, expires_in, scope }
//     Note: the response *echoes* resource_key so attackers see another secret in transit
//     (SecretSifter-style response scanners pick it up). The subscription key is NOT
//     required to mint a token — only to USE it against data endpoints.
app.post('/api/auth/generate-token', (req, res) => {
    // Express lowercases header names. Body is a fallback for non-Burp callers.
    const appId       = req.headers['appid']       || (req.body && req.body.appId);
    const appKey      = req.headers['appkey']      || (req.body && req.body.appKey);
    const resourceKey = req.headers['resourcekey'] || (req.body && req.body.resourceKey);

    if (!appId || !appKey || !resourceKey) {
        return res.status(400).json({
            error: 'appId, appKey and resourceKey are required (as headers or in JSON body)'
        });
    }

    // Path 1 — public Azure AD credentials from main.js → admin token
    if (appId === AAD_APP_ID && appKey === AAD_APP_KEY && resourceKey === AAD_RESOURCE_KEY) {
        const token = jwt.sign(
            { role: 'admin', source: 'apim', app_id: appId },
            JWT_SECRET, { expiresIn: '4h' }
        );
        return res.json({
            access_token: token,
            resource_key: AAD_RESOURCE_KEY,
            token_type:   'Bearer',
            expires_in:   14400,
            scope:        'policies.read claims.read users.read'
        });
    }

    // Path 2 — admin Azure AD credentials from the decrypted CryptoJS blob → superadmin token
    if (appId === AAD_ADMIN_APP_ID && appKey === AAD_ADMIN_APP_KEY && resourceKey === AAD_ADMIN_RESOURCE_KEY) {
        const token = jwt.sign(
            { role: 'superadmin', source: 'sp', app_id: appId },
            JWT_SECRET, { expiresIn: '4h' }
        );
        return res.json({
            access_token: token,
            resource_key: AAD_ADMIN_RESOURCE_KEY,
            token_type:   'Bearer',
            expires_in:   14400,
            scope:        'admin.config.read admin.diagnostics admin.dbconn'
        });
    }

    return res.status(401).json({ error: 'Invalid Azure AD application credentials' });
});

// [SP-1] Internal configuration — only callable by SP-sourced tokens.
//        GET /api/admin/internal-config
function requireSpToken(req, res, next) {
    requireToken(req, res, () => {
        if (req.user.source !== 'sp') {
            return res.status(403).json({ error: 'SP-sourced token required' });
        }
        next();
    });
}

app.get('/api/admin/internal-config', requireSpToken, (req, res) => {
    res.json({
        IsSuccess: true,
        config: {
            jwt_secret_fingerprint: 'SHA256:' + require('crypto').createHash('sha256').update(JWT_SECRET).digest('hex').slice(0,16),
            db_conn_string:         DB_CONN_STR,
            apim_subscription_key:  APIM_KEY,
            admin_email:            ADMIN_EMAIL,
            internal_services: [
                'https://claims-svc.acme-portal.internal/api/v1',
                'https://policy-svc.acme-portal.internal/api/v1',
                'https://reporting.acme-portal.internal/api'
            ]
        }
    });
});

// [SP-2] Diagnostics — total tenant footprint, only callable by SP token.
app.get('/api/admin/diagnostics', requireSpToken, (req, res) => {
    res.json({
        IsSuccess: true,
        tenant: 'acme-portal-prod-2024',
        sp_id:  req.user.sp_id,
        privileges_granted_by_token: ['admin.config.read', 'admin.diagnostics', 'admin.dbconn'],
        runtime: {
            uptime_seconds:       Math.floor(process.uptime()),
            node_version:         process.version,
            customer_count:       customers.length,
            policy_count:         policies.length,
            claim_count:          claims.length
        }
    });
});

// [3] List all policies  (Attack chain Step 2)
//     GET /api/policies
//     Admin/APIM token → all policies; customer token → own policies only
app.get('/api/policies', requireToken, (req, res) => {
    if (req.user.role === 'admin' || req.user.source === 'apim') {
        return res.json({ policies, total: policies.length });
    }
    const mine = policies.filter(p => p.customerId === req.user.customerId);
    res.json({ policies: mine, total: mine.length });
});

// [4] Claims for a policy  (Attack chain Step 3)
//     GET /api/claims/:policyId
app.get('/api/claims/:policyId', requireToken, (req, res) => {
    const result = claims.filter(c => c.policyId === req.params.policyId);
    if (!result.length) return res.status(404).json({ error: 'No claims found for policy' });
    res.json({ claims: result, total: result.length });
});

// [5] All customers — full PII exfiltration  (Attack chain Step 4)
//     GET /api/users
app.get('/api/users', requireToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.source !== 'apim') {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const safe = customers.map(({ password, ...rest }) => rest);
    res.json({ users: safe, total: safe.length });
});

// [6] Current user profile
app.get('/api/me', requireToken, (req, res) => {
    if (req.user.role === 'admin') return res.json({ name: 'Admin', role: 'admin', email: ADMIN_EMAIL });
    const c = customers.find(x => x.id === req.user.customerId);
    if (!c) return res.status(404).json({ error: 'Not found' });
    const { password, ...safe } = c;
    res.json(safe);
});

// [7] Summary stats for dashboard
app.get('/api/stats', requireToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.source !== 'apim') {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    res.json({
        totalCustomers: customers.length,
        totalPolicies:  policies.length,
        totalClaims:    claims.length,
        openClaims:     claims.filter(c => c.status === 'Open').length,
        totalExposure:  claims.reduce((s, c) => s + c.amount, 0)
    });
});

// [8] Read user profile by numeric id
//     GET /api/profile          — own profile (from token)
//     GET /api/profile?id=3     — IDOR: any authenticated user can read any profile
//                                 by incrementing the id — no ownership check
app.get('/api/profile', requireToken, (req, res) => {
    if (req.query.id !== undefined) {
        // IDOR — no check that id belongs to the requesting user
        const idx = parseInt(req.query.id, 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= customers.length) {
            return res.status(404).json({ error: 'User not found' });
        }
        const { password, ...profile } = customers[idx];
        return res.json({ ...profile, numericId: idx + 1 });
    }
    if (req.user.role === 'admin') {
        return res.json({ id: 'admin', numericId: 0, name: 'Admin User', email: ADMIN_EMAIL, role: 'admin', memberSince: '2014-01-01' });
    }
    const customer = customers.find(c => c.id === req.user.customerId);
    if (!customer) return res.status(404).json({ error: 'Profile not found' });
    const { password, ...profile } = customer;
    res.json({ ...profile, numericId: parseInt(customer.id.replace('CUST-', ''), 10) });
});

// [9a] Read credentials by profile id  — INTENTIONAL: legacy reset-flow endpoint
//      GET /api/profile/password?id=N
//      Returns hash + salt + email + username + role. No ownership check.
//      Mirrors a real-world "password reset lookup" endpoint that should never
//      have shipped with the credential material in the response body.
app.get('/api/profile/password', requireToken, (req, res) => {
    const idx = parseInt(req.query.id, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= customers.length) {
        return res.status(404).json({ IsSuccess: false, error: 'User not found' });
    }
    const c = customers[idx];
    const numericId = parseInt(String(c.id).replace('CUST-', ''), 10) || (idx + 1);
    res.json({
        IsSuccess:     true,
        userProfileID: numericId,
        userName:      c.name,
        email:         c.email,
        role:          c.role || 'customer',
        passwordHash:  c.passwordHash,
        salt:          c.salt
    });
});

// [9b] Update password
//     PUT /api/profile/password
//     Body { currentPassword, newPassword }        — own account (requires current password)
//     Body { id: <number>, newPassword }            — IDOR: changes any user's password
//                                                     without knowing their current password (BOLA)
app.put('/api/profile/password', requireToken, (req, res) => {
    const { id, currentPassword, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    if (id !== undefined && id !== null) {
        // IDOR — no ownership check, no current-password verification
        const idx = parseInt(id, 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= customers.length) {
            return res.status(404).json({ error: 'User not found' });
        }
        customers[idx].password = newPassword;
        return res.json({ message: 'Password updated', userId: customers[idx].id });
    }
    if (req.user.role === 'admin') {
        return res.json({ message: 'Admin password updated', userId: 'admin' });
    }
    const customer = customers.find(c => c.id === req.user.customerId);
    if (!customer) return res.status(404).json({ error: 'Profile not found' });
    if (customer.password !== currentPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
    }
    customer.password = newPassword;
    res.json({ message: 'Password updated', userId: customer.id });
});

// [10] Account info lookup by profile id — INTENTIONAL: enumeration primitive
//      POST /api/account/info   body { userProfileID: N }
//      Returns email + username + policy number for any id. No ownership check.
app.post('/api/account/info', requireToken, (req, res) => {
    const id = req.body && req.body.userProfileID;
    const idx = parseInt(id, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= customers.length) {
        return res.status(404).json({ IsSuccess: false, error: 'User not found' });
    }
    const c = customers[idx];
    const policy = policies.find(p => p.customerId === c.id);
    const numericId = parseInt(String(c.id).replace('CUST-', ''), 10) || (idx + 1);
    res.json({
        IsSuccess:     true,
        userProfileID: numericId,
        userName:      c.name,
        email:         c.email,
        policyNumber:  policy ? policy.policyId : null
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP + WebSocket server
// Token intentionally passed as query param so SecretSifter picks it up in WS traffic
// ─────────────────────────────────────────────────────────────────────────────
const server = http.createServer(app);
const wss    = new WebSocketServer({ server, path: '/ws/notifications' });

wss.on('connection', (ws, req) => {
    const url   = new URL(req.url, `http://localhost:${PORT}`);
    const token = url.searchParams.get('token') || '';
    console.log('[WS] Client connected, token prefix:', token.substring(0, 30) + '…');

    ws.send(JSON.stringify({
        type:    'welcome',
        message: 'Connected to InsecureShield live notifications',
        server:  'prod-ws.acme-portal.internal',
        apiKey:  'ws-internal-key-7f3a9b2c1d4e5f6a'   // intentional secret in WS message
    }));

    const interval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                type:      'notification',
                message:   `Claim CLAIM-${Math.floor(Math.random() * 9000 + 1000)} status updated`,
                timestamp: new Date().toISOString()
            }));
        }
    }, 15000);

    ws.on('close', () => clearInterval(interval));
});

server.listen(PORT, '0.0.0.0', () => {
    const networkIP  = getNetworkIP();
    const networkUrl = `http://${networkIP}:${PORT}`;

    console.log('\n  ╔══════════════════════════════════════╗');
    console.log('  ║   InsecureShield Claims Portal Demo    ║');
    console.log('  ╚══════════════════════════════════════╝');
    console.log(`\n  Local:    http://localhost:${PORT}`);
    console.log(`  Network:  ${networkUrl}`);
    console.log(`\n  Admin:    admin@acme-portal.com / InsecureShield@2024`);
    console.log(`  APIM:     a1b2c3d4e5f6789012345678901234ab\n`);

    openBrowser(networkUrl);
});
