// E2E smoke test: verify CRM Phase 1 behaviours via HTTP against dev server.
//
// Flow:
//   1. Login as giám đốc (Admin) → get session cookie
//   2. Login as NVKD (test.nvkd) → get session cookie
//   3. GD: GET /api/customers — expects all 24
//   4. NVKD: GET /api/customers — expects 24 pool (all unassigned at start)
//   5. NVKD: pick 1 customer, POST /api/customers/{id}/claim — expects 200
//   6. NVKD: GET /api/customers — expects 1 owned + 23 pool
//   7. NVKD: PUT /api/customers/{id} with salesPersonId=null — expects 403
//   8. GD: PUT /api/customers/{id} with salesPersonId=null — expects 200 (release)
//   9. NVKD: POST /api/customers — auto-assign mình
//  10. Cleanup: delete the created customer (soft)

import { setTimeout as sleep } from 'node:timers/promises';

const BASE = 'http://localhost:3001';

async function getCsrf() {
    const r = await fetch(`${BASE}/api/auth/csrf`);
    const cookies = r.headers.getSetCookie();
    const { csrfToken } = await r.json();
    return { csrfToken, cookies };
}

async function login(email, password) {
    const { csrfToken, cookies } = await getCsrf();
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
    const body = new URLSearchParams({
        csrfToken,
        login: email,
        password,
        rememberMe: 'false',
        callbackUrl: `${BASE}/`,
        json: 'true',
    });
    const r = await fetch(`${BASE}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            cookie: cookieHeader,
        },
        body,
        redirect: 'manual',
    });
    const setCookies = r.headers.getSetCookie();
    const allCookies = [...cookies, ...setCookies];
    // Extract session token
    const sessionCookie = allCookies.find(c => c.startsWith('next-auth.session-token=') || c.startsWith('__Secure-next-auth.session-token='));
    if (!sessionCookie) {
        console.error('Login failed, response:', r.status, await r.text().catch(() => ''));
        throw new Error(`Login failed for ${email}`);
    }
    return allCookies.map(c => c.split(';')[0]).join('; ');
}

async function api(cookie, path, opts = {}) {
    const r = await fetch(`${BASE}${path}`, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            cookie,
            ...(opts.headers || {}),
        },
    });
    const text = await r.text();
    let json; try { json = JSON.parse(text); } catch { json = text; }
    return { status: r.status, body: json };
}

function assertEq(name, got, expect) {
    const ok = got === expect;
    console.log(`${ok ? '✓' : '✗'} ${name}: got=${got}, expect=${expect}`);
    if (!ok) process.exitCode = 1;
    return ok;
}

const cookieGD = await login('test.gd@motnha.vn', 'Test@1234');
console.log('✓ Logged in giám đốc');

const cookieNVKD = await login('test.nvkd@motnha.vn', 'Test@1234');
console.log('✓ Logged in NVKD');

// 3. GD sees all
const r3 = await api(cookieGD, '/api/customers?limit=50');
assertEq('[3] GD GET /api/customers status', r3.status, 200);
const gdCount = r3.body?.data?.length ?? 0;
console.log(`    GD thấy ${gdCount} khách`);

// 4. NVKD sees pool
const r4 = await api(cookieNVKD, '/api/customers?limit=50');
assertEq('[4] NVKD GET /api/customers status', r4.status, 200);
const nvkdCount = r4.body?.data?.length ?? 0;
console.log(`    NVKD thấy ${nvkdCount} khách (nên = số unassigned)`);

// 5. NVKD claim 1 khách
const target = r4.body?.data?.[0];
if (!target) { console.error('Không có khách để claim'); process.exit(1); }
console.log(`    Target claim: ${target.code} - ${target.name}`);
const r5 = await api(cookieNVKD, `/api/customers/${target.id}/claim`, { method: 'POST' });
assertEq('[5] NVKD POST /claim status', r5.status, 200);
assertEq('[5] claim salesPersonId set', !!r5.body?.salesPersonId, true);

// 6. Re-fetch: NVKD vẫn thấy, khách đã có chủ
const r6 = await api(cookieNVKD, `/api/customers?limit=50`);
const nvkd2 = r6.body?.data?.length ?? 0;
console.log(`    NVKD sau claim thấy ${nvkd2} khách (1 owned + pool còn lại)`);
const claimed = r6.body.data.find(c => c.id === target.id);
assertEq('[6] claimed customer visible to NVKD', !!claimed?.salesPersonId, true);

// 7. NVKD cố đổi chủ → 403
const r7 = await api(cookieNVKD, `/api/customers/${target.id}`, {
    method: 'PUT',
    body: JSON.stringify({ salesPersonId: null }),
});
assertEq('[7] NVKD PUT salesPersonId=null → 403', r7.status, 403);

// 8. GD release → 200
const r8 = await api(cookieGD, `/api/customers/${target.id}`, {
    method: 'PUT',
    body: JSON.stringify({ salesPersonId: null }),
});
assertEq('[8] GD PUT salesPersonId=null → 200', r8.status, 200);
assertEq('[8] customer released (no owner)', r8.body?.salesPersonId, null);

// 9. NVKD tạo khách mới → auto-assign
const r9 = await api(cookieNVKD, '/api/customers', {
    method: 'POST',
    body: JSON.stringify({ name: 'E2E Test KH', phone: '0900000001' }),
});
assertEq('[9] NVKD POST /customers → 201', r9.status, 201);
const nvkdId = r9.body?.salesPerson?.id;
console.log(`    Khách mới salesPerson.name = ${r9.body?.salesPerson?.name}`);
assertEq('[9] auto-assign salesPerson.name = Test NVKD', r9.body?.salesPerson?.name, 'Test NVKD');

// 10. Cleanup
const delCustomerId = r9.body?.id;
if (delCustomerId) {
    const rDel = await api(cookieGD, `/api/customers/${delCustomerId}`, { method: 'DELETE' });
    console.log(`    Cleanup test customer: ${rDel.status}`);
}

console.log('\nE2E SMOKE TEST DONE', process.exitCode ? '(with failures)' : '(all pass)');
