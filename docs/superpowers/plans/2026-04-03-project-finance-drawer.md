# Project Finance Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm drawer tài chính chi tiết (thu/chi/lợi nhuận) mở từ bảng P&L khi click vào tên dự án, không cần rời khỏi trang.

**Architecture:** Tạo component `ProjectFinanceDrawer` fetch `GET /api/reports/project-settlement/[id]` (đã có sẵn). Trang P&L thêm state `drawerProjectId`, click tên dự án → set state → drawer render. Không thêm API mới.

**Tech Stack:** Next.js 16 App Router, React 19, `apiFetch` từ `@/lib/fetchClient`, inline CSS với `var(--*)` CSS variables, lucide-react icons.

---

## File Structure

| File | Action | Trách nhiệm |
|---|---|---|
| `components/reports/ProjectFinanceDrawer.js` | Tạo mới | Drawer component: fetch settlement API, hiển thị 4 KPI + 2 cột A/B + profit bar |
| `app/reports/pl-by-project/page.js` | Sửa | Thêm `drawerProjectId` state, click handler trên tên dự án, render drawer |

---

### Task 1: Tạo ProjectFinanceDrawer component

**Files:**
- Create: `components/reports/ProjectFinanceDrawer.js`

**Context cần biết:**
- API endpoint: `GET /api/reports/project-settlement/[id]` — trả về object có shape:
  ```js
  {
    project: { id, code, name, status, customer, progress, startDate, endDate },
    revenue: { contractValue, variations, addenda, totalValue, received, outstanding },
    costs: { expenses, purchaseOrders, contractorPayments, retention, totalCost, byCategory },
    profitability: { grossProfit, grossMargin, budget, budgetVariance, budgetUtilization },
    details: {
      contracts: [{ id, code, name, value, paid, payments }],
      purchaseOrders: [{ id, code, supplier, totalAmount, paidAmount, status }],
      contractorPayments: [{ id, contractAmount, paidAmount, netAmount, phase, status, retentionAmount, contractor: { name } }],
      expenses: [{ id, code, description, amount, category, date }], // alloc có prefix "[Phân bổ]"
    },
    milestones: [],
  }
  ```
- Auth: `apiFetch` từ `@/lib/fetchClient` tự kèm session cookie
- CSS: dùng `var(--bg-primary)`, `var(--border)`, `var(--text-secondary)` — không tạo CSS file riêng
- Lucide icons: `X`, `ExternalLink` từ `lucide-react`
- `fmt` helper: `new Intl.NumberFormat('vi-VN').format(Math.round(n || 0))`

- [ ] **Step 1: Tạo file với skeleton cơ bản**

```js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetchClient';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));

export default function ProjectFinanceDrawer({ projectId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleEsc = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [handleEsc]);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        setData(null);
        apiFetch(`/api/reports/project-settlement/${projectId}`)
            .then(d => setData(d))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [projectId]);

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.4)',
                }}
            />
            {/* Drawer */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1001,
                width: 'min(640px, 100vw)',
                background: 'var(--bg-primary, #fff)',
                boxShadow: '-4px 0 32px rgba(0,0,0,0.15)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
            }}>
                <DrawerHeader data={data} onClose={onClose} />
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                    {loading && <LoadingSkeleton />}
                    {error && <ErrorState message={error} />}
                    {data && <DrawerBody data={data} />}
                </div>
            </div>
        </>
    );
}
```

- [ ] **Step 2: Thêm DrawerHeader component (trong cùng file)**

```js
function DrawerHeader({ data, onClose }) {
    const p = data?.project;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border, #e5e7eb)',
            background: 'var(--bg-secondary, #f9fafb)',
            flexShrink: 0,
        }}>
            <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {p ? `${p.code} — ${p.name}` : 'Đang tải...'}
                </div>
                {p && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', marginTop: 2 }}>
                        {p.customer} {p.status && `· ${p.status}`}
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {p && (
                    <Link
                        href={`/reports/settlement/${p.id}`}
                        title="Xem đầy đủ"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 12, color: '#3b82f6', textDecoration: 'none',
                            padding: '4px 10px', border: '1px solid #bfdbfe',
                            borderRadius: 6, background: '#eff6ff',
                        }}
                    >
                        <ExternalLink size={12} /> Xem đầy đủ
                    </Link>
                )}
                <button
                    onClick={onClose}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 6, borderRadius: 8,
                        color: 'var(--text-secondary, #6b7280)',
                    }}
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Thêm KPI cards (trong DrawerBody)**

```js
function DrawerBody({ data }) {
    const { revenue, costs, profitability } = data;
    const isProfit = profitability.grossProfit >= 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 4 KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <KpiCard label="Giá trị HĐ" value={fmt(revenue.totalValue)} color="#3b82f6" sub={revenue.variations > 0 ? `+${fmt(revenue.variations)} phát sinh` : null} />
                <KpiCard label="Đã thu" value={fmt(revenue.received)} color="#16a34a" sub={revenue.outstanding > 0 ? `Còn nợ: ${fmt(revenue.outstanding)}` : 'Đã thu đủ'} subColor={revenue.outstanding > 0 ? '#dc2626' : '#16a34a'} />
                <KpiCard label="Tổng chi phí" value={fmt(costs.totalCost)} color="#dc2626" sub={`PO + Thầu + Chi phí`} />
                <KpiCard
                    label="Lợi nhuận"
                    value={(isProfit ? '' : '-') + fmt(Math.abs(profitability.grossProfit))}
                    color={isProfit ? '#16a34a' : '#dc2626'}
                    sub={`Tỷ suất ${profitability.grossMargin}%`}
                    subColor={isProfit ? '#16a34a' : '#dc2626'}
                    highlight
                />
            </div>

            {/* A / B columns */}
            <SideAB data={data} />

            {/* Profit bar */}
            <ProfitBar profit={profitability.grossProfit} margin={profitability.grossMargin} revenue={revenue.received} />
        </div>
    );
}

function KpiCard({ label, value, color, sub, subColor, highlight }) {
    return (
        <div style={{
            background: highlight ? (color + '10') : 'var(--bg-secondary, #f9fafb)',
            border: `1px solid ${highlight ? color + '40' : 'var(--border, #e5e7eb)'}`,
            borderRadius: 10, padding: '12px 14px',
        }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary, #6b7280)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: subColor || 'var(--text-secondary, #6b7280)', marginTop: 2 }}>{sub}</div>}
        </div>
    );
}
```

- [ ] **Step 4: Thêm SideAB component (Bên A/B)**

```js
function SideAB({ data }) {
    const { details, revenue, costs } = data;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* BÊN A */}
            <div style={{ border: '1px solid #bfdbfe', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ background: '#1d4ed8', color: '#fff', padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>
                    BÊN A — DOANH THU
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {details.contracts.map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid #f0f4ff' }}>
                            <span style={{ color: 'var(--text-secondary, #6b7280)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.name}>{c.code}</span>
                            <span style={{ fontWeight: 500 }}>{fmt(c.value)}</span>
                        </div>
                    ))}
                    <SideRow label="Tổng giá trị HĐ" value={fmt(revenue.totalValue)} bold color="#1d4ed8" />
                    <div style={{ height: 8 }} />
                    <SideRow label="✓ Đã thu" value={fmt(revenue.received)} color="#16a34a" bold />
                    {revenue.outstanding > 0 && (
                        <div style={{ background: '#fef3c7', borderRadius: 6, padding: '6px 8px', display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                            <span style={{ color: '#b45309', fontWeight: 600 }}>KH còn nợ</span>
                            <span style={{ color: '#b45309', fontWeight: 700 }}>{fmt(revenue.outstanding)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* BÊN B */}
            <div style={{ border: '1px solid #fecaca', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ background: '#b91c1c', color: '#fff', padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>
                    BÊN B — CHI PHÍ
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {costs.purchaseOrders > 0 && <SideRow label="Nhập vật tư (PO)" value={fmt(costs.purchaseOrders)} />}
                    {costs.contractorPayments > 0 && <SideRow label="Thầu phụ" value={fmt(costs.contractorPayments)} />}
                    {costs.expenses > 0 && <SideRow label="Chi phí phát sinh" value={fmt(costs.expenses)} />}
                    <SideRow label="Tổng chi bên B" value={fmt(costs.totalCost)} bold color="#b91c1c" />
                    {costs.totalCost > 0 && (() => {
                        const totalPaid = details.purchaseOrders.reduce((s, p) => s + (p.paidAmount || 0), 0)
                            + details.contractorPayments.reduce((s, c) => s + (c.paidAmount || 0), 0);
                        const remaining = costs.totalCost - totalPaid;
                        return remaining > 0 ? (
                            <div style={{ background: '#fef3c7', borderRadius: 6, padding: '6px 8px', display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                                <span style={{ color: '#b45309', fontWeight: 600 }}>Còn phải trả</span>
                                <span style={{ color: '#b45309', fontWeight: 700 }}>{fmt(remaining)}</span>
                            </div>
                        ) : null;
                    })()}
                </div>
            </div>
        </div>
    );
}

function SideRow({ label, value, bold, color }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid #f9f9f9' }}>
            <span style={{ color: color || 'var(--text-secondary, #6b7280)', fontWeight: bold ? 700 : 400 }}>{label}</span>
            <span style={{ fontWeight: bold ? 700 : 500, color: color || 'inherit' }}>{value}</span>
        </div>
    );
}
```

- [ ] **Step 5: Thêm ProfitBar, LoadingSkeleton, ErrorState**

```js
function ProfitBar({ profit, margin, revenue }) {
    const isProfit = profit >= 0;
    const barWidth = revenue > 0 ? Math.min(Math.abs(margin), 100) : 0;
    return (
        <div style={{
            background: isProfit ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${isProfit ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
        }}>
            <div style={{ fontWeight: 700, color: isProfit ? '#15803d' : '#dc2626', fontSize: 13, whiteSpace: 'nowrap' }}>
                {isProfit ? '📈' : '📉'} LỢI NHUẬN GỘP
            </div>
            <div style={{ flex: 1, background: isProfit ? '#dcfce7' : '#fee2e2', borderRadius: 4, height: 10, overflow: 'hidden' }}>
                <div style={{ background: isProfit ? '#16a34a' : '#dc2626', height: '100%', width: `${barWidth}%`, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: isProfit ? '#15803d' : '#dc2626', whiteSpace: 'nowrap' }}>
                {(isProfit ? '' : '-')}{fmt(Math.abs(profit))}đ
            </div>
            <div style={{
                background: isProfit ? '#15803d' : '#dc2626', color: '#fff',
                padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
            }}>
                {margin}%
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: 0.5 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                {[1,2,3,4].map(i => <div key={i} style={{ height: 72, background: 'var(--bg-secondary, #f3f4f6)', borderRadius: 10 }} />)}
            </div>
            <div style={{ height: 160, background: 'var(--bg-secondary, #f3f4f6)', borderRadius: 10 }} />
            <div style={{ height: 52, background: 'var(--bg-secondary, #f3f4f6)', borderRadius: 10 }} />
        </div>
    );
}

function ErrorState({ message }) {
    return (
        <div style={{ padding: 20, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>
            Lỗi tải dữ liệu: {message}
        </div>
    );
}
```

- [ ] **Step 6: Verify build**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓|Failed"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 7: Commit**

```bash
git add components/reports/ProjectFinanceDrawer.js
git commit -m "feat(reports): add ProjectFinanceDrawer component"
```

---

### Task 2: Wire drawer vào trang P&L

**Files:**
- Modify: `app/reports/pl-by-project/page.js`

**Context cần biết:**
- File hiện tại 289 dòng, `'use client'`, dùng React hooks + lucide-react
- Row dự án ở dòng 176–210: `<tr key={r.id}>` với cell đầu tiên chứa code + name
- Cell cuối cùng (dòng 204–208) là ExternalLink sang `/projects/${r.code}` — **giữ nguyên**, thêm click vào cell tên
- Import thêm: `ProjectFinanceDrawer` từ `@/components/reports/ProjectFinanceDrawer`
- State mới: `drawerProjectId` (string | null) — id của dự án đang xem trong drawer

- [ ] **Step 1: Thêm import và state**

Ở đầu file, thêm import:
```js
import ProjectFinanceDrawer from '@/components/reports/ProjectFinanceDrawer';
```

Trong `PLByProjectPage()`, sau dòng `const [sortDir, setSortDir] = useState('asc');` thêm:
```js
const [drawerProjectId, setDrawerProjectId] = useState(null);
```

- [ ] **Step 2: Làm tên dự án clickable**

Tìm cell đầu tiên trong row (dòng ~177–181 hiện tại):
```js
<td style={td}>
    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{r.code || '—'}</div>
    <div style={{ color: '#374151', maxWidth: 220 }}>{r.name}</div>
    {r.alert && <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#b45309', fontSize: 11, marginTop: 2 }}><AlertTriangle size={11} /> Margin thấp</div>}
</td>
```

Thay bằng:
```js
<td style={{ ...td, cursor: 'pointer' }} onClick={() => setDrawerProjectId(r.id)} title="Xem chi tiết tài chính">
    <div style={{ fontWeight: 600, fontSize: 12.5, color: '#2563eb' }}>{r.code || '—'}</div>
    <div style={{ color: '#374151', maxWidth: 220, textDecoration: 'underline', textDecorationColor: '#bfdbfe' }}>{r.name}</div>
    {r.alert && <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#b45309', fontSize: 11, marginTop: 2 }}><AlertTriangle size={11} /> Margin thấp</div>}
</td>
```

- [ ] **Step 3: Render drawer**

Ngay trước dòng `</div>` cuối cùng đóng toàn bộ return (trước `<style>{...}</style>`), thêm:
```js
{drawerProjectId && (
    <ProjectFinanceDrawer
        projectId={drawerProjectId}
        onClose={() => setDrawerProjectId(null)}
    />
)}
```

- [ ] **Step 4: Verify build**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓|Failed"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Manual test**

1. Mở `http://localhost:3000/reports/pl-by-project`
2. Click vào tên một dự án → drawer mở từ phải
3. Kiểm tra: 4 KPI cards hiển thị đúng số, 2 cột Bên A/Bên B, thanh lợi nhuận
4. Bấm nút X → drawer đóng, bảng P&L vẫn nguyên
5. Bấm Escape → drawer đóng
6. Click backdrop → drawer đóng
7. Click "Xem đầy đủ →" → navigate sang `/reports/settlement/[id]`
8. Click dự án khác ngay sau khi đóng → drawer mở lại đúng dự án mới

- [ ] **Step 6: Commit**

```bash
git add app/reports/pl-by-project/page.js
git commit -m "feat(reports): wire finance drawer into P&L table — click project name to view detail"
```

- [ ] **Step 7: Push**

```bash
git push origin main
```
