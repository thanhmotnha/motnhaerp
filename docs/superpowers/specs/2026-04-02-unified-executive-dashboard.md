# Unified Executive Dashboard Design

## Goal

Merge Dashboard, Pipeline, Reports, and P&L by Project into a single `/` page for the business owner. All critical information visible in one scroll, no need to navigate between 4 separate pages.

---

## Architecture

No new API endpoints. Page fetches from existing endpoints in parallel:
- `/api/dashboard` — KPI stats, tasks, pipeline summary (already loaded)
- `/api/reports/debt` — supplier/contractor debt + aging
- `/api/reports/project-pnl` — P&L per project (filter `alert=true` client-side)
- `/api/reports/monthly?year=YYYY` — monthly revenue/expense for mini chart (lazy on mount)

`app/page.js` is rewritten as a single `'use client'` component. No sub-components extracted to new files — follows existing codebase pattern of large page files.

---

## Layout (top to bottom)

### Header Banner (unchanged)
Gradient banner: title "Tổng quan Lãnh đạo", date, active projects count, this-month revenue, refresh + customize buttons.

### Block 1 — Tài chính tháng này

**6 KPI cards** (grid, auto-fit min 150px):
1. Doanh thu tháng — `s.thisMonthRevenue`, growth % vs last month
2. Chi phí tháng — `s.thisMonthExpense` (from monthly API)
3. Lợi nhuận tháng — revenue - expense, color red if negative
4. Còn phải thu — `s.totalContractValue - s.totalPaid`
5. Công nợ NCC — `debtData.supplierTotal`
6. Công nợ nhà thầu — `debtData.contractorTotal`

**Mini bar chart** below cards — 6 most recent months, revenue (blue) vs expense (orange) bars side by side. Built with inline SVG (same pattern as existing `app/reports/page.js` monthly tab). Selector for year (default current year).

Data: `monthlyData.months` from `/api/reports/monthly`. Fetch on mount with current year.

### Block 2 — Cảnh báo vận hành (unchanged from current Dashboard)

- `AlertBar` component — overdue receivables, open warranty, pending leave
- `TodayTasksWidget` — overdue WOs, pending POs, urgent commitments, overdue contract payments
- `PaymentAlertsCard` — contract payments overdue/upcoming

### Block 3 — Dự án cần chú ý (new)

Card with header "⚠️ Dự án cần chú ý" + link "Xem tất cả P&L →" to `/reports/pl-by-project`.

Compact table — only rows where `alert === true` from `/api/reports/project-pnl`, max 10 rows.

Columns: Mã DA | Tên | Loại | Doanh thu | Chi phí | Margin% | Trạng thái

Row coloring:
- Red: `margin < 0`
- Yellow: `0 ≤ margin < 10`

If no alert projects: show green message "✅ Tất cả dự án đều đang tốt".

### Block 4 — Công nợ (new)

Two side-by-side panels (grid 2 cols, stack on mobile):

**Phải thu (Receivables)**
- Big number: `debtData.supplierTotal` — wait, this is receivables from contracts
- Actually: receivable = `s.totalContractValue - s.totalPaid` (already in dashboard stats)
- Aging bars: current / 1-30 / 31-60 / 61-90 / >90 days from `/api/reports/aging-receivables` (lazy, or skip if too slow — use summary number only)
- Link → `/reports` tab `cong_no`

**Phải trả (Payables)**
- Big number supplier: `debtData.supplierTotal`
- Big number contractor: `debtData.contractorTotal`
- Top 3 debtors list from `debtData.topSuppliers` + `debtData.topContractors`

Data: `/api/reports/debt` — fetch in parallel with dashboard on mount.

### Block 5 — Pipeline mini (already in dashboard, keep)

1-row stat bar using `data.pipelineSummary`:
- DA đang thi công | Giá trị HĐ đang chạy | Tiềm năng chưa ký | Tỷ lệ chốt

Link → `/pipeline` for detail.

### Block 6 — Hoạt động + Mốc sắp tới (unchanged)

Two-column layout: `ActivityFeed` | `UpcomingMilestones`

---

## Sidebar changes

Move Pipeline, Reports, P&L by Project from their current prominent positions to a collapsed "Báo cáo chi tiết" section (collapsible, default collapsed). This avoids removing them — still accessible when needed.

In `components/Sidebar.js`, change the "Báo cáo" section:
- Add `collapsible: true` (currently `collapsible !== false`)
- Group: Pipeline + Reports + P&L under one section header "Báo cáo chi tiết", default collapsed

---

## API loading strategy

```
On mount (parallel):
  fetch('/api/dashboard')          → stats, tasks, pipeline
  fetch('/api/reports/debt')       → debt panels
  fetch('/api/reports/project-pnl') → alert projects
  fetch('/api/reports/monthly?year=YYYY') → mini chart

All 4 fetches fire simultaneously.
Show skeleton while loading.
Each block renders independently as its data arrives.
```

---

## Files to change

| File | Change |
|------|--------|
| `app/page.js` | Full rewrite — merge all 4 pages into one unified layout |
| `components/Sidebar.js` | Collapse Pipeline + Reports + P&L into "Báo cáo chi tiết" section |

---

## Out of scope

- Replacing or modifying `/pipeline`, `/reports`, `/reports/pl-by-project` pages themselves
- Adding new API endpoints
- Role-based visibility on new blocks (all visible to giam_doc — existing role checks via `useRole` apply)
- Export/print from dashboard
