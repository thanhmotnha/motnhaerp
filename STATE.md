# STATE.md — Một Nhà ERP

> Cập nhật: 2025-07-16T09:30

## Project Overview
- **Stack**: Next.js 16 + React 19 + Prisma 6 + PostgreSQL + Docker
- **Mục đích**: ERP quản lý doanh nghiệp nội thất/xây dựng
- **API Routes**: 160+ routes, 65+ modules
- **DB Models**: 67+ Prisma models (mới: EmployeeContract, ProductionCost + Warranty SLA fields)
- **Auth**: JWT (web) + Bearer Token (mobile) + Public pages
- **Storage**: Cloudflare R2
- **AI**: Gemini (Journal Assistant)

## Done (gần đây)
- [x] Phase 1-3: Schema, APIs, Dashboard, HR tabs, Furniture Orders, Production Batches
- [x] Phase 4: CustomerInteraction, EmployeeReview, SalaryAdvance, Customer tags, Dashboard PaymentAlerts
- [x] Phase 5A: Schema — EmployeeContract, ProductionCost models + Warranty SLA fields
- [x] Phase 5B: APIs — contracts, costs, warranty SLA, schedule critical-path
- [x] Phase 5C: Frontend — EmployeeContractTab, ProductionCostTab, Warranty SLA columns + category filter, Schedule Critical Path toggle + highlight
- [x] Phase 5D: Build verification passed (exit 0)

## In Progress
- (none)

## Next
- [ ] Deployment / staging test
- [ ] Push to remote (Phase 4 + 5 pending commit)

## Commit
- Branch: `main`
- Last commit: `b4bd170` — feat: Phase 3 - Dashboard KPI, HR tabs, Furniture Orders, Production Batches
- Pending: Phase 4 + Phase 5 changes (not committed yet)
