# BA Review Chi Tiết — motnha ERP

**Ngày:** 07/03/2026 | **Phiên bản:** commit b480a87

---

## 1. PHÂN TÍCH LUỒNG NGHIỆP VỤ

### Luồng chính: Lead → Quyết toán

```
[CRM] Lead/Khách hàng
  → Pipeline (6 giai đoạn: CRM → Thiết kế → Ký HĐ → Thi công → Bảo hành → Hoàn tất)
  → [Báo giá] Tạo báo giá (3 cấp, revision, bổ sung)
  → [Hợp đồng] Ký HĐ, lịch thanh toán theo đợt
  → [Dự án] Auto-tạo dự án từ HĐ ✅
    → Gantt (FS/SS/FF/SF dependencies)
    → Budget (S-curve, variance, overspend alert)
    → Punch List (priority, photos)
    → Nghiệm thu (acceptance report)
  → [Tài chính] AR aging, cashflow, thu tiền
  → [Quyết toán] Settlement report
```

**Nhận xét BA:** Luồng chính **khép kín và hoạt động tốt**. Auto-create project từ contract là điểm mạnh.

---

## 2. ĐIỂM MẠNH (STRENGTHS)

### 2.1 Nghiệp vụ cốt lõi vững
- Báo giá 3 cấp với revision tracking, draft auto-save, supplemental quotation → **đúng thực tế ngành xây dựng**
- Hợp đồng: payment template theo loại HĐ, validate 100%, proof upload bắt buộc → **kiểm soát tài chính tốt**
- Gantt: hỗ trợ 4 loại dependency (FS/SS/FF/SF) + cascade → **đúng chuẩn PM**
- Budget: S-curve, variance, profitability widget, change orders → **đầy đủ cho PM**

### 2.2 Báo cáo tài chính đủ
- AR Aging (0-30, 31-60, 61-90, >90 ngày)
- Cashflow forecast
- P&L theo dự án
- Portfolio (so sánh profitability các dự án)
- Funnel báo giá → HĐ
- Quyết toán dự án

### 2.3 RBAC triển khai nhất quán
- Finance columns chỉ hiện với `giam_doc`, `pho_gd`, `ke_toan`
- `withAuth` wrapper trên tất cả API routes

### 2.4 Tích hợp thực tế
- Gemini AI cho OCR số tiền (nhận dạng chứng từ)
- S3 upload ảnh
- Public portal cho KH xem tiến độ (`/progress/[code]`)
- Excel import/export cho NCC, Thầu phụ, Sản phẩm

---

## 3. GAPS & VẤN ĐỀ (theo mức độ ưu tiên)

### 🔴 HIGH — Ảnh hưởng nghiệp vụ quan trọng

#### G1: Không có trang quản lý Bảo hành (Warranty)
- **Hiện trạng:** `WarrantyTicket` model có trong schema, API `/api/warranty/[id]` tồn tại, nhưng **không có trang web riêng**. Dashboard chỉ hiển thị badge "X warranty mở".
- **Tác động:** Sau bàn giao, team không có nơi để track, assign và close warranty tickets. KH báo lỗi không biết ghi vào đâu.
- **Đề xuất:** Cần trang `/warranty` với list, filter theo trạng thái, assign nhân viên xử lý, upload ảnh hiện trường.

#### G2: Không có UI Kế hoạch Vật tư (Material Planning)
- **Hiện trạng:** `MaterialPlan`, `MaterialRequisition` models + API đầy đủ, nhưng **sidebar không có link** đến chức năng này.
- **Tác động:** PM không thể lập kế hoạch vật tư trực tiếp trên web. Nghiệm thu vật tư bị bỏ qua.
- **Đề xuất:** Thêm tab "Vật tư" trong project detail, cho phép tạo MaterialPlan và MaterialRequisition.

#### G3: Không có workflow phê duyệt Chi phí (Expense Approval)
- **Hiện trạng:** Expenses được tạo trực tiếp, không có bước approval.
- **Tác động:** Chi phí phát sinh không được kiểm soát. Rủi ro chi sai, chi vượt budget mà không ai approve.
- **Đề xuất:** Thêm trạng thái `pending_approval → approved/rejected` cho ProjectExpense, với notification cho `giam_doc`/`pho_gd`.

### 🟡 MEDIUM — Ảnh hưởng UX / Vận hành

#### G4: Mobile App thiếu nhiều module
- **Hiện trạng:** Mobile (Expo) chỉ có: Dự án, Daily Logs, Lịch, PO, Approvals, Settings.
- **Thiếu:** Báo giá, Hợp đồng, Tài chính, Nhân sự, Warranty.
- **Tác động:** Nhân viên kinh doanh, kế toán không thể làm việc trên mobile.
- **Đề xuất:** Ưu tiên thêm module Báo giá và Thu tiền cho mobile.

#### G5: Không có so sánh báo giá nhà cung cấp (Supplier Quote Comparison)
- **Hiện trạng:** Tạo PO trực tiếp, không có bước RFQ (Request for Quotation) từ nhiều NCC.
- **Tác động:** Team mua hàng không thể so sánh giá trước khi đặt hàng.
- **Đề xuất:** Thêm tính năng tạo RFQ, gửi cho nhiều NCC, so sánh và chọn.

#### G6: Không có KPI target cho Pipeline
- **Hiện trạng:** Pipeline có 6 giai đoạn nhưng không có mục tiêu doanh thu theo tháng/quý.
- **Tác động:** Sales manager không theo dõi được hiệu suất so với target.
- **Đề xuất:** Thêm revenue target per stage/period, hiển thị thực tế vs mục tiêu.

#### G7: Quy trình liên kết HĐ ↔ Dự án chưa linh hoạt
- **Hiện trạng:** Contract có nút "Ký HĐ & Tạo dự án" (auto-create project). Nhưng nếu dự án đã tồn tại, không có cách link thủ công.
- **Tác động:** Các dự án tạo thủ công trước khi ký HĐ bị "lơ lửng", không link được với HĐ.
- **Đề xuất:** Thêm dropdown "Link với dự án hiện có" trong contract detail.

#### G8: Site Logs không có UI web
- **Hiện trạng:** `SiteLog` model tồn tại, mobile app có `/daily-logs`. Trên web không thấy page riêng.
- **Tác động:** PM và BQL không xem được nhật ký công trường từ web.
- **Đề xuất:** Thêm tab "Nhật ký công trường" trong project detail (đọc-only trên web, edit trên mobile).

### 🟢 LOW — Cải tiến chất lượng code

#### G9: File quá lớn vi phạm quy tắc 200 dòng
- `app/projects/[id]/page.js` = **2003 dòng** (10x quy tắc)
- `app/reports/page.js` = **989 dòng**
- `app/finance/page.js` = **785 dòng**
- `app/hr/page.js` = **735 dòng**
- **Tác động:** Khó maintain, khó debug, context window LLM bị ảnh hưởng.

#### G10: Không có Customer Portal hoàn chỉnh
- **Hiện trạng:** `/progress/[code]` tồn tại (public, không cần login). Nhưng KH chỉ xem được tiến độ.
- **Đề xuất:** Thêm xem lịch sử thanh toán, download hóa đơn cho KH.

---

## 4. MA TRẬN ĐÁNH GIÁ

| Module | Nghiệp vụ | UI/UX | Data | Điểm |
|--------|-----------|-------|------|------|
| CRM / Pipeline | 9/10 | 8/10 | 9/10 | **87%** |
| Báo giá | 9/10 | 9/10 | 9/10 | **90%** |
| Hợp đồng | 9/10 | 8/10 | 9/10 | **87%** |
| Dự án (core) | 9/10 | 8/10 | 8/10 | **83%** |
| Gantt / Schedule | 8/10 | 7/10 | 8/10 | **77%** |
| Budget / Finance | 8/10 | 8/10 | 8/10 | **80%** |
| Tài chính tổng | 8/10 | 8/10 | 8/10 | **80%** |
| Nhân sự / Lương | 7/10 | 7/10 | 7/10 | **70%** |
| Sản xuất Nội thất | 7/10 | 7/10 | 7/10 | **70%** |
| Mua sắm / Kho | 7/10 | 7/10 | 7/10 | **70%** |
| Bảo hành | 3/10 | 1/10 | 5/10 | **30%** |
| Kế hoạch vật tư | 4/10 | 0/10 | 5/10 | **30%** |
| Mobile App | 5/10 | 6/10 | 5/10 | **53%** |
| Báo cáo | 9/10 | 8/10 | 8/10 | **83%** |
| **TỔNG** | | | | **~74%** |

---

## 5. KHUYẾN NGHỊ ƯU TIÊN

### Sprint tiếp theo (2-3 tuần)
1. **[G1]** Trang Bảo hành `/warranty` — CRUD, assign, close tickets
2. **[G2]** Tab Vật tư trong project detail — MaterialPlan + Requisition
3. **[G3]** Expense approval workflow — pending → approve/reject

### Sprint sau (1 tháng)
4. **[G5]** RFQ / So sánh báo giá NCC
5. **[G7]** Link HĐ ↔ Dự án hiện có
6. **[G8]** Tab Nhật ký công trường (web view)

### Dài hạn
7. **[G4]** Mở rộng Mobile App (Báo giá, Thu tiền)
8. **[G6]** KPI target cho Pipeline
9. **[G9]** Refactor large files (tách component)
10. **[G10]** Customer Portal nâng cao

---

## 6. KẾT LUẬN

**motnha ERP đạt ~74% độ hoàn thiện cho một phần mềm quản lý xây dựng.**

- **Điểm mạnh cốt lõi:** Luồng Báo giá → HĐ → Dự án → Tài chính hoạt động tốt, RBAC nhất quán, báo cáo tài chính đủ để quản trị doanh nghiệp.
- **Rủi ro lớn nhất:** Thiếu Bảo hành UI và Kế hoạch Vật tư — hai chức năng quan trọng của giai đoạn thi công và hậu bàn giao.
- **Phù hợp production:** Có thể go-live với các tính năng hiện có, nhưng cần bổ sung Bảo hành và Vật tư trước khi khách hàng dùng thực tế dài hạn.
