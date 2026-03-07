# Phase 01 — Complete PO Detail Screen

**Ưu tiên:** HIGH | **Effort:** Small | **Status:** Pending

---

## Hiện trạng

File `mobile/app/purchase-orders/[id].tsx` tồn tại nhưng là stub (chỉ có navigation, không có content).

API sẵn có: `GET /api/purchase-orders/{id}` — trả về PO + items + supplier + project.

---

## Yêu cầu

- Hiển thị thông tin PO: mã, nhà cung cấp, dự án, ngày giao, ghi chú, trạng thái
- Danh sách items (tên, đơn vị, số lượng, đơn giá, thành tiền)
- Tổng tiền + đã thanh toán + còn lại
- Badge trạng thái (Nháp / Đang giao / Đã giao / Đã thanh toán)
- Nút approve/reject cho APPROVAL_ROLES (giam_doc, pho_gd)

---

## Files cần sửa

- `mobile/app/purchase-orders/[id].tsx` — implement từ stub

---

## Implementation Steps

1. Đọc `[id]` từ `useLocalSearchParams()`
2. Fetch `GET /api/purchase-orders/{id}` bằng `useApi` hook
3. Render header card: mã PO, supplier, project, status badge
4. Render FlatList items với tổng tiền ở footer
5. Nếu status `Chờ duyệt` + role APPROVAL → hiện approve/reject buttons
6. PATCH `/api/purchase-orders/{id}` để update status

---

## Todo

- [ ] Implement PO detail screen
- [ ] Status badge + color mapping
- [ ] Items list với subtotal
- [ ] Approve/reject flow (reuse từ Approvals screen)
- [ ] Test với các role khác nhau
