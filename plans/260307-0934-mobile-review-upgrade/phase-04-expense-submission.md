# Phase 04 — Expense Submission Mobile

**Ưu tiên:** MEDIUM | **Effort:** Small | **Status:** Pending

---

## Hiện trạng

Mobile Approvals screen có thể approve/reject expense nhưng không thể **tạo** expense từ mobile. Field workers phải vào web để submit chi phí.

---

## Yêu cầu

- Tạo chi phí từ mobile: mô tả, số tiền, danh mục, dự án, ảnh chứng từ
- Status mặc định: `Chờ duyệt`
- Roles: tất cả (nhan_vien, ky_thuat submit; finance approve)

---

## Files cần tạo

- `mobile/app/expenses/create.tsx` — form tạo chi phí + upload ảnh chứng từ (MỚI)

**Dashboard:** Thêm quick action "📋 Ghi chi phí" cho nhan_vien/ky_thuat roles.

---

## API

```
POST /api/project-expenses
Body: { projectId, description, amount, category, proofUrl, submittedBy }
```

API đã có sẵn, không cần thay đổi server.

---

## Implementation Steps

1. Tạo `expenses/create.tsx`:
   - Project picker (dropdown/modal)
   - Danh mục: `['Vật liệu', 'Nhân công', 'Thuê thiết bị', 'Vận chuyển', 'Khác']`
   - Số tiền input (numeric keyboard)
   - Upload ảnh chứng từ (optional, reuse photo pattern)
   - POST lên API → navigate back với success toast

2. Thêm vào Dashboard quick actions

---

## Todo

- [ ] Expense create screen
- [ ] Project picker modal
- [ ] Proof photo upload
- [ ] Quick action từ Dashboard
