# Nội Thất Redesign — Implementation Spec

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this spec.

**Goal:** Redesign module nội thất để trực quan hơn — người dùng biết ngay đang ở bước nào và cần làm gì tiếp theo.

**Architecture:** Layout "Action-First" với step bar 6 bước, action banner, và tab bar tự động focus vào bước hiện tại. Tab Vật liệu và Tab Đặt hàng tách biệt để kỹ thuật và kho làm độc lập.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6, PostgreSQL, CSS variables (globals.css)

---

## Scope

Chỉ thay đổi:
1. Enum `FurnitureOrder.status` — rút từ 9 xuống 6 giá trị
2. `MaterialSelection` — thêm `confirmationToken` để KH xác nhận online
3. Trang chi tiết `app/noi-that/[id]/page.js` — layout mới
4. Tab Vật liệu `MaterialSelectionTab.js` — vòng chốt + gửi link xác nhận
5. Tab Đặt hàng `MaterialOrdersTab.js` — pull từ vòng VL, 3 card PO
6. API `PUT /api/furniture-orders/[id]` — chấp nhận status mới
7. API `POST /api/furniture-orders/[id]/material-selections/[selId]/send-confirmation` — tạo token + gửi link

Không thay đổi: HồSơTab, CncFilesTab, IssuesTab, AcceptanceTab, list page, schema PO.

---

## Thay đổi Data Model

### 1. `FurnitureOrder.status` enum — 6 giá trị

**Cũ (9 giá trị):**
```
Nháp | Xác nhận | Chốt VL | Đặt VL | Có CNC | Đang sản xuất | Lắp đặt | Bảo hành | Hoàn thành
```

**Mới (6 giá trị):**
```
Xác nhận | Chốt & Đặt VL | CNC | Sản xuất | Lắp đặt | Bảo hành
```

Migration: update tất cả record hiện tại theo bảng:
| Cũ | Mới |
|----|-----|
| Nháp | Xác nhận |
| Xác nhận | Xác nhận |
| Chốt VL | Chốt & Đặt VL |
| Đặt VL | Chốt & Đặt VL |
| Có CNC | CNC |
| Đang sản xuất | Sản xuất |
| Lắp đặt | Lắp đặt |
| Bảo hành | Bảo hành |
| Hoàn thành | Bảo hành |

### 2. `MaterialSelection` — thêm field

```prisma
confirmationToken  String?   @unique
tokenExpiresAt     DateTime?
confirmedAt        DateTime?
confirmedByName    String    @default("")
confirmedIp        String    @default("")
```

Lưu ý: `FurnitureOrder` đã có `publicToken` — dùng pattern tương tự cho MaterialSelection.

---

## File Structure

| File | Thay đổi |
|------|----------|
| `prisma/schema.prisma` | Thêm 4 field vào `MaterialSelection` |
| `app/noi-that/[id]/page.js` | Rewrite: step bar 6 bước + action banner + tab bar mới |
| `app/noi-that/[id]/tabs/MaterialSelectionTab.js` | Rewrite: vòng chốt + nút Xuất PDF + Gửi link xác nhận |
| `app/noi-that/[id]/tabs/MaterialOrdersTab.js` | Rewrite: banner pull từ VL + 3 card VÁN/ACRYLIC/NẸP |
| `app/api/furniture-orders/[id]/route.js` | Chấp nhận status 6 giá trị mới |
| `app/api/furniture-orders/[id]/material-selections/[selId]/send-confirmation/route.js` | POST mới: tạo token, trả về link |
| `app/public/material-confirmation/[token]/page.js` | Public page: KH xem VL + click xác nhận |
| `app/api/public/material-confirmation/[token]/route.js` | GET (lấy thông tin) + POST (KH xác nhận) |

---

## Chi Tiết Thiết Kế

### Step Bar

```
STEPS = [
  { key: 'Xác nhận',      label: 'Xác nhận',    icon: '✓' },
  { key: 'Chốt & Đặt VL', label: 'Chốt & Đặt VL', icon: '🧱' },
  { key: 'CNC',           label: 'CNC',          icon: '✂️' },
  { key: 'Sản xuất',      label: 'Sản xuất',     icon: '🔨' },
  { key: 'Lắp đặt',       label: 'Lắp đặt',      icon: '🔧' },
  { key: 'Bảo hành',      label: 'Bảo hành',     icon: '🛡️' },
]
```

Logic màu:
- Bước đã qua: nền xanh lá `#16a34a`, text `✓`
- Bước hiện tại: nền xanh dương `#1d4ed8`, text số thứ tự
- Bước chưa tới: nền xám `#e5e7eb`, text số

### Action Banner

Map từ `status` sang message + action:

| Status | Message | Button |
|--------|---------|--------|
| Xác nhận | Chốt vật liệu với khách hàng | → Thêm vòng chốt |
| Chốt & Đặt VL | Vật liệu đã chốt — Chưa có PO đặt hàng | → Tạo PO đặt hàng |
| Chốt & Đặt VL (có PO) | PO đã tạo — Chờ nhận hàng để chuyển CNC | → Xem PO |
| CNC | Upload file CNC và xác nhận số tấm | → Upload CNC |
| Sản xuất | Đang sản xuất — Cập nhật tiến độ | → Cập nhật |
| Lắp đặt | Lắp đặt xong → Tạo biên bản nghiệm thu | → Tạo nghiệm thu |
| Bảo hành | Theo dõi bảo hành | — |

### Tab Bar

```javascript
TABS = [
  { key: 'materials',    label: 'Vật liệu',   icon: '🧱' },
  { key: 'orders',       label: 'Đặt hàng',   icon: '🛒', badgeFn: hasPendingPO },
  { key: 'files',        label: 'Hồ sơ',      icon: '📁' },
  { key: 'cnc',          label: 'CNC',         icon: '✂️' },
  { key: 'issues',       label: 'Phát sinh',  icon: '⚠️', badgeFn: openIssueCount },
  { key: 'acceptance',   label: 'Nghiệm thu', icon: '📋' },
]
```

`defaultTab`: tự động chọn theo status:
- `Xác nhận` → `materials`
- `Chốt & Đặt VL` → `orders` nếu chưa có PO, else `materials`
- `CNC` → `cnc`
- `Sản xuất` → `materials`
- `Lắp đặt` → `acceptance`
- `Bảo hành` → `acceptance`

### Tab Vật liệu (MaterialSelectionTab)

**Layout mỗi vòng chốt:**
```
┌─────────────────────────────────────────────┐
│ Vòng N — [title]    [badge status]  [ngày]  │
│                     [Xuất PDF] [Gửi KH]     │
├─────────────────────────────────────────────┤
│ Bảng: Loại | Sản phẩm | Màu | SL           │
│ [+ Thêm VL]                                 │
└─────────────────────────────────────────────┘
```

Badge status:
- `pending` → "Chờ xác nhận" (vàng)
- `confirmed` → "✓ Đã xác nhận" (xanh lá)
- `changed` → "Đã thay đổi" (xám)

Nút **Gửi KH xác nhận**:
- Gọi `POST /api/furniture-orders/[id]/material-selections/[selId]/send-confirmation`
- Nhận về `{ token, url }` — copy URL hoặc mở QR modal
- Khi KH click link → trang public `/public/material-confirmation/[token]`
- KH xem danh sách VL → click "Tôi đồng ý" → status = `confirmed`, lưu `confirmedAt`, `confirmedByName`, `confirmedIp`

Nút **Xuất PDF**: render HTML danh sách VL vào iframe, gọi `window.print()`

**Thêm vòng chốt mới:**
- Nút "Thêm vòng chốt mới" ở cuối
- Gọi `POST /api/furniture-orders/[id]/material-selections` với `{ selectionRound: n+1, title: 'Vật liệu vòng n+1' }`
- Picker VL giữ nguyên logic hiện tại (không thay đổi)

### Tab Đặt hàng (MaterialOrdersTab)

**Banner pull tự động:**
```
⚡ Pull từ Vòng [N] — [tóm tắt VL]. Chọn supplier và tạo PO.
```
Nếu chưa có vòng confirmed: banner đỏ "Chưa có vật liệu nào được xác nhận — Vào tab Vật liệu trước"

**3 card:**
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ 🪵 VÁN MDF  │  │ ✨ ACRYLIC  │  │ 📏 NẸP      │
│ [danh sách] │  │ [danh sách] │  │ [danh sách] │
│ Supplier ▼  │  │ Supplier ▼  │  │ Supplier ▼  │
│ [Tạo PO]   │  │ [Tạo PO]   │  │ [Tạo PO]   │
└─────────────┘  └─────────────┘  └─────────────┘
```

Nếu PO đã tạo: thay nút "Tạo PO" bằng badge `PO-001 ✓` + link sang trang PO.

---

## API Mới

### `POST /api/furniture-orders/[id]/material-selections/[selId]/send-confirmation`

Request: `{}` (không cần body)

Response:
```json
{
  "token": "abc123",
  "url": "/public/material-confirmation/abc123",
  "expiresAt": "2026-05-11T..."
}
```

Logic:
- Tạo `confirmationToken = crypto.randomUUID()`
- `tokenExpiresAt = now + 30 ngày`
- Update `MaterialSelection` record
- Trả về token + URL

### `GET /api/public/material-confirmation/[token]`

Public route (no auth). Trả về:
```json
{
  "selectionRound": 1,
  "title": "Vật liệu vòng 1",
  "status": "pending",
  "orderName": "Phòng ngủ Master",
  "customerName": "Nguyễn Văn A",
  "items": [...]
}
```

### `POST /api/public/material-confirmation/[token]`

Public route. Body: `{ "name": "Nguyễn Văn A" }`

Logic:
- Tìm MaterialSelection theo token, check tokenExpiresAt chưa hết hạn
- Set `status = 'confirmed'`, `confirmedAt = now`, `confirmedByName = name`, `confirmedIp = request IP`
- Set `confirmationToken = null` (invalidate token sau khi dùng)

---

## Không Thay Đổi

- `HoSoTab.js` — giữ nguyên
- `CncFilesTab.js` — giữ nguyên  
- `IssuesTab.js` — giữ nguyên
- `AcceptanceTab.js` — giữ nguyên
- `app/noi-that/page.js` (list page) — giữ nguyên
- `FurnitureTab.js` trong project — giữ nguyên
- Schema PO, CNC, Issue, Acceptance — giữ nguyên
