'use client';
import { useState, useEffect, useCallback } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const CATEGORIES = ['Nguyên vật liệu', 'Nhân công', 'Vận chuyển', 'Thuê mặt bằng', 'Marketing', 'Hoa hồng', 'Khác'];

const EMPTY_FORM = {
    type: 'Chi', category: 'Nguyên vật liệu', amount: '',
    description: '', projectId: '', reference: '',
    date: new Date().toISOString().split('T')[0],
};

export default function AccountingPage() {
    const [entries, setEntries] = useState([]);
    const [summary, setSummary] = useState({ totalThu: 0, totalChi: 0 });
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [projects, setProjects] = useState([]);
    const [filterType, setFilterType] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const p = new URLSearchParams({ limit: '200' });
            if (filterType) p.set('type', filterType);
            if (filterCategory) p.set('category', filterCategory);
            const [rEntries, rSummary] = await Promise.all([
                fetch(`/api/accounting?${p}`).then(r => r.json()),
                fetch('/api/accounting/summary').then(r => r.json()),
            ]);
            setEntries(rEntries.data || []);
            setSummary(rSummary);
        } catch {}
        setLoading(false);
    }, [filterType, filterCategory]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        fetch('/api/projects?limit=500').then(r => r.json()).then(d => setProjects(d.data || []));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.amount || Number(form.amount) <= 0) return alert('Số tiền phải lớn hơn 0');
        setSaving(true);
        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, amount: Number(form.amount) }),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Lỗi tạo bút toán');
                setSaving(false);
                return;
            }
            setShowForm(false);
            setForm(EMPTY_FORM);
            load();
        } catch {}
        setSaving(false);
    };

    const deleteEntry = async (id) => {
        if (!confirm('Xoá bút toán này?')) return;
        await fetch(`/api/accounting/${id}`, { method: 'DELETE' });
        load();
    };

    const profit = (summary.totalThu || 0) - (summary.totalChi || 0);

    return (
        <div>
            {/* KPI cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 20 }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#22c55e' }}>💰</div>
                    <div><div className="stat-value" style={{ color: '#22c55e' }}>{fmt(summary.totalThu)}</div><div className="stat-label">Tổng Thu</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#ef4444' }}>💸</div>
                    <div><div className="stat-value" style={{ color: '#ef4444' }}>{fmt(summary.totalChi)}</div><div className="stat-label">Tổng Chi</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ color: profit >= 0 ? '#22c55e' : '#ef4444' }}>📊</div>
                    <div><div className="stat-value" style={{ color: profit >= 0 ? '#22c55e' : '#ef4444' }}>{fmt(profit)}</div><div className="stat-label">Lợi nhuận</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div><div className="stat-value">{entries.length}</div><div className="stat-label">Bút toán</div></div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="card" style={{ marginBottom: 20, padding: '12px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ maxWidth: 140 }}>
                        <option value="">Tất cả loại</option>
                        <option value="Thu">💰 Thu</option>
                        <option value="Chi">💸 Chi</option>
                    </select>
                    <select className="form-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ maxWidth: 180 }}>
                        <option value="">Tất cả danh mục</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-ghost" onClick={load}>↻ Làm mới</button>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Thêm bút toán</button>
                </div>
            </div>

            {/* Form modal */}
            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <h3 style={{ marginBottom: 16 }}>📝 Thêm bút toán</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid" style={{ gap: 12 }}>
                                <div className="form-group">
                                    <label>Loại *</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                        <option value="Thu">💰 Thu</option>
                                        <option value="Chi">💸 Chi</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Danh mục</label>
                                    <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Số tiền (VNĐ) *</label>
                                    <input type="number" className="form-input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min="1" required />
                                </div>
                                <div className="form-group">
                                    <label>Ngày</label>
                                    <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Dự án</label>
                                    <select className="form-select" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                                        <option value="">-- Không --</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Mã tham chiếu</label>
                                    <input type="text" className="form-input" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="PO-xxx / HD-xxx" />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Mô tả</label>
                                    <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Huỷ</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : '✓ Lưu'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                <div className="card">
                    <div className="table-container"><table className="data-table">
                        <thead><tr>
                            <th>Mã</th><th>Ngày</th><th>Loại</th>
                            <th>Danh mục</th><th>Số tiền</th><th>Mô tả</th>
                            <th>Dự án</th><th>Tham chiếu</th><th></th>
                        </tr></thead>
                        <tbody>{entries.map(e => (
                            <tr key={e.id}>
                                <td className="accent">{e.code}</td>
                                <td style={{ fontSize: 12 }}>{fmtDate(e.date)}</td>
                                <td>
                                    <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 12,
                                        background: e.type === 'Thu' ? '#dcfce7' : '#fee2e2',
                                        color: e.type === 'Thu' ? '#22c55e' : '#ef4444',
                                    }}>
                                        {e.type === 'Thu' ? '💰' : '💸'} {e.type}
                                    </span>
                                </td>
                                <td style={{ fontSize: 12 }}>{e.category || '—'}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: e.type === 'Thu' ? '#22c55e' : '#ef4444' }}>
                                    {e.type === 'Thu' ? '+' : '-'}{fmt(e.amount)}
                                </td>
                                <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {e.description || '—'}
                                </td>
                                <td style={{ fontSize: 12 }}>{e.project?.name || '—'}</td>
                                <td style={{ fontSize: 12 }}>{e.reference || '—'}</td>
                                <td>
                                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 6px', color: '#ef4444' }} onClick={() => deleteEntry(e.id)}>🗑</button>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table></div>
                    {entries.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chưa có bút toán nào</div>}
                </div>
            )}
        </div>
    );
}
