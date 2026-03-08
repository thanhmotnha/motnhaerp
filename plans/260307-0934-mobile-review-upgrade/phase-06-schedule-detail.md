# Phase 06 — Schedule Detail Screen

**Ưu tiên:** LOW | **Effort:** Small | **Status:** Completed

---

## Hiện trạng

`mobile/app/schedule/index.tsx` hiển thị task list nhưng không có màn hình detail để xem/cập nhật từng task.

---

## Yêu cầu

- Xem chi tiết 1 schedule task: tên, mô tả, ngày bắt đầu/kết thúc, % hoàn thành, assignee, dependencies
- Cập nhật `% hoàn thành` và `status` từ mobile (dành cho ky_thuat, quan_ly_du_an)
- Thêm ghi chú tiến độ

---

## Files cần tạo/sửa

- `mobile/app/schedule/[id].tsx` — task detail + inline update (MỚI)
- `mobile/app/schedule/index.tsx` — thêm navigation khi tap task card

---

## API

```
GET  /api/schedule-tasks/{id}   → chi tiết task
PUT  /api/schedule-tasks/{id}   → update progress/status/notes
```

---

## Implementation Steps

1. `schedule/[id].tsx`:
   - Header: tên task, status badge, priority
   - Dates: startDate → endDate, duration
   - Progress slider (0–100%) hoặc input số
   - Assignee info
   - Dependencies list (task tên + status)
   - Notes textarea
   - Nút "Cập nhật" → PUT API

2. `schedule/index.tsx`:
   - Wrap task card trong `TouchableOpacity` → navigate(`/schedule/${task.id}`)

---

## Todo

- [x] Schedule detail screen
- [x] Progress update (slider/input)
- [x] Dependencies display
- [x] Tap-to-navigate từ task list
