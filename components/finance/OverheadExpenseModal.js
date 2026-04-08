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
