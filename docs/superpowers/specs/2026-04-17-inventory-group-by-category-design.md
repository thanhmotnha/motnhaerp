# Design: Inventory Display — Group by Category, Hide Zero Stock

**Date:** 2026-04-17  
**Status:** Approved

## Problem

Trang kho (`app/inventory/page.js`) hiện là flat list hiển thị tất cả sản phẩm kể cả hết hàng, gây rối mắt và khó tìm. User muốn chỉ thấy sản phẩm còn tồn, nhóm theo danh mục.

## Requirements

1. **Ẩn sản phẩm hết hàng** — chỉ hiển thị `stock > 0`
2. **Nhóm theo danh mục** — mỗi nhóm có header row (tên danh mục + số mã + tổng giá trị)
3. **Ẩn danh mục trống** — categories không có sản phẩm nào còn hàng không hiện
4. **Bỏ cột "Danh mục"** trong table vì đã có header group

## Approach

Frontend-only change. API `/api/inventory/stock` đã trả về đủ dữ liệu (`stock`, `category`, `importPrice`). Không cần sửa backend.

## Design

### Data Transform (line 293–295 hiện tại)

**Thay `stockFiltered`:**
```javascript
const stockFiltered = stockData.products.filter(p =>
    p.stock > 0 &&
    (!stockSearch || p.name.toLowerCase().includes(stockSearch.toLowerCase()) || p.code.toLowerCase().includes(stockSearch.toLowerCase()))
);
```

**Thêm `stockByCategory`:**
```javascript
const stockByCategory = stockFiltered.reduce((acc, p) => {
    const cat = p.category || 'Khác';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
}, {});
```

### Render (thay phần table trong TAB stock)

Columns: Mã | Tên sản phẩm | Tồn kho | Tồn tối thiểu | Đơn giá nhập | Giá trị tồn | TT  
(bỏ cột "Danh mục")

Mỗi danh mục render:
1. **Header row** — full-width, bg phân biệt, hiện: `🏷️ {tên danh mục}` + `{n} mã hàng` + tổng giá trị tồn của nhóm
2. **Product rows** — các sản phẩm trong nhóm đó (giữ màu warning cho sắp hết)

**Footer** — tổng giá trị toàn bộ, số mã đang hiện.

### Empty state

Nếu không có sản phẩm nào còn hàng (hoặc search không có kết quả): hiện "Không có sản phẩm nào còn tồn kho".

## Files to Change

| File | Thay đổi |
|------|---------|
| `app/inventory/page.js` | Sửa `stockFiltered`, thêm `stockByCategory`, sửa render table (lines 293–437) |

## Out of Scope

- Không sửa tab Lịch sử, GRN, Xuất kho
- Không thêm collapsible categories
- Không sửa backend/API
