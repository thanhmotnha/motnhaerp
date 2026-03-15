# STATE.md — Một Nhà ERP

> Cập nhật: 2025-07-17T10:00

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
- [x] Phase 6A: Schema — Product reorderPoint, Warehouse fields, WarehouseTransfer, AccountEntry
- [x] Phase 6B: APIs — quotation clone/lock, reorder-alerts, warehouse transfers, production-batch status, accounting + summary
- [x] Phase 6C: Frontend — Quotation versioning UI (clone/lock/revision), Warehouse transfers page, Production Kanban, Accounting page (KPIs + table + form)
- [x] Phase 6D: Build verification passed (exit 0)

## In Progress
- (none)

## Next
- [ ] Deployment / staging test
- [ ] Push to remote (Phase 4 + 5 + 6 pending commit)

## Commit
- Branch: `main`
- Last commit: `b4bd170` — feat: Phase 3 - Dashboard KPI, HR tabs, Furniture Orders, Production Batches
- Pending: Phase 4 + Phase 5 + Phase 6 changes (not committed yet)
