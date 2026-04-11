# Project Dashboard Tổng hợp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm dashboard tổng hợp vào đầu tab Tổng quan của mỗi dự án, hiển thị: cảnh báo cần xử lý, tiến độ hạng mục, trạng thái vật tư/PO, và tóm tắt tài chính.

**Architecture:** Tạo component `ProjectDashboard.js` mới (pure presentational, nhận props), sửa `OverviewTab.js` để fetch schedule-tasks và render dashboard ở trên cùng. Không cần API mới — tất cả data đã có trong `project` object (`materialPlans`, `purchaseOrders`, `pnl`, `settlement`) hoặc fetch từ `/api/schedule-tasks?projectId=`.

**Tech Stack:** Next.js 16 App Router, React 19, `apiFetch` từ `@/lib/fetchClient`, CSS variables từ `app/globals.css` (`.card`, `var(--primary)`, `var(--border)`, `var(--bg-secondary)`, `var(--text-muted)`).

---

## File Structure

| File | Hành động | Mục đích |
|------|-----------|---------|
| `app/projects/[id]/tabs/ProjectDashboard.js` | **Tạo mới** | Component dashboard: alert bar + 3 cột (Tiến độ / Vật tư / Tài chính) |
| `app/projects/[id]/tabs/OverviewTab.js` | **Sửa** | Thêm import + fetch schedule-tasks + render `<ProjectDashboard>` ở đầu |

---

## Context quan trọng cho implementer

### Data có sẵn trong `project` prop (từ `/api/projects/[id]`):
```js
project.materialPlans[]      // { id, status, costType, quantity, orderedQty, receivedQty, totalAmount, product: { name } }
project.purchaseOrders[]     // { id, code, supplier, supplierRel: { name }, status, deliveryDate, totalAmount, paidAmount }
project.pnl                  // { income, expense, profit, profitMargin, debtFromCustomer, debtToContractors }
project.settlement           // { sideA: { total, collected, remaining, rate }, sideB: { total, paid, remaining }, profit, profitRate }
project.progress             // số (0-100), từ milestones
```

### Data cần fetch thêm từ `/api/schedule-tasks?projectId=X`:
```js
// Response: { tasks: [...], flat: [...], totalProgress: 0 }
// flat[]: { id, name, parentId, progress, weight, endDate, startDate, status }
// Chỉ dùng flat (không dùng tree tasks)
```

### PO status mapping:
```js
const DONE_PO = ['Đã nhận', 'Hoàn thành', 'Hủy'];
const PO_STATUS_COLOR = {
  'Chờ duyệt': '#f59e0b',
  'Chờ duyệt vượt định mức': '#ef4444',
  'Đã duyệt': '#3b82f6',
  'Đang giao': '#8b5cf6',
  'Đã nhận': '#22c55e',
  'Hoàn thành': '#22c55e',
  'Hủy': '#9ca3af',
};
```

### Alert logic:
```js
// PO quá hạn: có deliveryDate, chưa xong, ngày giao < hôm nay
const overduePos = pos.filter(po =>
  po.deliveryDate && new Date(po.deliveryDate) < today && !DONE_PO.includes(po.status)
);

// Hạng mục trễ: top-level task (parentId = null), chưa 100%, endDate < hôm nay
const lateTasks = flatTasks
  .filter(t => !t.parentId)
  .filter(t => t.endDate && new Date(t.endDate) < today && t.progress < 100);

// Vật tư chưa đặt: status = 'Chưa đặt', không phải thầu phụ
const unordered = materials.filter(m => m.status === 'Chưa đặt');
```

---

## Task 1: Tạo component ProjectDashboard.js

**Files:**
- Create: `app/projects/[id]/tabs/ProjectDashboard.js`

- [ ] **Step 1: Tạo file với full component code**

Tạo file `app/projects/[id]/tabs/ProjectDashboard.js` với nội dung sau:

```jsx
'use client';

const fmtN = v => new Intl.NumberFormat('vi-VN').format(Math.round(v || 0));

const DONE_PO = ['Đã nhận', 'Hoàn thành', 'Hủy'];
const PO_STATUS_COLOR = {
    'Chờ duyệt': '#f59e0b',
    'Chờ duyệt vượt định mức': '#ef4444',
    'Đã duyệt': '#3b82f6',
    'Đang giao': '#8b5cf6',
    'Đã nhận': '#22c55e',
    'Hoàn thành': '#22c55e',
    'Hủy': '#9ca3af',
};

function ProgressBar({ value, color = 'var(--primary)' }) {
    return (
        <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, value || 0))}%`,
                background: color,
                borderRadius: 3,
                transition: 'width 0.3s',
            }} />
        </div>
    );
}

// project: full project object từ /api/projects/[id]
// scheduleTasks: flat array từ /api/schedule-tasks?projectId=X  ([] nếu chưa tải)
export default function ProjectDashboard({ project, scheduleTasks }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const materials = (project.materialPlans || []).filter(m => m.costType !== 'Thầu phụ');
    const pos = project.purchaseOrders || [];
    const pnl = project.pnl || {};
    const settlement = project.settlement || {};
    const sideA = settlement.sideA || {};
    const sideB = settlement.sideB || {};

    // --- Alerts ---
    const overduePos = pos.filter(po =>
        po.deliveryDate && new Date(po.deliveryDate) < today && !DONE_PO.includes(po.status)
    );
    const topTasks = (scheduleTasks || []).filter(t => !t.parentId);
    const lateTasks = topTasks.filter(t =>
        t.endDate && new Date(t.endDate) < today && (t.progress || 0) < 100
    );
    const unordered = materials.filter(m => m.status === 'Chưa đặt');
    const hasAlerts = overduePos.length > 0 || lateTasks.length > 0 || unordered.length > 0;

    // --- Tiến độ ---
    const totalWeight = topTasks.reduce((s, t) => s + (t.weight || 1), 0);
    const taskProgress = topTasks.length > 0 && totalWeight > 0
        ? Math.round(topTasks.reduce((s, t) => s + (t.progress || 0) * (t.weight || 1), 0) / totalWeight)
        : (project.progress || 0);
    const progressColor = taskProgress >= 80 ? '#22c55e' : taskProgress >= 50 ? '#f59e0b' : '#ef4444';

    // --- Vật tư stats ---
    const matTotal = materials.length;
    const matOrdered = materials.filter(m => ['Đã đặt', 'Đặt một phần', 'Đã nhận'].includes(m.status)).length;
    const matReceived = materials.filter(m => m.status === 'Đã nhận').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 4 }}>

            {/* Alert bar */}
            {hasAlerts && (
                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: '10px 16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    alignItems: 'center',
                }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>⚠️ Cần xử lý:</span>
                    {overduePos.length > 0 && (
                        <span style={{ fontSize: 12, color: '#dc2626', background: '#fee2e2', padding: '2px 10px', borderRadius: 12, fontWeight: 600 }}>
                            {overduePos.length} PO quá hạn giao
                        </span>
                    )}
                    {lateTasks.length > 0 && (
                        <span style={{ fontSize: 12, color: '#d97706', background: '#fef3c7', padding: '2px 10px', borderRadius: 12, fontWeight: 600 }}>
                            {lateTasks.length} hạng mục trễ tiến độ
                        </span>
                    )}
                    {unordered.length > 0 && (
                        <span style={{ fontSize: 12, color: '#7c3aed', background: '#ede9fe', padding: '2px 10px', borderRadius: 12, fontWeight: 600 }}>
                            {unordered.length} vật tư chưa đặt
                        </span>
                    )}
                </div>
            )}

            {/* 3 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>

                {/* Cột 1: Tiến độ */}
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>📊 Tiến độ thi công</div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng thể</span>
                        <span style={{ fontWeight: 700, color: progressColor, fontSize: 20 }}>{taskProgress}%</span>
                    </div>
                    <ProgressBar value={taskProgress} color={progressColor} />

                    {topTasks.length > 0 ? (
                        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
                            {topTasks.slice(0, 6).map(t => {
                                const pct = t.progress || 0;
                                const col = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
                                const late = t.endDate && new Date(t.endDate) < today && pct < 100;
                                return (
                                    <div key={t.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                            <span style={{ fontSize: 12, color: late ? '#dc2626' : 'inherit', maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {late ? '⚠️ ' : ''}{t.name}
                                            </span>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: col }}>{pct}%</span>
                                        </div>
                                        <ProgressBar value={pct} color={col} />
                                    </div>
                                );
                            })}
                            {topTasks.length > 6 && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                                    +{topTasks.length - 6} hạng mục khác
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>
                            Chưa có lịch thi công.<br />
                            <a href={`/gantt?project=${project.code}`} style={{ color: 'var(--primary)' }}>→ Tạo Gantt Chart</a>
                        </div>
                    )}
                </div>

                {/* Cột 2: Vật tư */}
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>🧱 Vật tư & Đặt hàng</div>

                    {matTotal === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                            Chưa có dự toán vật tư
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                                {[
                                    { label: 'Tổng', value: matTotal, color: 'var(--primary)' },
                                    { label: 'Đã đặt', value: matOrdered, color: '#3b82f6' },
                                    { label: 'Đã về', value: matReceived, color: '#22c55e' },
                                ].map(s => (
                                    <div key={s.label} style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Tiến độ nhận hàng</div>
                            <ProgressBar value={matTotal > 0 ? (matReceived / matTotal) * 100 : 0} color="#22c55e" />

                            {pos.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>Đơn hàng gần đây</div>
                                    {pos.slice(0, 4).map(po => {
                                        const col = PO_STATUS_COLOR[po.status] || '#9ca3af';
                                        const label = po.status || '?';
                                        const overdue = po.deliveryDate && new Date(po.deliveryDate) < today && !DONE_PO.includes(po.status);
                                        return (
                                            <div key={po.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                                                <div style={{ overflow: 'hidden' }}>
                                                    <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>{po.code}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                                                        {(po.supplierRel?.name || po.supplier || '').slice(0, 18)}
                                                    </span>
                                                </div>
                                                <span style={{
                                                    fontSize: 11, padding: '1px 7px', borderRadius: 10, whiteSpace: 'nowrap',
                                                    background: col + '22', color: col, fontWeight: 600,
                                                    border: overdue ? `1px solid ${col}` : 'none',
                                                }}>
                                                    {overdue ? '⚠️ ' : ''}{label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {pos.length > 4 && (
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
                                            +{pos.length - 4} đơn khác
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Cột 3: Tài chính */}
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>💰 Tài chính</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {[
                            { label: 'Giá trị HĐ', value: sideA.total, color: 'var(--primary)' },
                            { label: `Đã thu${sideA.rate ? ` (${sideA.rate}%)` : ''}`, value: sideA.collected, color: '#22c55e' },
                            { label: 'Còn phải thu', value: sideA.remaining, color: '#f59e0b' },
                            { label: 'Tổng chi phí', value: sideB.total, color: '#ef4444' },
                        ].map(r => (
                            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.label}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: r.color, fontFamily: 'monospace' }}>
                                    {fmtN(r.value)}đ
                                </span>
                            </div>
                        ))}

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>LN ước tính</span>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 15, fontWeight: 700, color: (settlement.profit || 0) >= 0 ? '#22c55e' : '#ef4444', fontFamily: 'monospace' }}>
                                    {fmtN(settlement.profit)}đ
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{settlement.profitRate || 0}% margin</div>
                            </div>
                        </div>

                        {(pnl.debtFromCustomer > 100 || pnl.debtToContractors > 100) && (
                            <div style={{ padding: '8px 10px', background: '#fef3c7', borderRadius: 6, marginTop: 2 }}>
                                {pnl.debtFromCustomer > 100 && (
                                    <div style={{ fontSize: 12, color: '#92400e' }}>
                                        KH còn nợ: <strong>{fmtN(pnl.debtFromCustomer)}đ</strong>
                                    </div>
                                )}
                                {pnl.debtToContractors > 100 && (
                                    <div style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>
                                        Nợ thầu phụ: <strong>{fmtN(pnl.debtToContractors)}đ</strong>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/projects/\[id\]/tabs/ProjectDashboard.js
git commit -m "feat(projects): add ProjectDashboard component — alert bar + 3-column overview"
```

---

## Task 2: Sửa OverviewTab.js để tích hợp dashboard

**Files:**
- Modify: `app/projects/[id]/tabs/OverviewTab.js`

**Context:** File này hiện có ~220 dòng. Phần đầu là state declarations, tiếp theo là handlers, cuối là JSX return với 3 section: thông tin dự án, nhật ký, chi phí chung.

Cần thêm:
1. Import `ProjectDashboard`
2. State + fetch `scheduleTasks`
3. Render `<ProjectDashboard>` ở trên cùng trong return

- [ ] **Step 1: Thêm import ProjectDashboard**

Ở dòng 1-5 của `app/projects/[id]/tabs/OverviewTab.js`, thêm import sau các import hiện có:

```js
import ProjectDashboard from './ProjectDashboard';
```

File sau khi sửa đầu file:
```js
'use client';
import { useState, useEffect } from 'react';
import { fmtDate } from '@/lib/projectUtils';
import { apiFetch } from '@/lib/fetchClient';
import ProjectDashboard from './ProjectDashboard';
```

- [ ] **Step 2: Thêm state và fetch scheduleTasks**

Trong `export default function OverviewTab({ project: p, projectId, onRefresh })`, ngay sau các useState hiện có (sau dòng `const [overheadLoading, setOverheadLoading] = useState(false);`), thêm:

```js
const [scheduleTasks, setScheduleTasks] = useState([]);

useEffect(() => {
    apiFetch(`/api/schedule-tasks?projectId=${projectId}`)
        .then(res => setScheduleTasks(res.flat || []))
        .catch(() => setScheduleTasks([]));
}, [projectId]);
```

- [ ] **Step 3: Render ProjectDashboard ở đầu return**

Trong phần JSX return, tìm thẻ `<div>` ngoài cùng (dòng `return ( <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>`).

Thêm `<ProjectDashboard>` làm phần tử **đầu tiên** bên trong div đó, trước `{/* Thông tin dự án */}`:

```jsx
return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ProjectDashboard project={p} scheduleTasks={scheduleTasks} />

        {/* Thông tin dự án */}
        <div className="card" style={{ padding: 20 }}>
        ...
```

- [ ] **Step 4: Kiểm tra trên browser**

Mở một dự án bất kỳ (ví dụ `/projects/DA-001`), vào tab Tổng quan. Kiểm tra:

- [ ] Dashboard 3 cột hiển thị phía trên phần "Thông tin dự án"
- [ ] Cột Tiến độ: nếu dự án chưa có schedule-tasks → hiện "Chưa có lịch thi công → Tạo Gantt Chart"
- [ ] Cột Vật tư: nếu không có materialPlans → hiện "Chưa có dự toán vật tư"
- [ ] Cột Tài chính: số tiền hiển thị đúng format (1,234,567đ)
- [ ] Alert bar: chỉ hiện khi có PO quá hạn / task trễ / vật tư chưa đặt
- [ ] Alert bar: không hiện nếu mọi thứ ổn
- [ ] Responsive: trên màn hình nhỏ, 3 cột xếp thành 1 cột (nhờ `auto-fit minmax(260px, 1fr)`)

- [ ] **Step 5: Commit**

```bash
git add app/projects/\[id\]/tabs/OverviewTab.js
git commit -m "feat(projects): integrate ProjectDashboard into OverviewTab"
```
