# Phase 1: Work Orders, Acceptance & Daily Site Logs

## Context Links
- [Codebase Gaps](../reports/researcher-260306-2358-codebase-gaps.md) — Work Orders 35%, Acceptance 40%
- [Upgrade Opportunities](../reports/researcher-260306-2356-upgrade-opportunities.md) — Mobile WO tracking

## Overview
- **Priority:** P1 — Cao nhat
- **Status:** pending
- **Effort:** 10h
- **Mo ta:** Hoan thien 3 module stub: Work Orders (detail + task assignment + progress), Acceptance (approval workflow + defect tracking + photo), Daily Site Logs (trang moi, API da co)

## Requirements

### Functional
- WO detail page: hien thi thong tin, danh sach task, assign employee/contractor, cap nhat % tien do
- WO task assignment: chon tu danh sach Employee/Contractor, set deadline, ghi chu
- Acceptance: tao bao cao nghiem thu voi checklist, trang thai (draft/reviewed/approved/rejected)
- Acceptance defect: them defect item voi severity, anh dinh kem, trang thai fix
- Daily Logs: trang list + form tao log hang ngay (thoi tiet, nhan cong, su co, ghi chu)

### Non-functional
- Response time <500ms cho list endpoints
- File upload anh <5MB, dinh dang JPG/PNG
- Pagination cho tat ca list (parsePagination + paginatedResponse)

## Architecture

### API Endpoints
| Method | Endpoint | Mo ta |
|--------|----------|-------|
| GET/PUT | `/api/work-orders/[id]` | Chi tiet + cap nhat WO |
| POST | `/api/work-orders/[id]/tasks` | Them task cho WO |
| PUT | `/api/work-orders/[id]/tasks/[taskId]` | Cap nhat task (assign, status, %) |
| GET | `/api/acceptance` | Da co — them filter status |
| POST | `/api/acceptance` | Da co — them defect items + photo |
| PUT | `/api/acceptance/[id]` | Cap nhat trang thai approval |
| POST | `/api/acceptance/[id]/defects` | Them defect item |
| PUT | `/api/acceptance/[id]/defects/[defectId]` | Cap nhat defect status |
| GET | `/api/daily-logs` | Da co |
| POST | `/api/daily-logs` | Da co |

### Data Flow
```
Work Order -> Tasks -> Assign Employee/Contractor -> Progress Update -> Complete
Project -> Acceptance Report -> Checklist Items -> Defects -> Resolution -> Approve
Project -> Daily Log (weather, workers, issues, notes)
```

## Related Code Files

### Files can sua
- `app/work-orders/page.js` — nang cap tu list stub len full page voi tabs
- `app/acceptance/page.js` — them list view, filter, link den detail
- `app/api/acceptance/route.js` — them filter, defect support
- `lib/validations/workOrder.js` — them schema cho task assignment
- `components/ui/StatusBadge.js` — them status moi (reviewed, approved, rejected)

### Files can tao
- `app/work-orders/[id]/page.js` — WO detail page
- `components/work-orders/TaskAssignment.js` — Component assign task
- `components/work-orders/ProgressTracker.js` — Progress bar + history
- `app/acceptance/[id]/page.js` — Acceptance detail page
- `components/acceptance/DefectList.js` — Danh sach defect + photo
- `components/acceptance/ApprovalActions.js` — Nut approve/reject
- `app/daily-logs/page.js` — Trang nhat ky cong truong
- `components/daily-logs/DailyLogForm.js` — Form tao log
- `app/api/work-orders/[id]/route.js` — GET/PUT WO detail
- `app/api/work-orders/[id]/tasks/route.js` — POST task
- `app/api/work-orders/[id]/tasks/[taskId]/route.js` — PUT task
- `app/api/acceptance/[id]/route.js` — GET/PUT acceptance detail
- `app/api/acceptance/[id]/defects/route.js` — POST defect
- `app/api/acceptance/[id]/defects/[defectId]/route.js` — PUT defect
- `lib/validations/acceptance.js` — Zod schema
- `lib/validations/dailyLog.js` — Zod schema

## Implementation Steps

### Work Orders (4h)
1. Tao Zod schema cho WO task assignment trong `lib/validations/workOrder.js` (them taskSchema)
2. Tao API route `app/api/work-orders/[id]/route.js` — GET (include tasks, assignees) + PUT (update status, progress)
3. Tao API route tasks CRUD: `[id]/tasks/route.js` va `[id]/tasks/[taskId]/route.js`
4. Tao component `TaskAssignment.js` — dropdown chon Employee/Contractor, deadline picker
5. Tao component `ProgressTracker.js` — progress bar, status history list
6. Tao page `app/work-orders/[id]/page.js` — tabs: Chi tiet | Tasks | Tien do | Vat tu
7. Cap nhat `app/work-orders/page.js` — them link den detail, filter status

### Acceptance (4h)
8. Tao `lib/validations/acceptance.js` — schema cho acceptance report, defect item
9. Tao API `app/api/acceptance/[id]/route.js` — GET detail + PUT approval status
10. Tao API defects CRUD routes
11. Tao component `DefectList.js` — bang defect voi severity badge, anh thumbnail, status
12. Tao component `ApprovalActions.js` — nut Duyet/Tu choi voi confirm dialog + ghi chu
13. Tao page `app/acceptance/[id]/page.js` — hien thi checklist, defects, approval history
14. Cap nhat `app/acceptance/page.js` — them DataTable voi filter, link detail

### Daily Site Logs (2h)
15. Tao `lib/validations/dailyLog.js` — schema (projectId, date, weather, workers, issues, notes)
16. Tao component `DailyLogForm.js` — form voi project selector, weather dropdown, textarea
17. Tao page `app/daily-logs/page.js` — list + form tao moi (API `/api/daily-logs` da co)
18. Them link Daily Logs vao Sidebar navigation

## Todo List
- [ ] WO: Zod schema task assignment
- [ ] WO: API detail + tasks CRUD
- [ ] WO: TaskAssignment component
- [ ] WO: ProgressTracker component
- [ ] WO: Detail page voi tabs
- [ ] WO: Cap nhat list page
- [ ] Acceptance: Zod schema
- [ ] Acceptance: API detail + defects CRUD
- [ ] Acceptance: DefectList component
- [ ] Acceptance: ApprovalActions component
- [ ] Acceptance: Detail page
- [ ] Acceptance: Cap nhat list page
- [ ] Daily Logs: Zod schema
- [ ] Daily Logs: Form component
- [ ] Daily Logs: Page + sidebar link

## Success Criteria
- WO detail page hien thi day du thong tin, co the assign task va cap nhat progress
- Acceptance workflow: draft -> reviewed -> approved/rejected hoat dong dung
- Defect items co anh dinh kem, severity, va tracking resolution
- Daily Logs page list + tao moi thanh cong
- Tat ca API co `withAuth()` va Zod validation

## Security Considerations
- Work Orders: `ky_thuat` va `giam_doc` co quyen tao/sua; `ke_toan` chi xem
- Acceptance approval: chi `giam_doc` va `pho_gd` duoc duyet
- Photo upload: validate file type (JPG/PNG), max size 5MB, sanitize filename
- Soft delete cho WO tasks va defect items
