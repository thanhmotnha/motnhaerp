# Unified Executive Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Dashboard, Pipeline, Reports, and P&L by Project into one unified `/` page for the business owner, adding finance KPI + chart, alert projects table, and debt panels.

**Architecture:** `app/page.js` is extended with 4 new parallel API fetches (debt, project-pnl, monthly) and 4 new inline component functions (MonthlyMiniChart, AlertProjectsCard, DebtPanels). Sidebar groups Pipeline/Reports/P&L into a new collapsed "Báo cáo chi tiết" section. No new API endpoints or files needed.

**Tech Stack:** Next.js 16 App Router, React 19, inline SVG charts (no library), existing CSS classes from globals.css

---

## File Structure

| File | Change |
|------|--------|
| `components/Sidebar.js` | Move Pipeline + Reports + P&L from "Tổng quan" into new "Báo cáo chi tiết" section (collapsible, default collapsed) |
| `app/page.js` | Add 3 new state vars + parallel fetches + 3 new inline component functions + insert new blocks into layout |

---

### Task 1: Sidebar — "Báo cáo chi tiết" section

**Files:**
- Modify: `components/Sidebar.js`

Context: `menuItems` array starts at line 18. The "Tổng quan" section (line 20) has `collapsible: false` and contains Dashboard, Pipeline, Báo cáo, P&L Dự án. We remove Pipeline/Reports/P&L from it and add a new collapsed section after "Quản lý".

The section collapse state is read from `localStorage('sidebar_collapsed')` on mount. We need "Báo cáo chi tiết" to start collapsed by default. The current init code is:
```js
useEffect(() => {
    try {
        const saved = localStorage.getItem('sidebar_collapsed');
        if (saved) setCollapsed(JSON.parse(saved));
    } catch { }
}, []);
```

We'll add a `defaultCollapsed` property to the new section and change the init to apply defaults when a section hasn't been explicitly set.

- [ ] **Step 1: Remove Pipeline, Báo cáo, P&L from "Tổng quan" section**

In `components/Sidebar.js`, find:
```js
    {
        section: 'Tổng quan', collapsible: false, items: [
            { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { href: '/pipeline', icon: TrendingUp, label: 'Pipeline' },
            { href: '/reports', icon: BarChart3, label: 'Báo cáo', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/reports/pl-by-project', icon: TrendingUp, label: 'P&L Dự án', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
        ]
    },
```

Replace with:
```js
    {
        section: 'Tổng quan', collapsible: false, items: [
            { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
        ]
    },
```

- [ ] **Step 2: Add "Báo cáo chi tiết" section after "Quản lý"**

Find the closing of the "Quản lý" section:
```js
    {
        section: 'Quản lý', items: [
            { href: '/contractors', icon: HardHat, label: 'Nhà thầu phụ' },
            { href: '/hr', icon: UserCog, label: 'Nhân sự', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/admin/settings', icon: Settings, label: 'Cài đặt', roles: ['giam_doc'] },
        ]
    },
```

Replace with:
```js
    {
        section: 'Quản lý', items: [
            { href: '/contractors', icon: HardHat, label: 'Nhà thầu phụ' },
            { href: '/hr', icon: UserCog, label: 'Nhân sự', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/admin/settings', icon: Settings, label: 'Cài đặt', roles: ['giam_doc'] },
        ]
    },
    {
        section: 'Báo cáo chi tiết', defaultCollapsed: true, items: [
            { href: '/pipeline', icon: TrendingUp, label: 'Pipeline' },
            { href: '/reports', icon: BarChart3, label: 'Báo cáo', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/reports/pl-by-project', icon: TrendingUp, label: 'P&L Dự án', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
        ]
    },
```

- [ ] **Step 3: Update collapsed init to respect `defaultCollapsed`**

Find:
```js
    useEffect(() => {
        try {
            const saved = localStorage.getItem('sidebar_collapsed');
            if (saved) setCollapsed(JSON.parse(saved));
        } catch { }
    }, []);
```

Replace with:
```js
    useEffect(() => {
        try {
            const saved = localStorage.getItem('sidebar_collapsed');
            const parsed = saved ? JSON.parse(saved) : {};
            const defaults = {};
            menuItems.forEach(s => { if (s.defaultCollapsed) defaults[s.section] = true; });
            setCollapsed({ ...defaults, ...parsed });
        } catch { }
    }, []);
```

- [ ] **Step 4: Verify build passes**

```bash
cd d:/Codeapp/motnha && npm run build
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/Sidebar.js
git commit -m "feat(sidebar): group pipeline/reports/pnl into collapsed section"
```

---

### Task 2: page.js — new state + parallel data fetching

**Files:**
- Modify: `app/page.js`

Context: Current `Dashboard` component (line 281) has `data`, `loading`, `refreshing` state and fetches `/api/dashboard` in `load`. We add 3 new states (`debtData`, `pnlAlerts`, `monthlyData`), update `load` to also fetch `/api/reports/debt` and `/api/reports/project-pnl` in parallel, and add a `selectedYear` state with a separate `useEffect` for year-based monthly refetch.

- [ ] **Step 1: Add new state variables**

In `app/page.js`, find:
```js
export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { widgets, showConfig, setShowConfig, toggleWidget, moveWidget, resetConfig } = useDashboardWidgets();
```

Replace with:
```js
export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [debtData, setDebtData] = useState(null);
    const [pnlAlerts, setPnlAlerts] = useState([]);
    const [monthlyData, setMonthlyData] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const { widgets, showConfig, setShowConfig, toggleWidget, moveWidget, resetConfig } = useDashboardWidgets();
```

- [ ] **Step 2: Update `load` to fetch debt and pnl in parallel**

Find:
```js
    const load = useCallback((showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        fetch('/api/dashboard').then(r => r.json()).then(d => {
            setData(d);
            setLoading(false);
            setRefreshing(false);
        });
    }, []);
```

Replace with:
```js
    const load = useCallback((showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        Promise.all([
            fetch('/api/dashboard').then(r => r.json()),
            fetch('/api/reports/debt').then(r => r.json()),
            fetch('/api/reports/project-pnl').then(r => r.json()),
        ]).then(([dashboard, debt, pnl]) => {
            setData(dashboard);
            setDebtData(debt);
            setPnlAlerts((pnl.rows || []).filter(r => r.alert));
            setLoading(false);
            setRefreshing(false);
        }).catch(() => { setLoading(false); setRefreshing(false); });
    }, []);
```

- [ ] **Step 3: Add useEffect for selectedYear → monthlyData**

After the existing `useEffect(() => { load(); }, [load]);`, add:

```js
    useEffect(() => {
        fetch(`/api/reports/monthly?year=${selectedYear}`)
            .then(r => r.json())
            .then(setMonthlyData)
            .catch(() => {});
    }, [selectedYear]);
```

- [ ] **Step 4: Verify build passes**

```bash
cd d:/Codeapp/motnha && npm run build
```

Expected: exit 0. The new state vars are declared but not yet used in JSX — that may produce lint warnings but not build errors.

- [ ] **Step 5: Commit**

```bash
git add app/page.js
git commit -m "feat(dashboard): add parallel fetches for debt, pnl, monthly data"
```

---

### Task 3: page.js — MonthlyMiniChart + 6-card KPI Block 1

**Files:**
- Modify: `app/page.js`

Context: Add `MonthlyMiniChart` function before `Dashboard`, then replace the existing 3-card KPI tier 1 (lines ~350-370) with a 6-card grid + year selector + chart. The existing cards were: "Doanh thu tháng này", "Còn phải thu", "Lợi nhuận tích lũy". We replace those with 6 cards using data from both dashboard and new state vars.

The `debtData` object shape: `{ supplierTotal, contractorTotal, topSuppliers, topContractors, supplierAging, contractorAging }`.

The `monthlyData` object shape: `{ year, months: [{month, label, revenue, expense, profit, cumRevenue, cumExpense}], summary }`.

- [ ] **Step 1: Add `MonthlyMiniChart` component before `Dashboard`**

Find the line:
```js
export default function Dashboard() {
```

Insert before it:

```js
function MonthlyMiniChart({ months, selectedYear }) {
    const currentMonth = selectedYear === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
    const display = (months || []).filter(m => m.month <= currentMonth && (m.revenue > 0 || m.expense > 0)).slice(-6);
    if (!display.length) return (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: 12 }}>Chưa có dữ liệu tháng {selectedYear}</div>
    );
    const maxVal = Math.max(...display.flatMap(m => [m.revenue, m.expense]), 1);
    const barW = 18, gap = 6, colW = barW * 2 + gap + 14;
    const W = display.length * colW + 20, H = 80;
    return (
        <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {display.map((m, i) => {
                const x = 10 + i * colW;
                const rh = Math.max(2, Math.round((m.revenue / maxVal) * H));
                const eh = Math.max(2, Math.round((m.expense / maxVal) * H));
                return (
                    <g key={m.label}>
                        <rect x={x} y={H - rh} width={barW} height={rh} fill="#234093" rx={2} opacity={0.85} />
                        <rect x={x + barW + gap / 2} y={H - eh} width={barW} height={eh} fill="#F97316" rx={2} opacity={0.85} />
                        <text x={x + barW} y={H + 16} textAnchor="middle" fontSize={9} fill="#888">{m.label}</text>
                    </g>
                );
            })}
            <text x={4} y={H + 16} fontSize={9} fill="#234093">■ DT</text>
            <text x={display.length * colW - 20} y={H + 16} fontSize={9} fill="#F97316">■ CP</text>
        </svg>
    );
}

```

- [ ] **Step 2: Replace 3-card KPI tier 1 with 6-card grid + chart**

Find this block (the 3 KPI cards, approximately lines 350-370):
```js
            {/* KPI Cards — Tier 1: Revenue + Collection + Profit */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid #DBB35E' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Doanh thu tháng này</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#234093', margin: '2px 0' }}>{fmtShort(s.thisMonthRevenue)}</div>
                    {s.revenueGrowth != null && (
                        <div style={{ fontSize: 11, color: s.revenueGrowth >= 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                            {s.revenueGrowth >= 0 ? '▲' : '▼'} {Math.abs(s.revenueGrowth)}% so tháng trước
                        </div>
                    )}
                </div>
                <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid #234093' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Còn phải thu</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#234093', margin: '2px 0' }}>{fmtShort(Math.max(0, s.totalContractValue - s.totalPaid))}</div>
                    <div style={{ fontSize: 11, color: collectionRate < 50 ? '#DC2626' : '#16A34A', fontWeight: 600 }}>Đã thu {collectionRate}%</div>
                </div>
                <div className="card" style={{ padding: '16px 20px', borderTop: `3px solid ${profit >= 0 ? '#16A34A' : '#DC2626'}` }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Lợi nhuận tích lũy</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: profit >= 0 ? '#16A34A' : '#DC2626', margin: '2px 0' }}>{fmtShort(profit)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>DT {fmtShort(s.revenue)} · CP {fmtShort(s.expense)}</div>
                </div>
            </div>
```

Replace with:

```js
            {/* Block 1 — Tài chính tháng này */}
            {(() => {
                const curMonthIdx = new Date().getMonth();
                const cm = monthlyData?.months?.[curMonthIdx] || { revenue: 0, expense: 0, profit: 0 };
                const thisMonthExpense = cm.expense;
                const thisMonthProfit = cm.revenue - cm.expense;
                const yearOptions = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];
                return (
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header" style={{ borderLeft: '4px solid #DBB35E', paddingLeft: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>📊 Tài chính tháng này</h3>
                            <select
                                className="form-input"
                                style={{ width: 100, fontSize: 12, padding: '4px 8px' }}
                                value={selectedYear}
                                onChange={e => setSelectedYear(Number(e.target.value))}
                            >
                                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div style={{ padding: '12px 16px 8px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
                                {[
                                    { label: 'Doanh thu tháng', value: s.thisMonthRevenue, color: '#234093', sub: s.revenueGrowth != null ? `${s.revenueGrowth >= 0 ? '▲' : '▼'} ${Math.abs(s.revenueGrowth)}% tháng trước` : null, subColor: s.revenueGrowth >= 0 ? '#16A34A' : '#DC2626' },
                                    { label: 'Chi phí tháng', value: thisMonthExpense, color: '#F97316', sub: monthlyData ? null : 'Đang tải...', subColor: '#888' },
                                    { label: 'Lợi nhuận tháng', value: thisMonthProfit, color: thisMonthProfit >= 0 ? '#16A34A' : '#DC2626', sub: null },
                                    { label: 'Còn phải thu', value: Math.max(0, s.totalContractValue - s.totalPaid), color: '#2D5CA3', sub: `Đã thu ${collectionRate}%`, subColor: collectionRate < 50 ? '#DC2626' : '#16A34A' },
                                    { label: 'Công nợ NCC', value: debtData?.supplierTotal || 0, color: '#7C3AED', sub: null },
                                    { label: 'Công nợ nhà thầu', value: debtData?.contractorTotal || 0, color: '#DC2626', sub: null },
                                ].map(k => (
                                    <div key={k.label} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10, borderTop: `3px solid ${k.color}` }}>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k.label}</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{fmtShort(k.value)}</div>
                                        {k.sub && <div style={{ fontSize: 10, color: k.subColor || 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{k.sub}</div>}
                                    </div>
                                ))}
                            </div>
                            <MonthlyMiniChart months={monthlyData?.months} selectedYear={selectedYear} />
                        </div>
                    </div>
                );
            })()}
```

- [ ] **Step 3: Verify build passes**

```bash
cd d:/Codeapp/motnha && npm run build
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add app/page.js
git commit -m "feat(dashboard): add 6-card finance KPI + monthly mini chart"
```

---

### Task 4: page.js — AlertProjectsCard + DebtPanels functions

**Files:**
- Modify: `app/page.js`

Context: Add two new inline component functions before `Dashboard` function. They receive props from the parent state. Then insert them into the JSX layout after `PaymentAlertsCard`.

`pnlAlerts` is an array of rows from `/api/reports/project-pnl` filtered to `alert === true`. Each row has: `{ code, name, customerName, groupType, contractValue, paidByCustomer, totalCost, grossProfit, margin, status }`.

`debtData` has: `{ supplierTotal, contractorTotal, topSuppliers: [{name, totalDebt, aging}], topContractors: [{name, totalDebt, aging}] }`.

- [ ] **Step 1: Add `AlertProjectsCard` component**

Add immediately before `export default function Dashboard() {`:

```js
function AlertProjectsCard({ rows }) {
    if (!rows || rows.length === 0) return (
        <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ borderLeft: '4px solid #16A34A', paddingLeft: 12 }}>
                <h3>✅ Dự án cần chú ý</h3>
            </div>
            <div style={{ padding: '16px 20px', color: '#16A34A', fontSize: 13 }}>Tất cả dự án đều đang ổn định.</div>
        </div>
    );
    return (
        <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ borderLeft: '4px solid #D97706', paddingLeft: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    ⚠️ Dự án cần chú ý
                    <span style={{ background: '#DC2626', color: '#fff', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 10 }}>{rows.length}</span>
                </h3>
                <a href="/reports/pl-by-project" style={{ fontSize: 12, color: '#234093', textDecoration: 'none', fontWeight: 600 }}>Xem tất cả P&L →</a>
            </div>
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Mã DA</th>
                            <th>Tên dự án</th>
                            <th>Loại</th>
                            <th style={{ textAlign: 'right' }}>Doanh thu</th>
                            <th style={{ textAlign: 'right' }}>Chi phí</th>
                            <th style={{ textAlign: 'right' }}>Margin</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.slice(0, 10).map(r => (
                            <tr key={r.id}
                                onClick={() => window.location.href = `/projects/${r.code}`}
                                style={{ cursor: 'pointer', background: r.margin < 0 ? 'rgba(220,38,38,0.04)' : 'rgba(217,119,6,0.04)' }}
                            >
                                <td style={{ fontWeight: 600, color: '#234093' }}>{r.code}</td>
                                <td style={{ fontWeight: 500 }}>{r.name}</td>
                                <td style={{ fontSize: 12 }}>{r.groupType}</td>
                                <td style={{ textAlign: 'right', fontSize: 13 }}>{fmtShort(r.paidByCustomer)}</td>
                                <td style={{ textAlign: 'right', fontSize: 13 }}>{fmtShort(r.totalCost)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: r.margin < 0 ? '#DC2626' : '#D97706' }}>{r.margin?.toFixed(1)}%</td>
                                <td><span className="badge badge-info">{r.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function DebtPanels({ debtData }) {
    if (!debtData) return null;
    const panels = [
        { title: 'Công nợ NCC', total: debtData.supplierTotal, items: debtData.topSuppliers?.slice(0, 4) || [], color: '#7C3AED' },
        { title: 'Công nợ Nhà thầu', total: debtData.contractorTotal, items: debtData.topContractors?.slice(0, 4) || [], color: '#DC2626' },
    ];
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {panels.map(panel => (
                <div key={panel.title} className="card">
                    <div className="card-header" style={{ borderLeft: `4px solid ${panel.color}`, paddingLeft: 12 }}>
                        <h3>{panel.title}</h3>
                        <span style={{ fontSize: 18, fontWeight: 800, color: panel.color }}>{fmtShort(panel.total)}</span>
                    </div>
                    <div style={{ padding: '8px 16px 12px' }}>
                        {panel.items.length === 0 ? (
                            <div style={{ color: '#16A34A', fontSize: 12 }}>Không có công nợ</div>
                        ) : panel.items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < panel.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.name}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: panel.color }}>{fmtShort(item.totalDebt)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

```

- [ ] **Step 2: Insert `AlertProjectsCard` and `DebtPanels` into the JSX layout**

In the `return (...)` of `Dashboard`, find:
```js
            {/* Payment alerts */}
            <PaymentAlertsCard />

            {/* KPI Cards — Tier 1: Revenue + Collection + Profit */}
```

Note: After Task 3, "KPI Cards — Tier 1" was replaced by "Block 1 — Tài chính tháng này". So find:
```js
            {/* Payment alerts */}
            <PaymentAlertsCard />

            {/* Block 1 — Tài chính tháng này */}
```

And change it to:
```js
            {/* Payment alerts */}
            <PaymentAlertsCard />

            {/* Block 1 — Tài chính tháng này */}
```

Then after the Block 1 closing `})()}` (end of the IIFE), find the next section and add the new blocks. Find:
```js
            {/* KPI Cards — Tier 2: Operational */}
```

Insert before it:
```js
            {/* Block 3 — Dự án cần chú ý */}
            <AlertProjectsCard rows={pnlAlerts} />

            {/* Block 4 — Công nợ */}
            <DebtPanels debtData={debtData} />

```

- [ ] **Step 3: Verify build passes**

```bash
cd d:/Codeapp/motnha && npm run build
```

Expected: exit 0.

- [ ] **Step 4: Run tests**

```bash
cd d:/Codeapp/motnha && npm test
```

Expected: tests that were passing before still pass (lib tests only, not component tests).

- [ ] **Step 5: Manual verification**

Start dev server:
```bash
cd d:/Codeapp/motnha && npm run dev
```

Open http://localhost:3000 and verify:
- [ ] 6 KPI cards visible with correct data
- [ ] Mini bar chart renders (even if no data, shows "Chưa có dữ liệu")
- [ ] Year selector changes chart
- [ ] "Dự án cần chú ý" section shows (or green "ổn định" message if no alerts)
- [ ] Debt panels show supplier + contractor totals
- [ ] Pipeline/Reports/P&L moved to collapsed "Báo cáo chi tiết" in sidebar
- [ ] "Báo cáo chi tiết" starts collapsed by default
- [ ] All existing widgets (Tasks, Payments, Activity, Milestones) still show

- [ ] **Step 6: Commit**

```bash
git add app/page.js
git commit -m "feat(dashboard): add alert projects table and debt panels"
```
