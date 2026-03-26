# Superpowers Brainstorm — Đánh Giá Lại Dự Án Một Nhà ERP

> Ngày: 2026-03-26

---

## Goal

Đánh giá toàn diện dự án Một Nhà ERP sau khi hoàn thành Phase 1–10 để xác định:
1. **Điểm mạnh** cần giữ và phát huy
2. **Điểm yếu / nợ kỹ thuật** cần xử lý trước khi scale
3. **Ưu tiên tiếp theo** — features nào mang lại giá trị cao nhất cho business
4. **Rủi ro** cần giảm thiểu trước khi triển khai production rộng

---

## Constraints

| Constraint | Chi tiết |
|-----------|----------|
| **Solo dev** | 1 developer, cần tối ưu effort/impact |
| **Budget thấp** | VPS đơn, không multi-server |
| **Tech stack cố định** | Next.js 16 + Prisma 6 + PostgreSQL — không đổi |
| **Đang production** | Có user thật, không thể break database |
| **Ngành nội thất/xây dựng** | Domain-specific, workflow phức tạp |

---

## Known Context

### Quy mô đã build
| Metric | Số liệu |
|--------|---------|
| Prisma models | 81 models, schema 69KB |
| API routes | 193 route files |
| Pages | 36 page directories |
| CSS | globals.css 94KB (monolithic) |
| Dashboard page | page.js 43KB (monolithic) |
| Dependencies | 25 runtime + 8 dev |
| Tests | 5 unit tests (vitest) — **rất ít** |
| Auth | JWT (web) + Bearer (mobile) + Public |
| Deploy | Docker Compose → single VPS |

### Modules hoàn chỉnh (9 nhóm)
1. **CRM** — Customer, Pipeline, Interaction
2. **Dự án & Thi công** — Project, Quotation, Contract (TinyMCE + Word export), Schedule, DailyLog, Acceptance, PunchList
3. **Nội thất & Sản xuất** — FurnitureOrder, FurnitureTemplate, BOM, ProductionBatch, WorkOrder, Workshop
4. **Kho & Vật tư** — Product, Inventory, Warehouse, Transfer, MaterialPlan
5. **Mua hàng** — Supplier, PurchaseOrder, Contractor, Commitment
6. **Tài chính** — Expense, Budget, Payment, AccountEntry, JournalEntry, OCR
7. **HR** — Employee, Attendance, Leave, Payroll, Review, SalaryAdvance, Contract
8. **Bảo hành** — Warranty
9. **Hệ thống** — Auth, Dashboard (4-tier), Notification, ActivityLog, Upload R2, Admin, Reports

### Kiến trúc tốt đã có
- `apiHandler.js` wrapper thống nhất (auth + rate limit + error handling + auto-log)
- TanStack Query cho client state
- Prisma + Zod validation
- Docker deploy workflow (`/deploy-vps`)
- Soft delete pattern
- Code generation (BG-xxx, HD-xxx, PO-xxx)

---

## Risks

### 🔴 Nghiêm trọng

| # | Risk | Impact | Likelihood |
|---|------|--------|------------|
| R1 | **Test coverage ~0%** — 5 tests cho 193 routes | Bug lọt production, regression khi thêm feature | Cao |
| R2 | **globals.css 94KB monolithic** — 1 file CSS duy nhất | Khó maintain, conflict, load chậm | Cao |
| R3 | **Dashboard page.js 43KB** — 1 component khổng lồ | Khó debug, render chậm, impossible to test | Cao |
| R4 | **Không có RBAC** — role check cơ bản | User xem/sửa data không thuộc quyền | Cao |
| R5 | **Single VPS, no backup plan** — thiếu disaster recovery | Mất data = mất business | Trung bình |

### 🟡 Đáng chú ý

| # | Risk | Impact | Likelihood |
|---|------|--------|------------|
| R6 | **Schema 81 models** — quá nhiều, có thể over-engineered | Migration phức tạp, query chậm | Trung bình |
| R7 | **TipTap vẫn trong deps** — đã chuyển sang TinyMCE nhưng chưa cleanup | Bundle size lãng phí ~500KB | Thấp |
| R8 | **Mobile responsive chưa polish** | UX kém trên mobile (đội thi công hay dùng) | Cao |
| R9 | **Không có monitoring/alerting** — chỉ Sentry cho errors | Không biết app chậm hay DB bottleneck | Trung bình |
| R10 | **Prisma v6 + Next.js 16** — versions rất mới | Có thể gặp bugs chưa fix upstream | Thấp |

---

## Options (4)

### Option A: "Vững trước, xa sau" — Consolidate & Harden

**Focus**: Fix nợ kỹ thuật, tăng stability trước khi thêm features.

| Bước | Việc | Effort |
|------|------|--------|
| 1 | Tách `globals.css` → CSS modules per page | 2-3 ngày |
| 2 | Tách `page.js` dashboard → components nhỏ | 1-2 ngày |
| 3 | Xóa TipTap deps (đã dùng TinyMCE) | 30 phút |
| 4 | Viết test cho 20 critical API routes | 3-4 ngày |
| 5 | Implement RBAC cơ bản | 2-3 ngày |
| 6 | Setup DB backup cron | 1 ngày |
| 7 | Mobile responsive audit & fix | 2-3 ngày |

**Tổng**: ~2-3 tuần. Không có feature mới, nhưng nền vững.

---

### Option B: "Feature-first" — Ship High-Value Features

**Focus**: Thêm features có impact cao nhất cho end-user.

| Bước | Việc | Impact | Effort |
|------|------|--------|--------|
| 1 | P/L per Project | 🔥🔥🔥 | Low |
| 2 | Cash Flow Forecast | 🔥🔥🔥 | Medium |
| 3 | Invoice Generation (VAT) | 🔥🔥 | Low |
| 4 | Calendar Attendance view | 🔥🔥 | Low |
| 5 | Payment Schedule | 🔥🔥 | Medium |

**Tổng**: ~2-3 tuần. User thấy giá trị ngay nhưng nợ kỹ thuật tích lũy.

---

### Option C: "Hybrid 70/30" — Harden rồi Feature

**Focus**: 70% hardening (1.5 tuần) + 30% quick-win features (1 tuần).

| Phase | Việc |
|-------|------|
| **Phase H1** (tuần 1) | Xóa TipTap deps, tách CSS, tách dashboard, DB backup |
| **Phase H2** (tuần 2 đầu) | RBAC cơ bản + 10 critical API tests |
| **Phase F1** (tuần 2-3) | P/L per Project + Invoice Generation + Payment Schedule |

**Tổng**: ~3 tuần. Cân bằng giữa stability và feature delivery.

---

### Option D: "Mobile-first Sprint" — Ưu tiên trải nghiệm thực tế

**Focus**: Mobile + UX, vì đội thi công dùng phone là chính.

| Bước | Việc | Effort |
|------|------|--------|
| 1 | Mobile responsive toàn bộ pages | 3-4 ngày |
| 2 | PWA setup (offline-capable) | 2 ngày |
| 3 | GPS check-in/out (attendance) | 2-3 ngày |
| 4 | Photo progress upload (mobile camera) | 1-2 ngày |
| 5 | Quick actions (mobile bottom bar) | 1 ngày |

**Tổng**: ~2 tuần. Tăng adoption rate từ đội thi công nhưng không fix nợ kỹ thuật.

---

## Recommendation

### 👉 **Option C: "Hybrid 70/30"** — Harden rồi Feature

**Lý do:**

1. **Nợ kỹ thuật đã đến ngưỡng nguy hiểm**: 94KB CSS + 43KB dashboard page + 5 tests → bất kỳ thay đổi nào cũng có risk regression cao.

2. **RBAC là blocker thực sự**: Đang production mà chưa có phân quyền → bất kỳ user nào cũng xem được mọi thứ. Đây là security risk #1.

3. **P/L per Project và Invoice là quick wins có ROI cao**: Effort thấp (ít thay đổi schema), impact trực tiếp đến bottom line của doanh nghiệp.

4. **Solo dev = phải giữ codebase manageable**: Nếu cứ thêm features mà không refactor, velocity sẽ giảm dần và bugs tăng exponentially.

**Thứ tự ưu tiên cụ thể:**

```
Tuần 1:   Cleanup (TipTap, CSS split, Dashboard split, DB backup)
Tuần 2:   RBAC + 10 critical tests
Tuần 3:   P/L per Project + Invoice Generation + Payment Schedule
```

---

## Acceptance Criteria

| # | Criteria | Measurable |
|---|---------|------------|
| AC1 | TipTap deps removed | `npm ls @tiptap/*` returns empty |
| AC2 | CSS split per module | No single CSS file > 15KB |
| AC3 | Dashboard components | No single .js file > 10KB in `app/` |
| AC4 | DB backup automated | Cron job chạy daily, backup file verify restore OK |
| AC5 | RBAC functional | User role `nhan_vien` không xem được route `/admin`, `/hr/payroll` |
| AC6 | Test coverage | ≥ 20 API route tests passing |
| AC7 | P/L per Project | Dashboard hiện lãi/lỗ mỗi dự án, số liệu match manual calc |
| AC8 | Invoice Generation | Xuất được hóa đơn PDF với format chuẩn VAT |
| AC9 | Payment Schedule | Xem lịch thu/chi theo đợt thanh toán hợp đồng |
