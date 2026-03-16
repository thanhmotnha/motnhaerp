#!/usr/bin/env node
/**
 * Full Test — Một Nhà ERP
 * Kiểm tra tất cả pages + API routes trả về HTTP 200
 * Usage: node scripts/full-test.mjs
 */

const BASE = 'http://localhost:3000';

// ═══════════════════════════════════════════
// 1. ALL PAGES (frontend routes)
// ═══════════════════════════════════════════
const PAGES = [
  // Dashboard
  '/',
  '/login',

  // Khách hàng
  '/customers',

  // Báo giá
  '/quotations',
  '/quotations/create',

  // Hợp đồng
  '/contracts',
  '/contracts/create',

  // Dự án
  '/projects',
  '/projects/create',
  '/schedules',
  '/daily-logs',
  '/acceptance',
  '/contractors',

  // Đơn hàng nội thất
  '/furniture-orders',
  '/furniture-orders/create',

  // Sản xuất
  '/production',
  '/work-orders',
  '/material-plans',

  // Kho
  '/inventory',

  // Nhân sự
  '/hr',

  // Tài chính
  '/accounting',
  '/expenses',
  '/budget',

  // Admin
  '/admin/users',
  '/admin/settings',

  // Workshops
  '/workshops',
];

// ═══════════════════════════════════════════
// 2. ALL API ROUTES
// ═══════════════════════════════════════════
const API_ROUTES = [
  // Core CRUD
  { method: 'GET', path: '/api/customers' },
  { method: 'GET', path: '/api/quotations' },
  { method: 'GET', path: '/api/contracts' },
  { method: 'GET', path: '/api/projects' },
  { method: 'GET', path: '/api/schedules' },
  { method: 'GET', path: '/api/furniture-orders' },
  { method: 'GET', path: '/api/production-batches' },
  { method: 'GET', path: '/api/inventory' },
  { method: 'GET', path: '/api/employees' },
  { method: 'GET', path: '/api/accounting/entries' },

  // Phase 4+
  { method: 'GET', path: '/api/customer-interactions' },
  { method: 'GET', path: '/api/employee-reviews' },
  { method: 'GET', path: '/api/salary-advances' },

  // Phase 5
  { method: 'GET', path: '/api/employee-contracts' },
  { method: 'GET', path: '/api/production-costs' },
  { method: 'GET', path: '/api/warranties' },

  // Phase 6
  { method: 'GET', path: '/api/warehouse-transfers' },
  { method: 'GET', path: '/api/account-entries' },

  // Phase 7
  { method: 'GET', path: '/api/work-orders' },
  { method: 'GET', path: '/api/material-plans' },
  { method: 'GET', path: '/api/notifications' },

  // Phase 8
  { method: 'GET', path: '/api/daily-logs' },
  { method: 'GET', path: '/api/acceptance' },
  { method: 'GET', path: '/api/contractors' },
  { method: 'GET', path: '/api/expenses' },
  { method: 'GET', path: '/api/budget' },

  // Dashboard
  { method: 'GET', path: '/api/dashboard/stats' },
  { method: 'GET', path: '/api/dashboard/activity' },

  // Admin
  { method: 'GET', path: '/api/admin/users' },
  { method: 'GET', path: '/api/admin/settings' },

  // Auth
  { method: 'POST', path: '/api/auth/login', body: { email: 'test@test.com', password: 'wrong' } },

  // Misc
  { method: 'GET', path: '/api/workshops' },
  { method: 'GET', path: '/api/products' },
  { method: 'GET', path: '/api/suppliers' },
  { method: 'GET', path: '/api/categories' },
];

// ═══════════════════════════════════════════
// Test Runner
// ═══════════════════════════════════════════

const results = { pass: 0, fail: 0, errors: [] };

async function testUrl(label, url, options = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    clearTimeout(timeout);

    // Pages: 200 or redirect to login (302→200)
    // APIs: 200, 401 (auth required), 400 (bad request) are all acceptable
    const ok = res.status < 500;

    if (ok) {
      results.pass++;
      console.log(`  ✅ ${label} → ${res.status}`);
    } else {
      results.fail++;
      const body = await res.text().catch(() => '');
      results.errors.push({ label, status: res.status, body: body.slice(0, 200) });
      console.log(`  ❌ ${label} → ${res.status}`);
    }
    return res.status;
  } catch (err) {
    results.fail++;
    results.errors.push({ label, error: err.message });
    console.log(`  ❌ ${label} → ERROR: ${err.message}`);
    return 0;
  }
}

async function runTests() {
  console.log('\n══════════════════════════════════════════');
  console.log('  Một Nhà ERP — Full Test Suite');
  console.log('══════════════════════════════════════════\n');

  // Check server is running
  try {
    await fetch(BASE, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.log('❌ Dev server not running at ' + BASE);
    console.log('   Run: npm run dev');
    process.exit(1);
  }

  // Test Pages
  console.log('\n📄 PAGES (' + PAGES.length + ' routes)\n');
  for (const page of PAGES) {
    await testUrl(`PAGE ${page}`, `${BASE}${page}`);
  }

  // Test APIs
  console.log('\n🔌 API ROUTES (' + API_ROUTES.length + ' endpoints)\n');
  for (const api of API_ROUTES) {
    const opts = { method: api.method };
    if (api.body) opts.body = JSON.stringify(api.body);
    await testUrl(`${api.method} ${api.path}`, `${BASE}${api.path}`, opts);
  }

  // Summary
  console.log('\n══════════════════════════════════════════');
  console.log(`  RESULTS: ${results.pass} passed, ${results.fail} failed`);
  console.log(`  Total:   ${results.pass + results.fail} tests`);
  console.log('══════════════════════════════════════════\n');

  if (results.errors.length > 0) {
    console.log('❌ FAILURES:\n');
    for (const err of results.errors) {
      console.log(`  → ${err.label}`);
      if (err.status) console.log(`    Status: ${err.status}`);
      if (err.error) console.log(`    Error: ${err.error}`);
      if (err.body) console.log(`    Body: ${err.body.slice(0, 100)}`);
      console.log();
    }
  }

  process.exit(results.fail > 0 ? 1 : 0);
}

runTests();
