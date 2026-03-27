# Spec: Redesign Chi tiết Dự án

**Ngày:** 2026-03-27
**Trạng thái:** Approved
**Phạm vi:** `app/projects/[id]/page.js` và các tab liên quan

---

## Bối cảnh

Công ty nội thất & xây dựng quy mô nhỏ (~6 người): 1 giám đốc, 3-4 kỹ thuật, 1 kế toán. Làm cả hai mảng nội thất (tự sản xuất) và xây dựng/hoàn thiện (thuê thầu phụ). Báo giá hoàn thiện đôi khi bao gồm cả nội thất.

**Vấn đề hiện tại:**
- File `page.js` dài 2.093 dòng, tất cả nhét vào 1 file
- 14 tab, nhiều tính năng enterprise chưa dùng được
- Kỹ thuật không biết dùng, nhập liệu mất thời gian
- Các budget widget (S-Curve, Variance, Lock) quá phức tạp với đội nhỏ

**Quy trình thực tế:**
```
Khảo sát → Báo giá → Ký HĐ → Thi công → Thu tiền → Bàn giao → Bảo hành
                                    ↓ (nội thất)
                      Thiết kế 3D → Bóc tách → Chọn vật liệu → Đặt hàng
```

---

## Mục tiêu

1. Giảm từ 14 tab xuống 7 tab thiết thực
2. Tách file 2.093 dòng thành 7 component nhỏ (~150-300 dòng mỗi file)
3. Xóa hoàn toàn các tính năng chưa/không dùng
4. Hệ thống phải dùng được ngay sau khi refactor

---

## Thiết kế Tab (7 tab)

| # | Tab | Người dùng | Nội dung |
|---|-----|------------|----------|
| 1 | Tổng quan | Tất cả | Thông tin dự án, giai đoạn, nhật ký gần đây (5 dòng gần nhất) |
| 2 | Hợp đồng | GĐ + Kế toán | Danh sách HĐ + lịch thu tiền |
| 3 | Tiến độ | Kỹ thuật | Các mốc milestone, % hoàn thành |
| 4 | Vật tư | Kỹ thuật | Dự toán → Yêu cầu vật tư → Tạo PO |
| 5 | Thầu phụ | GĐ + Kế toán | Danh sách thầu, nghiệm thu, thanh toán |
| 6 | Tài liệu | Kỹ thuật | File 3D, bản vẽ, ảnh công trình |
| 7 | Bảo hành | Kỹ thuật + GĐ | Yêu cầu bảo hành, trạng thái xử lý |

---

## Cấu trúc File mới

```
app/projects/[id]/
  page.js                  (~150 dòng)
    - fetch toàn bộ data dự án 1 lần
    - render tab bar
    - pass props xuống từng tab
  tabs/
    OverviewTab.js         (~150 dòng)
    ContractTab.js         (~200 dòng)
    MilestoneTab.js        (~150 dòng)
    MaterialTab.js         (~300 dòng)
    ContractorTab.js       (~200 dòng)
    DocumentTab.js         (~100 dòng — wrap DocumentManager có sẵn)
    WarrantyTab.js         (~150 dòng)
```

---

## Chi tiết từng Tab

### Tab 1: Tổng quan
- Thông tin cơ bản: tên, KH, địa chỉ, diện tích, loại dự án
- Pipeline giai đoạn (Khảo sát → Thiết kế → Ký HĐ → Thi công → Bảo hành → Hoàn thành)
- 3 số tóm tắt: Giá trị HĐ / Đã thu / Còn lại
- Nhật ký gần đây (5 dòng + nút thêm nhật ký inline)
- Nút chỉnh sửa thông tin dự án

### Tab 2: Hợp đồng
- Danh sách hợp đồng với trạng thái
- Lịch thu tiền theo từng HĐ (đợt, số tiền, ngày, trạng thái)
- Nút thêm HĐ mới → link sang trang tạo HĐ
- Không render finance sub-tabs phức tạp — chỉ bảng thu tiền

### Tab 3: Tiến độ
- Danh sách milestone: tên, ngày dự kiến, ngày thực tế, % hoàn thành
- Thanh tiến độ tổng thể
- Thêm/sửa milestone inline
- Viết lại inline (không dùng ScheduleManager — component đó quá nặng cho use case này)

### Tab 4: Vật tư
- **Bảng dự toán:** hạng mục, SL cần, đã đặt, đã nhận, còn thiếu, trạng thái
- **Nút "Tạo từ Báo giá"** — import materialPlans từ quotation
- **Checkbox chọn nhiều → Tạo PO** — giữ nguyên logic hiện tại
- **Nút YC (Yêu cầu)** per row — kỹ thuật gọi vật tư lên
- 3 số summary: Tổng dự toán / Cần đặt thêm / Vượt dự toán
- **Xóa:** BudgetLockBar, S-Curve, VarianceTable, BudgetAlertBanner, BudgetQuickAdd (thay bằng form inline đơn giản)
- Bảng vật tư giống nhau cho cả 2 loại dự án — không phân biệt theo type để tránh phức tạp

### Tab 5: Thầu phụ
- Danh sách thầu phụ trong dự án
- Giá trị hợp đồng thầu / Đã thanh toán / Còn lại
- Nút thêm đợt thanh toán
- Ghi chú nghiệm thu
- Luôn hiển thị tab này (cả nội thất cũng có thể có thầu phụ lắp đặt)

### Tab 6: Tài liệu
- Wrap component `DocumentManager` hiện có
- Không thay đổi logic

### Tab 7: Bảo hành
- Danh sách yêu cầu bảo hành: mô tả, ngày yêu cầu, người phụ trách, trạng thái
- Trạng thái: Mới → Đang xử lý → Hoàn thành
- Thêm yêu cầu mới (form đơn giản)
- **Gộp Punch List vào đây** dưới dạng sub-section "Lỗi trước bàn giao"

---

## Những gì bị xóa

| Component/Tab | Lý do xóa |
|---------------|-----------|
| `BudgetLockBar` | Khóa ngân sách — quá phức tạp với đội nhỏ |
| `SCurveChart` | Biểu đồ S-Curve — không ai dùng |
| `VarianceTable` | Bảng variance — overkill |
| `BudgetAlertBanner` | Alert ngân sách — đủ với 3 số summary |
| `ProfitabilityWidget` | Widget lợi nhuận — chuyển sang báo cáo riêng |
| `MeasurementSheet` | Bảng đo đạc — chưa dùng |
| Tab Nhật ký AI (`JournalTab`) | Chưa thực tế |
| Tab Punch List (inline) | Gộp vào Bảo hành |
| Tab Nhật ký CT (`SiteLogTab`) | Gộp vào Tổng quan |
| Tab Nhật ký (tracking logs) | Gộp vào Tổng quan |
| Tab Phiếu CV (Work Orders) | Chưa dùng |
| `financeSubTab` (settlement) | Lãi/Lỗ → chuyển sang báo cáo riêng |

---

## Không thay đổi

- API routes `/api/projects/[id]` và các API liên quan — giữ nguyên
- `DocumentManager` component — giữ nguyên
- `ScheduleManager` component — đánh giá lại khi implement
- CSS classes và CSS variables — giữ nguyên
- Logic soft delete, withAuth, apiFetch — giữ nguyên

---

## Tiêu chí hoàn thành

- [ ] File `page.js` dưới 200 dòng
- [ ] Mỗi tab file dưới 300 dòng
- [ ] 7 tab hoạt động đúng
- [ ] Không còn import BudgetLockBar, SCurveChart, VarianceTable, BudgetAlertBanner, ProfitabilityWidget, MeasurementSheet
- [ ] Tạo từ Báo giá → Vật tư hoạt động
- [ ] Tạo PO từ vật tư chọn hoạt động
- [ ] Thêm nhật ký từ Tổng quan hoạt động
- [ ] Không có lỗi console sau refactor
