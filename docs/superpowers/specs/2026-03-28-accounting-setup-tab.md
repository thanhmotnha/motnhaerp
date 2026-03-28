# Spec: Tab Cài đặt Kế toán trong Settings

**Ngày:** 2026-03-28
**Trạng thái:** Approved
**Phạm vi:** `app/admin/settings/page.js`, `components/settings/AccountingSetupTab.js`, `app/api/contracts/[id]/ar-opening/route.js`, `prisma/schema.prisma`

---

## Bối cảnh

Trang `/cong-no` (master-detail) hiển thị trống vì API lọc ra các NCC/thầu phụ chưa có `openingBalance > 0` hoặc `phatSinh > 0`. Kế toán cần một nơi để nhập số dư đầu kỳ cho toàn bộ NCC, thầu phụ và hợp đồng AR **trước khi** có giao dịch — đây là bước onboarding một lần khi bắt đầu dùng phần mềm.

---

## Cấu trúc

### Tab mới trong Settings

Thêm vào `MAIN_TABS` trong `app/admin/settings/page.js`:

```javascript
{ key: 'accounting', label: '📒 Kế toán' }
```

Chỉ hiển thị với role `giam_doc` và `ke_toan`. Tab render component `<AccountingSetupTab />`.

### 3 Sub-tab trong AccountingSetupTab

```
Kế toán
  ├── Nhà cung cấp    — openingBalance per Supplier
  ├── Nhà thầu phụ   — openingBalance per Contractor
  └── Hợp đồng AR    — arOpeningPaid per Contract
```

---

## Schema thay đổi

### `prisma/schema.prisma`

Thêm field vào model `Contract`:

```prisma
arOpeningPaid Float @default(0)
```

Đặt sau field `paidAmount` (dòng ~584).

Sau khi thêm: chạy `npx prisma db push` (không cần migration file — theo quy trình CI/CD của project).

---

## API mới

### `PATCH /api/contracts/[id]/ar-opening`

**File:** `app/api/contracts/[id]/ar-opening/route.js`

**Body:** `{ arOpeningPaid: number }`

**Logic:**
- Validate `arOpeningPaid >= 0`
- `prisma.contract.update({ where: { id }, data: { arOpeningPaid: Number(arOpeningPaid) } })`
- Return updated contract `{ id, code, arOpeningPaid }`
- Wrap với `withAuth`

**APIs đã có (không thay đổi):**
- `GET /api/suppliers?limit=500` → `{ data: [{ id, code, name, openingBalance }] }`
- `GET /api/contractors?limit=500` → `{ data: [{ id, code, name, openingBalance }] }`
- `GET /api/contracts?limit=500` → `{ data: [{ id, code, name, contractValue, customer: { name } }] }`
- `PATCH /api/debt/ncc` body `{ supplierId, openingBalance }` → update NCC opening balance
- `PATCH /api/debt/contractors` body `{ contractorId, openingBalance }` → update contractor opening balance

---

## Component: `AccountingSetupTab`

**File:** `components/settings/AccountingSetupTab.js`

### State

```javascript
const [activeTab, setActiveTab] = useState('ncc'); // 'ncc' | 'contractor' | 'ar'
const [suppliers, setSuppliers] = useState([]);
const [contractors, setContractors] = useState([]);
const [contracts, setContracts] = useState([]);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState({}); // { [entityId]: 'saving' | 'saved' | 'error' }
const [values, setValues] = useState({}); // { [entityId]: string } — local input values
```

### Data loading

Khi mount, fetch song song cả 3 nguồn:

```javascript
const [suppRes, contRes, conRes] = await Promise.all([
    apiFetch('/api/suppliers?limit=500'),
    apiFetch('/api/contractors?limit=500'),
    apiFetch('/api/contracts?limit=500'),
]);
```

Khởi tạo `values` từ `openingBalance` / `arOpeningPaid` của từng entity.

### Auto-save

Khi user thay đổi giá trị trong ô input:
1. Cập nhật `values[id]` ngay lập tức (controlled input)
2. Sau 600ms debounce (dùng `setTimeout` + `clearTimeout`), gọi PATCH
3. Trong lúc chờ: `saving[id] = 'saving'`
4. Thành công: `saving[id] = 'saved'`, sau 2s xóa trạng thái
5. Thất bại: `saving[id] = 'error'`

**Endpoints:**
- NCC: `PATCH /api/debt/ncc` body `{ supplierId: id, openingBalance: Number(value) }`
- Thầu phụ: `PATCH /api/debt/contractors` body `{ contractorId: id, openingBalance: Number(value) }`
- AR: `PATCH /api/contracts/${id}/ar-opening` body `{ arOpeningPaid: Number(value) }`

### UI — Sub-tab NCC và Thầu phụ

```
Tab bar: [Nhà cung cấp] [Nhà thầu phụ] [Hợp đồng AR]

Bảng:
| Mã       | Tên               | Số dư đầu kỳ (VNĐ)  |       |
|----------|-------------------|----------------------|-------|
| NCC-001  | VLXD Minh Khánh   | [    45,000,000    ] |  ✓   |
| NCC-002  | Thép Việt         | [           0      ] |       |
```

- Ô input: `type="number"`, `min="0"`, width ~160px, align right
- Indicator cạnh ô: spinner khi `saving`, ✓ xanh khi `saved`, ✗ đỏ khi `error`
- Hiện **tất cả** supplier/contractor (không lọc theo activity)

### UI — Sub-tab Hợp đồng AR

```
| Mã HĐ  | Khách hàng     | Giá trị HĐ      | Đã thu trước kỳ (VNĐ) |       |
|--------|----------------|-----------------|------------------------|-------|
| HD-001 | Nguyễn Văn A   | 500,000,000     | [    200,000,000     ] |  ✓   |
| HD-002 | Trần Thị B     | 300,000,000     | [              0     ] |       |
```

- Giá trị HĐ (`contractValue`) hiển thị read-only, dùng `fmtVND`
- Ô input cho `arOpeningPaid`: type number, min 0
- Hiện tất cả hợp đồng không bị xóa

---

## Không thay đổi

- Logic tính toán trong `/api/debt/ncc`, `/api/debt/contractors`, `/api/debt/report` — giữ nguyên
- Các tab khác trong Settings — giữ nguyên
- `app/cong-no/page.js` — giữ nguyên (sau khi nhập openingBalance, danh sách tự hiện)

---

## Tiêu chí hoàn thành

- [ ] Tab "📒 Kế toán" hiện trong Settings, chỉ với role `giam_doc` / `ke_toan`
- [ ] Sub-tab NCC: bảng tất cả suppliers, ô số dư đầu kỳ auto-save khi blur
- [ ] Sub-tab Thầu phụ: bảng tất cả contractors, ô số dư đầu kỳ auto-save
- [ ] Sub-tab Hợp đồng AR: bảng tất cả contracts, ô "Đã thu trước kỳ" auto-save
- [ ] `Contract.arOpeningPaid` tồn tại trong DB sau `prisma db push`
- [ ] Indicator ✓/✗ hiện đúng sau mỗi save
- [ ] Không lỗi console
