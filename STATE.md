# STATE.md — Một Nhà ERP

> Cập nhật: 2026-07-23T15:30

## Project Overview
- **Stack**: Next.js 16.1.6 + React 19.2 + Prisma 6.19 + PostgreSQL + Docker
- **Mục đích**: ERP quản lý doanh nghiệp nội thất/xây dựng
- **API Routes**: 193 route files, 63 API modules
- **DB Models**: 81 Prisma models (1826 lines schema)
- **Pages**: 36 page directories
- **UI Components**: 18 shared UI + 6 schedule + 7 top-level
- **Auth**: NextAuth JWT (web) + Bearer Token (mobile) + Public pages
- **Storage**: Cloudflare R2 (S3-compatible)
- **AI**: Gemini (OCR hóa đơn, Journal Assistant)
- **Tests**: 5 unit tests (vitest + jsdom)

## Done (gần đây)
- [x] Phase 1-3: Schema, APIs, Dashboard, HR tabs, Furniture Orders, Production Batches
- [x] Phase 4-6: CustomerInteraction, EmployeeReview, SalaryAdvance, Quotation versioning, Accounting
- [x] Phase 7-9: Sidebar, Notification bell, Daily Logs, Admin Settings, Dashboard Tier 4
- [x] Phase 10: Full test suite 61/61, Schema sync audit
- [x] Gantt Chart (`/gantt`) - SVG thuần, filter status/type/search, zoom ngày, tooltip, milestone diamond, scroll-to-today

## In Progress
- (none)

## Next
- [ ] Deployment / staging test
- [ ] Mobile responsive polish

## Commit
- Branch: `main`
- Last commit: `066ed75` — fix(hr): cải thiện
- Previous: `a50bff8` — feat: thêm tính năng

---

## 📊 Feature Map — Đã Implement

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
| Nhân viên | `Employee`, `/hr` | ✅ |
| Chấm công ngày | `DailyAttendance` | ✅ |
| Đơn nghỉ phép | `LeaveRequest` | ✅ |
| Bảng lương | `PayrollRecord` | ✅ |
| Đánh giá nhân sự | `EmployeeReview` | ✅ |
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
| Dashboard (4 tier) | `/page.js` | ✅ |
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

## 🚀 Backlog — Features Chưa Implement

### A. CRM Nâng Cao
- [ ] Phễu bán hàng trực quan — Kanban drag-drop pipeline
- [ ] Email/SMS tự động — Reminder, chúc mừng, nhắc thanh toán
- [ ] Chấm điểm Lead — Scoring dựa trên nguồn, ngân sách, timeline
- [ ] Referral tracking — Theo dõi khách giới thiệu, commission

### B. Quản lý Dự án Nâng Cao
- [ ] Gantt Chart — Timeline dự án kéo thả
- [ ] Resource Allocation — Phân bổ thợ/máy theo dự án
- [ ] Risk Register — Đánh giá rủi ro dự án
- [ ] Photo Progress — Timeline ảnh tiến độ before/after
- [ ] Client Portal — Trang riêng cho khách xem tiến độ

### C. Sản xuất & Xưởng Nâng Cao
- [ ] MRP — Tính NVL cần dựa trên BOM + tồn kho → tự tạo PR/PO
- [ ] Quality Control Checklist — QC từng lô sản xuất
- [ ] Machine/Equipment Management — Quản lý máy móc, lịch bảo trì
- [ ] Cutting Optimization — Tối ưu cắt gỗ/vật liệu
- [ ] Production Dashboard — Real-time tracking, OEE metrics

### D. Kho & Logistics Nâng Cao
- [ ] Barcode/QR scanning — Quét mã nhập/xuất kho
- [ ] Min/Max tồn kho — Cảnh báo hết hàng, auto reorder point
- [ ] Lot/Serial tracking — Theo dõi lô hàng, serial number
- [ ] Delivery Management — Quản lý giao hàng, route planning
- [ ] Return Management — Quản lý hàng trả lại

### E. Tài chính Nâng Cao
- [ ] Cash Flow Forecast — Dự báo dòng tiền theo dự án/tháng
- [ ] Profit/Loss per Project — Lãi/lỗ chi tiết từng dự án
- [ ] Invoice Generation — Xuất hóa đơn VAT, đa mẫu
- [ ] Payment Schedule — Lịch thu/chi theo đợt thanh toán HĐ
- [ ] Bank Reconciliation — Đối soát ngân hàng
- [ ] Multi-currency — Hỗ trợ ngoại tệ
- [ ] Tax Report — Báo cáo thuế GTGT, TNCN

### F. HR Nâng Cao
- [ ] Bảng chấm công visual — Calendar view, kéo thả, bulk edit
- [ ] GPS check-in/out — Chấm công qua app (geolocation)
- [ ] OKR / KPI — Mục tiêu cá nhân theo quý
- [ ] Training Management — Quản lý đào tạo, chứng chỉ
- [ ] Employee Self-Service Portal

### G. Bảo hành & CSKH Nâng Cao
- [ ] Warranty Timeline — Dòng thời gian bảo hành
- [ ] Customer Satisfaction Survey — Khảo sát hài lòng
- [ ] Maintenance Schedule — Lịch bảo trì định kỳ
- [ ] Warranty Analytics — Phân tích lỗi phổ biến

### H. Tích hợp & AI
- [ ] Zalo OA Integration
- [ ] AI Cost Estimator — Ước tính chi phí từ bản vẽ/mô tả
- [ ] AI Material Suggest — Gợi ý NVL thay thế
- [ ] Document OCR — Scan hợp đồng, phiếu giao hàng → data
- [ ] Chatbot CSKH

### I. Mobile & UX
- [ ] PWA / Mobile App — Responsive + offline
- [ ] Dark Mode
- [ ] Multi-language
- [ ] Drag & Drop everywhere
- [ ] Bulk actions

### J. Báo cáo & BI
- [ ] Custom Report Builder
- [ ] Executive Dashboard — Tổng quan cho giám đốc
- [ ] Project Comparison
- [ ] Employee Productivity
- [ ] Export PDF/Excel

### K. Quản trị & Bảo mật
- [ ] RBAC — Phân quyền theo vai trò
- [ ] Audit Trail chi tiết
- [ ] Data Backup & Restore
- [ ] 2FA
- [ ] API Rate Limiting

---

## 🎯 Quick Wins Ưu Tiên

| # | Feature | Impact | Effort |
|---|---------|--------|--------|
| 1 | Gantt Chart | 🔥🔥🔥 | Medium |
| 2 | Cash Flow Forecast | 🔥🔥🔥 | Medium |
| 3 | RBAC | 🔥🔥🔥 | Medium |
| 4 | Barcode/QR Kho | 🔥🔥 | Low |
| 5 | MRP | 🔥🔥🔥 | High |
| 6 | Client Portal | 🔥🔥 | Medium |
| 7 | Invoice Generation | 🔥🔥 | Low |
| 8 | P/L per Project | 🔥🔥🔥 | Low |
| 9 | Calendar Attendance | 🔥🔥 | Low |
| 10 | Dark Mode | 🔥 | Low |
