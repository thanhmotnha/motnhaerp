# Overhead Allocation Summary — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm bảng tổng hợp phân bổ chi phí chung — tab "Tổng hợp" trong /overhead và section chi phí chung trong trang dự án.

**Architecture:** Tạo 1 API endpoint mới `GET /api/overhead/summary` query từ OverheadAllocation/OverheadBatch đã có trong DB. Frontend: thêm tab thứ 3 vào `app/overhead/page.js` với 2 view toggle, và thêm section cuối `OverviewTab.js` trong project detail.

**Tech Stack:** Next.js 16 App Router, Prisma 6, React 19, `withAuth()`, `apiFetch()`

---

### Task 1: API GET /api/overhead/summary

**Files:**
- Create: `app/api/overhead/summary/route.js`

- [ ] **Step 1: Tạo file route**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const yearParam = parseInt(searchParams.get('year'), 10);
    const year = Number.isFinite(yearParam) ? yearParam : new Date().getFullYear();
    const projectId = searchParams.get('projectId') || null;

    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    // Mode: projectId → trả allocations của 1 dự án
    if (projectId) {
        const allocations = await prisma.overheadAllocation.findMany({
            where: {
                projectId,
                batch: {
                    status: 'confirmed',
                    confirmedAt: { gte: start, lt: end },
                },
            },
            include: {
                batch: {
                    select: { id: true, code: true, name: true, period: true, confirmedAt: true, totalAmount: true },
                },
            },
            orderBy: { batch: { period: 'asc' } },
        });

        const total = allocations.reduce((s, a) => s + a.amount, 0);
        return NextResponse.json({
            year,
            allocations: allocations.map(a => ({
                batchId: a.batchId,
                batchCode: a.batch.code,
                batchName: a.batch.name,
                period: a.batch.period,
                totalBatchAmount: a.batch.totalAmount,
                confirmedAt: a.batch.confirmedAt,
                amount: a.amount,
                ratio: a.ratio,
            })),
            total,
        });
    }

    // Mode: toàn bộ → trả batches + allocations grouped
    const batches = await prisma.overheadBatch.findMany({
        where: {
            status: 'confirmed',
            confirmedAt: { gte: start, lt: end },
            deletedAt: null,
        },
        include: {
            allocations: {
                include: {
                    project: { select: { id: true, code: true, name: true } },
                },
                orderBy: { amount: 'desc' },
            },
        },
        orderBy: { period: 'asc' },
    });

    // Build unique projects list with totals
    const projectMap = {};
    for (const batch of batches) {
        for (const alloc of batch.allocations) {
            const p = alloc.project;
            if (!projectMap[p.id]) {
                projectMap[p.id] = { id: p.id, code: p.code, name: p.name, totalAllocated: 0 };
            }
            projectMap[p.id].totalAllocated += alloc.amount;
        }
    }

    return NextResponse.json({
        year,
        batches: batches.map(b => ({
            id: b.id,
            code: b.code,
            name: b.name,
            period: b.period,
            totalAmount: b.totalAmount,
            confirmedAt: b.confirmedAt,
            allocations: b.allocations.map(a => ({
                projectId: a.projectId,
                projectCode: a.project.code,
                projectName: a.project.name,
                amount: a.amount,
                ratio: a.ratio,
            })),
        })),
        projects: Object.values(projectMap).sort((a, b) => b.totalAllocated - a.totalAllocated),
    });
});
```

- [ ] **Step 2: Test thủ công — không có projectId**

```bash
curl "http://localhost:3000/api/overhead/summary?year=2026"
```

Expected: `{ year: 2026, batches: [...], projects: [...] }`

- [ ] **Step 3: Test với projectId**

```bash
curl "http://localhost:3000/api/overhead/summary?year=2026&projectId=PROJECT_ID"
```

Expected: `{ year: 2026, allocations: [...], total: number }`

- [ ] **Step 4: Commit**

```bash
git add app/api/overhead/summary/route.js
git commit -m "feat(api): GET /api/overhead/summary — overhead allocation summary"
```

---

### Task 2: Tab "Tổng hợp" trong /overhead/page.js

**Files:**
- Modify: `app/overhead/page.js`

Tab hiện có 2 tabs: `expenses` và `batches`. Thêm tab thứ 3: `summary`.

- [ ] **Step 1: Thêm state cho tab summary**

Trong `OverheadPage()`, sau dòng `const [viewBatchId, setViewBatchId] = useState(null);`, thêm:

```javascript
// Summary tab state
const [summaryData, setSummaryData] = useState(null);
const [summaryLoading, setSummaryLoading] = useState(false);
const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
const [summaryView, setSummaryView] = useState('by-project'); // 'by-project' | 'by-batch'
```

- [ ] **Step 2: Thêm fetchSummary function**

Sau `fetchBatches`, thêm:

```javascript
const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
        const res = await apiFetch(`/api/overhead/summary?year=${summaryYear}`);
        setSummaryData(res);
    } catch (e) { toast.error(e.message); }
    setSummaryLoading(false);
}, [summaryYear]);

useEffect(() => { if (activeTab === 'summary') fetchSummary(); }, [activeTab, fetchSummary]);
```

- [ ] **Step 3: Cập nhật tab bar**

Tìm dòng:
```javascript
{[['expenses', '📋 Chi phí'], ['batches', '📊 Đợt phân bổ']].map(([key, label]) => (
```

Thay bằng:
```javascript
{[['expenses', '📋 Chi phí'], ['batches', '📊 Đợt phân bổ'], ['summary', '📈 Tổng hợp']].map(([key, label]) => (
```

- [ ] **Step 4: Thêm render tab summary**

Trước dòng `{showExpForm && (`, thêm block render:

```javascript
{activeTab === 'summary' && (
    <div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            <select className="form-select" value={summaryYear}
                onChange={e => setSummaryYear(Number(e.target.value))}
                style={{ width: 120 }}>
                {[0, 1, 2].map(offset => {
                    const y = new Date().getFullYear() - offset;
                    return <option key={y} value={y}>Năm {y}</option>;
                })}
            </select>
            <div style={{ display: 'flex', gap: 4 }}>
                {[['by-project', '👷 Theo dự án'], ['by-batch', '📦 Theo đợt']].map(([v, label]) => (
                    <button key={v} className={`btn btn-sm${summaryView === v ? ' btn-primary' : ''}`}
                        onClick={() => setSummaryView(v)}>{label}</button>
                ))}
            </div>
        </div>

        {summaryLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
        ) : !summaryData ? null : summaryView === 'by-project' ? (
            <SummaryByProject data={summaryData} fmt={fmt} />
        ) : (
            <SummaryByBatch data={summaryData} fmt={fmt} />
        )}
    </div>
)}
```

- [ ] **Step 5: Thêm component SummaryByProject cuối file**

Thêm sau closing brace của `BatchDetailModal` (hoặc cuối file), trước `export default`:

```javascript
function SummaryByProject({ data, fmt }) {
    const { batches, projects } = data;
    if (!batches.length) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Chưa có đợt phân bổ nào được xác nhận trong năm này.
        </div>
    );

    // Build lookup: projectId → batchId → amount
    const lookup = {};
    for (const b of batches) {
        for (const a of b.allocations) {
            if (!lookup[a.projectId]) lookup[a.projectId] = {};
            lookup[a.projectId][b.id] = a;
        }
    }

    return (
        <div className="card" style={{ overflow: 'auto' }}>
            <table className="data-table">
                <thead>
                    <tr>
                        <th style={{ minWidth: 180 }}>Dự án</th>
                        {batches.map(b => (
                            <th key={b.id} style={{ textAlign: 'right', minWidth: 130 }}>
                                {b.code}
                                {b.period && <div style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}>{b.period}</div>}
                            </th>
                        ))}
                        <th style={{ textAlign: 'right', minWidth: 130, color: 'var(--primary)' }}>Tổng cộng</th>
                    </tr>
                </thead>
                <tbody>
                    {projects.map(p => (
                        <tr key={p.id}>
                            <td>
                                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{p.code}</span>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.name}</div>
                            </td>
                            {batches.map(b => {
                                const a = lookup[p.id]?.[b.id];
                                return (
                                    <td key={b.id} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                        {a ? (
                                            <>
                                                {fmt(a.amount)}đ
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.ratio}%</div>
                                            </>
                                        ) : '—'}
                                    </td>
                                );
                            })}
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                                {fmt(p.totalAllocated)}đ
                            </td>
                        </tr>
                    ))}
                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                        <td>Tổng đợt</td>
                        {batches.map(b => (
                            <td key={b.id} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                {fmt(b.totalAmount)}đ
                            </td>
                        ))}
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--primary)' }}>
                            {fmt(batches.reduce((s, b) => s + b.totalAmount, 0))}đ
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function SummaryByBatch({ data, fmt }) {
    const { batches, projects } = data;
    if (!batches.length) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Chưa có đợt phân bổ nào được xác nhận trong năm này.
        </div>
    );

    // Build lookup: batchId → projectId → amount
    const lookup = {};
    for (const b of batches) {
        lookup[b.id] = {};
        for (const a of b.allocations) {
            lookup[b.id][a.projectId] = a;
        }
    }

    return (
        <div className="card" style={{ overflow: 'auto' }}>
            <table className="data-table">
                <thead>
                    <tr>
                        <th style={{ minWidth: 140 }}>Đợt phân bổ</th>
                        <th style={{ minWidth: 100 }}>Kỳ</th>
                        {projects.map(p => (
                            <th key={p.id} style={{ textAlign: 'right', minWidth: 120 }}>
                                {p.code}
                                <div style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}>{p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name}</div>
                            </th>
                        ))}
                        <th style={{ textAlign: 'right', minWidth: 120, color: 'var(--primary)' }}>Tổng đợt</th>
                    </tr>
                </thead>
                <tbody>
                    {batches.map(b => (
                        <tr key={b.id}>
                            <td style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>{b.code}</td>
                            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{b.period || '—'}</td>
                            {projects.map(p => {
                                const a = lookup[b.id]?.[p.id];
                                return (
                                    <td key={p.id} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                        {a ? (
                                            <>
                                                {fmt(a.amount)}đ
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.ratio}%</div>
                                            </>
                                        ) : '—'}
                                    </td>
                                );
                            })}
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                                {fmt(b.totalAmount)}đ
                            </td>
                        </tr>
                    ))}
                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                        <td colSpan={2}>Tổng theo dự án</td>
                        {projects.map(p => (
                            <td key={p.id} style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--primary)' }}>
                                {fmt(p.totalAllocated)}đ
                            </td>
                        ))}
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--primary)' }}>
                            {fmt(batches.reduce((s, b) => s + b.totalAmount, 0))}đ
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
```

- [ ] **Step 6: Kiểm tra thủ công**

Mở `http://localhost:3000/overhead`, click tab "📈 Tổng hợp". Toggle giữa "Theo dự án" và "Theo đợt". Đổi năm.

Expected: bảng hiển thị đúng dữ liệu (nếu chưa có batch confirmed → thấy thông báo trống).

- [ ] **Step 7: Commit**

```bash
git add app/overhead/page.js
git commit -m "feat(overhead): add Tổng hợp tab with by-project and by-batch views"
```

---

### Task 3: Section chi phí chung trong OverviewTab

**Files:**
- Modify: `app/projects/[id]/tabs/OverviewTab.js`

- [ ] **Step 1: Thêm state và fetch**

Trong `OverviewTab`, sau `const [savingEdit, setSavingEdit] = useState(false);`, thêm:

```javascript
const [overheadData, setOverheadData] = useState(null);
const [overheadYear, setOverheadYear] = useState(new Date().getFullYear());
const [overheadLoading, setOverheadLoading] = useState(false);
```

Thêm `useEffect` để fetch (cần import `useEffect` — thêm vào import đầu file):

```javascript
import { useState, useEffect } from 'react';
```

Sau `const recentLogs = ...`, thêm:

```javascript
useEffect(() => {
    setOverheadLoading(true);
    apiFetch(`/api/overhead/summary?projectId=${projectId}&year=${overheadYear}`)
        .then(res => setOverheadData(res))
        .catch(() => setOverheadData(null))
        .finally(() => setOverheadLoading(false));
}, [projectId, overheadYear]);
```

- [ ] **Step 2: Thêm format helper**

Dưới dòng `const LOG_TYPES = ...`, thêm:

```javascript
const fmtNum = v => new Intl.NumberFormat('vi-VN').format(v || 0);
```

- [ ] **Step 3: Thêm section vào JSX**

Trong `return (...)`, tìm thẻ đóng `</div>` cuối cùng của component (trước `}`), thêm section mới vào cuối `<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>`:

```javascript
{/* Chi phí chung được phân bổ */}
<div className="card" style={{ padding: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="card-title">🏢 Chi phí chung được phân bổ</span>
        <select className="form-select" value={overheadYear}
            onChange={e => setOverheadYear(Number(e.target.value))}
            style={{ width: 110 }}>
            {[0, 1, 2].map(offset => {
                const y = new Date().getFullYear() - offset;
                return <option key={y} value={y}>Năm {y}</option>;
            })}
        </select>
    </div>

    {overheadLoading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Đang tải...</div>
    ) : !overheadData || overheadData.allocations.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có phân bổ chi phí chung nào trong năm {overheadYear}.</div>
    ) : (
        <>
            <table className="data-table" style={{ marginBottom: 12 }}>
                <thead>
                    <tr>
                        <th>Đợt phân bổ</th>
                        <th>Kỳ</th>
                        <th style={{ textAlign: 'right' }}>Số tiền</th>
                        <th style={{ textAlign: 'right' }}>Tỷ lệ</th>
                        <th>Ngày XN</th>
                    </tr>
                </thead>
                <tbody>
                    {overheadData.allocations.map(a => (
                        <tr key={a.batchId}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{a.batchCode}</td>
                            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.period || '—'}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtNum(a.amount)}đ</td>
                            <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-muted)' }}>{a.ratio}%</td>
                            <td style={{ fontSize: 13 }}>{a.confirmedAt ? new Date(a.confirmedAt).toLocaleDateString('vi-VN') : '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                Tổng: {fmtNum(overheadData.total)}đ
            </div>
        </>
    )}
</div>
```

- [ ] **Step 4: Kiểm tra thủ công**

Mở 1 dự án có overhead allocation → tab Tổng quan → cuộn xuống cuối → thấy section "🏢 Chi phí chung được phân bổ" với bảng đúng dữ liệu. Đổi năm → data refresh.

- [ ] **Step 5: Commit**

```bash
git add "app/projects/[id]/tabs/OverviewTab.js"
git commit -m "feat(projects): add overhead allocation section in OverviewTab"
```

---

### Task 4: Build check + push

- [ ] **Step 1: Chạy build**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | tail -20
```

Expected: build thành công, không lỗi đỏ.

Lỗi thường gặp:
- `useEffect` chưa import → thêm vào import
- Prisma relation không tìm thấy → kiểm tra tên field trong `prisma/schema.prisma` (phải là `overheadAllocations` không phải `allocations` ở project)

- [ ] **Step 2: Chạy tests**

```bash
npm test 2>&1 | tail -10
```

Expected: 56 tests pass.

- [ ] **Step 3: Push**

```bash
git push
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|-------------|------|
| API `GET /api/overhead/summary` với year + optional projectId | Task 1 |
| Tab "Tổng hợp" trong /overhead | Task 2 |
| View by-project (hàng = dự án, cột = đợt) | Task 2 Step 5 `SummaryByProject` |
| View by-batch (hàng = đợt, cột = dự án) | Task 2 Step 5 `SummaryByBatch` |
| Filter năm | Task 2 Step 4 + Task 3 Step 1 |
| Toggle view | Task 2 Step 4 |
| Section cuối OverviewTab trong project | Task 3 |
| Hiển thị bảng allocations + tổng | Task 3 Step 3 |
| Empty state khi chưa có data | Task 2 Step 5 + Task 3 Step 3 |

### Notes quan trọng cho engineer

- `OverheadAllocation` có relation `batch` và `project` — xem `prisma/schema.prisma` để xác nhận tên field chính xác
- `overheadAllocations` là tên relation trên `Project` model (xem `/api/overhead/pl/route.js` dòng 28 — đã dùng tên này)
- `deletedAt: null` không cần set manually trên `overheadBatch` query vì Prisma extension tự filter — nhưng để an toàn thì để trong plan
- Dữ liệu test: cần có ít nhất 1 `OverheadBatch` với `status: 'confirmed'` và có `OverheadAllocation` thì mới thấy data thật
