---
description: Khởi tạo/refresh hệ thống productivity — scan project, tạo CODEBASE.md, báo cáo gaps, chuẩn bị session
---

# /productivity-start — Khởi Tạo Hệ Thống Productivity

## Khi nào dùng
- Bắt đầu session mới
- Sau khi thêm module/feature lớn
- Khi muốn kiểm tra sức khỏe hệ thống `.agent`

## Workflow Steps

### 1. Scan cấu trúc project
// turbo
```bash
find d:/Codeapp/motnha/app -type f -name "*.js" -o -name "*.jsx" | head -80
```
Liệt kê tất cả pages và API routes.

### 2. Tạo/Update CODEBASE.md
Tạo file `CODEBASE.md` ở root project chứa:
- **File Dependencies**: module nào phụ thuộc module nào
- **API Routes Map**: path → file → mô tả
- **Frontend Pages Map**: path → file → mô tả
- **Shared Components**: components dùng chung
- **Config Files**: prisma schema, next.config, package.json

### 3. Scan .agent gaps
Kiểm tra:
- [ ] Tất cả workflows khai báo trong GEMINI.md đều tồn tại
- [ ] CODEBASE.md tồn tại và up-to-date
- [ ] Agents có skills phù hợp
- [ ] Scripts chạy được

### 4. Báo cáo trạng thái
Output markdown report:
- ✅ Đã có
- ⚠️ Cần cập nhật
- ❌ Thiếu

### 5. Session context
Ghi nhận:
- Thời gian scan
- Số modules/pages/routes
- Pending tasks từ session trước
