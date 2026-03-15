# STATE.md — Một Nhà ERP

> Cập nhật: 2026-03-16T00:40

## Project Overview
- **Stack**: Next.js 16 + React 19 + Prisma 6 + PostgreSQL + Docker
- **Mục đích**: ERP quản lý doanh nghiệp nội thất/xây dựng
- **API Routes**: 170+ routes, 70+ modules
- **DB Models**: 69+ Prisma models (mới: WarehouseTransfer, AccountEntry)
- **Auth**: JWT (web) + Bearer Token (mobile) + Public pages
- **Storage**: Cloudflare R2
- **AI**: Gemini (Journal Assistant)

## Done (gần đây)
- [x] Phase 1-3: Schema, APIs, Dashboard, HR tabs, Furniture Orders, Production Batches
- [x] Phase 4: CustomerInteraction, EmployeeReview, SalaryAdvance, Customer tags, Dashboard PaymentAlerts
- [x] Phase 5: EmployeeContract, ProductionCost, Warranty SLA, Schedule Critical Path
- [x] Phase 6: Schema updates, API enhancements, Frontend (Quotation versioning, Warehouse transfers, Production Kanban, Accounting)
- [x] Phase 7: Sidebar — added `/work-orders` + `/material-plans`. Notification bell in Header.
- [x] Phase 8: 5 new pages — Daily Logs, Acceptance, Contractors, Expenses, Budget. All with KPI cards + tables + form modals. Sidebar updated.

## In Progress
- (none)

## Next
- [ ] Phase 9: Dashboard enhancements (activity feed, quick actions)
- [ ] Phase 10: Mobile responsive polish
- [ ] Deployment / staging test

## Commit
- Branch: `main`
- Last commit: `b4bd170` — feat: Phase 3
- Pending: Phase 4 + 5 + 6 + 7 + 8 changes → committing now
