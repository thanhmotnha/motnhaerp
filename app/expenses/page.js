'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const fmt = v => new Intl.NumberFormat('vi-VN').format(v || 0);
const statusColors = { 'Chờ duyệt': '#f59e0b', 'Đã duyệt': '#22c55e', 'Từ chối': '#ef4444', 'Đã chi': '#3b82f6', 'Hoàn thành': '#10b981' };
const expenseTypes = ['Vật tư', 'Nhân công', 'Thiết bị', 'Vận chuyển', 'Tạm ứng', 'Khác'];

export default function ExpensesPage() {
    const { role } = useRole();
    const toast = useToast();
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const canManage = ['giam_doc', 'pho_gd', 'ke_toan', 'quan_ly_du_an'].includes(role);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '500' });
            if (filterType) params.set('expenseType', filterType);
            if (filterStatus) params.set('status', filterStatus);
            if (filterCategory) params.set('categoryId', filterCategory);
            if (search) params.set('search', search);
            const [res, cats] = await Promise.all([
                apiFetch(`/api/project-expenses?${params}`),
                apiFetch('/api/expense-categories'),
            ]);
            setExpenses(res.data || []);
            setCategories(cats || []);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, [filterType, filterStatus, filterCategory, search]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const approved = expenses.filter(e => e.status === 'Đã duyệt' || e.status === 'Đã chi' || e.status === 'Hoàn thành');
    const totalApproved = approved.reduce((s, e) => s + (e.amount || 0), 0);
    const pending = expenses.filter(e => e.status === 'Chờ duyệt' || !e.status);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0 }}>Chi phí Dự án</h2>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Quản lý & duyệt chi phí phát sinh</div>
                </div>
                {canManage && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Tạo chi phí</button>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Tổng chi phí', value: fmt(totalAmount) + 'đ', color: 'var(--primary)' },
                    { label: 'Đã duyệt', value: fmt(totalApproved) + 'đ', color: '#22c55e' },
                    { label: 'Chờ duyệt', value: pending.length + ' phiếu', color: '#f59e0b' },
                    { label: 'Số phiếu', value: expenses.length, color: '#3b82f6' },
                ].map(k => (
                    <div key={k.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <input className="form-input" placeholder="Tìm theo mô tả..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
                <select className="form-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ maxWidth: 160 }}>
                    <option value="">Loại chi phí</option>
                    {expenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select className="form-input" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ maxWidth: 180 }}>
                    <option value="">Hạng mục</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 160 }}>
                    <option value="">Trạng thái</option>
                    {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div className="card" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr><th>Mã</th><th>Mô tả</th><th>Dự án</th><th>Hạng mục</th><th>Loại</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày</th></tr>
                        </thead>
                        <tbody>
                            {expenses.map(e => {
                                const sc = statusColors[e.status] || '#888';
                                const allocCount = e.allocations?.length || 0;
                                return (
                                    <tr key={e.id}>
                                        <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{e.code}</td>
                                        <td>
                                            {e.description || '—'}
                                            {allocCount > 0 && <span style={{ fontSize: 10, color: 'var(--primary)', marginLeft: 4 }} title={e.allocations.map(a => `${a.project?.code}: ${fmt(a.amount)}`).join(', ')}>({allocCount} DA)</span>}
                                        </td>
                                        <td>{e.project?.name || '—'}</td>
                                        <td><span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, background: 'var(--bg-tertiary)' }}>{e.expenseCategory?.name || e.category || '—'}</span></td>
                                        <td><span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, background: 'var(--bg-tertiary)' }}>{e.expenseType || '—'}</span></td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(e.amount)}</td>
                                        <td><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: sc + '18', color: sc }}>{e.status || 'Chờ duyệt'}</span></td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.createdAt ? new Date(e.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                                    </tr>
                                );
                            })}
                            {expenses.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Chưa có chi phí nào</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && <ExpenseForm categories={categories} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchData(); }} toast={toast} />}
        </div>
    );
}

function ExpenseForm({ categories, onClose, onSuccess, toast }) {
    const [form, setForm] = useState({ projectId: '', description: '', amount: '', expenseType: 'Vật tư', categoryId: '', notes: '' });
    const [projects, setProjects] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiFetch('/api/projects?limit=200').then(r => setProjects(r.data || [])).catch(() => {});
    }, []);

    const addAllocation = () => setAllocations([...allocations, { projectId: '', amount: '', ratio: '' }]);
    const removeAllocation = (i) => setAllocations(allocations.filter((_, j) => j !== i));
    const updateAllocation = (i, field, value) => {
        const updated = [...allocations];
        updated[i] = { ...updated[i], [field]: value };
        setAllocations(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.description || !form.amount) return toast.error('Vui lòng nhập mô tả và số tiền');
        setSaving(true);
        try {
            const payload = {
                ...form,
                amount: Number(form.amount),
                projectId: form.projectId || null,
                categoryId: form.categoryId || null,
                allocations: allocations.filter(a => a.projectId).map(a => ({
                    projectId: a.projectId,
                    amount: Number(a.amount) || 0,
                    ratio: Number(a.ratio) || 0,
                })),
            };
            await apiFetch('/api/project-expenses', { method: 'POST', body: JSON.stringify(payload) });
            toast.success('Tạo chi phí thành công');
            onSuccess();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                <h3 style={{ marginTop: 0 }}>Tạo phiếu Chi phí</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Dự án chính</label>
                        <select className="form-input" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                            <option value="">Không gắn dự án</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Hạng mục</label>
                            <select className="form-input" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                                <option value="">Chọn hạng mục</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Loại chi phí</label>
                            <select className="form-input" value={form.expenseType} onChange={e => setForm({ ...form, expenseType: e.target.value })}>
                                {expenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                        <div className="form-group"><label className="form-label">Mô tả *</label><input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
                        <div className="form-group"><label className="form-label">Số tiền *</label><input className="form-input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>

                    {/* Phân bổ multi-project */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <label className="form-label" style={{ margin: 0 }}>Phân bổ sang dự án khác</label>
                            <button type="button" className="btn" style={{ fontSize: 12, padding: '4px 10px' }} onClick={addAllocation}>+ Thêm DA</button>
                        </div>
                        {allocations.map((a, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 6, alignItems: 'end' }}>
                                <select className="form-input" value={a.projectId} onChange={e => updateAllocation(i, 'projectId', e.target.value)}>
                                    <option value="">Chọn DA</option>
                                    {projects.filter(p => p.id !== form.projectId).map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                </select>
                                <input className="form-input" type="number" placeholder="Số tiền" value={a.amount} onChange={e => updateAllocation(i, 'amount', e.target.value)} />
                                <input className="form-input" type="number" placeholder="% tỷ lệ" value={a.ratio} onChange={e => updateAllocation(i, 'ratio', e.target.value)} />
                                <button type="button" className="btn" style={{ padding: '6px 8px', color: '#ef4444' }} onClick={() => removeAllocation(i)}>✕</button>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                        <button type="button" className="btn" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Tạo phiếu'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
