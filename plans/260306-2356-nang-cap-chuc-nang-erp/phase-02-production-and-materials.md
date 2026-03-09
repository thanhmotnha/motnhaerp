# Phase 2: Production Batches, Material Requisitions & Inventory Alerts

## Context Links
- [Codebase Gaps](../reports/researcher-260306-2358-codebase-gaps.md) — Workshops 35%, Inventory 60%
- [Upgrade Opportunities](../reports/researcher-260306-2356-upgrade-opportunities.md) — Stock alerts

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 8h
- **Mo ta:** Nang cap Workshops tu stub len full production batch UI; tao Material Requisitions form + approval; them stock alert widget cho Inventory

## Requirements

### Functional
- Workshop: hien thi danh sach batch san xuat, trang thai (queue/running/completed), gan vao furniture order
- Workshop detail: thong tin batch, tien do, nhan cong, thoi gian uoc tinh vs thuc te
- Material Requisitions: form tao yeu cau vat tu tu project/WO, approval workflow, chuyen thanh PO
- Inventory alerts: canh bao khi ton kho duoi nguong, widget tren dashboard

### Non-functional
- Batch list pagination
- Material requisition form co auto-suggest tu product catalog
- Stock alert threshold configurable per product

## Architecture

### API Endpoints
| Method | Endpoint | Mo ta |
|--------|----------|-------|
| GET | `/api/batch/status` | Da co — bo sung filter |
| POST | `/api/workshops/[id]/batches` | Tao batch moi |
| PUT | `/api/workshops/[id]/batches/[batchId]` | Cap nhat batch status/progress |
| GET | `/api/material-requisitions` | Da co |
| POST | `/api/material-requisitions` | Da co — them approval fields |
| PUT | `/api/material-requisitions/[id]` | Da co — them approve/reject + convert-to-PO |
| POST | `/api/material-requisitions/[id]/convert-po` | Chuyen MR thanh Purchase Order |
| GET | `/api/inventory/alerts` | Moi — lay SP duoi nguong ton kho |

### Data Flow
```
Furniture Order -> Production Batch -> Workshop Assignment -> Progress -> Complete
Project/WO -> Material Requisition -> Approve -> Convert to PO -> GRN -> Inventory
Product (minStock) -> Stock Check -> Alert Dashboard Widget
```

## Related Code Files

### Files can sua
- `app/workshops/page.js` — nang cap tu stub (155 LoC) len batch management
- `app/api/material-requisitions/route.js` — them approval status filter
- `app/api/material-requisitions/[id]/route.js` — them approve/reject logic
- `app/api/batch/status/route.js` — them filter, pagination
- `app/inventory/page.js` — them tab/section stock alerts
- `app/page.js` (dashboard) — them low stock widget

### Files can tao
- `app/workshops/[id]/page.js` — Workshop detail + batch list
- `components/workshops/BatchCard.js` — Card hien thi batch info + status
- `components/workshops/BatchForm.js` — Form tao/sua batch
- `app/material-requisitions/page.js` — Trang MR list + form
- `components/materials/RequisitionForm.js` — Form tao yeu cau vat tu
- `components/materials/ApprovalBar.js` — Approve/reject bar
- `app/api/workshops/[id]/batches/route.js` — POST batch
- `app/api/workshops/[id]/batches/[batchId]/route.js` — PUT batch
- `app/api/material-requisitions/[id]/convert-po/route.js` — Convert to PO
- `app/api/inventory/alerts/route.js` — Stock alert endpoint
- `components/inventory/StockAlertWidget.js` — Widget cho dashboard
- `lib/validations/materialRequisition.js` — Zod schema
- `lib/validations/batch.js` — Zod schema

## Implementation Steps

### Workshops — Batch Management (3h)
1. Tao `lib/validations/batch.js` — schema (workshopId, furnitureOrderId, qty, status, dates)
2. Tao API routes: `workshops/[id]/batches/route.js` (GET list + POST), `[batchId]/route.js` (PUT)
3. Tao `BatchCard.js` — hien thi batch name, status badge, progress bar, furniture order link
4. Tao `BatchForm.js` — form tao batch: chon furniture order, so luong, ngay bat dau/ket thuc
5. Tao `app/workshops/[id]/page.js` — detail page voi tabs: Thong tin | Batches | Nhan cong
6. Cap nhat `app/workshops/page.js` — chuyen tu card grid sang DataTable, link den detail

### Material Requisitions (3h)
7. Tao `lib/validations/materialRequisition.js` — schema (projectId, items[], notes, priority)
8. Cap nhat API `material-requisitions/[id]/route.js` — them PUT approve/reject voi role check
9. Tao API `[id]/convert-po/route.js` — copy items sang PO, link MR -> PO
10. Tao `RequisitionForm.js` — project selector, product search (auto-suggest), qty, unit
11. Tao `ApprovalBar.js` — hien thi khi user co quyen approve, nut Duyet/Tu choi/Chuyen PO
12. Tao `app/material-requisitions/page.js` — list (DataTable + filter status) + form tao moi

### Inventory Alerts (2h)
13. Tao API `app/api/inventory/alerts/route.js` — query products WHERE stock < minStock
14. Tao `StockAlertWidget.js` — bang nho hien thi SP duoi nguong, link den product
15. Them widget vao dashboard (`app/page.js`) — section "Canh bao ton kho"
16. Cap nhat `app/inventory/page.js` — them tab "Canh bao" hien thi chi tiet

## Todo List
- [ ] Workshop: Zod schema batch
- [ ] Workshop: API batch CRUD
- [ ] Workshop: BatchCard + BatchForm components
- [ ] Workshop: Detail page
- [ ] Workshop: Cap nhat list page
- [ ] MR: Zod schema
- [ ] MR: API approve/reject + convert-to-PO
- [ ] MR: RequisitionForm + ApprovalBar components
- [ ] MR: Page list + form
- [ ] Inventory: API alerts endpoint
- [ ] Inventory: StockAlertWidget
- [ ] Inventory: Dashboard widget + Inventory tab

## Success Criteria
- Workshop page hien thi batches, co the tao/cap nhat batch, link furniture order
- MR workflow: tao -> approve -> convert to PO hoat dong end-to-end
- Stock alerts hien thi dung SP duoi nguong tren dashboard
- Tat ca API dung `withAuth()`, Zod validation, soft delete filter

## Security Considerations
- Batch management: `ky_thuat` + `giam_doc` co quyen tao/sua
- MR approval: `pho_gd` + `giam_doc` duoc approve; `ky_thuat` chi tao
- Convert-to-PO: chi role `ke_toan` hoac `giam_doc`
- Inventory alerts: tat ca role co quyen xem
