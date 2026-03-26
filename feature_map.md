# 🏗️ Một Nhà ERP — Feature Map Toàn Diện

> Scan từ: 55+ Prisma models, 34 app pages, 62 API modules

---

## 📊 HIỆN TRẠNG — Đã Implement

### 1. CRM & Khách hàng
| Feature | Model/Page | Status |
|---------|-----------|--------|
| CRUD khách hàng | `Customer`, `/customers` | ✅ |
| Lịch sử tương tác | `CustomerInteraction` | ✅ |
| Lead pipeline | `/pipeline` | ✅ |

### 2. Dự án & Thi công
| Feature | Model/Page | Status |
|---------|-----------|--------|
| Quản lý dự án | `Project`, `/projects` | ✅ |
| Báo giá (versioning) | `Quotation`, `/quotations` | ✅ |
| Hợp đồng (TinyMCE, export Word) | `Contract`, `/contracts` | ✅ |
| Mẫu hợp đồng | `ContractTemplate` | ✅ |
| Tiến độ thi công | `ProgressReport`, `/progress` | ✅ |
| Lịch thi công / Schedule | `ScheduleTask`, `/schedule-templates` | ✅ |
| Nhật ký công trường | `SiteLog`, `/daily-logs` | ✅ |
| Nghiệm thu (Acceptance) | `AcceptanceReport`, `/acceptance` | ✅ |
| Punch list (sửa lỗi) | `PunchList` | ✅ |
| Milestone | `Milestone` | ✅ |

### 3. Nội thất & Sản xuất
| Feature | Model/Page | Status |
|---------|-----------|--------|
| Đơn hàng nội thất | `FurnitureOrder`, `/furniture-orders` | ✅ |
| Mẫu nội thất | `FurnitureTemplate` | ✅ |
| Cấu hình biến thể (Configurator) | `VariantTemplate`, `ConfiguratorItem` | ✅ |
| BOM (Bill of Materials) | `BomEntry` | ✅ |
| Lô sản xuất | `ProductionBatch`, `/production-batches` | ✅ |
| Chi phí sản xuất | `ProductionCost` | ✅ |
| Work Orders | `WorkOrder`, `/work-orders` | ✅ |
| Xưởng | `Workshop`, `/workshops` | ✅ |

### 4. Kho & Vật tư
| Feature | Model/Page | Status |
|---------|-----------|--------|
| Sản phẩm / Vật tư | `Product`, `/products` | ✅ |
| Danh mục sản phẩm | `ProductCategory` | ✅ |
| Tồn kho (multi-warehouse) | `Inventory`, `WarehouseStock`, `/inventory` | ✅ |
| Kho | `Warehouse` | ✅ |
| Chuyển kho | `WarehouseTransfer`, `/warehouse-transfers` | ✅ |
| Kế hoạch vật tư | `MaterialPlan`, `/material-plans` | ✅ |
| Yêu cầu vật tư | `MaterialRequisition` | ✅ |

### 5. Mua hàng & Nhà cung cấp
| Feature | Model/Page | Status |
|---------|-----------|--------|
| Nhà cung cấp | `Supplier`, `/suppliers` | ✅ |
| Đơn mua hàng (PO) | `PurchaseOrder`, `/purchasing` | ✅ |
| Nhà thầu phụ | `Contractor`, `/contractors` | ✅ |
| Thanh toán nhà thầu | `ContractorPayment` | ✅ |
| Cam kết chi | `Commitment` | ✅ |

### 6. Tài chính & Kế toán
| Feature | Model/Page | Status |
|---------|-----------|--------|
| Chi phí dự án | `Expense`, `ProjectExpense`, `/expenses` | ✅ |
| Ngân sách | `BudgetItem`, `/budget` | ✅ |
| Thanh toán | `Payment`, `/payments` | ✅ |
| Sổ thu chi | `AccountEntry`, `/accounting` | ✅ |
| Bút toán | `JournalEntry` | ✅ |
| OCR hóa đơn | API `/ocr-amount`, `/ocr-budget` | ✅ |

### 7. Nhân sự (HR)
| Feature | Model/Page | Status |
|---------|-----------|--------|
| Nhân viên | [Employee](file:///d:/Codeapp/motnha/components/hr/EmployeeReviewTab.js#15-139), `/hr` | ✅ |
| Chấm công ngày | `DailyAttendance` | ✅ |
| Đơn nghỉ phép | `LeaveRequest` | ✅ |
| Bảng lương | `PayrollRecord` | ✅ |
| Đánh giá nhân sự | [EmployeeReview](file:///d:/Codeapp/motnha/components/hr/EmployeeReviewTab.js#15-139) | ✅ |
| Tạm ứng lương | `SalaryAdvance` | ✅ |
| Hợp đồng lao động | `EmployeeContract` | ✅ |

### 8. Bảo hành & CSKH
| Feature | Model/Page | Status |
|---------|-----------|--------|
| Phiếu bảo hành | `Warranty`, `/warranty` | ✅ |

### 9. Hệ thống
| Feature | Model/Page | Status |
|---------|-----------|--------|
| Đăng nhập JWT + Bearer | `User`, `/login` | ✅ |
| Dashboard (4 tier) | [/page.js](file:///d:/Codeapp/motnha/app/page.js) | ✅ |
| Thông báo | `Notification` | ✅ |
| Activity Log | `ActivityLog` | ✅ |
| Upload ảnh (R2) | API `/upload` | ✅ |
| Admin settings | `/admin` | ✅ |
| Báo cáo | `/reports` | ✅ |
| Export Word | Contract export | ✅ |
| Đối tác | `Partner`, `/partners` | ✅ |
| Tài liệu dự án | `ProjectDocument`, `DocumentFolder` | ✅ |
| PDF merge | API `/pdf-merge` | ✅ |

---

## 🚀 CHƯA IMPLEMENT — Brainstorm Features Mới

### A. CRM Nâng Cao
- [ ] **Phễu bán hàng trực quan** — Kanban drag-drop pipeline (Lead → Khảo sát → Báo giá → Ký HĐ → Thi công → Bàn giao)
- [ ] **Email/SMS tự động** — Reminder hẹn lịch, chúc mừng sinh nhật, nhắc thanh toán
- [ ] **Chấm điểm Lead** — Scoring dựa trên nguồn, ngân sách, timeline
- [ ] **Referral tracking** — Theo dõi khách giới thiệu, commission

### B. Quản lý Dự án Nâng Cao
- [ ] **Gantt Chart** — Timeline dự án kéo thả (dùng dhtmlxGantt hoặc Frappe Gantt)
- [ ] **Resource Allocation** — Phân bổ thợ/máy theo dự án, tránh conflict
- [ ] **Risk Register** — Đánh giá rủi ro dự án (xác suất × tác động)
- [ ] **Photo Progress** — Timeline ảnh tiến độ (before/after từng giai đoạn)
- [ ] **Client Portal** — Trang riêng cho khách xem tiến độ, phê duyệt, thanh toán

### C. Sản xuất & Xưởng Nâng Cao
- [ ] **MRP (Material Requirement Planning)** — Tính NVL cần dựa trên BOM + tồn kho → tự tạo PR/PO
- [ ] **Quality Control Checklist** — QC từng lô sản xuất, checklist tùy chỉnh
- [ ] **Machine/Equipment Management** — Quản lý máy móc, lịch bảo trì
- [ ] **Cutting Optimization** — Tối ưu cắt gỗ/vật liệu (nesting algorithm)
- [ ] **Production Dashboard** — Real-time production tracking, OEE metrics

### D. Kho & Logistics Nâng Cao
- [ ] **Barcode/QR scanning** — Quét mã nhập/xuất kho
- [ ] **Min/Max tồn kho** — Cảnh báo hết hàng, auto reorder point
- [ ] **Lot/Serial tracking** — Theo dõi lô hàng, serial number
- [ ] **Delivery Management** — Quản lý giao hàng, route planning
- [ ] **Return Management** — Quản lý hàng trả lại, đổi hàng

### E. Tài chính Nâng Cao
- [ ] **Cash Flow Forecast** — Dự báo dòng tiền theo dự án/tháng
- [ ] **Profit/Loss per Project** — Lãi/lỗ chi tiết từng dự án (revenue - expenses - labor)
- [ ] **Invoice Generation** — Xuất hóa đơn (VAT, đa mẫu)
- [ ] **Payment Schedule** — Lịch thu/chi theo đợt thanh toán hợp đồng
- [ ] **Bank Reconciliation** — Đối soát ngân hàng
- [ ] **Multi-currency** — Hỗ trợ ngoại tệ (cho dự án import NVL)
- [ ] **Tax Report** — Báo cáo thuế GTGT, TNCN

### F. HR Nâng Cao
- [ ] **Bảng chấm công visual** — Calendar view, kéo thả, bulk edit
- [ ] **GPS check-in/out** — Chấm công qua app (geolocation)
- [ ] **OKR / KPI** — Mục tiêu cá nhân theo quý, link với đánh giá
- [ ] **Training Management** — Quản lý đào tạo, chứng chỉ
- [ ] **Employee Self-Service Portal** — Nhân viên tự xem lương, phiếu phép, đơn tạm ứng

### G. Bảo hành & CSKH Nâng Cao
- [ ] **Warranty Timeline** — Dòng thời gian bảo hành theo sản phẩm
- [ ] **Customer Satisfaction Survey** — Khảo sát hài lòng sau bàn giao
- [ ] **Maintenance Schedule** — Lịch bảo trì định kỳ (1 năm, 2 năm)
- [ ] **Warranty Analytics** — Phân tích lỗi phổ biến, nhà cung cấp có tỷ lệ lỗi cao

### H. Tích hợp & AI
- [ ] **Zalo OA Integration** — Gửi thông báo qua Zalo
- [ ] **AI Cost Estimator** — Ước tính chi phí dự án từ bản vẽ/mô tả
- [ ] **AI Material Suggest** — Gợi ý NVL thay thế, so sánh giá
- [ ] **Document OCR** — Scan hợp đồng, phiếu giao hàng → data
- [ ] **Chatbot CSKH** — Bot trả lời bảo hành, tiến độ cho khách

### I. Mobile & UX
- [ ] **PWA / Mobile App** — Responsive + offline capability
- [ ] **Dark Mode** — Giao diện tối
- [ ] **Multi-language** — Tiếng Anh cho dự án có đối tác nước ngoài
- [ ] **Drag & Drop everywhere** — Kanban, timeline, lịch
- [ ] **Bulk actions** — Chọn nhiều, xử lý hàng loạt

### J. Báo cáo & BI
- [ ] **Custom Report Builder** — Kéo thả tạo báo cáo tùy chỉnh
- [ ] **Executive Dashboard** — Tổng quan cho giám đốc (revenue, margin, pipeline)
- [ ] **Project Comparison** — So sánh hiệu quả giữa các dự án
- [ ] **Employee Productivity** — Báo cáo năng suất theo thợ/nhóm
- [ ] **Export PDF/Excel** — Xuất báo cáo đa format

### K. Quản trị & Bảo mật
- [ ] **RBAC (Role-Based Access)** — Phân quyền theo vai trò (Admin, PM, Accountant, Worker)
- [ ] **Audit Trail** — Lịch sử thay đổi chi tiết (ai sửa gì, khi nào)
- [ ] **Data Backup & Restore** — Backup tự động, restore point
- [ ] **2FA** — Xác thực 2 bước
- [ ] **API Rate Limiting** — Chống abuse

---

## 🎯 ĐỀ XUẤT ƯU TIÊN CAO (Quick Wins)

| # | Feature | Impact | Effort | Lý do |
|---|---------|--------|--------|-------|
| 1 | **Gantt Chart** | 🔥🔥🔥 | Medium | Khách hàng + PM rất cần visual timeline |
| 2 | **Cash Flow Forecast** | 🔥🔥🔥 | Medium | Giám đốc cần dự báo dòng tiền |
| 3 | **RBAC** | 🔥🔥🔥 | Medium | Bảo mật cơ bản, phân quyền theo role |
| 4 | **Barcode/QR Kho** | 🔥🔥 | Low | Tăng tốc nhập/xuất kho |
| 5 | **MRP** | 🔥🔥🔥 | High | Tự động tính NVL cần mua |
| 6 | **Client Portal** | 🔥🔥 | Medium | Giảm áp lực CSKH, tăng trust |
| 7 | **Invoice Generation** | 🔥🔥 | Low | Xuất hóa đơn chuyên nghiệp |
| 8 | **P/L per Project** | 🔥🔥🔥 | Low | Biết dự án nào lãi/lỗ ngay |
| 9 | **Calendar Attendance** | 🔥🔥 | Low | UX chấm công visual |
| 10 | **Dark Mode** | 🔥 | Low | UX polish |
