# Phase 5: Warranty, Work Item Library, Quotation-Contract Sync & Testing

## Context Links
- [Codebase Gaps](../reports/researcher-260306-2358-codebase-gaps.md) — WarrantyTicket no UI, WorkItemLibrary no editor, Quote-Contract disconnect
- [Upgrade Opportunities](../reports/researcher-260306-2356-upgrade-opportunities.md) — Warranty tracking, document management

## Overview
- **Priority:** P3
- **Status:** pending
- **Effort:** 6h
- **Dependency:** Phase 1 (Acceptance) nen hoan thanh — warranty lien ket voi acceptance
- **Mo ta:** Tao UI warranty tickets, editor cho work item library, cai thien Quotation->Contract data sync, testing toan bo tinh nang moi

## Requirements

### Functional
- Warranty Tickets: trang list + detail, trang thai (open/in-progress/resolved/closed), link tu acceptance/project
- Work Item Library: editor UI cho templates cong viec (ten, don vi, don gia, mo ta)
- Quotation -> Contract sync: khi tao contract tu quotation, tu dong copy categories/items
- Testing: kiem tra end-to-end cac phase 1-4

### Non-functional
- Warranty list pagination, filter by project/status
- Work item library search + filter by category
- Sync action co confirmation dialog

## Architecture

### API Endpoints
| Method | Endpoint | Mo ta |
|--------|----------|-------|
| GET | `/api/warranty-tickets` | List warranty tickets (filter project, status) |
| POST | `/api/warranty-tickets` | Tao ticket tu acceptance defect |
| PUT | `/api/warranty-tickets/[id]` | Cap nhat status, ghi chu, assignee |
| GET | `/api/work-item-library` | Da co (read-only) — them full CRUD |
| POST | `/api/work-item-library` | Tao work item template |
| PUT | `/api/work-item-library/[id]` | Sua work item |
| DELETE | `/api/work-item-library/[id]` | Xoa (soft delete) |
| POST | `/api/contracts/[id]/sync-quotation` | Sync du lieu tu quotation sang contract |

### Data Flow
```
Acceptance Defect -> Warranty Ticket (auto-create on project close)
Work Item Library -> Edit Template -> Use in Work Orders / Quotations
Quotation (approved) -> Create Contract -> Sync Categories/Items -> Contract ready
```

## Related Code Files

### Files can sua
- `app/api/work-item-library/route.js` — them POST, update GET voi search/filter
- `app/contracts/create/page.js` — them option "Tao tu Bao gia" voi sync
- `app/api/contracts/route.js` — them logic link quotationId khi tao
- `app/projects/[id]/page.js` — them tab Warranty voi link den warranty tickets

### Files can tao
- `app/warranty/page.js` — Trang list warranty tickets
- `app/warranty/[id]/page.js` — Warranty ticket detail
- `components/warranty/TicketCard.js` — Card hien thi ticket info
- `components/warranty/TicketForm.js` — Form tao/sua ticket
- `app/work-item-library/page.js` — Trang editor library
- `components/work-items/LibraryEditor.js` — Inline edit table voi add/edit/delete
- `components/work-items/WorkItemForm.js` — Form tao/sua work item
- `app/api/warranty-tickets/route.js` — GET + POST
- `app/api/warranty-tickets/[id]/route.js` — PUT
- `app/api/work-item-library/[id]/route.js` — PUT + DELETE
- `app/api/contracts/[id]/sync-quotation/route.js` — POST sync
- `lib/validations/warrantyTicket.js` — Zod schema
- `lib/validations/workItemLibrary.js` — Da co, kiem tra va bo sung

## Implementation Steps

### Warranty Tickets (2h)
1. Tao `lib/validations/warrantyTicket.js` — schema (projectId, acceptanceId, description, severity, status, assigneeId)
2. Tao API `warranty-tickets/route.js` — GET (filter project/status, include project name) + POST
3. Tao API `warranty-tickets/[id]/route.js` — PUT (cap nhat status, assignee, resolution notes)
4. Tao `TicketCard.js` — hien thi: project, severity badge, status, ngay tao, assignee
5. Tao `TicketForm.js` — form: chon project, severity, mo ta, assign
6. Tao `app/warranty/page.js` — DataTable list + nut tao moi
7. Tao `app/warranty/[id]/page.js` — detail view voi history, resolution notes
8. Them link Warranty vao Sidebar + project detail page

### Work Item Library Editor (1.5h)
9. Kiem tra `lib/validations/workItemLibrary.js` — bo sung create/update schema neu thieu
10. Tao API `work-item-library/[id]/route.js` — PUT (update) + DELETE (soft delete)
11. Tao `LibraryEditor.js` — DataTable voi inline edit (click cell to edit), add row, delete
12. Tao `WorkItemForm.js` — Modal form: ten, don vi (m2, cai, md), don gia, mo ta, category
13. Tao `app/work-item-library/page.js` — hien thi LibraryEditor, search bar, filter category
14. Them link "Thu vien cong viec" vao Sidebar

### Quotation -> Contract Sync (1h)
15. Tao API `contracts/[id]/sync-quotation/route.js` — nhan quotationId, copy categories + items sang contract
16. Cap nhat contract create page — them dropdown "Tao tu Bao gia", khi chon se auto-fill
17. Them ConfirmDialog truoc khi sync: "Du lieu contract hien tai se bi ghi de?"

### Integration Testing Checklist (1.5h)
18. Kiem tra WO flow: tao WO -> assign task -> update progress -> complete
19. Kiem tra Acceptance flow: tao -> add defects -> approve -> warranty ticket auto
20. Kiem tra MR flow: tao yeu cau -> approve -> convert PO -> verify PO data
21. Kiem tra Leave flow: tao don -> notification -> approve -> balance update
22. Kiem tra Dashboard: role giam_doc vs ke_toan thay KPI khac nhau
23. Kiem tra Export: Excel va PDF co dung format VND, dd/mm/yyyy
24. Kiem tra Notifications: bell badge, mark read, navigation

## Todo List
- [ ] Warranty: Zod schema
- [ ] Warranty: API CRUD
- [ ] Warranty: TicketCard + TicketForm components
- [ ] Warranty: List + detail pages
- [ ] Warranty: Sidebar link + project tab
- [ ] Work Item: API PUT + DELETE
- [ ] Work Item: LibraryEditor + WorkItemForm
- [ ] Work Item: Editor page + sidebar link
- [ ] Sync: API sync-quotation
- [ ] Sync: Cap nhat contract create page
- [ ] Testing: WO flow
- [ ] Testing: Acceptance flow
- [ ] Testing: MR flow
- [ ] Testing: Leave + Notification flow
- [ ] Testing: Dashboard + Reports + Export

## Success Criteria
- Warranty ticket CRUD hoat dong, link tu project va acceptance
- Work item library: them/sua/xoa template, search hoat dong
- Tao contract tu quotation tu dong copy data chinh xac
- Tat ca flow end-to-end tu Phase 1-4 pass manual testing
- Khong co regression tren cac module hien tai

## Security Considerations
- Warranty tickets: tat ca role xem duoc; chi ky_thuat + giam_doc tao/sua
- Work item library: chi giam_doc + pho_gd chinh sua (template anh huong toan he thong)
- Sync quotation: chi role tao contract (giam_doc, pho_gd, ke_toan) duoc sync
- Soft delete cho warranty tickets va work items
- Validate quotationId thuoc cung customer khi sync
