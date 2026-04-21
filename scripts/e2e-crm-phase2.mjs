// E2E smoke test CRM Phase 2 — Photo check-in
const BASE = 'http://localhost:3001';

async function getCsrf() { const r = await fetch(`${BASE}/api/auth/csrf`); return { csrfToken: (await r.json()).csrfToken, cookies: r.headers.getSetCookie() }; }
async function login(email, password) {
    const { csrfToken, cookies } = await getCsrf();
    const r = await fetch(`${BASE}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: cookies.map(c => c.split(';')[0]).join('; ') },
        body: new URLSearchParams({ csrfToken, login: email, password, rememberMe: 'false', callbackUrl: `${BASE}/`, json: 'true' }),
        redirect: 'manual',
    });
    return [...cookies, ...r.headers.getSetCookie()].map(c => c.split(';')[0]).join('; ');
}
async function api(cookie, path, opts = {}) {
    const r = await fetch(`${BASE}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', cookie, ...(opts.headers || {}) } });
    const t = await r.text(); try { return { status: r.status, body: JSON.parse(t) }; } catch { return { status: r.status, body: t }; }
}
function assertEq(name, got, expect) {
    const ok = JSON.stringify(got) === JSON.stringify(expect);
    console.log(`${ok ? '✓' : '✗'} ${name}: got=${JSON.stringify(got)}, expect=${JSON.stringify(expect)}`);
    if (!ok) process.exitCode = 1;
}

const gd = await login('test.gd@motnha.vn', 'Test@1234');
const nvkd = await login('test.nvkd@motnha.vn', 'Test@1234');
console.log('✓ Logged in 2 users');

// NVKD tạo khách của mình
const c = await api(nvkd, '/api/customers', { method: 'POST', body: JSON.stringify({ name: 'Phase2 E2E KH', phone: '0900000200' }) });
const cid = c.body.id;
assertEq('NVKD create customer → 201', c.status, 201);

// Upload 1 ảnh giả (minimal JPEG header)
const fd = new FormData();
const jpegBuf = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
fd.append('file', new File([jpegBuf], 'test.jpg', { type: 'image/jpeg' }));
fd.append('type', 'checkin');
const up = await fetch(`${BASE}/api/upload`, { method: 'POST', headers: { cookie: nvkd }, body: fd });
const upJson = await up.json();
assertEq('Upload checkin image → 200', up.status, 200);
console.log('  Uploaded URL:', upJson.url);

// Check-in với ảnh + metadata
const r1 = await api(nvkd, `/api/customers/${cid}/interactions`, {
    method: 'POST',
    body: JSON.stringify({
        type: 'Gặp trực tiếp',
        content: 'E2E gặp khách - đã đặt cọc',
        photos: [upJson.url],
        interestLevel: 'Nóng',
        outcome: 'Đặt cọc',
        companionIds: [],
    }),
});
assertEq('NVKD check-in → 201', r1.status, 201);
assertEq('Photos stored = 1', r1.body.photos?.length, 1);
assertEq('InterestLevel stored', r1.body.interestLevel, 'Nóng');
assertEq('Outcome stored', r1.body.outcome, 'Đặt cọc');

// Verify customer side-effects
const c2 = await api(gd, `/api/customers/${cid}`);
assertEq('Customer score = 5 (Nóng)', c2.body.score, 5);
assertEq('Customer pipelineStage = Cọc', c2.body.pipelineStage, 'Cọc');
assertEq('lastContactAt set', !!c2.body.lastContactAt, true);

// NVKD thử check-in khách không phải của mình
const otherC = await api(gd, '/api/customers', { method: 'POST', body: JSON.stringify({ name: 'E2E other', phone: '0900000201' }) });
const r2 = await api(nvkd, `/api/customers/${otherC.body.id}/interactions`, {
    method: 'POST',
    body: JSON.stringify({ content: 'hack attempt' }),
});
assertEq('NVKD check-in khách người khác → 403', r2.status, 403);

// GD GET list
const r3 = await api(gd, `/api/customer-interactions?limit=50`);
assertEq('GD list status', r3.status, 200);
const found = (r3.body.data || []).some(it => it.id === r1.body.id);
assertEq('GD thấy interaction vừa tạo', found, true);

// NVKD GET list — chỉ thấy của mình
const r4 = await api(nvkd, `/api/customer-interactions?limit=50`);
assertEq('NVKD list status', r4.status, 200);
const nvkdUserId = 'cmo89vem90000ury8lpv07wf5';
const allMine = (r4.body.data || []).every(it => it.createdBy === nvkdUserId);
assertEq('NVKD chỉ thấy của mình', allMine, true);

// Cleanup
await api(gd, `/api/customers/${cid}`, { method: 'DELETE' });
await api(gd, `/api/customers/${otherC.body.id}`, { method: 'DELETE' });

console.log('\n' + (process.exitCode ? '✗ SOME FAILED' : '✓ ALL E2E PASS'));
