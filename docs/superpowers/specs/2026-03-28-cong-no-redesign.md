# Spec: Trang Công nợ riêng — Master-Detail Layout

**Ngày:** 2026-03-28
**Trạng thái:** Approved
**Phạm vi:** `app/cong-no/`, `components/Sidebar.js`

---

## Bối cảnh

DebtTab hiện tại (799 dòng) nhồi quá nhiều thứ vào 1 tab trong Finance: NCC, thầu phụ, AR, giữ lại BH, báo cáo kỳ, modal sổ cái, modal thanh toán, modal đầu kỳ. UX rối, không có chỗ thở.

Giải pháp: tách Công nợ ra trang riêng `/cong-no` với layout master-detail chuyên nghiệp.

---

## Cấu trúc

### Sidebar

Thêm mục vào section Tài chính (sau Ngân sách):

```
Tài chính
  ├── Tổng quan        /finance
  ├── Sổ cái           /accounting
  ├── Dự báo dòng tiền /cashflow-forecast
  ├── Ngân sách        /budget
  └── Công nợ          /cong-no          ← thêm mới, icon: Landmark
```

### Routes

| Route | Mô tả |
|---|---|
| `/cong-no` | Trang master-detail chính |
| `/cong-no/bao-cao` | Báo cáo công nợ theo kỳ |

---

## Trang `/cong-no` — Master-Detail

### Layout

2 cột:
- **Cột trái** (280px cố định): danh sách NCC hoặc thầu phụ
- **Cột phải** (flex): sổ cái chi tiết của entity đang chọn

### Cột trái

**Tab bar:** `Nhà cung cấp` | `Nhà thầu phụ`

**Mỗi tab có:**
- Search input: tìm theo tên / mã
- Filter select: `Còn nợ` (default) | `Tất cả`
- Danh sách items: tên + số dư + indicator màu (🔴 > 0, ✅ = 0)
- Click item → cột phải cập nhật

**Dữ liệu:**
- NCC: từ `GET /api/debt/ncc`
- Thầu phụ: từ `GET /api/debt/contractors`

### Cột phải

**Khi chưa chọn ai:** empty state "Chọn một nhà cung cấp hoặc nhà thầu để xem sổ cái"

**Khi đã chọn:**

**Header:** tên entity + nút `[✎ Sửa đầu kỳ]` + nút `[💸 Ghi nhận thanh toán]`

**4 stat cards:**
- Đầu kỳ
- Phát sinh
- Đã trả
- Số dư (đỏ nếu > 0, xanh nếu = 0)

**Bảng sổ cái** (từ `/api/debt/ncc/[id]/ledger`):

| Ngày | Loại | Chứng từ | Dự án | Phát sinh | Thanh toán | Số dư |
|---|---|---|---|---|---|---|
| 10/03 | Nhận hàng | PO-023 | Nhà anh Minh | +45tr | — | 65tr |
| 08/03 | Thanh toán | SP-001 | — | — | -20tr | 20tr |

- Badge Loại: "Nhận hàng" (warning) / "Thanh toán" (success)
- Phát sinh: màu đỏ
- Thanh toán: màu xanh
- Số dư: đỏ nếu > 0

**Thầu phụ — cột phải bổ sung:**
- Thêm dòng "Giữ lại BH" trong stat cards
- Bảng sổ cái tương tự nhưng loại = "Quyết toán" / "Thanh toán" / "Giải phóng BH"

### Actions

**Modal "Ghi nhận thanh toán":**
- Fields: Số tiền *, Ngày *, Ghi chú
- Thầu phụ thêm: Dự án (optional select)
- POST `/api/debt/ncc` hoặc `/api/debt/contractors`
- Sau lưu: refresh sổ cái

**Modal "Sửa đầu kỳ":**
- Field: Số dư đầu kỳ (number)
- PATCH `/api/debt/ncc` hoặc `/api/debt/contractors`
- Sau lưu: refresh

---

## Trang `/cong-no/bao-cao` — Báo cáo kỳ

### Layout

- Header: "Báo cáo công nợ theo kỳ" + month picker (`<input type="month">`)
- 3 KPI cards: Tổng nợ NCC | Tổng nợ Thầu phụ | Grand Total
- Tab bar: `Nhà cung cấp` | `Nhà thầu phụ`
- Bảng tương ứng

**Bảng NCC:**

| NCC | Đầu kỳ | Phát sinh | Đã trả | Cuối kỳ |
|---|---|---|---|---|
| VLXD Minh K. | 20tr | 65tr | 20tr | 65tr 🔴 |
| Footer tổng | ... | ... | ... | ... |

**Bảng Thầu phụ:** tương tự

**Dữ liệu:** `GET /api/debt/report?month=YYYY-MM` (đã có)

---

## Không thay đổi

- `app/api/debt/ncc/route.js` — giữ nguyên
- `app/api/debt/contractors/route.js` — giữ nguyên
- `app/api/debt/ncc/[id]/ledger/route.js` — giữ nguyên
- `app/api/debt/report/route.js` — giữ nguyên
- `app/finance/tabs/DebtTab.js` — giữ nguyên (vẫn hiện trong Finance → Tab Công nợ, nhưng có thể đơn giản hóa sau)
- CSS variables, `withAuth`, `apiFetch` — giữ nguyên

---

## Tiêu chí hoàn thành

- [ ] Sidebar có mục Công nợ → `/cong-no`, icon Landmark
- [ ] `/cong-no` layout 2 cột, tab NCC / Thầu phụ ở cột trái
- [ ] Click NCC/thầu phụ → cột phải hiện sổ cái chi tiết với running balance
- [ ] Search + filter "Còn nợ / Tất cả" hoạt động
- [ ] Modal ghi nhận thanh toán + sửa đầu kỳ hoạt động
- [ ] `/cong-no/bao-cao` có month picker + 2 bảng NCC/thầu phụ + KPI cards
- [ ] Không lỗi console
