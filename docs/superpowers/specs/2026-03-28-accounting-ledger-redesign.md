# Spec: Redesign Module Kế toán → Sổ cái tổng hợp

**Ngày:** 2026-03-28
**Trạng thái:** Approved
**Phạm vi:** `components/Sidebar.js`, `app/accounting/page.js`, `app/api/accounting/ledger/route.js`

---

## Bối cảnh

Công ty nội thất & xây dựng 6 người. Hiện tại có 2 vấn đề:

1. **Sidebar Tài chính quá nhiều mục (6 mục):** Lịch Thu Chi và Chi phí DA trùng với Tab Thu tiền / Chi phí trong `/finance`. Kế toán bị confuse không biết nhập ở đâu.

2. **Module Kế toán (`AccountEntry`) trùng với `Transaction`:** Cùng mục đích lưu thu/chi thủ công nhưng 2 bảng riêng. Kế toán phải nhập 2 lần.

**Giải pháp:** Biến module Kế toán thành Sổ cái tổng hợp read-only — tổng hợp từ 3 nguồn dữ liệu đã có. Không nhập mới ở đây.

---

## Thay đổi

### 1. Sidebar — Thu gọn Tài chính từ 6 xuống 4 mục

**Trước:**
```
Tài chính
  ├── Tổng quan           /finance
  ├── Lịch Thu Chi        /payment-schedule      ← XÓA khỏi sidebar
  ├── Dự báo dòng tiền    /cashflow-forecast
  ├── Chi phí DA          /expenses              ← XÓA khỏi sidebar
  ├── Ngân sách           /budget
  └── Kế toán             /accounting
```

**Sau:**
```
Tài chính
  ├── Tổng quan           /finance
  ├── Sổ cái              /accounting            ← đổi label
  ├── Dự báo dòng tiền    /cashflow-forecast
  └── Ngân sách           /budget
```

Lịch Thu Chi và Chi phí DA **vẫn tồn tại** dưới dạng trang riêng — chỉ xóa khỏi sidebar Tài chính. Truy cập qua module Hợp đồng / Dự án.

Icon Kế toán: đổi từ `Calculator` → `BookOpen`.

---

### 2. API mới: `GET /api/accounting/ledger`

Query song song 3 nguồn, merge, sort theo ngày desc.

**Nguồn dữ liệu:**

| Nguồn | Model | Loại | Điều kiện |
|---|---|---|---|
| Thu HĐ | `ContractPayment` | Thu | `status = 'Đã thu'`, include `contract.project.name` + `contract.code` |
| Chi DA | `ProjectExpense` | Chi | `status IN ['Đã chi', 'Hoàn thành']`, include `project.name` |
| Thủ công | `Transaction` | Thu/Chi | Tất cả |

**Query params:** `?month=2026-03&type=Thu|Chi&projectId=xxx`

**Response:**
```json
{
  "entries": [
    {
      "id": "...",
      "date": "2026-03-15T00:00:00Z",
      "type": "Thu",
      "source": "contract",        // "contract" | "expense" | "manual"
      "description": "Thu đợt 2 — HĐ ABC",
      "projectName": "Nhà anh Minh",
      "amount": 50000000
    }
  ],
  "summary": {
    "totalThu": 361647000,
    "totalChi": 0,
    "net": 361647000
  },
  "months": [
    { "key": "2026-03", "label": "Tháng 3/2026", "totalThu": 50000000, "totalChi": 20000000, "net": 30000000, "runningBalance": 361647000 }
  ]
}
```

**File:** `app/api/accounting/ledger/route.js` — tạo mới, dùng `withAuth`.

---

### 3. Rewrite `app/accounting/page.js` — Sổ cái

**Xóa hoàn toàn:** Form nhập mới, các state liên quan đến `AccountEntry`, raw `fetch` calls.

**Giao diện mới (3 phần):**

#### ① 3 stat cards
- Tổng thu = sum ContractPayment đã thu + Transaction Thu
- Tổng chi = sum ProjectExpense đã chi + Transaction Chi
- Số dư ròng = Tổng thu - Tổng chi (xanh nếu dương, đỏ nếu âm)

#### ② Bộ lọc + Bảng giao dịch
- Lọc: Tháng (select), Loại (Thu/Chi/Tất cả), Dự án (select)
- Bảng: Ngày | Nguồn (badge: HĐ / Chi DA / Thủ công) | Mô tả | Dự án | Số tiền (+/- màu)
- Empty state: "Chưa có giao dịch trong kỳ này"

#### ③ Bảng tổng hợp tháng
- Cột: Tháng / Tổng thu / Tổng chi / Ròng / Luỹ kế
- Tính từ `months[]` trả về từ API

**Dùng `apiFetch` từ `@/lib/fetchClient` — không dùng raw `fetch`.**
**Dùng `fmtVND`, `fmtDate` từ `@/lib/financeUtils`.**

---

## Không thay đổi

- `AccountEntry` model — giữ nguyên schema (không migrate, không xóa data cũ)
- `/api/accounting/route.js` — giữ nguyên (backward compat)
- `/payment-schedule`, `/expenses` — trang vẫn hoạt động, chỉ xóa khỏi sidebar
- CSS variables, `withAuth`, `apiFetch` — giữ nguyên

---

## Tiêu chí hoàn thành

- [ ] Sidebar Tài chính còn 4 mục, label "Kế toán" → "Sổ cái"
- [ ] `/api/accounting/ledger` trả đúng 3 nguồn, lọc được theo tháng/type/projectId
- [ ] `app/accounting/page.js` không còn form nhập mới, không raw `fetch`
- [ ] 3 stat cards hiển thị đúng tổng thu/chi/ròng
- [ ] Bảng giao dịch merge đủ 3 nguồn, lọc được
- [ ] Bảng tháng có luỹ kế
- [ ] Không lỗi console
