# Project Finance Drawer — Design Spec

**Date:** 2026-04-03

---

## Goal

Cho phép xem chi tiết tài chính từng dự án (thu – chi – lợi nhuận) trực tiếp từ bảng P&L, không cần điều hướng khỏi trang. Không có nghiệp vụ nhập liệu trong drawer này — tất cả nhập liệu vẫn ở Finance.

---

## Architecture

**Entry point:** `app/reports/pl-by-project/page.js`
- Thêm state `drawerProjectId` (string | null)
- Click vào tên dự án → set `drawerProjectId = row.id` (thay vì chỉ có link ExternalLink)
- Drawer render ngay trong trang, fetch data khi `drawerProjectId` thay đổi

**Drawer component:** `components/reports/ProjectFinanceDrawer.js` (file mới)
- Props: `projectId`, `onClose`
- Fetch `GET /api/reports/project-settlement/[id]` khi mount/projectId change
- Hiển thị layout B: 4 KPI cards + 2 cột Thu/Chi + thanh lợi nhuận
- Nút "Xem đầy đủ →" link sang `/reports/settlement/[id]`

**API:** Dùng lại `GET /api/reports/project-settlement/[id]` đã có — **không thêm API mới**.

---

## UI Layout (Drawer)

```
┌─────────────────────────────────────────────────────────┐
│ DA-001 — Tên dự án                              [X] [→] │
├──────────────┬──────────────┬──────────────┬───────────┤
│ Giá trị HĐ  │  Đã thu      │  Tổng chi    │  LN / %   │
├──────────────┴──────────────┴──────────────┴───────────┤
│  BÊN A — DOANH THU       │  BÊN B — CHI PHÍ           │
│  HĐ: ...                 │  PO: ...                    │
│  Tiến độ thanh toán      │  Thầu phụ: ...              │
│  Đã thu: ...             │  Chi phí (direct+alloc): ..│
│  Còn nợ: ...             │  Còn phải trả: ...          │
├──────────────────────────────────────────────────────────┤
│  📈 LỢI NHUẬN GỘP  ████░░░░  90,000,000đ   13.2%      │
└──────────────────────────────────────────────────────────┘
```

**Drawer specs:**
- Width: 640px, full height, position fixed bên phải
- Backdrop mờ, click backdrop đóng drawer
- Scroll nội dung nếu nội dung dài
- Loading skeleton khi fetch
- Error state nếu API fail

---

## Data Mapping

Từ response `project-settlement`:

| UI element | API field |
|---|---|
| Giá trị HĐ | `revenue.contractValue` |
| Đã thu | `revenue.received` |
| Còn nợ | `revenue.outstanding` |
| Tổng chi phí | `costs.totalCost` |
| Lợi nhuận | `profitability.grossProfit` |
| Tỷ suất | `profitability.grossMargin` |
| Danh sách HĐ | `details.contracts` |
| Danh sách PO | `details.purchaseOrders` |
| Thanh toán thầu | `details.contractorPayments` |
| Chi phí (direct+alloc) | `details.expenses` (đã gộp sẵn, alloc có prefix `[Phân bổ]`) |

---

## Files

| File | Action |
|---|---|
| `components/reports/ProjectFinanceDrawer.js` | Tạo mới |
| `app/reports/pl-by-project/page.js` | Sửa: thêm drawer state + wire click |

**Không sửa:** API routes, CSS global, các tab dự án.

---

## Constraints

- Chỉ dùng CSS inline + `var(--*)` variables hiện có (không thêm CSS file)
- Auth: drawer gọi API qua `apiFetch` — session tự động
- Roles: trang P&L đã guard `['giam_doc', 'pho_gd', 'ke_toan']`, drawer hưởng luôn
- Mobile: drawer full-width khi < 640px
