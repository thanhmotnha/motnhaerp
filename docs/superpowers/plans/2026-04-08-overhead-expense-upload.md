# Overhead Expense Upload Form — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm upload chứng từ (ảnh) vào form nhập chi phí chung — cả trong `/overhead` lẫn `/finance`, dùng cùng 1 component.

**Architecture:** Tạo `OverheadExpenseModal` component độc lập với upload logic (POST `/api/upload`) giống `ExpensesTab`. Dùng nó trong `overhead/page.js` thay form cũ. Đồng thời thêm "Chi phí chung" vào toggle type trong `ExpensesTab` của `/finance`, khi chọn route submit sang `/api/overhead/expenses`.

**Tech Stack:** Next.js 16, React 19, `apiFetch`, `fetch('/api/upload')` (R2), `components/finance/`, `app/overhead/`

---

### Task 1: Tạo `OverheadExpenseModal` component

**Files:**
- Create: `components/finance/OverheadExpenseModal.js`

Context: `OverheadExpense` schema nhận `{ description, amount, date, categoryId, notes, proofUrl }`. API upload ảnh qua `POST /api/upload` với FormData `{ file, type: 'proofs' }` → trả `{ url }`. Nhiều ảnh → `JSON.stringify([url1, url2])`. Categories fetch từ `/api/expense-categories`, lọc `linkType === 'company'` hoặc `linkType === ''`.

- [ ] **Step 1: Tạo file component**

```javascript
'use client';
import { useState, useRef } from 'react';
import { apiFetch } from '@/lib/fetchClient';

export default function OverheadExpenseModal({ expense, categories, onClose, onSuccess, toast }) {
    const [form, setForm] = useState({
        description: expense?.description || '',
        amount: expense?.amount || '',
        categoryId: expense?.categoryId || '',
        date: expense?.date
            ? new Date(expense.date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        notes: expense?.notes || '',
    });
    const [saving, setSaving] = useState(false);
    const [formProofFiles, setFormProofFiles] = useState([]);
    const formProofRef = useRef();

    const addFiles = (files) => {
        const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!imgs.length) return;
        setFormProofFiles(prev => [...prev, ...imgs.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
    };
    const removeFile = (i) => setFormProofFiles(prev => prev.filter((_, j) => j !== i));

    const uploadFile = async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'proofs');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Upload chứng từ thất bại');
        }
        return (await res.json()).url;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.description.trim() || !form.amount) return toast.error('Vui lòng điền đủ thông tin');
        setSaving(true);
        try {
            let proofUrl = expense?.proofUrl || '';
            if (formProofFiles.length > 0) {
                const urls = await Promise.all(formProofFiles.map(({ file }) => uploadFile(file)));
                proofUrl = urls.length === 1 ? urls[0] : JSON.stringify(urls);
            }
            const body = { ...form, amount: parseFloat(form.amount), categoryId: form.categoryId || null, proofUrl };
            if (expense) {
                await apiFetch(`/api/overhead/expenses/${expense.id}`, { method: 'PUT', body: JSON.stringify(body) });
                toast.success('Đã cập nhật');
            } else {
                await apiFetch('/api/overhead/expenses', { method: 'POST', body: JSON.stringify(body) });
                toast.success('Đã thêm chi phí chung');
            }
            onSuccess();
        } catch (err) { toast.error(err.message); }
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={ev => ev.stopPropagation()} style={{ maxWidth: 520 }}>
                <h3 style={{ marginTop: 0 }}>{expense ? 'Sửa chi phí chung' : '+ Thêm chi phí chung'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Mô tả *</label>
                        <input className="form-input" value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Số tiền *</label>
                            <input className="form-input" type="number" min="0" value={form.amount}
                                onChange={e => setForm({ ...form, amount: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ngày</label>
                            <input className="form-input" type="date" value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Danh mục</label>
                        <select className="form-select" value={form.categoryId}
                            onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                            <option value="">-- Không chọn --</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Ghi chú</label>
                        <input className="form-input" value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>

                    {/* Chứng từ upload */}
                    <div className="form-group">
                        <label className="form-label">
                            📎 Chứng từ{' '}
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>(tùy chọn — nhiều ảnh)</span>
                        </label>
                        <div
                            onPaste={e => { const f = e.clipboardData?.items?.[0]?.getAsFile(); if (f) addFiles([f]); }}
                            onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                            onDragOver={e => e.preventDefault()}
                            tabIndex={0}
                            onClick={() => formProofRef.current?.click()}
                            style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: 12, cursor: 'pointer', outline: 'none', minHeight: 60 }}>
                            <input ref={formProofRef} type="file" accept="image/*" multiple
                                style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
                            {formProofFiles.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} onClick={e => e.stopPropagation()}>
                                    {formProofFiles.map((item, i) => (
                                        <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                                            <img src={item.preview} alt="" style={{ height: 60, borderRadius: 4, border: '1px solid var(--border)', display: 'block' }} />
                                            <button type="button" onClick={() => removeFile(i)}
                                                style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, lineHeight: '18px', cursor: 'pointer', padding: 0 }}>×</button>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, border: '1px dashed var(--border)', borderRadius: 4, color: 'var(--text-muted)', fontSize: 20 }}>+</div>
                                </div>
                            ) : (
                                <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', paddingTop: 8 }}>
                                    📋 <strong>Ctrl+V</strong> paste &nbsp;|&nbsp; 📁 Click chọn nhiều &nbsp;|&nbsp; 🖱️ Kéo thả
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                        <button type="button" className="btn" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Đang lưu...' : expense ? 'Cập nhật' : 'Thêm chi phí'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/finance/OverheadExpenseModal.js
git commit -m "feat(finance): add OverheadExpenseModal with image upload support"
```

---

### Task 2: Dùng `OverheadExpenseModal` trong `/overhead/page.js`

**Files:**
- Modify: `app/overhead/page.js`

Context: Hiện tại `overhead/page.js` có `ExpenseForm` component (lines ~455–526) dùng `<input>` text cho proofUrl. Cần thay bằng `OverheadExpenseModal`. `categories` state đã được fetch sẵn trong `fetchExpenses`. `toast` là từ `useToast()`.

- [ ] **Step 1: Thêm import ở đầu file**

Tìm dòng:
```javascript
import { useToast } from '@/components/ui/Toast';
```

Thêm sau dòng đó:
```javascript
import OverheadExpenseModal from '@/components/finance/OverheadExpenseModal';
```

- [ ] **Step 2: Thay `<ExpenseForm>` bằng `<OverheadExpenseModal>`**

Tìm đoạn:
```javascript
        {showExpForm && (
            <ExpenseForm
                expense={editExpense}
                categories={categories}
                onClose={() => { setShowExpForm(false); setEditExpense(null); }}
                onSuccess={() => { setShowExpForm(false); setEditExpense(null); fetchExpenses(); }}
                toast={toast}
            />
        )}
```

Thay bằng:
```javascript
        {showExpForm && (
            <OverheadExpenseModal
                expense={editExpense}
                categories={categories}
                onClose={() => { setShowExpForm(false); setEditExpense(null); }}
                onSuccess={() => { setShowExpForm(false); setEditExpense(null); fetchExpenses(); }}
                toast={toast}
            />
        )}
```

- [ ] **Step 3: Xóa `ExpenseForm` function cũ**

Tìm và xóa toàn bộ function `ExpenseForm` — từ dòng:
```javascript
function ExpenseForm({ expense, categories, onClose, onSuccess, toast }) {
```
đến dòng đóng `}` của nó (khoảng 70 dòng, kết thúc bằng `</div>\n    );\n}`).

- [ ] **Step 4: Verify — mở `/overhead`, click "+ Thêm chi phí"**

Expected: Modal mới hiện với upload chứng từ (dashed box, paste/click/kéo thả). Form có Mô tả, Số tiền, Ngày, Danh mục, Ghi chú, Chứng từ.

- [ ] **Step 5: Commit**

```bash
git add app/overhead/page.js
git commit -m "feat(overhead): replace ExpenseForm with OverheadExpenseModal (with upload)"
```

---

### Task 3: Thêm "Chi phí chung" vào ExpensesTab trong `/finance`

**Files:**
- Modify: `components/finance/ExpensesTab.js`

Context: `ExpensesTab` có `emptyForm` với `expenseType: 'Dự án'` và `setExpenseType(type)` function. Form modal render từ `showModal`. `handleSubmit` POST tới `/api/project-expenses`. Categories computed bằng `getCatsForType(form.expenseType)`. Cần thêm type "Chi phí chung" — khi chọn: ẩn dự án/người nhận/phân bổ, submit sang `/api/overhead/expenses`.

- [ ] **Step 1: Thêm type buttons vào modal**

Tìm dòng đầu tiên của modal body (sau `<div className="modal-body">`):
```javascript
                        <div className="modal-body">
                            {/* Project selector */}
                            <div className="form-group">
                                <label className="form-label">Dự án</label>
```

Thêm type toggle TRƯỚC `{/* Project selector */}`:
```javascript
                        <div className="modal-body">
                            {/* Type toggle */}
                            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                                {[['Dự án', '🏗️'], ['Công ty', '🏢'], ['Chi phí chung', '📋']].map(([t, icon]) => (
                                    <button key={t} type="button"
                                        className={`btn btn-sm${form.expenseType === t ? ' btn-primary' : ''}`}
                                        onClick={() => setExpenseType(t)}
                                        style={{ flex: 1 }}>
                                        {icon} {t}
                                    </button>
                                ))}
                            </div>

                            {/* Project selector */}
                            <div className="form-group">
                                <label className="form-label">Dự án</label>
```

- [ ] **Step 2: Ẩn project/recipient/allocations khi type = "Chi phí chung"**

Tìm đoạn project selector:
```javascript
                            {/* Project selector */}
                            <div className="form-group">
                                <label className="form-label">Dự án</label>
                                <select className="form-select" value={form.projectId || ''} onChange={e => setForm(f => ({ ...f, projectId: e.target.value || null }))}>
                                    <option value="">— Không gắn dự án —</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                </select>
                            </div>
```

Wrap bằng conditional:
```javascript
                            {/* Project selector */}
                            {form.expenseType !== 'Chi phí chung' && (
                            <div className="form-group">
                                <label className="form-label">Dự án</label>
                                <select className="form-select" value={form.projectId || ''} onChange={e => setForm(f => ({ ...f, projectId: e.target.value || null }))}>
                                    <option value="">— Không gắn dự án —</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                </select>
                            </div>
                            )}
```

Tìm đoạn `{/* Recipient */}`:
```javascript
                            {/* Recipient */}
                            <div className="form-row">
```

Wrap bằng conditional:
```javascript
                            {/* Recipient */}
                            {form.expenseType !== 'Chi phí chung' && (
                            <div className="form-row">
```

Tìm dòng đóng `</div>` cuối của Recipient block (sau `RecipientSearch` closing tag và outer `</div>`). Thêm `)` để đóng conditional sau đó.

Tìm đoạn `{/* Phân bổ vào nhiều dự án */}`:
```javascript
                            {/* Phân bổ vào nhiều dự án */}
                            {(() => {
```

Wrap bằng conditional:
```javascript
                            {/* Phân bổ vào nhiều dự án */}
                            {form.expenseType !== 'Chi phí chung' && (() => {
```

Tìm dòng đóng của IIFE: `})()}` — thêm `}` sau:
```javascript
                            {form.expenseType !== 'Chi phí chung' && (() => {
                                ...
                            })()}
```

- [ ] **Step 3: Cập nhật `setExpenseType` để handle "Chi phí chung"**

Tìm function `setExpenseType`:
```javascript
    const setExpenseType = (type) => {
        const available = getCatsForType(type);
        setForm(f => ({
            ...f,
            expenseType: type,
            projectId: type === 'Công ty' ? null : f.projectId,
            recipientType: type === 'Công ty' ? '' : f.recipientType,
            recipientId: type === 'Công ty' ? '' : f.recipientId,
            category: available[0] || '',
        }));
    };
```

Thay bằng:
```javascript
    const setExpenseType = (type) => {
        const available = getCatsForType(type);
        setForm(f => ({
            ...f,
            expenseType: type,
            projectId: (type === 'Công ty' || type === 'Chi phí chung') ? null : f.projectId,
            recipientType: (type === 'Công ty' || type === 'Chi phí chung') ? '' : f.recipientType,
            recipientId: (type === 'Công ty' || type === 'Chi phí chung') ? '' : f.recipientId,
            category: available[0] || '',
        }));
        if (type === 'Chi phí chung') setAllocations([]);
    };
```

- [ ] **Step 4: Route submit sang `/api/overhead/expenses` khi type = "Chi phí chung"**

Tìm trong `handleSubmit`:
```javascript
            if (editing) {
                await apiFetch('/api/project-expenses', { method: 'PUT', body: { id: editing.id, ...payload } });
                toast.success('Đã cập nhật lệnh chi');
            } else {
                await apiFetch('/api/project-expenses', { method: 'POST', body: payload });
                toast.success('Đã tạo lệnh chi');
            }
```

Thay bằng:
```javascript
            if (form.expenseType === 'Chi phí chung') {
                const ohPayload = {
                    description: payload.description,
                    amount: payload.amount,
                    date: payload.date,
                    categoryId: payload.categoryId || null,
                    notes: payload.notes || '',
                    proofUrl: payload.proofUrl || '',
                };
                if (editing) {
                    await apiFetch(`/api/overhead/expenses/${editing.id}`, { method: 'PUT', body: ohPayload });
                    toast.success('Đã cập nhật chi phí chung');
                } else {
                    await apiFetch('/api/overhead/expenses', { method: 'POST', body: ohPayload });
                    toast.success('Đã tạo chi phí chung');
                }
            } else if (editing) {
                await apiFetch('/api/project-expenses', { method: 'PUT', body: { id: editing.id, ...payload } });
                toast.success('Đã cập nhật lệnh chi');
            } else {
                await apiFetch('/api/project-expenses', { method: 'POST', body: payload });
                toast.success('Đã tạo lệnh chi');
            }
```

Note: `payload` đã có `proofUrl` từ upload logic trước đó (lines ~210-213 trong handleSubmit).

- [ ] **Step 5: Verify — mở `/finance`, click tạo chi tiền, click "📋 Chi phí chung"**

Expected:
- Toggle buttons hiện: 🏗️ Dự án | 🏢 Công ty | 📋 Chi phí chung
- Khi chọn Chi phí chung: ẩn Dự án, ẩn Chi cho, ẩn Phân bổ sang DA
- Form gọn: Mô tả, Số tiền, Hạng mục, Ngày, Ghi chú, Chứng từ
- Submit → tạo được record trong `/overhead` tab Chi phí

- [ ] **Step 6: Commit**

```bash
git add components/finance/ExpensesTab.js
git commit -m "feat(finance): add Chi phí chung type in ExpensesTab — routes to overhead API"
```

---

### Task 4: Build + Push

- [ ] **Step 1: Build**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "(error|Error|✓ Compiled|Failed)"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 2: Push**

```bash
git push
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| OverheadExpenseModal với upload (paste/click/kéo thả) | Task 1 |
| `/overhead` dùng modal mới thay form cũ | Task 2 |
| `/finance` có type "Chi phí chung" | Task 3 |
| Chi phí chung ẩn dự án/người nhận/phân bổ | Task 3 Step 2 |
| Chi phí chung submit tới `/api/overhead/expenses` | Task 3 Step 4 |
| Upload chứng từ hoạt động ở cả 2 nơi | Task 1 + Task 3 (dùng `/api/upload`) |

### Notes cho engineer

- `OverheadExpenseModal` nhận `categories` từ parent — `/overhead/page.js` đã fetch sẵn từ `/api/expense-categories`
- `getCatsForType('Chi phí chung')` trả `linkType = 'company'` cats — đây là đúng hành vi vì overhead = chi phí công ty
- Upload proofUrl trong ExpensesTab đã có sẵn ở lines ~210-213 của handleSubmit — đoạn `if (formProofFiles.length > 0)` — không cần thêm
- Sau khi tạo Chi phí chung từ `/finance`, record sẽ hiện trong `/overhead` tab Chi phí
