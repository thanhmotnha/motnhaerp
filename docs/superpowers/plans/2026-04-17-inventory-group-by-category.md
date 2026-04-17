# Inventory Group-by-Category Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang kho chỉ hiển thị sản phẩm còn tồn kho (stock > 0), nhóm theo danh mục với header row mỗi nhóm.

**Architecture:** Frontend-only change trong `app/inventory/page.js`. Sửa computed variable `stockFiltered` để filter `stock > 0`, thêm `stockByCategory` group-by transform, thay flat table render bằng grouped render.

**Tech Stack:** React 19, Next.js App Router, existing CSS classes (data-table, badge).

---

## File Map

| File | Thay đổi |
|------|---------|
| `app/inventory/page.js` | Sửa lines 293–295 (stockFiltered), thêm stockByCategory, thay render lines 385–435 |

---

## Task 1: Sửa data transform — filter + group by category

**Files:**
- Modify: `app/inventory/page.js:293-295`

- [ ] **Step 1: Sửa `stockFiltered` để filter stock > 0**

Tìm đoạn hiện tại (lines 293–295):
```javascript
const stockFiltered = stockData.products.filter(p =>
    !stockSearch || p.name.toLowerCase().includes(stockSearch.toLowerCase()) || p.code.toLowerCase().includes(stockSearch.toLowerCase())
);
```

Thay bằng:
```javascript
const stockFiltered = stockData.products.filter(p =>
    p.stock > 0 &&
    (!stockSearch || p.name.toLowerCase().includes(stockSearch.toLowerCase()) || p.code.toLowerCase().includes(stockSearch.toLowerCase()))
);
```

- [ ] **Step 2: Thêm `stockByCategory` sau `stockFiltered`**

Thêm ngay sau dòng `stockFiltered` (trước `const totalStockValue`):
```javascript
const stockByCategory = stockFiltered.reduce((acc, p) => {
    const cat = p.category || 'Khác';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
}, {});
```

- [ ] **Step 3: Verify không lỗi JS**

Chạy:
```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```
Expected: `✓ Compiled successfully`

---

## Task 2: Sửa render — grouped table thay flat table

**Files:**
- Modify: `app/inventory/page.js:385-435`

- [ ] **Step 1: Thay toàn bộ phần `<div className="table-container">` trong TAB stock**

Tìm đoạn (lines 385–436):
```javascript
<div className="table-container">
    <table className="data-table">
        <thead>
            <tr>
                <th>Mã</th><th>Tên sản phẩm</th><th>Danh mục</th>
                <th style={{ textAlign: 'right' }}>Tồn kho</th>
                <th style={{ textAlign: 'right' }}>Tồn tối thiểu</th>
                <th style={{ textAlign: 'right' }}>Đơn giá nhập</th>
                <th style={{ textAlign: 'right' }}>Giá trị tồn</th>
                <th>TT</th>
            </tr>
        </thead>
        <tbody>
            {stockFiltered.map(p => {
                const isLow = p.minStock > 0 && p.stock <= p.minStock;
                const isOut = p.stock <= 0;
                return (
                    <tr key={p.id} style={{ background: isOut ? 'rgba(239,68,68,0.04)' : isLow ? 'rgba(245,158,11,0.04)' : undefined }}>
                        <td className="accent">{p.code}</td>
                        <td className="primary">{p.name}</td>
                        <td><span className="badge badge-info" style={{ fontSize: 11 }}>{p.category}</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: isOut ? 'var(--status-danger)' : isLow ? 'var(--status-warning)' : undefined }}>
                            {p.stock} {p.unit}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 13 }}>
                            {p.minStock > 0 ? `${p.minStock} ${p.unit}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(p.importPrice)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt((p.stock || 0) * (p.importPrice || 0))}</td>
                        <td>
                            {isOut && <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--status-danger)', fontSize: 10 }}>Hết hàng</span>}
                            {isLow && !isOut && <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--status-warning)', fontSize: 10 }}>Sắp hết</span>}
                        </td>
                    </tr>
                );
            })}
        </tbody>
        {stockFiltered.length > 0 && (
            <tfoot>
                <tr>
                    <td colSpan={6} style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {stockFiltered.length} mã hàng
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, padding: '8px 16px' }}>
                        {fmt(stockFiltered.reduce((s, p) => s + (p.stock || 0) * (p.importPrice || 0), 0))}
                    </td>
                    <td />
                </tr>
            </tfoot>
        )}
    </table>
</div>
```

Thay bằng:
```javascript
{stockFiltered.length === 0 ? (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        {stockSearch ? 'Không tìm thấy sản phẩm phù hợp' : 'Không có sản phẩm nào còn tồn kho'}
    </div>
) : (
    <div className="table-container">
        <table className="data-table">
            <thead>
                <tr>
                    <th>Mã</th><th>Tên sản phẩm</th>
                    <th style={{ textAlign: 'right' }}>Tồn kho</th>
                    <th style={{ textAlign: 'right' }}>Tồn tối thiểu</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá nhập</th>
                    <th style={{ textAlign: 'right' }}>Giá trị tồn</th>
                    <th>TT</th>
                </tr>
            </thead>
            <tbody>
                {Object.entries(stockByCategory).map(([cat, items]) => {
                    const catValue = items.reduce((s, p) => s + (p.stock || 0) * (p.importPrice || 0), 0);
                    return (
                        <>
                            <tr key={`cat-${cat}`} style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border)' }}>
                                <td colSpan={7} style={{ padding: '8px 16px', fontWeight: 700, fontSize: 13 }}>
                                    🏷️ {cat}
                                    <span style={{ marginLeft: 12, fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>
                                        {items.length} mã hàng
                                    </span>
                                    <span style={{ marginLeft: 12, fontWeight: 600, color: 'var(--accent-primary)', fontSize: 12 }}>
                                        {fmt(catValue)}
                                    </span>
                                </td>
                            </tr>
                            {items.map(p => {
                                const isLow = p.minStock > 0 && p.stock <= p.minStock;
                                return (
                                    <tr key={p.id} style={{ background: isLow ? 'rgba(245,158,11,0.04)' : undefined }}>
                                        <td className="accent">{p.code}</td>
                                        <td className="primary">{p.name}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: isLow ? 'var(--status-warning)' : undefined }}>
                                            {p.stock} {p.unit}
                                        </td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 13 }}>
                                            {p.minStock > 0 ? `${p.minStock} ${p.unit}` : '—'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(p.importPrice)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt((p.stock || 0) * (p.importPrice || 0))}</td>
                                        <td>
                                            {isLow && <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--status-warning)', fontSize: 10 }}>Sắp hết</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </>
                    );
                })}
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan={5} style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {stockFiltered.length} mã hàng · {Object.keys(stockByCategory).length} danh mục
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, padding: '8px 16px' }}>
                        {fmt(stockFiltered.reduce((s, p) => s + (p.stock || 0) * (p.importPrice || 0), 0))}
                    </td>
                    <td />
                </tr>
            </tfoot>
        </table>
    </div>
)}
```

- [ ] **Step 2: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha && git add app/inventory/page.js && git commit -m "feat(kho): nhóm sản phẩm theo danh mục, ẩn hết hàng"
```
