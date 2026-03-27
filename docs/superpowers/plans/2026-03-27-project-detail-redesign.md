# Project Detail Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách file `app/projects/[id]/page.js` (2.093 dòng, 14 tab) thành 7 tab component riêng biệt, xóa các tính năng không dùng, giữ nguyên toàn bộ API.

**Architecture:** Shell `page.js` fetch data 1 lần từ `/api/projects/${id}`, truyền `{ project, projectId, onRefresh }` xuống 7 tab component riêng. Mỗi tab quản lý state modal/form của chính nó. Mutation nào cũng gọi `onRefresh()` để re-fetch.

**Tech Stack:** Next.js 16 App Router, React 19 (`useState`, `useEffect`), `apiFetch` từ `@/lib/fetchClient`, CSS variables từ `app/globals.css`, Vitest cho unit tests.

---

## File Structure

```
app/projects/[id]/
  page.js                          ← REWRITE (~150 dòng): shell, fetch, tab bar
  tabs/
    OverviewTab.js                 ← CREATE (~150 dòng)
    ContractTab.js                 ← CREATE (~220 dòng)
    MilestoneTab.js                ← CREATE (~150 dòng)
    MaterialTab.js                 ← CREATE (~300 dòng)
    ContractorTab.js               ← CREATE (~220 dòng)
    DocumentTab.js                 ← CREATE (~30 dòng): wrap DocumentManager
    WarrantyTab.js                 ← CREATE (~150 dòng)

lib/projectUtils.js                ← CREATE: pure utility functions
__tests__/lib/projectUtils.test.js ← CREATE: unit tests cho utils
```

**Không thay đổi:**
- `app/api/projects/[id]/route.js` và tất cả API routes
- `components/documents/DocumentManager.js`
- `app/globals.css`

---

## Task 1: Tạo utility functions + tests

**Files:**
- Create: `lib/projectUtils.js`
- Create: `__tests__/lib/projectUtils.test.js`

- [ ] **Bước 1: Viết test trước**

```javascript
// __tests__/lib/projectUtils.test.js
import { calcPhaseAmounts, milestoneStatus, fmtVND, fmtDate } from '@/lib/projectUtils';

describe('calcPhaseAmounts', () => {
    it('tính đúng số tiền từ % và giá trị HĐ', () => {
        const phases = [{ phase: 'Đặt cọc', pct: 30, category: 'Thi công' }];
        const result = calcPhaseAmounts(phases, 1000000);
        expect(result[0].amount).toBe(300000);
    });

    it('trả về 0 khi contractValue = 0', () => {
        const phases = [{ phase: 'Đặt cọc', pct: 30, category: 'Thi công' }];
        const result = calcPhaseAmounts(phases, 0);
        expect(result[0].amount).toBe(0);
    });
});

describe('milestoneStatus', () => {
    it('trả về Hoàn thành khi progress = 100', () => {
        expect(milestoneStatus(100)).toBe('Hoàn thành');
    });

    it('trả về Đang làm khi progress > 0', () => {
        expect(milestoneStatus(50)).toBe('Đang làm');
    });

    it('trả về Chưa bắt đầu khi progress = 0', () => {
        expect(milestoneStatus(0)).toBe('Chưa bắt đầu');
    });
});

describe('fmtVND', () => {
    it('format số thành VND', () => {
        expect(fmtVND(1000000)).toContain('1.000.000');
    });

    it('trả về 0 khi null/undefined', () => {
        expect(fmtVND(null)).toContain('0');
    });
});

describe('fmtDate', () => {
    it('format date thành dd/mm/yyyy', () => {
        const result = fmtDate('2025-01-15');
        expect(result).toMatch(/15\/01\/2025|15-01-2025/);
    });

    it('trả về — khi null', () => {
        expect(fmtDate(null)).toBe('—');
    });
});
```

- [ ] **Bước 2: Chạy test, xác nhận FAIL**

```bash
cd d:/Codeapp/motnha && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|projectUtils"
```

Expected: FAIL với "Cannot find module '@/lib/projectUtils'"

- [ ] **Bước 3: Tạo `lib/projectUtils.js`**

```javascript
// lib/projectUtils.js

export const fmtVND = (n) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n) || 0);

export const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export const milestoneStatus = (progress) => {
    const p = Number(progress);
    if (p === 100) return 'Hoàn thành';
    if (p > 0) return 'Đang làm';
    return 'Chưa bắt đầu';
};

export const calcPhaseAmounts = (phases, contractValue) => {
    const val = Number(contractValue) || 0;
    return phases.map(p => ({ ...p, amount: Math.round(val * p.pct / 100) }));
};

export const PAYMENT_TEMPLATES = {
    'Thiết kế': [
        { phase: 'Đặt cọc thiết kế', pct: 50, category: 'Thiết kế' },
        { phase: 'Nghiệm thu bản vẽ', pct: 50, category: 'Thiết kế' },
    ],
    'Thi công thô': [
        { phase: 'Đặt cọc thi công', pct: 30, category: 'Thi công' },
        { phase: 'Hoàn thiện móng + khung', pct: 30, category: 'Thi công' },
        { phase: 'Hoàn thiện xây thô', pct: 30, category: 'Thi công' },
        { phase: 'Nghiệm thu bàn giao thô', pct: 10, category: 'Thi công' },
    ],
    'Thi công hoàn thiện': [
        { phase: 'Đặt cọc hoàn thiện', pct: 30, category: 'Hoàn thiện' },
        { phase: 'Hoàn thiện trát + ốp lát', pct: 25, category: 'Hoàn thiện' },
        { phase: 'Hoàn thiện sơn + điện nước', pct: 25, category: 'Hoàn thiện' },
        { phase: 'Nghiệm thu bàn giao', pct: 20, category: 'Hoàn thiện' },
    ],
    'Nội thất': [
        { phase: 'Đặt cọc nội thất', pct: 50, category: 'Nội thất' },
        { phase: 'Giao hàng + lắp đặt', pct: 40, category: 'Nội thất' },
        { phase: 'Nghiệm thu hoàn thiện', pct: 10, category: 'Nội thất' },
    ],
};

export const CONTRACT_TYPES = ['Thiết kế', 'Thi công thô', 'Thi công hoàn thiện', 'Nội thất'];
```

- [ ] **Bước 4: Chạy lại test, xác nhận PASS**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|projectUtils"
```

Expected: PASS — 7 tests passed

- [ ] **Bước 5: Commit**

```bash
git add lib/projectUtils.js __tests__/lib/projectUtils.test.js
git commit -m "feat(project): extract utility functions với unit tests"
```

---

## Task 2: Viết lại page.js thành shell

**Files:**
- Modify: `app/projects/[id]/page.js` (xóa toàn bộ nội dung, viết lại)

- [ ] **Bước 1: Tạo folder tabs**

```bash
mkdir -p "d:/Codeapp/motnha/app/projects/[id]/tabs"
```

- [ ] **Bước 2: Tạo placeholder cho mỗi tab** (để shell không bị lỗi import)

Tạo `app/projects/[id]/tabs/OverviewTab.js`:
```javascript
export default function OverviewTab({ project, projectId, onRefresh }) {
    return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Tổng quan — đang phát triển</div>;
}
```

Lặp lại tương tự cho: `ContractTab.js`, `MilestoneTab.js`, `MaterialTab.js`, `ContractorTab.js`, `DocumentTab.js`, `WarrantyTab.js` — mỗi file chỉ thay tên tab trong text.

- [ ] **Bước 3: Viết lại `page.js`**

```javascript
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fmtVND, fmtDate } from '@/lib/projectUtils';
import OverviewTab from './tabs/OverviewTab';
import ContractTab from './tabs/ContractTab';
import MilestoneTab from './tabs/MilestoneTab';
import MaterialTab from './tabs/MaterialTab';
import ContractorTab from './tabs/ContractorTab';
import DocumentTab from './tabs/DocumentTab';
import WarrantyTab from './tabs/WarrantyTab';

const PIPELINE = [
    { key: 'Khảo sát', label: 'CRM', icon: '📊' },
    { key: 'Thiết kế', label: 'Thiết kế', icon: '🎨' },
    { key: 'Ký HĐ', label: 'Ký HĐ', icon: '📝' },
    { key: 'Đang thi công', label: 'Thi công', icon: '🔨' },
    { key: 'Bảo hành', label: 'Bảo hành', icon: '🛡️' },
    { key: 'Hoàn thành', label: 'Hậu mãi', icon: '✅' },
];
const STATUS_MAP = Object.fromEntries(PIPELINE.map((s, i) => [s.key, i]));

const TABS = [
    { key: 'overview', label: 'Tổng quan', icon: '📋' },
    { key: 'contracts', label: 'Hợp đồng', icon: '📝', countKey: 'contracts' },
    { key: 'milestones', label: 'Tiến độ', icon: '📊', countKey: 'milestones' },
    { key: 'materials', label: 'Vật tư', icon: '🧱', countKey: 'materialPlans' },
    { key: 'contractors', label: 'Thầu phụ', icon: '👷', countKey: 'contractorPays' },
    { key: 'documents', label: 'Tài liệu', icon: '📁', countKey: 'documents' },
    { key: 'warranty', label: 'Bảo hành', icon: '🛡️' },
];

export default function ProjectDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    const fetchData = () => {
        setLoading(true);
        fetch(`/api/projects/${id}`)
            .then(r => r.json())
            .then(d => { setProject(d); setLoading(false); });
    };

    useEffect(fetchData, [id]);

    if (loading || !project) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    }

    const p = project;
    const pipelineIdx = STATUS_MAP[p.status] ?? 0;
    const pnl = p.pnl || {};

    // Health badge
    const now = new Date();
    const end = p.endDate ? new Date(p.endDate) : null;
    const overdueDays = end ? Math.ceil((now - end) / 86400000) : 0;
    const budgetRate = (p.budget || 0) > 0 ? ((p.spent || 0) / p.budget) * 100 : 0;
    const isDone = p.status === 'Hoàn thành';
    let health = 'success', healthLabel = '🟢 Bình thường';
    if (!isDone && (overdueDays > 30 || budgetRate > 100)) {
        health = 'danger'; healthLabel = overdueDays > 30 ? `🔴 Trễ ${overdueDays} ngày` : '🔴 Vượt NS';
    } else if (!isDone && (overdueDays > 0 || budgetRate > 80)) {
        health = 'warning'; healthLabel = overdueDays > 0 ? `🟡 Trễ ${overdueDays} ngày` : '🟡 Cần theo dõi';
    }

    const TAB_COMPONENTS = {
        overview: <OverviewTab project={p} projectId={id} onRefresh={fetchData} />,
        contracts: <ContractTab project={p} projectId={id} onRefresh={fetchData} />,
        milestones: <MilestoneTab project={p} projectId={id} onRefresh={fetchData} />,
        materials: <MaterialTab project={p} projectId={id} onRefresh={fetchData} />,
        contractors: <ContractorTab project={p} projectId={id} onRefresh={fetchData} />,
        documents: <DocumentTab project={p} projectId={id} onRefresh={fetchData} />,
        warranty: <WarrantyTab project={p} projectId={id} onRefresh={fetchData} />,
    };

    return (
        <div>
            <button className="btn btn-secondary" onClick={() => router.push('/projects')} style={{ marginBottom: 16 }}>
                ← Quay lại
            </button>

            {/* Project Header */}
            <div className="card" style={{ marginBottom: 24, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--text-accent)', fontSize: 14, fontWeight: 600 }}>{p.code}</span>
                            <span className={`badge ${p.status === 'Hoàn thành' ? 'success' : p.status === 'Đang thi công' ? 'warning' : 'info'}`}>{p.status}</span>
                            {p.phase && <span className="badge muted">{p.phase}</span>}
                            <span className={`badge ${health}`}>{healthLabel}</span>
                            {(pnl.profit ?? 0) >= 0
                                ? <span className="badge success">📈 Lãi {fmtVND(pnl.profit)}</span>
                                : <span className="badge danger">📉 Lỗ {fmtVND(Math.abs(pnl.profit))}</span>
                            }
                        </div>
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{p.name}</h2>
                        <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 13 }}>
                            {p.customer?.name} • {p.address}
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                            {p.manager && <span>👤 PM: <strong>{p.manager}</strong></span>}
                            {p.designer && <span>🎨 TK: {p.designer}</span>}
                            {p.supervisor && <span>🔧 GS: {p.supervisor}</span>}
                        </div>
                        {(p.startDate || p.endDate) && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, fontSize: 12 }}>
                                <span style={{ color: 'var(--text-muted)' }}>📅 {fmtDate(p.startDate)} → {fmtDate(p.endDate)}</span>
                                {!isDone && overdueDays > 0 && (
                                    <span className="badge danger" style={{ fontSize: 11 }}>⚠ Trễ {overdueDays} ngày</span>
                                )}
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 32, fontWeight: 700 }}>{Number(p.progress) || 0}%</div>
                        <div className="progress-bar" style={{ width: 120 }}>
                            <div className="progress-fill" style={{ width: `${Number(p.progress) || 0}%` }} />
                        </div>
                    </div>
                </div>

                {/* Pipeline */}
                <div className="pipeline">
                    {PIPELINE.map((stage, i) => (
                        <div className="pipeline-step" key={stage.key}>
                            <div className={`pipeline-node ${i === pipelineIdx ? 'active' : i < pipelineIdx ? 'completed' : ''}`}>
                                <div className="pipeline-dot">{i < pipelineIdx ? '✓' : stage.icon}</div>
                                <span className="pipeline-label">{stage.label}</span>
                            </div>
                            {i < PIPELINE.length - 1 && <div className={`pipeline-line ${i < pipelineIdx ? 'completed' : ''}`} />}
                        </div>
                    ))}
                </div>

                {/* Quick Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 8 }}>
                    {[
                        { v: `${Number(p.area) || 0}m²`, l: 'Diện tích' },
                        { v: `${p.floors || 0} tầng`, l: 'Số tầng' },
                        { v: fmtVND(p.contractValue), l: 'Giá trị HĐ' },
                        { v: fmtVND(p.paidAmount), l: 'Đã thu' },
                        { v: fmtVND(pnl.debtFromCustomer), l: 'KH còn nợ', c: (pnl.debtFromCustomer || 0) > 0 ? 'var(--status-danger)' : 'var(--status-success)' },
                    ].map(s => (
                        <div key={s.l} style={{ textAlign: 'center', padding: '8px 0' }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: s.c || 'var(--text-primary)' }}>{s.v}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.l}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tab Bar */}
            <div className="project-tabs">
                {TABS.map(t => {
                    const count = t.countKey ? (p[t.countKey]?.length || 0) : 0;
                    return (
                        <button key={t.key} className={`project-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                            <span>{t.icon}</span> {t.label}
                            {count > 0 && <span className="tab-count">{count}</span>}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div style={{ marginTop: 16 }}>
                {TAB_COMPONENTS[tab]}
            </div>
        </div>
    );
}
```

- [ ] **Bước 4: Chạy dev server, kiểm tra trang mở không lỗi**

```bash
npm run dev
```

Mở `http://localhost:3000/projects/[id-thực]` — phải thấy header + pipeline + 7 tab + placeholder text cho mỗi tab.

- [ ] **Bước 5: Commit**

```bash
git add "app/projects/[id]/page.js" "app/projects/[id]/tabs/"
git commit -m "refactor(project): tách shell page.js + tạo 7 tab placeholder"
```

---

## Task 3: OverviewTab

**Files:**
- Modify: `app/projects/[id]/tabs/OverviewTab.js`

Hiển thị: nhật ký gần nhất (5 dòng) + form thêm nhật ký inline.

- [ ] **Bước 1: Viết `OverviewTab.js`**

```javascript
'use client';
import { useState } from 'react';
import { fmtDate } from '@/lib/projectUtils';

const LOG_TYPES = ['Điện thoại', 'Gặp mặt', 'Email', 'Zalo', 'Ghi chú'];

export default function OverviewTab({ project: p, projectId, onRefresh }) {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ type: 'Điện thoại', content: '', createdBy: '' });
    const [saving, setSaving] = useState(false);

    const addLog = async () => {
        if (!form.content.trim()) return alert('Nhập nội dung nhật ký!');
        setSaving(true);
        await fetch('/api/tracking-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, projectId }),
        });
        setSaving(false);
        setForm({ type: 'Điện thoại', content: '', createdBy: '' });
        setShowForm(false);
        onRefresh();
    };

    const recentLogs = (p.trackingLogs || []).slice(0, 5);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Thông tin dự án */}
            <div className="card" style={{ padding: 20 }}>
                <div className="card-header" style={{ marginBottom: 16 }}>
                    <span className="card-title">📋 Thông tin dự án</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {[
                        { l: 'Khách hàng', v: p.customer?.name },
                        { l: 'Địa chỉ', v: p.address },
                        { l: 'Loại dự án', v: p.type },
                        { l: 'Diện tích', v: p.area ? `${p.area}m²` : '—' },
                        { l: 'Số tầng', v: p.floors || '—' },
                        { l: 'Bắt đầu', v: fmtDate(p.startDate) },
                        { l: 'Dự kiến xong', v: fmtDate(p.endDate) },
                        { l: 'Quản lý', v: p.manager || '—' },
                        { l: 'Thiết kế', v: p.designer || '—' },
                        { l: 'Giám sát', v: p.supervisor || '—' },
                    ].map(({ l, v }) => (
                        <div key={l}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{l}</div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{v || '—'}</div>
                        </div>
                    ))}
                </div>
                {p.notes && (
                    <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 13 }}>
                        <strong>Ghi chú:</strong> {p.notes}
                    </div>
                )}
            </div>

            {/* Nhật ký gần đây */}
            <div className="card" style={{ padding: 20 }}>
                <div className="card-header" style={{ marginBottom: 16 }}>
                    <span className="card-title">📒 Nhật ký theo dõi</span>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
                        {showForm ? 'Đóng' : '+ Thêm nhật ký'}
                    </button>
                </div>

                {showForm && (
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <select className="form-input" style={{ flex: '0 0 150px' }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {LOG_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                            <input className="form-input" style={{ flex: 1, minWidth: 120 }} placeholder="Người ghi" value={form.createdBy} onChange={e => setForm({ ...form, createdBy: e.target.value })} />
                        </div>
                        <textarea className="form-input" rows={3} placeholder="Nội dung nhật ký..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Hủy</button>
                            <button className="btn btn-primary btn-sm" onClick={addLog} disabled={saving}>
                                {saving ? 'Đang lưu...' : 'Lưu nhật ký'}
                            </button>
                        </div>
                    </div>
                )}

                {recentLogs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Chưa có nhật ký</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recentLogs.map(log => (
                            <div key={log.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 80, flexShrink: 0 }}>
                                    <div>{fmtDate(log.createdAt)}</div>
                                    <span className="badge muted" style={{ fontSize: 10, marginTop: 4 }}>{log.type}</span>
                                </div>
                                <div style={{ fontSize: 13 }}>
                                    <div>{log.content}</div>
                                    {log.createdBy && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>— {log.createdBy}</div>}
                                </div>
                            </div>
                        ))}
                        {(p.trackingLogs?.length || 0) > 5 && (
                            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', paddingTop: 8 }}>
                                Còn {p.trackingLogs.length - 5} nhật ký cũ hơn
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Bước 2: Kiểm tra trên trình duyệt**

Mở tab Tổng quan — phải thấy thông tin dự án + nhật ký + form thêm nhật ký hoạt động.

- [ ] **Bước 3: Commit**

```bash
git add "app/projects/[id]/tabs/OverviewTab.js"
git commit -m "feat(project): OverviewTab — thông tin + nhật ký theo dõi"
```

---

## Task 4: ContractTab

**Files:**
- Modify: `app/projects/[id]/tabs/ContractTab.js`

Hiển thị: danh sách HĐ + lịch thu tiền. Thêm HĐ mới với template thanh toán tự động.

- [ ] **Bước 1: Viết `ContractTab.js`**

```javascript
'use client';
import { useState } from 'react';
import { fmtVND, fmtDate, calcPhaseAmounts, PAYMENT_TEMPLATES, CONTRACT_TYPES } from '@/lib/projectUtils';

export default function ContractTab({ project: p, projectId, onRefresh }) {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', type: 'Thi công thô', contractValue: '', signDate: '', startDate: '', endDate: '', notes: '' });
    const [phases, setPhases] = useState([]);
    const [saving, setSaving] = useState(false);

    const setTypeAndPhases = (type) => {
        const template = PAYMENT_TEMPLATES[type] || [];
        setForm(f => ({ ...f, type, name: '' }));
        setPhases(calcPhaseAmounts(template, form.contractValue));
    };

    const setValueAndRecalc = (contractValue) => {
        setForm(f => ({ ...f, contractValue }));
        setPhases(prev => calcPhaseAmounts(prev, contractValue));
    };

    const updatePhase = (idx, field, value) => {
        setPhases(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            if (field === 'pct') {
                updated[idx].amount = Math.round((Number(form.contractValue) || 0) * Number(value) / 100);
            }
            return updated;
        });
    };

    const createContract = async () => {
        if (!form.contractValue) return alert('Nhập giá trị hợp đồng!');
        setSaving(true);
        const cName = form.name.trim() || `HĐ ${form.type} - ${p.name}`;
        const res = await fetch('/api/contracts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, name: cName, contractValue: Number(form.contractValue) || 0, projectId, customerId: p.customerId, paymentPhases: phases }),
        });
        setSaving(false);
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo HĐ'); }
        setShowModal(false);
        setForm({ name: '', type: 'Thi công thô', contractValue: '', signDate: '', startDate: '', endDate: '', notes: '' });
        setPhases([]);
        onRefresh();
    };

    const contracts = p.contracts || [];
    const totalContract = contracts.reduce((s, c) => s + (Number(c.contractValue) || 0), 0);
    const totalPaid = contracts.reduce((s, c) => s + (c.paymentPhases || []).filter(ph => ph.status === 'Đã thanh toán').reduce((a, ph) => a + (Number(ph.amount) || 0), 0), 0);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
                    <span>Tổng HĐ: <strong>{fmtVND(totalContract)}</strong></span>
                    <span>Đã thu: <strong style={{ color: 'var(--status-success)' }}>{fmtVND(totalPaid)}</strong></span>
                    <span>Còn lại: <strong style={{ color: 'var(--status-danger)' }}>{fmtVND(totalContract - totalPaid)}</strong></span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Thêm hợp đồng</button>
            </div>

            {contracts.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có hợp đồng</div>
            ) : (
                contracts.map(c => {
                    const paid = (c.paymentPhases || []).filter(ph => ph.status === 'Đã thanh toán').reduce((s, ph) => s + (Number(ph.amount) || 0), 0);
                    const pct = c.contractValue > 0 ? Math.round((paid / c.contractValue) * 100) : 0;
                    return (
                        <div key={c.id} className="card" style={{ marginBottom: 16 }}>
                            <div className="card-header" style={{ marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                        {c.code} • Ký: {fmtDate(c.signDate)} • Giá trị: <strong>{fmtVND(c.contractValue)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                        <div style={{ flex: 1, maxWidth: 200, height: 6, background: 'var(--bg-secondary)', borderRadius: 3 }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--status-success)' : 'var(--accent-primary)', borderRadius: 3 }} />
                                        </div>
                                        <span style={{ fontSize: 12 }}>Thu {pct}% ({fmtVND(paid)})</span>
                                    </div>
                                </div>
                                <a href={`/contracts/${c.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>Xem chi tiết →</a>
                            </div>

                            {/* Lịch thu tiền */}
                            {(c.paymentPhases || []).length > 0 && (
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Đợt thanh toán</th>
                                                <th>%</th>
                                                <th>Số tiền</th>
                                                <th>Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {c.paymentPhases.map((ph, i) => (
                                                <tr key={i}>
                                                    <td>{ph.phase}</td>
                                                    <td>{ph.pct}%</td>
                                                    <td style={{ fontWeight: 600 }}>{fmtVND(ph.amount)}</td>
                                                    <td>
                                                        <span className={`badge ${ph.status === 'Đã thanh toán' ? 'success' : ph.status === 'Đến hạn' ? 'warning' : 'muted'}`}>
                                                            {ph.status || 'Chưa thanh toán'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {/* Modal thêm HĐ */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Thêm hợp đồng</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 4px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loại HĐ</label>
                                    <select className="form-input" value={form.type} onChange={e => setTypeAndPhases(e.target.value)}>
                                        {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Giá trị HĐ (VND)</label>
                                    <input className="form-input" type="number" placeholder="0" value={form.contractValue} onChange={e => setValueAndRecalc(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tên HĐ (để trống = tự động)</label>
                                <input className="form-input" placeholder={`HĐ ${form.type} - ${p.name}`} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ngày ký</label>
                                    <input className="form-input" type="date" value={form.signDate} onChange={e => setForm({ ...form, signDate: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bắt đầu</label>
                                    <input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Kết thúc</label>
                                    <input className="form-input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                                </div>
                            </div>

                            {/* Lịch thanh toán */}
                            {phases.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Lịch thanh toán</div>
                                    <table className="data-table" style={{ fontSize: 12 }}>
                                        <thead><tr><th>Đợt</th><th>%</th><th>Số tiền</th></tr></thead>
                                        <tbody>
                                            {phases.map((ph, i) => (
                                                <tr key={i}>
                                                    <td><input className="form-input" style={{ padding: '4px 8px', fontSize: 12 }} value={ph.phase} onChange={e => updatePhase(i, 'phase', e.target.value)} /></td>
                                                    <td><input className="form-input" style={{ padding: '4px 8px', fontSize: 12, width: 60 }} type="number" value={ph.pct} onChange={e => updatePhase(i, 'pct', e.target.value)} /></td>
                                                    <td style={{ fontWeight: 600 }}>{fmtVND(ph.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <textarea className="form-input" rows={2} placeholder="Ghi chú..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={createContract} disabled={saving}>
                                    {saving ? 'Đang lưu...' : 'Tạo hợp đồng'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Bước 2: Kiểm tra trên trình duyệt**

Mở tab Hợp đồng — thấy danh sách HĐ + thanh tiến độ thu tiền + nút thêm HĐ. Thử thêm 1 HĐ mới.

- [ ] **Bước 3: Commit**

```bash
git add "app/projects/[id]/tabs/ContractTab.js"
git commit -m "feat(project): ContractTab — danh sách HĐ + lịch thu tiền + thêm HĐ"
```

---

## Task 5: MilestoneTab

**Files:**
- Modify: `app/projects/[id]/tabs/MilestoneTab.js`

- [ ] **Bước 1: Viết `MilestoneTab.js`**

```javascript
'use client';
import { useState } from 'react';
import { fmtDate, milestoneStatus } from '@/lib/projectUtils';

export default function MilestoneTab({ project: p, projectId, onRefresh }) {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', plannedDate: '', description: '' });
    const [saving, setSaving] = useState(false);

    const milestones = p.milestones || [];
    const done = milestones.filter(m => m.progress === 100).length;
    const overall = milestones.length > 0 ? Math.round(milestones.reduce((s, m) => s + (Number(m.progress) || 0), 0) / milestones.length) : 0;

    const updateProgress = async (msId, progress) => {
        await fetch(`/api/milestones/${msId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ progress: Number(progress), status: milestoneStatus(progress) }),
        });
        onRefresh();
    };

    const addMilestone = async () => {
        if (!form.name.trim()) return alert('Nhập tên mốc tiến độ!');
        setSaving(true);
        await fetch('/api/milestones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, projectId, progress: 0, status: 'Chưa bắt đầu' }),
        });
        setSaving(false);
        setForm({ name: '', plannedDate: '', description: '' });
        setShowForm(false);
        onRefresh();
    };

    return (
        <div className="card" style={{ padding: 24 }}>
            <div className="card-header" style={{ marginBottom: 20 }}>
                <div>
                    <span className="card-title">📊 Tiến độ dự án</span>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 200, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${overall}%`, height: '100%', background: overall === 100 ? 'var(--status-success)' : 'var(--accent-primary)', transition: '0.3s' }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{done}/{milestones.length} mốc ({overall}%)</span>
                    </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
                    {showForm ? 'Đóng' : '+ Thêm mốc'}
                </button>
            </div>

            {showForm && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tên mốc</label>
                        <input className="form-input" placeholder="Hoàn thiện phần móng..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ngày dự kiến</label>
                        <input className="form-input" type="date" value={form.plannedDate} onChange={e => setForm({ ...form, plannedDate: e.target.value })} />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={addMilestone} disabled={saving}>
                        {saving ? 'Đang lưu...' : 'Thêm'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Hủy</button>
                </div>
            )}

            {milestones.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Chưa có mốc tiến độ</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {milestones.map(ms => {
                        const progress = Number(ms.progress) || 0;
                        const overdue = ms.plannedDate && new Date() > new Date(ms.plannedDate) && progress < 100;
                        return (
                            <div key={ms.id} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{ms.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 12 }}>
                                        {ms.plannedDate && <span>Dự kiến: {fmtDate(ms.plannedDate)}</span>}
                                        {ms.actualDate && <span>Thực tế: {fmtDate(ms.actualDate)}</span>}
                                        {overdue && <span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>⚠ Trễ hạn</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 120, height: 6, background: 'var(--bg-primary)', borderRadius: 3 }}>
                                        <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? 'var(--status-success)' : 'var(--accent-primary)', borderRadius: 3, transition: '0.3s' }} />
                                    </div>
                                    <input
                                        type="number"
                                        min={0} max={100}
                                        className="form-input"
                                        style={{ width: 64, padding: '4px 8px', fontSize: 13, textAlign: 'center' }}
                                        defaultValue={progress}
                                        onBlur={e => { if (Number(e.target.value) !== progress) updateProgress(ms.id, e.target.value); }}
                                    />
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                                    <span className={`badge ${progress === 100 ? 'success' : progress > 0 ? 'warning' : 'muted'}`} style={{ fontSize: 11 }}>
                                        {milestoneStatus(progress)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Bước 2: Kiểm tra trên trình duyệt**

Mở tab Tiến độ — thấy danh sách mốc + thanh progress + nhập % thay đổi được.

- [ ] **Bước 3: Commit**

```bash
git add "app/projects/[id]/tabs/MilestoneTab.js"
git commit -m "feat(project): MilestoneTab — danh sách mốc + cập nhật tiến độ"
```

---

## Task 6: MaterialTab

**Files:**
- Modify: `app/projects/[id]/tabs/MaterialTab.js`

Gồm: bảng dự toán vật tư + tạo từ báo giá + tạo PO từ nhiều vật tư chọn + nút YC.

- [ ] **Bước 1: Viết `MaterialTab.js`**

```javascript
'use client';
import { useState } from 'react';
import { fmtVND } from '@/lib/projectUtils';

export default function MaterialTab({ project: p, projectId, onRefresh }) {
    const [selectedPlans, setSelectedPlans] = useState([]);
    const [showPOModal, setShowPOModal] = useState(false);
    const [poForm, setPoForm] = useState({ supplier: '', supplierId: '', deliveryDate: '', notes: '', deliveryType: 'Giao thẳng dự án', deliveryAddress: '' });
    const [poItems, setPoItems] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [savingPO, setSavingPO] = useState(false);

    const materials = (p.materialPlans || []).filter(m => m.costType !== 'Thầu phụ');
    const totalBudget = materials.reduce((s, m) => s + (Number(m.totalAmount) || 0), 0);
    const needOrder = materials.filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần').length;
    const overBudget = materials.filter(m => m.receivedQty > m.quantity).length;

    const importFromQuotation = async () => {
        if (!confirm('Tạo dự toán vật tư từ báo giá mới nhất?')) return;
        const res = await fetch(`/api/projects/${projectId}/material-plans/import-quotation`, { method: 'POST' });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Không thể import'); }
        onRefresh();
    };

    const deletePlan = async (id) => {
        if (!confirm('Xóa hạng mục này?')) return;
        await fetch(`/api/material-plans/${id}`, { method: 'DELETE' });
        onRefresh();
    };

    const openPOModal = async () => {
        if (suppliers.length === 0) {
            const res = await fetch('/api/suppliers?limit=500');
            const json = await res.json();
            setSuppliers(json.data || json || []);
        }
        const selected = selectedPlans.length > 0
            ? materials.filter(m => selectedPlans.includes(m.id))
            : materials.filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần');
        setPoItems(selected.map(m => ({
            productName: m.product?.name || '',
            unit: m.product?.unit || '',
            quantity: m.quantity - m.orderedQty,
            unitPrice: m.unitPrice || 0,
            amount: (m.quantity - m.orderedQty) * (m.unitPrice || 0),
            productId: m.productId,
            _mpId: m.id,
        })));
        setPoForm({ supplier: '', supplierId: '', deliveryDate: '', notes: '', deliveryType: 'Giao thẳng dự án', deliveryAddress: p.address || '' });
        setShowPOModal(true);
    };

    const createPO = async () => {
        if (!poForm.supplier.trim()) return alert('Nhập tên nhà cung cấp!');
        if (poItems.length === 0) return alert('Không có vật tư để đặt!');
        setSavingPO(true);
        const res = await fetch('/api/purchase-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...poForm, projectId, items: poItems, materialPlanIds: poItems.map(i => i._mpId) }),
        });
        setSavingPO(false);
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo PO'); }
        setShowPOModal(false);
        setSelectedPlans([]);
        onRefresh();
    };

    const toggleSelect = (id) => setSelectedPlans(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleAll = (checked) => {
        const eligible = materials.filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần').map(m => m.id);
        setSelectedPlans(checked ? eligible : []);
    };

    return (
        <div>
            {/* Summary */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 16 }}>
                <div className="stat-card"><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-info)' }}>{fmtVND(totalBudget)}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng dự toán</div></div>
                <div className="stat-card"><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-warning)' }}>{needOrder}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cần đặt thêm</div></div>
                <div className="stat-card"><div style={{ fontSize: 18, fontWeight: 700, color: overBudget > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>{overBudget}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vượt dự toán</div></div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">🧱 Dự toán vật tư</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(p.quotations?.length || 0) > 0 && (
                            <button className="btn btn-ghost btn-sm" onClick={importFromQuotation}>📋 Tạo từ Báo giá</button>
                        )}
                        {needOrder > 0 && (
                            <button className="btn btn-primary btn-sm" onClick={openPOModal}>
                                🛒 Tạo PO {selectedPlans.length > 0 ? `(${selectedPlans.length} vật tư)` : `(${needOrder} vật tư)`}
                            </button>
                        )}
                    </div>
                </div>

                {materials.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dự toán vật tư</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 32 }}>
                                        <input type="checkbox"
                                            checked={selectedPlans.length > 0 && selectedPlans.length === materials.filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần').length}
                                            onChange={e => toggleAll(e.target.checked)}
                                        />
                                    </th>
                                    <th>Hạng mục</th>
                                    <th>SL cần</th>
                                    <th>Đã đặt</th>
                                    <th>Đã nhận</th>
                                    <th>Còn thiếu</th>
                                    <th>Đơn giá</th>
                                    <th>Trạng thái</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {materials.map(m => {
                                    const missing = m.quantity - m.receivedQty;
                                    const canOrder = m.status === 'Chưa đặt' || m.status === 'Đặt một phần';
                                    const over = m.receivedQty > m.quantity;
                                    return (
                                        <tr key={m.id} style={{ background: over ? 'rgba(239,68,68,0.06)' : '' }}>
                                            <td>{canOrder && <input type="checkbox" checked={selectedPlans.includes(m.id)} onChange={() => toggleSelect(m.id)} />}</td>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.product?.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.product?.code}</div>
                                                {over && <div style={{ fontSize: 11, color: 'var(--status-danger)', fontWeight: 600 }}>⚠ Nhận vượt {m.receivedQty - m.quantity} {m.product?.unit}</div>}
                                            </td>
                                            <td>{m.quantity} <span style={{ fontSize: 11, opacity: 0.6 }}>{m.product?.unit}</span></td>
                                            <td style={{ color: 'var(--status-info)' }}>{m.orderedQty}</td>
                                            <td style={{ color: over ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 600 }}>{m.receivedQty}</td>
                                            <td style={{ color: missing > 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 700 }}>{missing > 0 ? missing : '✓'}</td>
                                            <td style={{ fontSize: 12 }}>{fmtVND(m.unitPrice)}</td>
                                            <td>
                                                <span className={`badge ${m.status === 'Đã nhận đủ' || m.status === 'Đã đặt đủ' ? 'success' : m.status?.includes('một phần') ? 'warning' : 'danger'}`} style={{ fontSize: 11 }}>
                                                    {m.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <a href={`/purchasing?projectId=${projectId}&mpId=${m.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} title="Tạo phiếu yêu cầu vật tư">📋 YC</a>
                                                    {m.orderedQty === 0 && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--status-danger)' }} onClick={() => deletePlan(m.id)}>🗑</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* PO Modal */}
            {showPOModal && (
                <div className="modal-overlay" onClick={() => setShowPOModal(false)}>
                    <div className="modal" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Tạo đơn mua hàng</h3>
                            <button className="modal-close" onClick={() => setShowPOModal(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nhà cung cấp *</label>
                                    <input className="form-input" placeholder="Tên nhà cung cấp" value={poForm.supplier}
                                        onChange={e => setPoForm({ ...poForm, supplier: e.target.value })} list="supplier-list" />
                                    <datalist id="supplier-list">
                                        {suppliers.map(s => <option key={s.id} value={s.name} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ngày giao dự kiến</label>
                                    <input className="form-input" type="date" value={poForm.deliveryDate} onChange={e => setPoForm({ ...poForm, deliveryDate: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Địa chỉ giao hàng</label>
                                <input className="form-input" value={poForm.deliveryAddress} onChange={e => setPoForm({ ...poForm, deliveryAddress: e.target.value })} />
                            </div>

                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>Vật tư</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                                <tbody>
                                    {poItems.map((item, i) => (
                                        <tr key={i}>
                                            <td>{item.productName}</td>
                                            <td>{item.unit}</td>
                                            <td>
                                                <input type="number" className="form-input" style={{ width: 64, padding: '4px 6px', fontSize: 12 }} value={item.quantity}
                                                    onChange={e => setPoItems(prev => { const n = [...prev]; n[i] = { ...n[i], quantity: Number(e.target.value), amount: Number(e.target.value) * n[i].unitPrice }; return n; })} />
                                            </td>
                                            <td>{fmtVND(item.unitPrice)}</td>
                                            <td style={{ fontWeight: 600 }}>{fmtVND(item.amount)}</td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Tổng cộng:</td>
                                        <td style={{ fontWeight: 700 }}>{fmtVND(poItems.reduce((s, i) => s + i.amount, 0))}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <textarea className="form-input" rows={2} placeholder="Ghi chú..." value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} />

                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowPOModal(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={createPO} disabled={savingPO}>
                                    {savingPO ? 'Đang tạo...' : 'Tạo đơn mua hàng'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Bước 2: Kiểm tra trên trình duyệt**

Mở tab Vật tư — thấy summary 3 số, bảng vật tư, nút Tạo PO. Thử chọn vật tư và tạo PO.

- [ ] **Bước 3: Commit**

```bash
git add "app/projects/[id]/tabs/MaterialTab.js"
git commit -m "feat(project): MaterialTab — dự toán + tạo PO + yêu cầu vật tư"
```

---

## Task 7: ContractorTab

**Files:**
- Modify: `app/projects/[id]/tabs/ContractorTab.js`

- [ ] **Bước 1: Viết `ContractorTab.js`**

```javascript
'use client';
import { useState } from 'react';
import { fmtVND, fmtDate } from '@/lib/projectUtils';

export default function ContractorTab({ project: p, projectId, onRefresh }) {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ contractorId: '', contractAmount: '', paidAmount: '0', description: '', dueDate: '', status: 'Chưa TT' });
    const [contractors, setContractors] = useState([]);
    const [editId, setEditId] = useState(null);
    const [editPaid, setEditPaid] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [saving, setSaving] = useState(false);

    const pays = p.contractorPays || [];
    const totalContract = pays.reduce((s, c) => s + (Number(c.contractAmount) || 0), 0);
    const totalPaid = pays.reduce((s, c) => s + (Number(c.paidAmount) || 0), 0);

    const openModal = async () => {
        if (contractors.length === 0) {
            const res = await fetch('/api/contractors?limit=500');
            const json = await res.json();
            setContractors(json.data || []);
        }
        setForm({ contractorId: '', contractAmount: '', paidAmount: '0', description: '', dueDate: '', status: 'Chưa TT' });
        setShowModal(true);
    };

    const create = async () => {
        if (!form.contractorId) return alert('Chọn thầu phụ!');
        if (!form.contractAmount) return alert('Nhập giá trị hợp đồng!');
        setSaving(true);
        const res = await fetch('/api/contractor-payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, projectId, contractAmount: Number(form.contractAmount), paidAmount: Number(form.paidAmount) || 0 }),
        });
        setSaving(false);
        if (!res.ok) return alert('Lỗi tạo thầu phụ');
        setShowModal(false);
        onRefresh();
    };

    const updatePaid = async (id) => {
        await fetch(`/api/contractor-payments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paidAmount: Number(editPaid), status: editStatus }),
        });
        setEditId(null);
        onRefresh();
    };

    const remove = async (id) => {
        if (!confirm('Xóa thầu phụ này khỏi dự án?')) return;
        await fetch(`/api/contractor-payments/${id}`, { method: 'DELETE' });
        onRefresh();
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
                    <span>Tổng HĐ thầu: <strong>{fmtVND(totalContract)}</strong></span>
                    <span>Đã thanh toán: <strong style={{ color: 'var(--status-success)' }}>{fmtVND(totalPaid)}</strong></span>
                    <span>Còn lại: <strong style={{ color: 'var(--status-danger)' }}>{fmtVND(totalContract - totalPaid)}</strong></span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={openModal}>+ Thêm thầu phụ</button>
            </div>

            {pays.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có thầu phụ</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Thầu phụ</th>
                                <th>Mô tả</th>
                                <th>Giá trị HĐ</th>
                                <th>Đã TT</th>
                                <th>Còn lại</th>
                                <th>Trạng thái</th>
                                <th>Hạn TT</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {pays.map(cp => {
                                const remain = (Number(cp.contractAmount) || 0) - (Number(cp.paidAmount) || 0);
                                const isEditing = editId === cp.id;
                                return (
                                    <tr key={cp.id}>
                                        <td style={{ fontWeight: 600 }}>{cp.contractor?.name}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cp.description || '—'}</td>
                                        <td>{fmtVND(cp.contractAmount)}</td>
                                        <td>
                                            {isEditing
                                                ? <input className="form-input" style={{ width: 110, padding: '4px 6px', fontSize: 12 }} type="number" value={editPaid} onChange={e => setEditPaid(e.target.value)} />
                                                : <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmtVND(cp.paidAmount)}</span>
                                            }
                                        </td>
                                        <td style={{ color: remain > 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 600 }}>{fmtVND(remain)}</td>
                                        <td>
                                            {isEditing
                                                ? <select className="form-input" style={{ fontSize: 12, padding: '4px 6px' }} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                                                    {['Chưa TT', 'TT một phần', 'Đã TT'].map(s => <option key={s}>{s}</option>)}
                                                  </select>
                                                : <span className={`badge ${cp.status === 'Đã TT' ? 'success' : cp.status === 'TT một phần' ? 'warning' : 'muted'}`}>{cp.status}</span>
                                            }
                                        </td>
                                        <td style={{ fontSize: 12 }}>{fmtDate(cp.dueDate)}</td>
                                        <td>
                                            {isEditing ? (
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => updatePaid(cp.id)}>Lưu</button>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setEditId(null)}>Hủy</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => { setEditId(cp.id); setEditPaid(String(cp.paidAmount || 0)); setEditStatus(cp.status || 'Chưa TT'); }}>✏ Cập nhật TT</button>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--status-danger)' }} onClick={() => remove(cp.id)}>🗑</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal thêm thầu phụ */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Thêm thầu phụ</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thầu phụ *</label>
                                <select className="form-input" value={form.contractorId} onChange={e => setForm({ ...form, contractorId: e.target.value })}>
                                    <option value="">— Chọn thầu phụ —</option>
                                    {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mô tả công việc</label>
                                <input className="form-input" placeholder="Xây thô, lắp điện nước..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Giá trị HĐ (VND) *</label>
                                    <input className="form-input" type="number" value={form.contractAmount} onChange={e => setForm({ ...form, contractAmount: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã thanh toán (VND)</label>
                                    <input className="form-input" type="number" value={form.paidAmount} onChange={e => setForm({ ...form, paidAmount: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hạn thanh toán</label>
                                    <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Trạng thái</label>
                                    <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        {['Chưa TT', 'TT một phần', 'Đã TT'].map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={create} disabled={saving}>
                                    {saving ? 'Đang lưu...' : 'Thêm thầu phụ'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Bước 2: Kiểm tra trên trình duyệt**

Mở tab Thầu phụ — thấy bảng thầu phụ + nút cập nhật thanh toán hoạt động.

- [ ] **Bước 3: Commit**

```bash
git add "app/projects/[id]/tabs/ContractorTab.js"
git commit -m "feat(project): ContractorTab — thầu phụ + cập nhật thanh toán"
```

---

## Task 8: DocumentTab + WarrantyTab

**Files:**
- Modify: `app/projects/[id]/tabs/DocumentTab.js`
- Modify: `app/projects/[id]/tabs/WarrantyTab.js`

- [ ] **Bước 1: Viết `DocumentTab.js`**

```javascript
'use client';
import DocumentManager from '@/components/documents/DocumentManager';

export default function DocumentTab({ project, projectId }) {
    return <DocumentManager projectId={projectId} projectName={project.name} />;
}
```

- [ ] **Bước 2: Viết `WarrantyTab.js`**

> **Lưu ý:** Tab này tự fetch data riêng từ `/api/warranty?projectId=...` — KHÔNG dùng `p.warrantyRequests` vì field này không có trong API response.

```javascript
'use client';
import { useState, useEffect } from 'react';
import { fmtDate } from '@/lib/projectUtils';

const WARRANTY_STATUSES = ['Mới', 'Đang xử lý', 'Hoàn thành'];
const PRIORITY_OPTS = ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'];
const STATUS_BADGE = { 'Mới': 'danger', 'Đang xử lý': 'warning', 'Hoàn thành': 'success' };

export default function WarrantyTab({ projectId }) {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', reportedBy: '', assignee: '', priority: 'Trung bình' });
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        fetch(`/api/warranty?projectId=${projectId}`)
            .then(r => r.json())
            .then(d => { setTickets(Array.isArray(d) ? d : d.data || []); setLoading(false); });
    };

    useEffect(load, [projectId]);

    const addTicket = async () => {
        if (!form.title.trim()) return alert('Nhập tiêu đề yêu cầu bảo hành!');
        setSaving(true);
        await fetch('/api/warranty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, projectId }),
        });
        setSaving(false);
        setForm({ title: '', description: '', reportedBy: '', assignee: '', priority: 'Trung bình' });
        setShowForm(false);
        load();
    };

    const updateStatus = async (id, status) => {
        await fetch(`/api/warranty/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        load();
    };

    const deleteTicket = async (id) => {
        if (!confirm('Xóa ticket này?')) return;
        await fetch(`/api/warranty/${id}`, { method: 'DELETE' });
        load();
    };

    const open = tickets.filter(t => t.status === 'Mới' || t.status === 'Đang xử lý').length;

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div className="card" style={{ padding: 24 }}>
            <div className="card-header" style={{ marginBottom: 20 }}>
                <div>
                    <span className="card-title">🛡️ Bảo hành / After-sales</span>
                    {open > 0 && <span className="badge danger" style={{ marginLeft: 8 }}>{open} đang mở</span>}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
                    {showForm ? 'Đóng' : '+ Tạo ticket'}
                </button>
            </div>

            {showForm && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tiêu đề *</label>
                            <input className="form-input" placeholder="Mô tả vấn đề bảo hành" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ưu tiên</label>
                            <select className="form-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                {PRIORITY_OPTS.map(p => <option key={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Người báo</label>
                            <input className="form-input" placeholder="Tên khách hàng / kỹ thuật" value={form.reportedBy} onChange={e => setForm({ ...form, reportedBy: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Người xử lý</label>
                            <input className="form-input" placeholder="Kỹ thuật phụ trách" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} />
                        </div>
                    </div>
                    <textarea className="form-input" rows={3} placeholder="Chi tiết vấn đề..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Hủy</button>
                        <button className="btn btn-primary btn-sm" onClick={addTicket} disabled={saving}>
                            {saving ? 'Đang lưu...' : 'Tạo ticket'}
                        </button>
                    </div>
                </div>
            )}

            {tickets.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có yêu cầu bảo hành</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tickets.map(t => (
                        <div key={t.id} style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
                                {t.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{t.description}</div>}
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    {t.reportedBy && <span>👤 {t.reportedBy}</span>}
                                    {t.assignee && <span>🔧 {t.assignee}</span>}
                                    <span>{fmtDate(t.createdAt)}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                                <span className={`badge ${STATUS_BADGE[t.status] || 'muted'}`} style={{ fontSize: 11 }}>{t.priority}</span>
                                <select className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }} value={t.status} onChange={e => updateStatus(t.id, e.target.value)}>
                                    {WARRANTY_STATUSES.map(s => <option key={s}>{s}</option>)}
                                </select>
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--status-danger)' }} onClick={() => deleteTicket(t.id)}>🗑</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Bước 3: Kiểm tra trên trình duyệt**

Mở tab Tài liệu — thấy DocumentManager. Mở tab Bảo hành — thấy form + danh sách yêu cầu.

- [ ] **Bước 4: Commit**

```bash
git add "app/projects/[id]/tabs/DocumentTab.js" "app/projects/[id]/tabs/WarrantyTab.js"
git commit -m "feat(project): DocumentTab + WarrantyTab"
```

---

## Task 9: Kiểm tra tổng thể + dọn dẹp

**Files:**
- Kiểm tra: tất cả tab hoạt động đúng

- [ ] **Bước 1: Chạy full test suite**

```bash
npm test -- --reporter=verbose 2>&1 | tail -20
```

Expected: Tất cả test pass, không có regression.

- [ ] **Bước 2: Kiểm tra console errors**

Mở `http://localhost:3000/projects/[id-thực]` trong Chrome, mở DevTools Console, chuyển qua từng tab 1 — không được có lỗi đỏ.

- [ ] **Bước 3: Kiểm tra build production**

```bash
npm run build 2>&1 | tail -30
```

Expected: Build thành công, không có lỗi.

- [ ] **Bước 4: Xóa các imports không còn dùng trong page.js**

Kiểm tra `app/projects/[id]/page.js` không còn import:
- `BudgetLockBar`, `VarianceTable`, `ProfitabilityWidget`, `BudgetQuickAdd`, `SCurveChart`, `BudgetAlertBanner`
- `MeasurementSheet`
- `JournalTab`, `ScheduleManager`

Nếu còn → xóa bỏ.

- [ ] **Bước 5: Commit cuối**

```bash
git add -A
git commit -m "refactor(project): hoàn thành tách tab — 2093 dòng → 7 component"
```

---

## Checklist từ Spec

| Yêu cầu | Task |
|---------|------|
| page.js dưới 200 dòng | Task 2 |
| Mỗi tab file dưới 300 dòng | Task 3-8 |
| 7 tab hoạt động | Task 2-8 |
| Không còn import budget widgets | Task 9 |
| Tạo từ Báo giá hoạt động | Task 6 |
| Tạo PO từ vật tư chọn hoạt động | Task 6 |
| Thêm nhật ký từ Tổng quan | Task 3 |
| Không có lỗi console | Task 9 |
| Unit tests pass | Task 1, 9 |
