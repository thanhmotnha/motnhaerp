# Spec: Redesign Phân hệ Tài chính

**Ngày:** 2026-03-28
**Trạng thái:** Approved
**Phạm vi:** `app/finance/page.js`, `app/finance/tabs/`, `components/finance/`

---

## Bối cảnh

Công ty nội thất & xây dựng 6 người. Kế toán là người nhập liệu tài chính hàng ngày — ghi nhận tiền khách trả, nhập chi phí dự án, và xem tình hình dòng tiền. Vấn đề chính: giao diện khó dùng, quá nhiều click để nhập 1 khoản, không có màn hình tổng hợp xem nhanh tình hình tiền mặt hôm nay.

**Quy trình thực tế của kế toán:**
```
Sáng: Xem tổng quan → Kiểm tra đợt thu tuần này → Ghi nhận tiền vừa nhận
Chiều: Nhập chi phí phát sinh → Xem dòng tiền còn lại
Cuối tháng: Báo cáo thu/chi theo dự án
```

---

## Mục tiêu

1. **Quick Entry** — nhập thu/chi trong 3 field, 1 click, không cần chuyển tab
2. **Daily Dashboard** — kế toán mở ra là thấy ngay: tiền mặt hiện có, đợt thu tuần này, giao dịch hôm nay
3. **Công nợ đầy đủ** — khách hàng + nhà thầu + nhà cung cấp trong 1 tab
4. **Tách file** — `page.js` hiện 432 dòng → shell ~100 dòng + 4 tab component mới

---

## Cấu trúc File

```
app/finance/
  page.js                  (~100 dòng — shell, Quick Entry bar, tab routing)
  tabs/
    OverviewTab.js          (~150 dòng — daily dashboard)
    CashflowTab.js          (~180 dòng — dòng tiền + giao dịch thủ công)
    DebtTab.js              (~200 dòng — công nợ 3 chiều)
    ReportTab.js            (~150 dòng — báo cáo tháng)

components/finance/
  ReceivablesTab.js         (giữ nguyên — không thay đổi)
  ExpensesTab.js            (giữ nguyên — không thay đổi)
```

---

## Quick Entry Bar

Hiển thị cố định ngay dưới stat cards, trên tab bar. 3 nút:

| Nút | Fields | API |
|-----|--------|-----|
| `+ Thu tiền` | Dự án (optional), Số tiền, Ngày, Ghi chú | POST `/api/finance` `{type:'Thu'}` |
| `+ Chi phí` | Dự án (optional), Danh mục, Số tiền, Ngày | POST `/api/finance` `{type:'Chi'}` |
| `+ Giao dịch khác` | Loại (Thu/Chi), Mô tả, Số tiền, Ngày | POST `/api/finance` `{type:...}` |

Click nút → form inline slide down → save → form đóng → refresh summary. Chỉ 1 form mở tại 1 thời điểm.

---

## 6 Tab (giữ nguyên key, refactor code)

### Tab 1: Tổng quan (`overview`)

**Stat cards (4 số):**
- Tiền mặt hiện tại = tổng Thu - tổng Chi từ tất cả `Transaction`
- Thu tháng này = sum `Transaction.type='Thu'` trong tháng hiện tại
- Chi tháng này = sum `Transaction.type='Chi'` + `ProjectExpense` trong tháng
- Công nợ chưa thu = sum `ContractPayment.amount - paidAmount` where `status != 'Đã thu'`

**Cảnh báo đỏ** nếu có `ContractPayment` quá hạn > 7 ngày (`dueDate < now - 7d` và `status != 'Đã thu'`).

**Danh sách "Cần thu tuần này":** `ContractPayment` có `dueDate` trong 7 ngày tới, chưa thu — hiển thị: dự án, đợt, số tiền, ngày đến hạn.

**10 giao dịch gần nhất** từ `Transaction`, lọc được Thu/Chi.

### Tab 2: Thu tiền (`thu_tien`)

Wrap `ReceivablesTab` component có sẵn — không thay đổi.

### Tab 3: Chi phí (`chi_phi`)

Wrap `ExpensesTab` component có sẵn — không thay đổi.

### Tab 4: Dòng tiền (`dong_tien`)

- Số dư hiện tại (running balance từ đầu đến nay)
- Biểu đồ SVG thu/chi theo tháng (giữ nguyên logic hiện tại)
- Bảng giao dịch thủ công: lọc theo loại (Thu/Chi/Tất cả) và tháng
- Nút `+ Thêm giao dịch` → dùng Quick Entry bar

### Tab 5: Công nợ (`cong_no`)

**3 section:**

**A. Khách hàng chưa trả (AR):**
- Nguồn: `ContractPayment` where `status != 'Đã thu'`
- Hiển thị: Dự án, Đợt, Số tiền, Đã trả, Còn lại, Ngày đến hạn, Quá hạn (ngày)
- Phân nhóm màu: xanh (<30 ngày), vàng (30-60), đỏ (>60 hoặc quá hạn)

**B. Nhà thầu giữ lại bảo hành:**
- Nguồn: `ContractorPayment` where `retentionAmount > 0 AND retentionReleased = false`
- Hiển thị: Nhà thầu, Dự án, Giai đoạn, Số tiền giữ lại

**C. Nhà cung cấp chưa thanh toán:**
- Nguồn: `PurchaseOrder` where `paidAmount < totalAmount AND status != 'Đã hủy'`
- Hiển thị: Mã PO, Nhà CC, Dự án, Tổng PO, Đã trả, Còn lại, Ngày đặt hàng

### Tab 6: Báo cáo tháng (`bao_cao`)

Bảng tổng hợp theo tháng từ `cashflow.months`:
- Cột: Tháng / Tổng thu / Tổng chi / Ròng tháng / Số dư tích lũy
- Giữ nguyên data source từ `/api/finance/cashflow`
- Xóa bảng duplicate bị orphaned (đã xóa)

---

## Không thay đổi

- API routes `/api/finance/*` — giữ nguyên
- `ReceivablesTab.js`, `ExpensesTab.js` — giữ nguyên
- CSS classes và CSS variables — giữ nguyên
- Logic `withAuth`, `apiFetch` — giữ nguyên

---

## Tiêu chí hoàn thành

- [ ] `page.js` dưới 120 dòng
- [ ] Quick Entry bar hoạt động cho cả 3 loại giao dịch
- [ ] Tab Tổng quan hiển thị 4 số + cảnh báo quá hạn + danh sách cần thu tuần này
- [ ] Tab Công nợ có đủ 3 section (AR + nhà thầu + nhà CC)
- [ ] Tab Dòng tiền hiển thị số dư hiện tại
- [ ] Không có lỗi console sau refactor
