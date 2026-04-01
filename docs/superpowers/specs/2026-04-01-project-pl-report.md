# Project P&L Report — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Goal:** Nâng cấp trang báo cáo P&L dự án hiện có — thêm cột "Còn phải thu", phân nhóm dự án theo loại HĐ chính (Thiết kế / Nội thất / Thi công), hiển thị 3 section cuộn với subtotal riêng.

---

## Background

Trang `/reports/pl-by-project` hiện có 1 bảng phẳng, không phân loại, không có cột "còn phải thu". Giám đốc cần nhìn thấy:
1. Từng nhóm loại công việc (Thiết kế / Nội thất / Thi công) riêng biệt
2. Số tiền còn phải thu của từng dự án
3. So sánh margin giữa các nhóm

---

## Grouping Logic

Mỗi dự án xếp vào **1 nhóm duy nhất** — nhóm của hợp đồng có `contractValue` lớn nhất trong dự án đó.

| Contract.type | Nhóm |
|---|---|
| "Thiết kế kiến trúc" | Thiết kế |
| "Thiết kế nội thất" | Thiết kế |
| "Thi công nội thất" | Nội thất |
| "Thi công thô" | Thi công |
| "Thi công hoàn thiện" | Thi công |
| Không có HĐ hoặc type khác | Thi công (fallback) |

Nếu dự án có nhiều HĐ thuộc nhiều nhóm khác nhau → nhóm theo HĐ có `contractValue` cao nhất.

---

## Revenue & Cost Calculation

Tất cả tính trên toàn dự án (không tách theo từng HĐ):

- **Giá trị HĐ** = sum(`Contract.contractValue`) — chỉ HĐ status ≠ "Nháp", deletedAt IS NULL
- **Đã thu** = sum(`Contract.paidAmount`)
- **Còn phải thu** = Giá trị HĐ − Đã thu (min 0)
- **Tổng chi** = `contractorCost` + `poCost` + `expenseCost`
  - `contractorCost` = sum(`ContractorPayment.paidAmount`)
  - `poCost` = sum(`PurchaseOrder.paidAmount`)
  - `expenseCost` = sum(`ProjectExpense.amount`) where status ≠ "Từ chối", deletedAt IS NULL
- **Lợi nhuận** = Đã thu − Tổng chi
- **Margin %** = round(Lợi nhuận / Giá trị HĐ × 100) nếu Giá trị HĐ > 0, else 0

---

## API Changes — `app/api/reports/project-pnl/route.js`

Nâng cấp tại chỗ, thêm vào select:
```javascript
contracts: {
    where: { deletedAt: null, status: { not: 'Nháp' } },
    select: {
        type: true,        // thêm field này
        contractValue: true,
        paidAmount: true,
        payments: { select: { amount: true, paidAmount: true, status: true } },
    },
},
```

Thêm grouping logic trong `projects.map()`:
```javascript
const GROUP_MAP = {
    'Thiết kế kiến trúc': 'Thiết kế',
    'Thiết kế nội thất': 'Thiết kế',
    'Thi công nội thất': 'Nội thất',
    'Thi công thô': 'Thi công',
    'Thi công hoàn thiện': 'Thi công',
};

// Tìm HĐ có contractValue lớn nhất
const dominantContract = p.contracts.reduce((max, c) => 
    (c.contractValue || 0) > (max?.contractValue || 0) ? c : max, null);
const groupType = GROUP_MAP[dominantContract?.type] || 'Thi công';
```

Thêm `groupType` và `remainReceivable` vào mỗi row trả về. `remainReceivable` đã tính sẵn trong code hiện tại, chỉ cần đảm bảo expose ra JSON.

Response shape (thêm `groupType`):
```javascript
{
    rows: [{ ...existing fields, groupType: 'Thiết kế' | 'Nội thất' | 'Thi công', remainReceivable: number }],
    summary: { ...existing fields }
}
```

---

## Frontend Changes — `app/reports/pl-by-project/page.js`

### Columns (thay thế bảng hiện tại)

| # | Column | Notes |
|---|---|---|
| 1 | Mã / Tên DA | code + name, 2 dòng |
| 2 | Khách hàng | customerName |
| 3 | Trạng thái | badge màu |
| 4 | Giá trị HĐ | right-align |
| 5 | Đã thu | right-align, xanh lá |
| 6 | **Còn phải thu** | right-align, đỏ nếu > 0 |
| 7 | Tổng chi | right-align, đỏ |
| 8 | Lợi nhuận | right-align, xanh/đỏ theo giá trị |
| 9 | Margin % | badge: đỏ <0, vàng 0–10, xanh dương 10–20, xanh lá >20 |
| 10 | Link | icon ExternalLink → /projects/{code} |

### Layout

```
[KPI Cards — tổng toàn bộ: Giá trị HĐ | Đã thu | Còn phải thu | Tổng chi | LN | Margin%]

[Search input]  [Filter: Tất cả trạng thái ▼]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 Thiết kế  (N dự án)
[bảng rows nhóm Thiết kế]
[dòng subtotal: Tổng N DA | — | — | sum | sum | sum | sum | avg margin]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛋️ Nội thất  (N dự án)
[bảng rows nhóm Nội thất]
[dòng subtotal]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ Thi công  (N dự án)
[bảng rows nhóm Thi công]
[dòng subtotal]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Grand Total  (tổng N dự án)
```

### Section header

Mỗi section có header dạng:
```jsx
<div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 0 8px' }}>
    <span style={{ fontSize:16, fontWeight:700 }}>{icon} {label}</span>
    <span style={{ fontSize:12, color:'var(--text-muted)' }}>({count} dự án)</span>
    <span style={{ marginLeft:'auto', fontSize:12 }}>Margin TB: <strong>{avgMargin}%</strong></span>
</div>
```

### KPI Cards (thay thế cards hiện tại)

6 cards:
1. Tổng giá trị HĐ
2. Đã thu (xanh)
3. Còn phải thu (cam/đỏ)
4. Tổng chi (vàng)
5. Lợi nhuận (xanh/đỏ theo giá trị)
6. Cảnh báo margin thấp (số DA có margin < 10%)

### Sorting

Mỗi section có thể sort độc lập bằng click column header — giữ `sortField` + `sortDir` chung cho cả trang (sort áp dụng đồng thời 3 section).

### Highlight rules

- Row có `remainReceivable > 0` và `status === 'Hoàn thành'` → background `#fff7ed` (cam nhạt) + icon ⚠️ nhỏ cạnh "Còn phải thu"
- Row có `margin < 0` → background `#fef2f2`
- Row có `margin < 10 && margin >= 0` → background `#fffbeb`

### Filter behavior

Search và filter trạng thái áp dụng cho cả 3 section. Nếu 1 section sau khi filter không còn row nào → ẩn section đó hoàn toàn (không hiện bảng trống).

---

## Files Changed

| File | Action |
|---|---|
| `app/api/reports/project-pnl/route.js` | Sửa — thêm `contract.type` vào select, tính `groupType`, expose `remainReceivable` |
| `app/reports/pl-by-project/page.js` | Sửa — thêm cột còn phải thu, đổi layout sang 3 section, thêm KPI card mới |
