# Contract Variation (Phát Sinh) Design

## Goal

Fix 3 linked problems on the contract detail page (`/contracts/[id]`):
1. Finance sidebar shows `variationAmount` only in edit mode — should always be visible
2. Payment schedule rejects adding variation phases because total already = 100%
3. No UI to upload proof-of-payment per phase (field exists in DB, no UI)

---

## Architecture

### Data model change

Add `isVariation Boolean @default(false)` to `ContractPayment`. This is the only schema change. No new tables.

- `isVariation = false` → original contract phase (% based)
- `isVariation = true` → variation phase (amount based, % column shows "—")

### Validation logic change

Current: one rule — sum of all phases % must equal 100.

New: two independent rules:
- Original phases: sum of % ≤ 100% (warn if < 100, not a hard block)
- Variation phases: sum of amounts ≤ `variationAmount` (warn if exceeded)

Rationale: strict 100% blocks adding variation phases and is inflexible in practice.

---

## Components

### 1. Finance sidebar (view-only always)

`app/contracts/[id]/page.js` — sidebar finance block currently reads from `form.variationAmount` which is only populated in edit mode.

Fix: read from `data.variationAmount` (loaded on page load) with fallback to `form.variationAmount`. Display the Phát sinh row regardless of edit mode, hide it only when `variationAmount === 0`.

### 2. Payment schedule — edit mode

`paymentPhases` state split into two arrays: `basePhases` and `variationPhases`. Internally they stay separate but are sent to the API as a flat array with `isVariation` flag.

Edit table layout — one card, two sections separated by a divider row:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  HỢP ĐỒNG GỐC   [tổng %] / [contractValue]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  row: Đợt 1  30%  150tr  [giảm trừ]  [xóa]
  row: Đợt 2  40%  200tr  ...
  [+ Thêm đợt gốc]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PHÁT SINH   [tổng amount] / [variationAmount]
  (only shown when variationAmount > 0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  row: PS 1   —   50tr   [giảm trừ]  [xóa]
  [+ Thêm đợt phát sinh]
```

Variation rows: no % column input, amount input only.

`updatePhase` keeps existing logic for base phases. Variation phases skip % recalc.

### 3. Payment schedule — view mode

Same 1-table layout, two header rows separating sections. Variation section hidden when no variation phases exist.

Columns unchanged: Đợt | % | Giá trị | Giảm trừ | Thực nhận | Đã thu | Còn lại | Tiến độ | Ngày thu | Trạng thái

Variation rows: % column shows "—".

### 4. Proof of payment upload per phase

In view mode, each phase row gets a 📎 button (or shows existing proof link if `proofUrl` set).

Clicking 📎 opens a small inline modal:
- `paidAmount` input (pre-filled with phase amount)
- `paidDate` date picker (defaults today)
- File upload area: paste / click / drag-drop → image → stored as base64 in `proofUrl` (same pattern as expenses proof upload)
- Save button → calls existing `PUT /api/contracts/[id]/payments` with updated phase data

No new API endpoint needed — the existing PUT already preserves `proofUrl` per phase.

---

## API changes

### `PUT /api/contracts/[id]/payments`

Accept `isVariation` field per phase. Pass through to `contractPayment.createMany`.

Remove the strict `total !== 100` validation. Replace with:
- If any base phase exists and sum > 100: return 400 "Tổng đợt gốc vượt 100%"
- If any variation phase exists and sum > variationAmount: return 400 "Tổng đợt phát sinh vượt giá trị phát sinh"

### `prisma/schema.prisma`

```prisma
model ContractPayment {
  ...
  isVariation Boolean @default(false)
  ...
}
```

Run `npm run db:migrate` after.

---

## Files to change

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `isVariation Boolean @default(false)` to ContractPayment |
| `app/api/contracts/[id]/payments/route.js` | Accept `isVariation`, replace 100% validation |
| `app/contracts/[id]/page.js` | Finance sidebar fix + split phase edit UI + proof upload modal |

---

## Out of scope

- Variation amount entry (already works in contract edit form)
- Variation approval workflow
- PDF/contract body changes
