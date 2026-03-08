# Mobile App Review & Upgrade Plan

**Ngày:** 07/03/2026 | **Stack:** Expo 54, React 19, RN 0.81, Expo Router, React Query

---

## Hiện trạng

**4 tab chính:** Dashboard | Projects | Approvals | Settings

**Screens đầy đủ (✅):**
- Dashboard (KPI, pending POs, quick actions)
- Projects (search, infinite scroll)
- Approvals (PO + Expense + Contractor payment inline)
- Progress Report (photo upload, compression)
- Daily Log (weather, workforce, notes)
- Customer Portal (overview, gallery)
- PO Create (supplier, items, calc)
- Schedule (task list)

**Screens đã implement thêm (commit 54626bc):**
- PO Detail — ✅ fully implemented
- Schedule Detail — ✅ screen + navigation
- Warranty list + create — ✅ với photo upload
- Expense create — ✅ với proof photo
- Contract list + detail — ✅ read-only + RBAC

**Còn thiếu (❌):**
- Push Notifications — chưa implement
- Finance/Invoice view (cho ke_toan)
- Offline caching

---

## Phases

| Phase | Tên | Ưu tiên | Effort | Status |
|-------|-----|---------|--------|--------|
| 01 | Complete PO Detail | HIGH | S | ✅ Completed |
| 02 | Warranty Ticket Mobile | HIGH | S | ✅ Completed |
| 03 | Push Notifications | HIGH | M | ⬜ Pending |
| 04 | Expense Submission | MEDIUM | S | ✅ Completed |
| 05 | Contract View | MEDIUM | S | ✅ Completed |
| 06 | Schedule Detail | LOW | S | ✅ Completed |

Xem chi tiết từng phase:
- [phase-01-po-detail.md](./phase-01-po-detail.md)
- [phase-02-warranty-mobile.md](./phase-02-warranty-mobile.md)
- [phase-03-push-notifications.md](./phase-03-push-notifications.md)
- [phase-04-expense-submission.md](./phase-04-expense-submission.md)
- [phase-05-contract-view.md](./phase-05-contract-view.md)
- [phase-06-schedule-detail.md](./phase-06-schedule-detail.md)
