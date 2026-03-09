# Phase 3: Leave Requests & Notification System

## Context Links
- [Codebase Gaps](../reports/researcher-260306-2358-codebase-gaps.md) — LeaveRequest model exists, no UI
- [Upgrade Opportunities](../reports/researcher-260306-2356-upgrade-opportunities.md) — Notifications system, HR leave

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 8h
- **Mo ta:** Tao UI quan ly nghi phep trong HR module (balance check, approval flow); xay dung notification system trong app voi alert center

## Requirements

### Functional
- Leave Requests: form tao don xin nghi, chon loai (phep nam/om/khac), khoang ngay, ly do
- Leave balance: hien thi so ngay phep con lai (12 ngay/nam theo Luat Lao dong VN)
- Leave approval: manager/director duyet, tu choi voi ly do
- Notifications: trung tam thong bao trong app, badge so chua doc tren sidebar
- Alert types: budget breach 80%, milestone overdue, payment due, approval pending
- Mark as read, dismiss, filter theo loai

### Non-functional
- Notification polling moi 60 giay (hoac dung React Query refetch interval)
- Leave balance tinh toan chinh xac theo nam tai chinh
- Notification list pagination (20 items/page)

## Architecture

### API Endpoints
| Method | Endpoint | Mo ta |
|--------|----------|-------|
| GET | `/api/hr/leave-requests` | List don nghi phep (filter: status, employee, date range) |
| POST | `/api/hr/leave-requests` | Tao don nghi phep |
| PUT | `/api/hr/leave-requests/[id]` | Duyet/Tu choi |
| GET | `/api/hr/leave-balance/[employeeId]` | So ngay phep con lai |
| GET | `/api/notifications` | List thong bao (filter: unread, type) |
| PUT | `/api/notifications/[id]/read` | Danh dau da doc |
| PUT | `/api/notifications/mark-all-read` | Danh dau tat ca da doc |
| POST | `/api/notifications` | Tao thong bao (internal, goi tu cac module khac) |

### Data Flow
```
Employee -> Leave Request Form -> Manager Notification -> Approve/Reject -> Update Balance
Module Event (budget 80%, milestone overdue) -> Create Notification -> Bell Badge Update
User Click Bell -> Notification List -> Mark Read -> Navigate to Related Page
```

### Notification Trigger Points
- Budget vượt 80%: tu `app/api/budget/` khi cap nhat expense
- Milestone qua han: cron job hoac check khi load dashboard
- Payment sap den han: check khi load finance page
- Leave request cho duyet: khi employee tao don
- Acceptance cho duyet: khi tao acceptance report

## Related Code Files

### Files can sua
- `app/hr/page.js` — them tab "Nghi phep" voi list + form
- `components/ui/NotificationBell.js` — da co, cap nhat logic fetch + badge
- `components/Sidebar.js` — them notification badge count
- `components/Header.js` — dam bao NotificationBell hien thi
- `app/page.js` (dashboard) — them pending approval widget

### Files can tao
- `components/hr/LeaveRequestForm.js` — Form tao don nghi phep
- `components/hr/LeaveBalanceCard.js` — Hien thi so ngay phep con
- `components/hr/LeaveApprovalList.js` — Danh sach cho duyet (cho manager)
- `components/notifications/NotificationCenter.js` — Dropdown/panel list thong bao
- `components/notifications/NotificationItem.js` — Dong thong bao (icon, text, time, actions)
- `app/api/hr/leave-requests/route.js` — GET + POST
- `app/api/hr/leave-requests/[id]/route.js` — PUT approve/reject
- `app/api/hr/leave-balance/[employeeId]/route.js` — GET balance
- `app/api/notifications/route.js` — GET list + POST create
- `app/api/notifications/[id]/read/route.js` — PUT mark read
- `app/api/notifications/mark-all-read/route.js` — PUT mark all
- `lib/validations/leaveRequest.js` — Zod schema
- `lib/validations/notification.js` — Zod schema
- `lib/notifications.js` — Helper function `createNotification(userId, type, title, link)`

## Implementation Steps

### Leave Requests (4h)
1. Tao `lib/validations/leaveRequest.js` — schema (employeeId, type, startDate, endDate, reason)
2. Tao API `hr/leave-requests/route.js` — GET (filter status/employee) + POST (validate balance truoc)
3. Tao API `hr/leave-requests/[id]/route.js` — PUT approve/reject (role check: giam_doc/pho_gd)
4. Tao API `hr/leave-balance/[employeeId]/route.js` — tinh 12 - used days trong nam hien tai
5. Tao `LeaveBalanceCard.js` — hien thi: phep nam (X/12), om (Y), da dung, con lai
6. Tao `LeaveRequestForm.js` — loai nghi, khoang ngay (date range picker), ly do, nut gui
7. Tao `LeaveApprovalList.js` — DataTable don cho duyet, nut Duyet/Tu choi + ConfirmDialog
8. Cap nhat `app/hr/page.js` — them tab "Nghi phep" render 3 components tren

### Notification System (4h)
9. Tao Prisma model `Notification` (hoac dung bang co san) — userId, type, title, body, link, read, createdAt
10. Tao `lib/notifications.js` — helper `createNotification(userId, type, title, link)`
11. Tao `lib/validations/notification.js` — schema
12. Tao API `notifications/route.js` — GET (filter unread, pagination) + POST (internal)
13. Tao API `notifications/[id]/read/route.js` — PUT mark read
14. Tao API `notifications/mark-all-read/route.js` — PUT
15. Tao `NotificationItem.js` — icon theo type, title, time ago, link, nut dismiss
16. Tao `NotificationCenter.js` — dropdown tu bell, list items, "Danh dau tat ca da doc"
17. Cap nhat `NotificationBell.js` — fetch unread count, hien badge, click open NotificationCenter
18. Tich hop trigger: goi `createNotification()` khi leave request tao, acceptance cho duyet

## Todo List
- [ ] Leave: Zod schema
- [ ] Leave: API CRUD + balance
- [ ] Leave: LeaveBalanceCard component
- [ ] Leave: LeaveRequestForm component
- [ ] Leave: LeaveApprovalList component
- [ ] Leave: Cap nhat HR page
- [ ] Notif: Prisma model (neu chua co)
- [ ] Notif: Helper createNotification
- [ ] Notif: API endpoints (list, read, mark-all)
- [ ] Notif: NotificationItem + NotificationCenter
- [ ] Notif: Cap nhat NotificationBell
- [ ] Notif: Tich hop trigger points

## Success Criteria
- Employee tao don nghi phep, manager/director duyet thanh cong
- Balance tinh dung 12 ngay/nam, tru khi approve
- Notification bell hien badge, click mo danh sach, mark read hoat dong
- Trigger tu leave request + acceptance tao notification dung nguoi nhan

## Security Considerations
- Leave requests: employee chi xem/tao cua minh; manager xem team; giam_doc xem tat ca
- Leave approval: chi `giam_doc` va `pho_gd`
- Notifications: user chi xem notification cua minh (filter by userId in session)
- createNotification: chi goi tu server-side (khong expose POST endpoint ra public)
