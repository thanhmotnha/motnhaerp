# STATE.md — Một Nhà ERP

> Cập nhật: 2026-03-16T10:37

## Project Overview
- **Stack**: Next.js 16 + React 19 + Prisma 6 + PostgreSQL + Docker
- **Mục đích**: ERP quản lý doanh nghiệp nội thất/xây dựng
- **API Routes**: 170+ routes, 70+ modules
- **DB Models**: 79 Prisma models
- **Auth**: JWT (web) + Bearer Token (mobile) + Public pages
- **Storage**: Cloudflare R2
- **AI**: Gemini (Journal Assistant)

## Done (gần đây)
- [x] Phase 1-3: Schema, APIs, Dashboard, HR tabs, Furniture Orders, Production Batches
- [x] Phase 4: CustomerInteraction, EmployeeReview, SalaryAdvance, Customer tags, Dashboard PaymentAlerts
- [x] Phase 5: EmployeeContract, ProductionCost, Warranty SLA, Schedule Critical Path
- [x] Phase 6: Schema updates, API enhancements, Frontend (Quotation versioning, Warehouse transfers, Production Kanban, Accounting)
- [x] Phase 7: Sidebar — added `/work-orders` + `/material-plans`. Notification bell in Header.
- [x] Phase 8: 5 new pages — Daily Logs, Acceptance, Contractors, Expenses, Budget
- [x] Phase 9: Admin Settings (6 tabs), Dashboard Tier 4 (activity feed, quick actions, calendar)
- [x] Phase 10: Full test suite — 61/61 pass. Schema sync audit — fix prisma.setting→systemSetting
- [x] Code review: infrastructure, API, frontend — all patterns consistent

## In Progress
- (none)

## Next
- [ ] Deployment / staging test
- [ ] Mobile responsive polish

## Commit
- Branch: `main`
- Last commit: Phase 4–10 (pending push)
