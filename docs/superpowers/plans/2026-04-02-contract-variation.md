# Contract Variation (Phát Sinh) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix contract variation (phát sinh) — always show in finance sidebar, split payment schedule into base/variation sections with independent validation, add per-phase proof-of-payment upload.

**Architecture:** Add `isVariation` flag to `ContractPayment` schema. API accepts the flag and replaces the strict 100% validation with two independent checks. UI splits `paymentPhases` into `basePhases`/`variationPhases`, renders two labeled sections in one table, and adds a proof upload modal per phase.

**Tech Stack:** Next.js App Router, Prisma 6, React 19, raw fetch (existing pattern in this file — no apiFetch)

---

## File Map

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `isVariation Boolean @default(false)` to ContractPayment |
| `app/api/contracts/[id]/payments/route.js` | Accept isVariation, replace 100% validation, add PATCH for single payment update |
| `app/contracts/[id]/page.js` | Split phase state, fix sidebar, new edit/view UI, proof modal |

---

### Task 1: Add isVariation to schema and migrate

**Files:**
- Modify: `prisma/schema.prisma` (ContractPayment model, around line 624)

- [ ] **Step 1: Add field to ContractPayment model**

In `prisma/schema.prisma`, find the `ContractPayment` model and add `isVariation` after `retentionAmount`:

```prisma
model ContractPayment {
  id                  String   @id @default(cuid())
  phase               String
  amount              Float    @default(0)
  paidAmount          Float    @default(0)
  category            String   @default("Hợp đồng")
  status              String   @default("Chưa thu")
  dueDate             DateTime?
  paidDate            DateTime?
  notes               String   @default("")
  proofUrl            String   @default("")
  retentionRate       Float    @default(0)
  retentionAmount     Float    @default(0)
  isVariation         Boolean  @default(false)
  retentionReleasedAt DateTime?
  contractId          String
  contract            Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)
  corrections         PaymentCorrection[]
  createdAt           DateTime @default(now())
  @@index([contractId])
}
```

- [ ] **Step 2: Run migration**

```bash
npm run db:migrate
```

Expected: Migration created and applied. Prisma client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add isVariation to ContractPayment"
```

---

### Task 2: Update payments API

**Files:**
- Modify: `app/api/contracts/[id]/payments/route.js`

- [ ] **Step 1: Replace the entire file**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Add a single payment phase
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const data = await request.json();

    const payment = await prisma.contractPayment.create({
        data: {
            contractId: id,
            phase: data.phase || '',
            amount: Number(data.amount) || 0,
            paidAmount: Number(data.paidAmount) || 0,
            category: data.category || '',
            status: data.status || 'Chưa thu',
            notes: data.notes || '',
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            isVariation: Boolean(data.isVariation),
        },
    });

    const total = await prisma.contractPayment.aggregate({
        where: { contractId: id },
        _sum: { paidAmount: true },
    });
    await prisma.contract.update({
        where: { id },
        data: { paidAmount: total._sum.paidAmount || 0 },
    });

    return NextResponse.json(payment);
});

// PATCH — update a single payment (proof, paidAmount, paidDate, status)
export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { paymentId, proofUrl, paidAmount, paidDate, status } = await request.json();
    if (!paymentId) return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 });

    const data = {};
    if (proofUrl !== undefined) data.proofUrl = proofUrl;
    if (paidAmount !== undefined) data.paidAmount = Number(paidAmount) || 0;
    if (paidDate !== undefined) data.paidDate = paidDate ? new Date(paidDate) : null;
    if (status !== undefined) data.status = status;

    const payment = await prisma.contractPayment.update({ where: { id: paymentId }, data });

    // Recalc contract paidAmount
    const total = await prisma.contractPayment.aggregate({
        where: { contractId: id },
        _sum: { paidAmount: true },
    });
    await prisma.contract.update({
        where: { id },
        data: { paidAmount: total._sum.paidAmount || 0 },
    });

    return NextResponse.json(payment);
});

// PUT — batch replace all payment phases
export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { phases } = await request.json();

    // Validation: base phases sum ≤ 100%, variation phases sum ≤ variationAmount
    if (phases?.length > 0) {
        const contract = await prisma.contract.findUnique({ where: { id }, select: { variationAmount: true } });
        const variationAmount = contract?.variationAmount || 0;

        const basePhases = phases.filter(p => !p.isVariation);
        const varPhases = phases.filter(p => p.isVariation);

        const basePctTotal = basePhases.reduce((s, p) => s + (Number(p.pct) || 0), 0);
        if (basePctTotal > 100) {
            return NextResponse.json({ error: `Tổng đợt gốc đang là ${basePctTotal}% — vượt 100%` }, { status: 400 });
        }

        const varAmountTotal = varPhases.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        if (variationAmount > 0 && varAmountTotal > variationAmount) {
            return NextResponse.json({ error: `Tổng đợt phát sinh (${varAmountTotal.toLocaleString('vi-VN')}) vượt giá trị phát sinh (${variationAmount.toLocaleString('vi-VN')})` }, { status: 400 });
        }
    }

    await prisma.$transaction(async (tx) => {
        const existing = await tx.contractPayment.findMany({
            where: { contractId: id },
            orderBy: { createdAt: 'asc' },
        });

        const existingById = {};
        const existingByPhase = {};
        for (const p of existing) {
            existingById[p.id] = p;
            if (!existingByPhase[p.phase]) existingByPhase[p.phase] = p;
        }

        await tx.contractPayment.deleteMany({ where: { contractId: id } });

        if (phases?.length > 0) {
            await tx.contractPayment.createMany({
                data: phases.map(p => {
                    const prev = (p.id && existingById[p.id]) || existingByPhase[p.phase];
                    return {
                        contractId: id,
                        phase: p.phase || '',
                        amount: Number(p.amount) || 0,
                        paidAmount: prev?.paidAmount || Number(p.paidAmount) || 0,
                        category: p.category || prev?.category || '',
                        status: prev?.status || p.status || 'Chưa thu',
                        notes: prev?.notes || p.notes || '',
                        proofUrl: prev?.proofUrl || '',
                        paidDate: prev?.paidDate || null,
                        dueDate: p.dueDate ? new Date(p.dueDate) : prev?.dueDate || null,
                        retentionRate: Number(p.retentionRate) || 0,
                        retentionAmount: Number(p.retentionAmount) || 0,
                        isVariation: Boolean(p.isVariation),
                    };
                }),
            });
        }

        const total = await tx.contractPayment.aggregate({
            where: { contractId: id },
            _sum: { paidAmount: true },
        });
        await tx.contract.update({
            where: { id },
            data: { paidAmount: total._sum.paidAmount || 0 },
        });
    });

    const payments = await prisma.contractPayment.findMany({
        where: { contractId: id },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(payments);
});
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "Error|error" | grep -v "warning"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/contracts/[id]/payments/route.js
git commit -m "feat(api): add isVariation support, PATCH single payment, replace 100% validation"
```

---

### Task 3: Update contracts/[id]/page.js — state and logic

**Files:**
- Modify: `app/contracts/[id]/page.js`

This task updates the state declarations and business logic functions. No UI changes yet.

- [ ] **Step 1: Replace state declarations**

Find and replace the single `paymentPhases` state (line ~22) plus add proof modal state:

```javascript
// Replace this:
const [paymentPhases, setPaymentPhases] = useState([]);

// With this:
const [basePhases, setBasePhases] = useState([]);
const [variationPhases, setVariationPhases] = useState([]);
const [proofModal, setProofModal] = useState(null); // { payment, paidAmount, paidDate, file, preview, saving }
```

- [ ] **Step 2: Replace startEditPayments**

```javascript
const startEditPayments = () => {
    const cv = parseFloat(form.contractValue) || 0;
    const allPayments = data.payments || [];
    const base = allPayments.filter(p => !p.isVariation).map(p => ({
        id: p.id, phase: p.phase, amount: p.amount || 0, paidAmount: p.paidAmount || 0,
        pct: cv > 0 ? Math.round((p.amount || 0) / cv * 100) : 0,
        status: p.status || 'Chưa thu', notes: p.notes || '', category: p.category || '',
        retentionRate: p.retentionRate || 0, retentionAmount: p.retentionAmount || 0,
        isVariation: false,
    }));
    const variation = allPayments.filter(p => p.isVariation).map(p => ({
        id: p.id, phase: p.phase, amount: p.amount || 0, paidAmount: p.paidAmount || 0,
        pct: 0, status: p.status || 'Chưa thu', notes: p.notes || '', category: p.category || '',
        retentionRate: p.retentionRate || 0, retentionAmount: p.retentionAmount || 0,
        isVariation: true,
    }));
    setBasePhases(base);
    setVariationPhases(variation);
    setEditingPayments(true);
};
```

- [ ] **Step 3: Replace loadTemplate**

```javascript
const loadTemplate = () => {
    const templates = dbPaymentTemplates || PAYMENT_TEMPLATES;
    const tmpl = templates[form.type] || PAYMENT_TEMPLATES[form.type] || [];
    const cv = parseFloat(form.contractValue) || 0;
    setBasePhases(tmpl.map(t => ({
        phase: t.phase, pct: t.pct, category: t.category || '',
        amount: Math.round(cv * t.pct / 100), paidAmount: 0, status: 'Chưa thu', notes: '',
        retentionRate: 0, retentionAmount: 0, isVariation: false,
    })));
};
```

- [ ] **Step 4: Replace updatePhase, addPhase, removePhase with split versions**

```javascript
const updateBasePhase = (idx, field, value) => {
    const cv = parseFloat(form.contractValue) || 0;
    setBasePhases(prev => prev.map((p, i) => {
        if (i !== idx) return p;
        const updated = { ...p, [field]: value };
        if (field === 'pct') updated.amount = Math.round(cv * (Number(value) || 0) / 100);
        if (field === 'amount') updated.pct = cv ? Math.round((Number(value) || 0) / cv * 100) : 0;
        if (field === 'retentionAmount') {
            updated.retentionRate = updated.amount > 0 ? Math.round((Number(value) || 0) / updated.amount * 10000) / 100 : 0;
        }
        return updated;
    }));
};

const updateVariationPhase = (idx, field, value) => {
    setVariationPhases(prev => prev.map((p, i) => {
        if (i !== idx) return p;
        const updated = { ...p, [field]: value };
        if (field === 'retentionAmount') {
            updated.retentionRate = updated.amount > 0 ? Math.round((Number(value) || 0) / updated.amount * 10000) / 100 : 0;
        }
        return updated;
    }));
};

const addBasePhase = () => setBasePhases(prev => [...prev, {
    phase: '', pct: 0, amount: 0, paidAmount: 0, status: 'Chưa thu',
    notes: '', category: '', retentionRate: 0, retentionAmount: 0, isVariation: false,
}]);

const addVariationPhase = () => setVariationPhases(prev => [...prev, {
    phase: '', pct: 0, amount: 0, paidAmount: 0, status: 'Chưa thu',
    notes: '', category: '', retentionRate: 0, retentionAmount: 0, isVariation: true,
}]);

const removeBasePhase = (idx) => setBasePhases(prev => prev.filter((_, i) => i !== idx));
const removeVariationPhase = (idx) => setVariationPhases(prev => prev.filter((_, i) => i !== idx));
```

- [ ] **Step 5: Replace savePayments**

```javascript
const savePayments = async () => {
    const basePctTotal = basePhases.reduce((s, p) => s + (p.pct || 0), 0);
    if (basePhases.length > 0 && basePctTotal > 100) {
        return alert(`Tổng đợt gốc đang là ${basePctTotal}% — vượt 100%`);
    }
    const va = parseFloat(form.variationAmount) || 0;
    const varTotal = variationPhases.reduce((s, p) => s + (p.amount || 0), 0);
    if (va > 0 && varTotal > va) {
        return alert(`Tổng đợt phát sinh vượt giá trị phát sinh (${fmt(va)})`);
    }

    setSavingPayments(true);
    const allPhases = [...basePhases, ...variationPhases];
    const res = await fetch(`/api/contracts/${id}/payments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phases: allPhases }),
    });
    if (res.ok) {
        const payments = await res.json();
        setData(prev => ({ ...prev, payments }));
        setEditingPayments(false);
    } else {
        const err = await res.json().catch(() => ({}));
        alert('Lỗi: ' + (err.error || 'Không rõ'));
    }
    setSavingPayments(false);
};
```

- [ ] **Step 6: Add computed totals (replace old totalPhasePct / totalPhaseAmount)**

```javascript
const basePctTotal = basePhases.reduce((s, p) => s + (p.pct || 0), 0);
const baseAmountTotal = basePhases.reduce((s, p) => s + (p.amount || 0), 0);
const varAmountTotal = variationPhases.reduce((s, p) => s + (p.amount || 0), 0);
```

- [ ] **Step 7: Add proof modal save handler**

Add this function near the other handlers:

```javascript
const saveProof = async () => {
    if (!proofModal) return;
    setProofModal(m => ({ ...m, saving: true }));
    let proofUrl = proofModal.payment.proofUrl || '';
    if (proofModal.file) {
        proofUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(proofModal.file);
        });
    }
    const res = await fetch(`/api/contracts/${id}/payments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            paymentId: proofModal.payment.id,
            proofUrl,
            paidAmount: Number(proofModal.paidAmount) || 0,
            paidDate: proofModal.paidDate || null,
            status: Number(proofModal.paidAmount) >= proofModal.payment.amount ? 'Đã thu' : 'Thu một phần',
        }),
    });
    if (res.ok) {
        const updated = await res.json();
        setData(prev => ({ ...prev, payments: prev.payments.map(p => p.id === updated.id ? updated : p) }));
        setProofModal(null);
    } else {
        alert('Lỗi lưu chứng từ');
        setProofModal(m => ({ ...m, saving: false }));
    }
};
```

- [ ] **Step 8: Commit**

```bash
git add app/contracts/[id]/page.js
git commit -m "refactor(contracts): split paymentPhases into basePhases/variationPhases, add proof modal logic"
```

---

### Task 4: Update contracts/[id]/page.js — UI

**Files:**
- Modify: `app/contracts/[id]/page.js`

- [ ] **Step 1: Fix finance sidebar — always show variationAmount**

Find the finance sidebar block (around line 540). Replace the `Phát sinh` row:

```javascript
// Find this:
<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
    <span style={{ color: 'var(--text-muted)' }}>Phát sinh</span>
    <span style={{ fontWeight: 600, color: 'var(--status-warning)' }}>+{fmt(form.variationAmount)}</span>
</div>

// Replace with:
{(data?.variationAmount || 0) > 0 && (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span style={{ color: 'var(--text-muted)' }}>Phát sinh</span>
        <span style={{ fontWeight: 600, color: 'var(--status-warning)' }}>+{fmt(data?.variationAmount || 0)}</span>
    </div>
)}
```

Also fix Tổng giá trị and Còn lại to use `data` not `form`:

```javascript
// Find:
<span>{fmt((parseFloat(form.contractValue) || 0) + (parseFloat(form.variationAmount) || 0))}</span>
// Replace with:
<span>{fmt((data?.contractValue || 0) + (data?.variationAmount || 0))}</span>

// Find:
{fmt(((parseFloat(form.contractValue) || 0) + (parseFloat(form.variationAmount) || 0)) - (data.paidAmount || 0))}
// Replace with:
{fmt(((data?.contractValue || 0) + (data?.variationAmount || 0)) - (data?.paidAmount || 0))}
```

- [ ] **Step 2: Update toolbar buttons**

Find the editingPayments toolbar (around line 395). Replace the add/template buttons:

```javascript
{!editingPayments ? (
    <button className="btn btn-secondary btn-sm" onClick={startEditPayments}>✏️ Chỉnh sửa đợt TT</button>
) : (
    <>
        <button className="btn btn-ghost btn-sm" onClick={loadTemplate} title="Load mẫu theo loại HĐ">📋 Template "{form.type}"</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditingPayments(false)}>✕ Hủy</button>
        <button className="btn btn-primary btn-sm" onClick={savePayments} disabled={savingPayments}>
            {savingPayments ? '⏳...' : '💾 Lưu'}
        </button>
    </>
)}
```

- [ ] **Step 3: Replace edit-mode payment table**

Find the `editingPayments ? (` branch. Replace the entire table content with:

```javascript
{editingPayments ? (
    <div>
        {/* Base phases section */}
        <div style={{ padding: '10px 16px 4px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>📄 HỢP ĐỒNG GỐC</span>
            <span style={{ fontSize: 12, color: basePctTotal > 100 ? 'var(--status-danger)' : basePctTotal === 100 ? 'var(--status-success)' : 'var(--text-muted)' }}>
                {basePctTotal}% / {fmt(parseFloat(form.contractValue) || 0)}
            </span>
        </div>
        {basePhases.length === 0 ? (
            <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>Chưa có đợt gốc. Bấm <strong>📋 Template</strong> hoặc thêm thủ công.</div>
        ) : (
            <table className="data-table" style={{ margin: 0 }}>
                <thead><tr>
                    <th style={{ width: 35 }}>#</th><th>Giai đoạn</th>
                    <th style={{ width: 70, textAlign: 'center' }}>%</th>
                    <th style={{ width: 130, textAlign: 'right' }}>Số tiền</th>
                    <th style={{ width: 120, textAlign: 'right' }}>Giảm trừ</th>
                    <th style={{ width: 40 }}></th>
                </tr></thead>
                <tbody>
                    {basePhases.map((p, idx) => (
                        <tr key={idx}>
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                            <td><input className="form-input form-input-compact" value={p.phase} onChange={e => updateBasePhase(idx, 'phase', e.target.value)} style={{ width: '100%' }} /></td>
                            <td><div style={{ display: 'flex', alignItems: 'center', gap: 2 }}><input className="form-input form-input-compact" type="number" value={p.pct || ''} onChange={e => updateBasePhase(idx, 'pct', parseFloat(e.target.value) || 0)} style={{ width: 50, textAlign: 'center' }} /><span style={{ fontSize: 11 }}>%</span></div></td>
                            <td><input className="form-input form-input-compact" type="number" value={p.amount || ''} onChange={e => updateBasePhase(idx, 'amount', parseFloat(e.target.value) || 0)} style={{ width: '100%', textAlign: 'right' }} /></td>
                            <td><input className="form-input form-input-compact" type="number" value={p.retentionAmount || ''} onChange={e => updateBasePhase(idx, 'retentionAmount', parseFloat(e.target.value) || 0)} style={{ width: '100%', textAlign: 'right' }} placeholder="0" /></td>
                            <td><button className="btn btn-ghost" onClick={() => removeBasePhase(idx)} style={{ padding: '2px 6px', color: 'var(--status-danger)', fontSize: 11 }}>✕</button></td>
                        </tr>
                    ))}
                    <tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                        <td></td><td>Tổng</td>
                        <td style={{ textAlign: 'center', color: basePctTotal > 100 ? 'var(--status-danger)' : 'var(--status-success)' }}>{basePctTotal}%</td>
                        <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{fmt(baseAmountTotal)}</td>
                        <td></td><td></td>
                    </tr>
                </tbody>
            </table>
        )}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
            <button className="btn btn-ghost btn-sm" onClick={addBasePhase}>➕ Thêm đợt gốc</button>
        </div>

        {/* Variation phases section — only show when variationAmount > 0 */}
        {(parseFloat(form.variationAmount) || 0) > 0 && (
            <>
                <div style={{ padding: '10px 16px 4px', background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid var(--border)', borderTop: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--status-warning)' }}>⚡ PHÁT SINH</span>
                    <span style={{ fontSize: 12, color: varAmountTotal > (parseFloat(form.variationAmount) || 0) ? 'var(--status-danger)' : 'var(--text-muted)' }}>
                        {fmt(varAmountTotal)} / {fmt(parseFloat(form.variationAmount) || 0)}
                    </span>
                </div>
                {variationPhases.length === 0 ? (
                    <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>Chưa có đợt phát sinh.</div>
                ) : (
                    <table className="data-table" style={{ margin: 0 }}>
                        <thead><tr>
                            <th style={{ width: 35 }}>#</th><th>Giai đoạn</th>
                            <th style={{ width: 70, textAlign: 'center' }}>%</th>
                            <th style={{ width: 130, textAlign: 'right' }}>Số tiền</th>
                            <th style={{ width: 120, textAlign: 'right' }}>Giảm trừ</th>
                            <th style={{ width: 40 }}></th>
                        </tr></thead>
                        <tbody>
                            {variationPhases.map((p, idx) => (
                                <tr key={idx} style={{ background: 'rgba(245,158,11,0.04)' }}>
                                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                                    <td><input className="form-input form-input-compact" value={p.phase} onChange={e => updateVariationPhase(idx, 'phase', e.target.value)} style={{ width: '100%' }} /></td>
                                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>—</td>
                                    <td><input className="form-input form-input-compact" type="number" value={p.amount || ''} onChange={e => updateVariationPhase(idx, 'amount', parseFloat(e.target.value) || 0)} style={{ width: '100%', textAlign: 'right' }} /></td>
                                    <td><input className="form-input form-input-compact" type="number" value={p.retentionAmount || ''} onChange={e => updateVariationPhase(idx, 'retentionAmount', parseFloat(e.target.value) || 0)} style={{ width: '100%', textAlign: 'right' }} placeholder="0" /></td>
                                    <td><button className="btn btn-ghost" onClick={() => removeVariationPhase(idx)} style={{ padding: '2px 6px', color: 'var(--status-danger)', fontSize: 11 }}>✕</button></td>
                                </tr>
                            ))}
                            <tr style={{ background: 'rgba(245,158,11,0.08)', fontWeight: 700 }}>
                                <td></td><td>Tổng phát sinh</td>
                                <td></td>
                                <td style={{ textAlign: 'right', color: 'var(--status-warning)' }}>{fmt(varAmountTotal)}</td>
                                <td></td><td></td>
                            </tr>
                        </tbody>
                    </table>
                )}
                <div style={{ padding: '8px 16px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={addVariationPhase}>➕ Thêm đợt phát sinh</button>
                </div>
            </>
        )}
    </div>
) : (
```

- [ ] **Step 4: Replace view-mode payment table**

Find the existing `data.payments?.length > 0` view table. Replace:

```javascript
data.payments?.length > 0 ? (
    <>
        {/* Base phases */}
        {data.payments.filter(p => !p.isVariation).length > 0 && (
            <>
                <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Hợp đồng gốc
                </div>
                <table className="data-table" style={{ margin: 0 }}>
                    <thead><tr>
                        <th>Đợt thanh toán</th><th>%</th><th>Giá trị</th>
                        <th>Giảm trừ</th><th>Thực nhận</th>
                        <th>Đã thu</th><th>Còn lại</th><th>Tiến độ</th>
                        <th>Ngày thu</th><th>Trạng thái</th><th></th>
                    </tr></thead>
                    <tbody>
                        {data.payments.filter(p => !p.isVariation).map(p => {
                            const cv = data?.contractValue || 0;
                            const phasePct = cv > 0 ? Math.round((p.amount || 0) / cv * 100) : 0;
                            const retAmt = p.retentionAmount || 0;
                            const netAmount = (p.amount || 0) - retAmt;
                            const paidPct = netAmount > 0 ? Math.round((p.paidAmount || 0) / netAmount * 100) : 0;
                            const remaining = netAmount - (p.paidAmount || 0);
                            return (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600 }}>{p.phase}</td>
                                    <td style={{ textAlign: 'center' }}>{phasePct}%</td>
                                    <td style={{ textAlign: 'right' }}>{fmt(p.amount)}</td>
                                    <td style={{ textAlign: 'right', color: retAmt > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{retAmt > 0 ? `-${fmt(retAmt)}` : '—'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>{fmt(netAmount)}</td>
                                    <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(p.paidAmount)}</td>
                                    <td style={{ color: remaining > 0 ? 'var(--status-danger)' : 'var(--text-muted)', fontWeight: 600 }}>{fmt(remaining)}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div className="progress-bar" style={{ flex: 1, minWidth: 50 }}><div className="progress-fill" style={{ width: `${Math.min(paidPct, 100)}%` }}></div></div>
                                            <span style={{ fontSize: 11 }}>{paidPct}%</span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: 12 }}>{p.paidDate ? fmtDateVN(p.paidDate) : '—'}</td>
                                    <td>
                                        <span className={`badge ${p.status === 'Đã thu' ? 'success' : p.status === 'Thu một phần' ? 'warning' : 'muted'}`}>{p.status}</span>
                                        {p.proofUrl && <a href={p.proofUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 4 }}>📸</a>}
                                    </td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                                            onClick={() => setProofModal({ payment: p, paidAmount: p.paidAmount || p.amount, paidDate: p.paidDate ? fmtDate(p.paidDate) : new Date().toISOString().slice(0, 10), file: null, preview: null, saving: false })}>
                                            📎 Thu
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </>
        )}

        {/* Variation phases */}
        {data.payments.filter(p => p.isVariation).length > 0 && (
            <>
                <div style={{ padding: '8px 16px', background: 'rgba(245,158,11,0.08)', borderTop: '2px solid var(--border)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 12, color: 'var(--status-warning)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    ⚡ Phát sinh
                </div>
                <table className="data-table" style={{ margin: 0 }}>
                    <thead><tr>
                        <th>Đợt phát sinh</th><th>%</th><th>Giá trị</th>
                        <th>Giảm trừ</th><th>Thực nhận</th>
                        <th>Đã thu</th><th>Còn lại</th><th>Tiến độ</th>
                        <th>Ngày thu</th><th>Trạng thái</th><th></th>
                    </tr></thead>
                    <tbody>
                        {data.payments.filter(p => p.isVariation).map(p => {
                            const retAmt = p.retentionAmount || 0;
                            const netAmount = (p.amount || 0) - retAmt;
                            const paidPct = netAmount > 0 ? Math.round((p.paidAmount || 0) / netAmount * 100) : 0;
                            const remaining = netAmount - (p.paidAmount || 0);
                            return (
                                <tr key={p.id} style={{ background: 'rgba(245,158,11,0.03)' }}>
                                    <td style={{ fontWeight: 600 }}>{p.phase}</td>
                                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>—</td>
                                    <td style={{ textAlign: 'right' }}>{fmt(p.amount)}</td>
                                    <td style={{ textAlign: 'right', color: retAmt > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{retAmt > 0 ? `-${fmt(retAmt)}` : '—'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>{fmt(netAmount)}</td>
                                    <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(p.paidAmount)}</td>
                                    <td style={{ color: remaining > 0 ? 'var(--status-danger)' : 'var(--text-muted)', fontWeight: 600 }}>{fmt(remaining)}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div className="progress-bar" style={{ flex: 1, minWidth: 50 }}><div className="progress-fill" style={{ width: `${Math.min(paidPct, 100)}%` }}></div></div>
                                            <span style={{ fontSize: 11 }}>{paidPct}%</span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: 12 }}>{p.paidDate ? fmtDateVN(p.paidDate) : '—'}</td>
                                    <td>
                                        <span className={`badge ${p.status === 'Đã thu' ? 'success' : p.status === 'Thu một phần' ? 'warning' : 'muted'}`}>{p.status}</span>
                                        {p.proofUrl && <a href={p.proofUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 4 }}>📸</a>}
                                    </td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                                            onClick={() => setProofModal({ payment: p, paidAmount: p.paidAmount || p.amount, paidDate: p.paidDate ? fmtDate(p.paidDate) : new Date().toISOString().slice(0, 10), file: null, preview: null, saving: false })}>
                                            📎 Thu
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </>
        )}

        <div style={{ padding: '10px 16px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
            <a href="/payments" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                💰 Thu tiền & In phiếu thu → Trang Thu tiền
            </a>
        </div>
    </>
) : (
    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
        Chưa có lịch thanh toán. Bấm <strong>"✏️ Chỉnh sửa đợt TT"</strong> để tạo.
    </div>
)
```

- [ ] **Step 5: Add proof upload modal JSX**

Find the closing `</div>` of the page return (before the last `}`). Add the modal just before it:

```javascript
{/* Proof upload modal */}
{proofModal && (
    <div className="modal-overlay" onClick={() => !proofModal.saving && setProofModal(null)}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
                <h3>📎 Thu tiền — {proofModal.payment.phase}</h3>
                <button className="modal-close" onClick={() => setProofModal(null)}>×</button>
            </div>
            <div className="modal-body">
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13 }}>
                    <div><strong>Giá trị đợt:</strong> {fmt(proofModal.payment.amount)}</div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Số tiền đã thu</label>
                        <input className="form-input" type="number"
                            value={proofModal.paidAmount}
                            onChange={e => setProofModal(m => ({ ...m, paidAmount: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Ngày thu</label>
                        <input className="form-input" type="date"
                            value={proofModal.paidDate}
                            onChange={e => setProofModal(m => ({ ...m, paidDate: e.target.value }))} />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Chứng từ (ảnh chuyển khoản)</label>
                    <div
                        onPaste={e => { const f = e.clipboardData?.items?.[0]?.getAsFile(); if (f?.type.startsWith('image/')) setProofModal(m => ({ ...m, file: f, preview: URL.createObjectURL(f) })); }}
                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f?.type.startsWith('image/')) setProofModal(m => ({ ...m, file: f, preview: URL.createObjectURL(f) })); }}
                        onDragOver={e => e.preventDefault()}
                        onClick={() => document.getElementById('proof-file-input').click()}
                        style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer', minHeight: 80 }}>
                        <input id="proof-file-input" type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) setProofModal(m => ({ ...m, file: f, preview: URL.createObjectURL(f) })); }} />
                        {proofModal.preview
                            ? <img src={proofModal.preview} alt="preview" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6 }} />
                            : proofModal.payment.proofUrl
                                ? <div><img src={proofModal.payment.proofUrl} alt="current" style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 6, marginBottom: 6 }} /><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã có chứng từ — paste/chọn ảnh mới để thay</div></div>
                                : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>📋 <strong>Ctrl+V</strong> paste &nbsp;|&nbsp; 📁 Click chọn file &nbsp;|&nbsp; 🖱️ Kéo thả</div>
                        }
                    </div>
                </div>
            </div>
            <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setProofModal(null)} disabled={proofModal.saving}>Hủy</button>
                <button className="btn btn-primary" onClick={saveProof} disabled={proofModal.saving}>
                    {proofModal.saving ? '⏳ Đang lưu...' : '💾 Lưu'}
                </button>
            </div>
        </div>
    </div>
)}
```

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | grep -E "Error|error" | grep -v "warning"
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add app/contracts/[id]/page.js
git commit -m "feat(contracts): variation payment sections, finance sidebar fix, proof upload modal"
```

---

### Task 5: Push and verify

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Manual test checklist**

1. Open a contract with `variationAmount > 0`
2. Finance sidebar shows "Phát sinh" row without entering edit mode ✓
3. Click "✏️ Chỉnh sửa đợt TT" — sees two sections: HĐ Gốc + Phát sinh
4. Add a variation phase with amount, save — no 100% error ✓
5. Try to exceed variationAmount — gets warning alert ✓
6. In view mode, variation phases appear in orange-tinted section ✓
7. Click "📎 Thu" on any phase — proof modal opens ✓
8. Upload image, set amount + date, save — phase updates with proof link ✓
9. Test on contract with `variationAmount = 0` — variation section hidden ✓
