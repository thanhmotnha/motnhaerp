# Phase 4: Dashboard, Reports & Export Upgrade

## Context Links
- [Upgrade Opportunities](../reports/researcher-260306-2356-upgrade-opportunities.md) — Dashboard KPIs, Reports gaps, Export
- [Codebase Gaps](../reports/researcher-260306-2358-codebase-gaps.md) — Reports 50%, budget variance stub

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 8h
- **Dependency:** Phase 3 (Notifications) nen hoan thanh truoc de co alert tren dashboard
- **Mo ta:** Nang cap dashboard voi role-based KPI; bo sung reports budget variance + project profitability; them export Excel/PDF voi dinh dang Viet Nam

## Requirements

### Functional
- Dashboard: KPI cards theo role (giam_doc thay profit; ke_toan thay AR aging; ky_thuat thay WO)
- Dashboard: Project Health Index (budget% + timeline% + quality score)
- Dashboard: Cash flow runway (so ngay von con du)
- Reports: Budget vs Actual Variance — grouped by cost category, hien thi chenh lech
- Reports: Project Profitability drill-down — revenue vs cost per project, per phase
- Export: Excel voi VND format, dd/mm/yyyy, Vietnamese headers
- Export: PDF cho bao cao tong hop, dung template co san

### Non-functional
- Dashboard load <2s (aggregate queries co cache React Query 5min staleTime)
- Export Excel <10s cho 1000 rows
- PDF generation server-side (dung route handler)

## Architecture

### API Endpoints
| Method | Endpoint | Mo ta |
|--------|----------|-------|
| GET | `/api/dashboard` | Da co — them role-based KPI logic |
| GET | `/api/dashboard/project-health` | Moi — Project Health Index |
| GET | `/api/dashboard/cashflow-runway` | Moi — Cash flow runway |
| GET | `/api/budget/variance` | Da co — them groupBy category |
| GET | `/api/budget/profitability` | Da co — them drill-down per phase |
| GET | `/api/reports/export` | Moi — export Excel/PDF (query params: type, format, filters) |

### Data Flow
```
Dashboard Load -> Fetch KPIs (role-filtered) -> Render Cards + Charts
Budget Variance -> Group by Category -> Show Planned vs Actual vs Diff
Export Request -> Server Generate File -> Stream Download to Client
```

## Related Code Files

### Files can sua
- `app/page.js` (dashboard) — them role-based sections, project health widget
- `app/api/dashboard/route.js` — them role-based KPI queries
- `app/api/budget/variance/route.js` — them groupBy param, category breakdown
- `app/api/budget/profitability/route.js` — them phase drill-down
- `app/reports/page.js` — them tab Variance + Profitability
- `components/budget/VarianceTable.js` — nang cap hien thi grouped data
- `components/budget/ProfitabilityWidget.js` — them drill-down interaction
- `components/dashboard/WidgetConfigurator.js` — them widget options moi

### Files can tao
- `components/dashboard/ProjectHealthCard.js` — hien thi health index (budget/timeline/quality)
- `components/dashboard/CashFlowRunway.js` — so ngay von con, progress bar
- `components/dashboard/RoleKPISection.js` — render KPI cards theo role
- `components/reports/VarianceReport.js` — Bao cao chenh lech chi tiet
- `components/reports/ProfitabilityDrillDown.js` — Bang loi nhuan theo project + phase
- `components/reports/ExportButton.js` — Nut export voi dropdown (Excel/PDF)
- `app/api/dashboard/project-health/route.js` — Health index calculation
- `app/api/dashboard/cashflow-runway/route.js` — Cash flow calculation
- `app/api/reports/export/route.js` — Generate Excel/PDF
- `lib/export-utils.js` — Helper format VND, date, generate Excel buffer

## Implementation Steps

### Dashboard Upgrade (3h)
1. Cap nhat `app/api/dashboard/route.js` — them logic: neu role=giam_doc return profit KPIs; ke_toan return AR aging; ky_thuat return WO status
2. Tao API `dashboard/project-health/route.js` — tinh: budgetScore (spent/planned * 100), timelineScore (actual vs planned dates), qualityScore (defects resolved/total)
3. Tao API `dashboard/cashflow-runway/route.js` — (cash balance / avg daily expense) = so ngay con
4. Tao `RoleKPISection.js` — render KPICard components theo role tu session
5. Tao `ProjectHealthCard.js` — 3 gauge/progress bars (budget, timeline, quality) + overall score
6. Tao `CashFlowRunway.js` — progress bar + so ngay, mau do khi <30 ngay
7. Cap nhat `app/page.js` — thay KPI section bang RoleKPISection, them health + cashflow widgets

### Reports Upgrade (3h)
8. Cap nhat `app/api/budget/variance/route.js` — them groupBy=category param, return { category, planned, actual, diff, diffPercent }
9. Cap nhat `app/api/budget/profitability/route.js` — them projectId param cho drill-down, return phases voi revenue/cost
10. Tao `VarianceReport.js` — DataTable voi columns: Hang muc | Ke hoach | Thuc te | Chenh lech | % | StatusBadge
11. Tao `ProfitabilityDrillDown.js` — tree table: Project > Phase > Cost Items voi expand/collapse
12. Cap nhat `app/reports/page.js` — them 2 tab moi: "Chenh lech Ngan sach" va "Loi nhuan Du an"

### Export (2h)
13. Tao `lib/export-utils.js` — functions: formatVND(), formatDateVN(), generateExcelBuffer(data, columns), generatePDFBuffer(data, template)
14. Tao API `reports/export/route.js` — nhan query (type=variance|profitability|ar-aging, format=xlsx|pdf), goi export-utils, return file stream
15. Tao `ExportButton.js` — dropdown voi 2 option (Excel, PDF), goi API va trigger download
16. Them ExportButton vao cac trang reports: Variance, Profitability, AR Aging

## Todo List
- [ ] Dashboard: Role-based KPI API logic
- [ ] Dashboard: Project Health API + component
- [ ] Dashboard: Cash Flow Runway API + component
- [ ] Dashboard: RoleKPISection component
- [ ] Dashboard: Cap nhat main page
- [ ] Reports: Variance API upgrade + component
- [ ] Reports: Profitability drill-down API + component
- [ ] Reports: Cap nhat reports page voi tabs moi
- [ ] Export: export-utils.js (VND, date format, Excel/PDF gen)
- [ ] Export: API export route
- [ ] Export: ExportButton component
- [ ] Export: Tich hop vao report pages

## Success Criteria
- Dashboard hien thi KPI khac nhau theo role dang nhap
- Project Health Index tinh dung 3 metrics, hien thi truc quan
- Variance report hien thi grouped by category voi chenh lech %
- Profitability drill-down expand duoc tung project > phase
- Export Excel co VND format dung (1.234.567 d), date dd/mm/yyyy
- Export PDF co layout dep, header tieng Viet

## Security Considerations
- Dashboard KPI: filter data theo role (ke_toan khong thay HR data)
- Export: chi role `giam_doc`, `pho_gd`, `ke_toan` duoc export (withAuth role check)
- Profitability data: du lieu nhay cam — chi giam_doc va ke_toan
- Rate limit export API (1 request/10s/user) de tranh abuse
