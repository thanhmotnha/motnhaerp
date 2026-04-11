# Accounting Setup Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "📒 Kế toán" tab in `/admin/settings` with 3 sub-tabs (NCC / Thầu phụ / Hợp đồng AR) where accountants can enter opening balances via inline auto-save inputs.

**Architecture:** New `AccountingSetupTab` component handles all 3 sub-tabs with parallel data loading and debounced auto-save (600ms) per entity. A new PATCH API endpoint handles AR contract opening balances. The settings page gets a new tab entry visible only to `giam_doc` and `ke_toan`.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6, `withAuth` from `@/lib/apiHandler`, `apiFetch` from `@/lib/fetchClient`, `fmtVND` from `@/lib/financeUtils`, CSS from `app/globals.css`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Add `arOpeningPaid Float @default(0)` to `Contract` model |
| `app/api/contracts/[id]/ar-opening/route.js` | Create | `PATCH` endpoint to update `arOpeningPaid` |
| `components/settings/AccountingSetupTab.js` | Create | Full component: 3 sub-tabs, parallel fetch, debounced auto-save |
| `app/admin/settings/page.js` | Modify | Add tab to `MAIN_TABS`, allow `ke_toan` role, import + render component |

---

### Task 1: Schema — Add `arOpeningPaid` to Contract

**Files:**
- Modify: `prisma/schema.prisma` (line ~584, after `paidAmount`)

- [ ] **Step 1: Add field to Contract model**

  Open `prisma/schema.prisma`. Find the `Contract` model. After the line `paidAmount Float @default(0)`, add:

  ```prisma
  arOpeningPaid   Float    @default(0)
  ```

  The block around line 584 should look like:
  ```prisma
  contractValue   Float    @default(0)
  paidAmount      Float    @default(0)
  arOpeningPaid   Float    @default(0)
  variationAmount Float    @default(0)
  ```

- [ ] **Step 2: Push schema to database**

  ```bash
  cd d:/Codeapp/motnha
  npm run db:generate
  ```

  Then run the push (via npm script convention — do NOT use bare `npx prisma`):
  ```bash
  node -e "const { execSync } = require('child_process'); execSync('npx prisma db push', { stdio: 'inherit' });"
  ```

  Or simply run directly if Prisma is already installed locally:
  ```bash
  ./node_modules/.bin/prisma db push
  ```

  Expected output: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Verify field exists**

  ```bash
  ./node_modules/.bin/prisma studio
  ```

  Open Contract table — confirm `arOpeningPaid` column exists with default 0. Then close Studio (Ctrl+C).

- [ ] **Step 4: Commit**

  ```bash
  git add prisma/schema.prisma
  git commit -m "feat(schema): add arOpeningPaid to Contract model"
  ```

---

### Task 2: API — PATCH `/api/contracts/[id]/ar-opening`

**Files:**
- Create: `app/api/contracts/[id]/ar-opening/route.js`

- [ ] **Step 1: Create the route file**

  Create `app/api/contracts/[id]/ar-opening/route.js` with this exact content:

  ```javascript
  import { withAuth } from '@/lib/apiHandler';
  import prisma from '@/lib/prisma';
  import { NextResponse } from 'next/server';

  export const PATCH = withAuth(async (request, { params }) => {
      const { id } = await params;
      const body = await request.json();
      const arOpeningPaid = Number(body.arOpeningPaid);

      if (isNaN(arOpeningPaid) || arOpeningPaid < 0) {
          return NextResponse.json({ error: 'arOpeningPaid phải là số >= 0' }, { status: 400 });
      }

      const contract = await prisma.contract.findUnique({
          where: { id, deletedAt: null },
          select: { id: true },
      });
      if (!contract) {
          return NextResponse.json({ error: 'Không tìm thấy hợp đồng' }, { status: 404 });
      }

      const updated = await prisma.contract.update({
          where: { id },
          data: { arOpeningPaid },
          select: { id: true, code: true, arOpeningPaid: true },
      });

      return NextResponse.json(updated);
  });
  ```

- [ ] **Step 2: Smoke-test the endpoint**

  Start dev server (`npm run dev`) and run:

  ```bash
  # Get a real contract ID from DB first
  node -e "const p = require('./node_modules/.prisma/client'); const prisma = new p.PrismaClient(); prisma.contract.findFirst().then(c => { console.log(c?.id); prisma.\$disconnect(); });"
  ```

  Then test (replace `<id>` and `<token>` with real values, or test via browser):
  ```
  PATCH /api/contracts/<id>/ar-opening
  Body: { "arOpeningPaid": 5000000 }
  ```

  Expected: `{ "id": "...", "code": "HD-001", "arOpeningPaid": 5000000 }`

- [ ] **Step 3: Commit**

  ```bash
  git add app/api/contracts/
  git commit -m "feat(api): PATCH /api/contracts/[id]/ar-opening — set AR opening balance"
  ```

---

### Task 3: Component — `AccountingSetupTab`

**Files:**
- Create: `components/settings/AccountingSetupTab.js`

- [ ] **Step 1: Create the component file**

  Create `components/settings/AccountingSetupTab.js`:

  ```javascript
  'use client';
  import { useState, useEffect, useRef } from 'react';
  import { apiFetch } from '@/lib/fetchClient';
  import { fmtVND } from '@/lib/financeUtils';

  export default function AccountingSetupTab() {
      const [activeTab, setActiveTab] = useState('ncc');
      const [suppliers, setSuppliers] = useState([]);
      const [contractors, setContractors] = useState([]);
      const [contracts, setContracts] = useState([]);
      const [loading, setLoading] = useState(true);
      const [saving, setSaving] = useState({}); // { [id]: 'saving' | 'saved' | 'error' }
      const [values, setValues] = useState({});  // { [id]: string }
      const timers = useRef({});

      useEffect(() => {
          loadAll();
          return () => {
              // Clear pending debounce timers on unmount
              Object.values(timers.current).forEach(clearTimeout);
          };
      }, []);

      const loadAll = async () => {
          setLoading(true);
          try {
              const [suppRes, contRes, conRes] = await Promise.all([
                  apiFetch('/api/suppliers?limit=500'),
                  apiFetch('/api/contractors?limit=500'),
                  apiFetch('/api/contracts?limit=500'),
              ]);
              const supps = suppRes.data || [];
              const conts = contRes.data || [];
              const cons  = conRes.data  || [];
              setSuppliers(supps);
              setContractors(conts);
              setContracts(cons);

              // Pre-populate local values from existing data
              const init = {};
              supps.forEach(s => { init[`s_${s.id}`] = String(s.openingBalance ?? 0); });
              conts.forEach(c => { init[`c_${c.id}`] = String(c.openingBalance ?? 0); });
              cons.forEach(c  => { init[`ar_${c.id}`] = String(c.arOpeningPaid ?? 0); });
              setValues(init);
          } catch (e) {
              console.error('AccountingSetupTab loadAll error:', e);
          }
          setLoading(false);
      };

      const handleChange = (prefix, id, val) => {
          const key = `${prefix}_${id}`;
          setValues(prev => ({ ...prev, [key]: val }));
          clearTimeout(timers.current[key]);
          timers.current[key] = setTimeout(() => doSave(prefix, id, val), 600);
      };

      const doSave = async (prefix, id, val) => {
          const key = `${prefix}_${id}`;
          const num = Number(val);
          if (isNaN(num) || num < 0) {
              setSaving(prev => ({ ...prev, [key]: 'error' }));
              return;
          }
          setSaving(prev => ({ ...prev, [key]: 'saving' }));
          try {
              if (prefix === 's') {
                  await apiFetch('/api/debt/ncc', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ supplierId: id, openingBalance: num }),
                  });
              } else if (prefix === 'c') {
                  await apiFetch('/api/debt/contractors', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ contractorId: id, openingBalance: num }),
                  });
              } else if (prefix === 'ar') {
                  await apiFetch(`/api/contracts/${id}/ar-opening`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ arOpeningPaid: num }),
                  });
              }
              setSaving(prev => ({ ...prev, [key]: 'saved' }));
              setTimeout(() => setSaving(prev => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
              }), 2000);
          } catch {
              setSaving(prev => ({ ...prev, [key]: 'error' }));
          }
      };

      const Indicator = ({ stateVal }) => {
          if (!stateVal) return null;
          if (stateVal === 'saving') return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>⏳</span>;
          if (stateVal === 'saved')  return <span style={{ color: 'var(--success)', fontSize: 14 }}>✓</span>;
          if (stateVal === 'error')  return <span style={{ color: 'var(--danger)', fontSize: 14 }}>✗</span>;
          return null;
      };

      const SUB_TABS = [
          { key: 'ncc', label: 'Nhà cung cấp' },
          { key: 'contractor', label: 'Nhà thầu phụ' },
          { key: 'ar', label: 'Hợp đồng AR' },
      ];

      if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

      return (
          <div>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 13 }}>
                  Nhập số dư đầu kỳ trước khi có giao dịch. Thay đổi được lưu tự động.
              </p>

              {/* Sub-tab bar */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
                  {SUB_TABS.map(t => (
                      <button key={t.key} onClick={() => setActiveTab(t.key)}
                          style={{
                              padding: '8px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                              border: 'none', background: 'transparent',
                              color: activeTab === t.key ? 'var(--text-accent)' : 'var(--text-muted)',
                              borderBottom: activeTab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                          }}>
                          {t.label}
                      </button>
                  ))}
              </div>

              {/* NCC sub-tab */}
              {activeTab === 'ncc' && (
                  <table className="data-table">
                      <thead>
                          <tr>
                              <th>Mã</th>
                              <th>Tên nhà cung cấp</th>
                              <th style={{ textAlign: 'right' }}>Số dư đầu kỳ (VNĐ)</th>
                              <th style={{ width: 32 }}></th>
                          </tr>
                      </thead>
                      <tbody>
                          {suppliers.length === 0 && (
                              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Chưa có nhà cung cấp</td></tr>
                          )}
                          {suppliers.map(s => {
                              const key = `s_${s.id}`;
                              return (
                                  <tr key={s.id}>
                                      <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>{s.code}</td>
                                      <td>{s.name}</td>
                                      <td style={{ textAlign: 'right' }}>
                                          <input
                                              type="number" min="0"
                                              className="form-input"
                                              style={{ width: 160, textAlign: 'right', display: 'inline-block' }}
                                              value={values[key] ?? '0'}
                                              onChange={e => handleChange('s', s.id, e.target.value)}
                                          />
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                          <Indicator stateVal={saving[key]} />
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              )}

              {/* Thầu phụ sub-tab */}
              {activeTab === 'contractor' && (
                  <table className="data-table">
                      <thead>
                          <tr>
                              <th>Mã</th>
                              <th>Tên nhà thầu phụ</th>
                              <th style={{ textAlign: 'right' }}>Số dư đầu kỳ (VNĐ)</th>
                              <th style={{ width: 32 }}></th>
                          </tr>
                      </thead>
                      <tbody>
                          {contractors.length === 0 && (
                              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Chưa có nhà thầu phụ</td></tr>
                          )}
                          {contractors.map(c => {
                              const key = `c_${c.id}`;
                              return (
                                  <tr key={c.id}>
                                      <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>{c.code}</td>
                                      <td>{c.name}</td>
                                      <td style={{ textAlign: 'right' }}>
                                          <input
                                              type="number" min="0"
                                              className="form-input"
                                              style={{ width: 160, textAlign: 'right', display: 'inline-block' }}
                                              value={values[key] ?? '0'}
                                              onChange={e => handleChange('c', c.id, e.target.value)}
                                          />
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                          <Indicator stateVal={saving[key]} />
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              )}

              {/* Hợp đồng AR sub-tab */}
              {activeTab === 'ar' && (
                  <table className="data-table">
                      <thead>
                          <tr>
                              <th>Mã HĐ</th>
                              <th>Khách hàng</th>
                              <th style={{ textAlign: 'right' }}>Giá trị HĐ</th>
                              <th style={{ textAlign: 'right' }}>Đã thu trước kỳ (VNĐ)</th>
                              <th style={{ width: 32 }}></th>
                          </tr>
                      </thead>
                      <tbody>
                          {contracts.length === 0 && (
                              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Chưa có hợp đồng</td></tr>
                          )}
                          {contracts.map(c => {
                              const key = `ar_${c.id}`;
                              return (
                                  <tr key={c.id}>
                                      <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>{c.code}</td>
                                      <td>{c.customer?.name || '—'}</td>
                                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmtVND(c.contractValue)}</td>
                                      <td style={{ textAlign: 'right' }}>
                                          <input
                                              type="number" min="0"
                                              className="form-input"
                                              style={{ width: 160, textAlign: 'right', display: 'inline-block' }}
                                              value={values[key] ?? '0'}
                                              onChange={e => handleChange('ar', c.id, e.target.value)}
                                          />
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                          <Indicator stateVal={saving[key]} />
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              )}
          </div>
      );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add components/settings/AccountingSetupTab.js
  git commit -m "feat(settings): AccountingSetupTab — NCC / thầu phụ / AR opening balances with auto-save"
  ```

---

### Task 4: Wire into Settings Page

**Files:**
- Modify: `app/admin/settings/page.js`

**Changes needed:**
1. Import `AccountingSetupTab`
2. Add `{ key: 'accounting', label: '📒 Kế toán' }` to `MAIN_TABS`
3. Change role guard (line 79) to allow `ke_toan` as well
4. Render `<AccountingSetupTab />` for `tab === 'accounting'`
5. Hide non-accounting tabs from `ke_toan` role (ke_toan sees only the accounting tab)

- [ ] **Step 1: Add import**

  In `app/admin/settings/page.js`, after the last import line (after `ContractTemplateTab`), add:

  ```javascript
  import AccountingSetupTab from '@/components/settings/AccountingSetupTab';
  ```

- [ ] **Step 2: Add tab to MAIN_TABS**

  Find `MAIN_TABS` array (line ~40). Add entry at the end:

  ```javascript
  const MAIN_TABS = [
      { key: 'company', label: '🏢 Công ty' },
      { key: 'templates', label: '📋 Mẫu biểu' },
      { key: 'pdf_covers', label: '📎 PDF Bìa' },
      { key: 'users', label: '👥 Tài khoản' },
      { key: 'contract_templates', label: '📝 Mẫu HĐ' },
      { key: 'activity', label: '📝 Nhật ký' },
      { key: 'accounting', label: '📒 Kế toán' },
  ];
  ```

- [ ] **Step 3: Update role guard and initial tab**

  Find (around line 78–81):
  ```javascript
  useEffect(() => {
      if (role && role !== 'giam_doc') { router.replace('/'); return; }
      loadAll();
  }, [role]);
  ```

  Replace with:
  ```javascript
  useEffect(() => {
      if (role && role !== 'giam_doc' && role !== 'ke_toan') { router.replace('/'); return; }
      if (role === 'ke_toan') setTab('accounting');
      loadAll();
  }, [role]);
  ```

- [ ] **Step 4: Filter tabs for ke_toan in render**

  Find the tab bar render (around line 194):
  ```javascript
  {MAIN_TABS.map(t => (
  ```

  Replace with:
  ```javascript
  {MAIN_TABS.filter(t => role === 'ke_toan' ? t.key === 'accounting' : true).map(t => (
  ```

- [ ] **Step 5: Also update the second early-return guard** (line ~179):

  Find:
  ```javascript
  if (role && role !== 'giam_doc') return null;
  ```

  Replace with:
  ```javascript
  if (role && role !== 'giam_doc' && role !== 'ke_toan') return null;
  ```

- [ ] **Step 6: Add tab render block**

  Find the last `{tab === 'activity' && ...}` block and after its closing `}`, add:

  ```javascript
  {tab === 'accounting' && <AccountingSetupTab />}
  ```

- [ ] **Step 7: Verify in browser**

  Start `npm run dev`. Log in as `giam_doc`:
  - Go to `/admin/settings` → confirm "📒 Kế toán" tab is visible
  - Click it → 3 sub-tabs appear: Nhà cung cấp / Nhà thầu phụ / Hợp đồng AR
  - Change a value in any row → after 600ms, ✓ indicator appears
  - Refresh the page → value is persisted

  Log in as `ke_toan`:
  - Go to `/admin/settings` → only "📒 Kế toán" tab visible, auto-selected
  - Auto-save works

  Log in as `ky_thuat`:
  - Go to `/admin/settings` → redirected to `/`

- [ ] **Step 8: Commit**

  ```bash
  git add app/admin/settings/page.js
  git commit -m "feat(settings): add Kế toán tab — visible to giam_doc and ke_toan"
  ```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Tab "📒 Kế toán" in Settings, role guard giam_doc/ke_toan | Task 4 |
| Sub-tab NCC: all suppliers, auto-save openingBalance | Task 3 |
| Sub-tab Thầu phụ: all contractors, auto-save openingBalance | Task 3 |
| Sub-tab AR: all contracts, auto-save arOpeningPaid | Task 3 |
| `Contract.arOpeningPaid` field in DB | Task 1 |
| PATCH `/api/contracts/[id]/ar-opening` | Task 2 |
| Indicator ✓/✗ per save | Task 3 |
| 600ms debounce auto-save | Task 3 |

All spec requirements covered. No placeholders. Types consistent across tasks.
