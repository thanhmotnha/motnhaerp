# Chi phí chung — Bảng tổng hợp phân bổ

**Date:** 2026-04-08  
**Status:** Approved

---

## Mục tiêu

Thêm bảng tổng hợp phân bổ chi phí chung (OverheadAllocation) vào 2 nơi:

1. **Tab "Tổng hợp"** trong `/overhead` — xem toàn cục, 2 view: theo dự án / theo đợt
2. **Section cuối tab Chi phí** trong `/projects/[id]/tabs/OverviewTab.js` — xem chi phí chung được phân bổ cho dự án đó

---

## Phạm vi

- **Không thay đổi** luồng tạo/duyệt/phân bổ chi phí hiện tại
- **Không thêm** tính năng sửa trực tiếp từ bảng tổng hợp — vẫn sửa qua Tab Đợt phân bổ
- **Chỉ thêm** 1 API mới + 1 tab mới + 1 section mới

---

## 1. API — `GET /api/overhead/summary`

**File:** `app/api/overhead/summary/route.js` (mới)

### Query params

| Param | Type | Mô tả |
|-------|------|-------|
| `year` | number | Năm lọc (default: năm hiện tại) |
| `projectId` | string? | Nếu có → chỉ trả allocations của project đó |

### Response khi không có `projectId` (dùng cho tab Tổng hợp)

```json
{
  "year": 2026,
  "batches": [
    {
      "id": "...",
      "code": "CPGB-2026-01",
      "name": "Chi phí T1/2026",
      "period": "2026-01",
      "totalAmount": 10000000,
      "confirmedAt": "2026-01-31T...",
      "allocations": [
        {
          "projectId": "...",
          "projectCode": "DA-001",
          "projectName": "Nhà phố Quận 2",
          "amount": 4200000,
          "ratio": 42.0
        }
      ]
    }
  ],
  "projects": [
    {
      "id": "...",
      "code": "DA-001",
      "name": "Nhà phố Quận 2",
      "totalAllocated": 13100000
    }
  ]
}
```

### Response khi có `projectId` (dùng cho project detail)

```json
{
  "year": 2026,
  "allocations": [
    {
      "batchId": "...",
      "batchCode": "CPGB-2026-01",
      "batchName": "Chi phí T1/2026",
      "period": "2026-01",
      "amount": 4200000,
      "ratio": 42.0,
      "confirmedAt": "2026-01-31T..."
    }
  ],
  "total": 13100000
}
```

### Implementation

```javascript
// Khi không có projectId:
const batches = await prisma.overheadBatch.findMany({
    where: {
        status: 'confirmed',
        confirmedAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
        deletedAt: null,
    },
    include: {
        allocations: {
            include: { project: { select: { id: true, code: true, name: true } } },
        },
    },
    orderBy: { period: 'asc' },
});

// Khi có projectId:
const allocations = await prisma.overheadAllocation.findMany({
    where: {
        projectId,
        batch: {
            status: 'confirmed',
            confirmedAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
        },
    },
    include: { batch: { select: { id: true, code: true, name: true, period: true, confirmedAt: true } } },
    orderBy: { batch: { period: 'asc' } },
});
```

---

## 2. Tab "Tổng hợp" trong `/overhead`

**File:** `app/overhead/page.js`

### Thay đổi

- Thêm tab thứ 3: `['summary', '📈 Tổng hợp']`
- Thêm state: `summaryData`, `summaryLoading`, `summaryYear`, `summaryView` (`'by-project'` | `'by-batch'`)
- Fetch khi `activeTab === 'summary'`: `GET /api/overhead/summary?year=${summaryYear}`

### UI — View "Theo dự án"

```
Filter: [Năm: 2026 ▼]   [Theo dự án ✓] [Theo đợt]

Table:
Dự án | CPGB-2026-01 (T1) | CPGB-2026-02 (T2) | ... | Tổng
DA-001 Nhà phố Q2 | 4.200.000đ (42%) | 3.800.000đ (38%) | ... | 13.100.000đ
DA-002 Biệt thự BD | 3.500.000đ (35%) | 4.200.000đ (42%) | ... | 7.700.000đ
─────
Tổng đợt | 10.000.000đ | 10.000.000đ | ... | 28.300.000đ
```

- Dự án không có allocation trong đợt → hiển thị "—"
- Cột Tổng cộng cố định bên phải, màu primary
- Hàng cuối "Tổng đợt" nền xám nhạt

### UI — View "Theo đợt"

```
Filter: [Năm: 2026 ▼]   [Theo dự án] [Theo đợt ✓]

Table:
Đợt | Kỳ | DA-001 | DA-002 | DA-003 | ... | Tổng đợt
CPGB-2026-01 | T1/2026 | 4.200.000đ | 3.500.000đ | 2.300.000đ | ... | 10.000.000đ
─────
Tổng theo DA | | 13.100.000đ | 7.700.000đ | 7.500.000đ | ... | 28.300.000đ
```

---

## 3. Section trong `/projects/[id]`

**File:** `app/projects/[id]/tabs/OverviewTab.js`

Tab Chi phí hiện tại (OverviewTab) hiển thị chi phí trực tiếp của dự án. Thêm section "Chi phí chung được phân bổ" vào cuối tab này.

### Fetch

Khi OverviewTab mount, gọi thêm:
```javascript
apiFetch(`/api/overhead/summary?projectId=${projectId}&year=${currentYear}`)
```

### UI

```
── Chi phí chung được phân bổ ────────────────────────
Đợt          | Kỳ        | Số tiền      | Tỷ lệ
CPGB-2026-01 | T1/2026   | 4.200.000đ   | 42%
CPGB-2026-02 | T2/2026   | 3.800.000đ   | 38%
CPGB-2026-03 | T3/2026   | 5.100.000đ   | 45%
─────────────────────────────────────────────────
Tổng                       13.100.000đ

Filter năm: [2026 ▼]
```

- Nếu chưa có allocation → hiển thị "Chưa có phân bổ chi phí chung nào"
- Mã đợt là link → navigate đến `/overhead` tab Đợt phân bổ

---

## Data model hiện có (không thay đổi)

```
OverheadBatch { id, code, name, period, totalAmount, status, confirmedAt }
  └─ OverheadBatchItem { expenseId, amount }
  └─ OverheadAllocation { projectId, ratio, amount, isOverride, notes }
       └─ Project { id, code, name }
```

Tất cả data cần đã có trong DB. Chỉ cần API query + UI hiển thị.

---

## Files thay đổi

| File | Loại | Mô tả |
|------|------|-------|
| `app/api/overhead/summary/route.js` | Tạo mới | GET endpoint trả summary data |
| `app/overhead/page.js` | Sửa | Thêm tab Tổng hợp + state + render |
| `app/projects/[id]/tabs/OverviewTab.js` | Sửa | Thêm section chi phí chung cuối tab |
