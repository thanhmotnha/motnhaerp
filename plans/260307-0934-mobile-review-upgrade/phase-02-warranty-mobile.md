# Phase 02 — Warranty Ticket Mobile

**Ưu tiên:** HIGH | **Effort:** Small | **Status:** Pending

---

## Hiện trạng

Web app đã có trang `/warranty` + API đầy đủ (`GET/POST /api/warranty`, `PUT /api/warranty/[id]`).
Mobile chưa có màn hình bảo hành.

---

## Yêu cầu

- Tạo warranty ticket từ mobile (tiêu đề, mô tả, priority, ảnh hiện trường)
- Xem danh sách ticket theo dự án
- Update trạng thái (Mới → Đang xử lý → Đã xử lý)
- Roles: tất cả (nhan_vien tạo, quan_ly_du_an update status)

---

## Files cần tạo/sửa

- `mobile/app/warranty/index.tsx` — list tickets (MỚI)
- `mobile/app/warranty/create.tsx` — tạo ticket + upload ảnh (MỚI)
- `mobile/app/projects/[id].tsx` — thêm quick action "Báo bảo hành"

---

## Implementation Steps

1. Tạo `warranty/index.tsx`:
   - FlatList tickets filter theo projectId (optional)
   - Badge màu theo status + priority
   - Swipe-to-update status (react-native-gesture-handler)

2. Tạo `warranty/create.tsx`:
   - Form: chọn project, tiêu đề, mô tả, priority picker, ảnh
   - Upload ảnh qua `apiUpload` (reuse pattern từ progress report)
   - POST `/api/warranty`

3. Thêm nút "🛡 Bảo hành" trong Project Detail quick actions

---

## Todo

- [ ] Warranty list screen
- [ ] Create warranty form với photo upload
- [ ] Quick action từ project detail
- [ ] Status update flow
