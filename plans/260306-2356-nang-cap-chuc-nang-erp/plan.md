---
title: "Nang cap chuc nang HomeERP"
description: "Ke hoach nang cap toan dien HomeERP — hoan thien module stub, dashboard, reports, HR, notifications"
status: pending
priority: P1
effort: 40h
branch: main
tags: [erp, upgrade, vietnam, construction, furniture]
created: 2026-03-06
---

# Ke hoach Nang cap HomeERP

## Tong quan
Nang cap 14 tinh nang chinh, chia 5 phase theo muc do uu tien. Tap trung hoan thien module stub (Work Orders, Workshops, Acceptance), bo sung tinh nang co gia tri cao (Notifications, Dashboard, Reports, Export).

## Bao cao nghien cuu
- [Codebase Gaps](../reports/researcher-260306-2358-codebase-gaps.md)
- [Upgrade Opportunities](../reports/researcher-260306-2356-upgrade-opportunities.md)

## Dependency chinh
- Phase 1 (Work Orders) la nen tang cho Phase 2 (Materials) va Phase 5 (Warranty)
- Phase 3 (Notifications) can hoan thanh truoc Phase 4 (Dashboard alerts)
- Tat ca phase dung chung: `withAuth()`, `apiFetch()`, Zod validation, `globals.css`

## Tien do

| Phase | Mo ta | Effort | Status |
|-------|-------|--------|--------|
| [Phase 1](./phase-01-work-orders-and-acceptance.md) | Work Orders + Acceptance + Daily Logs | 10h | pending |
| [Phase 2](./phase-02-production-and-materials.md) | Workshops + Material Requisitions + Inventory alerts | 8h | pending |
| [Phase 3](./phase-03-hr-leave-notifications.md) | Leave Requests + Notification System | 8h | pending |
| [Phase 4](./phase-04-dashboard-reports-upgrade.md) | Dashboard KPI + Reports + Export Excel/PDF | 8h | pending |
| [Phase 5](./phase-05-quality-and-integration.md) | Warranty + Work Item Library + Quotation-Contract sync + Testing | 6h | pending |

## Coding patterns bat buoc
- API: `withAuth(handler, { roles: [...] })` trong `lib/apiHandler.js`
- Frontend: `apiFetch()` tu `lib/fetchClient.js`, `useToast()`, `ConfirmDialog`
- Validation: Zod schema trong `lib/validations/`
- CSS: chi su dung `app/globals.css` (CSS variables, khong module CSS)
- Soft delete: `deletedAt` filter cho moi query
- File size: <200 LoC, tach component khi can

## Kiem tra truoc khi merge
- [ ] Tat ca API routes co `withAuth()`
- [ ] Zod validation cho moi input
- [ ] Soft delete filter (`deletedAt: null`)
- [ ] Responsive co ban (tablet 768px)
- [ ] Khong co console.log/debug code
