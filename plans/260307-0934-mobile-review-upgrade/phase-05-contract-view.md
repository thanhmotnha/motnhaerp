# Phase 05 — Contract View (Read-only)

**Ưu tiên:** MEDIUM | **Effort:** Small | **Status:** Pending

---

## Hiện trạng

Field workers và PM cần xem thông tin hợp đồng (giá trị, điều khoản, lịch thanh toán) từ mobile nhưng hiện không có màn hình nào.

---

## Yêu cầu

- Xem danh sách hợp đồng theo dự án (read-only)
- Chi tiết: tên HĐ, giá trị, trạng thái, lịch thanh toán theo đợt
- Roles: giam_doc, pho_gd, ke_toan, quan_ly_du_an (không cho nhan_vien)
- Chỉ READ — không edit từ mobile

---

## Files cần tạo

- `mobile/app/contracts/index.tsx` — danh sách HĐ theo project (MỚI)
- `mobile/app/contracts/[id].tsx` — chi tiết HĐ + payment phases (MỚI)
- `mobile/app/projects/[id].tsx` — thêm link "Xem hợp đồng" trong quick actions

---

## API

```
GET /api/contracts?projectId={id}   → danh sách
GET /api/contracts/{id}              → chi tiết + payments
```
API đã có, không cần thay đổi.

---

## Implementation Steps

1. `contracts/index.tsx`:
   - Nhận `projectId` từ params hoặc show tất cả HĐ của user
   - FlatList với status badge, contract value (finance roles only), ngày ký

2. `contracts/[id].tsx`:
   - Header: mã HĐ, tên, khách hàng, giá trị, trạng thái
   - Payment phases: tên đợt, %, số tiền, trạng thái thu
   - Progress bar thu tiền (đã thu / tổng)

3. Project Detail → quick action "📝 Hợp đồng"

---

## Todo

- [ ] Contract list screen
- [ ] Contract detail với payment phases
- [ ] Progress bar thu tiền
- [ ] RBAC: ẩn với nhan_vien
- [ ] Link từ Project Detail
