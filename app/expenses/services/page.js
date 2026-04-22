'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const SERVICE_CATEGORIES = [
    { key: 'Thiết kế công năng', icon: '📐', color: '#2980b9' },
    { key: 'Thiết kế KT-KC', icon: '🏛️', color: '#8e44ad' },
    { key: 'Thiết kế 3D', icon: '🎨', color: '#e67e22' },
    { key: 'Tư vấn thuê ngoài', icon: '💼', color: '#16a085' },
];

const SERVICE_CATEGORY_KEYS = SERVICE_CATEGORIES.map(c => c.key);

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + 'đ';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

function statusOf(amount, paid) {
    if (paid >= amount - 0.01) return { key: 'paid', label: 'Đã trả', color: '#22c55e', bg: '#dcfce7' };
    if (paid > 0) return { key: 'partial', label: 'Trả 1 phần', color: '#d97706', bg: '#fef3c7' };
    return { key: 'unpaid', label: 'Chưa trả', color: '#dc2626', bg: '#fee2e2' };
}

export default function ServiceExpensesPage() {
    const toast = useToast();
    const [data, setData] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [payModal, setPayModal] = useState(null);
    const [editing, setEditing] = useState(null);
    const [filter, setFilter] = useState('all'); // all | unpaid | paid | category
    const [categoryFilter, setCategoryFilter] = useState('');

    const [form, setForm] = useState({
        category: SERVICE_CATEGORY_KEYS[0],
        recipientName: '',
        amount: '',
        paidAmount: '0',
        projectId: '',
        date: new Date().toISOString().slice(0, 10),
        notes: '',
    });

    const load = useCallback(async () => {
        try {
            const [expRes, projRes] = await Promise.all([
                apiFetch('/api/project-expenses?limit=500'),
                apiFetch('/api/projects?limit=500'),
            ]);
            // Only show services (filtered client-side by category match)
            const services = (expRes?.data || []).filter(e => SERVICE_CATEGORY_KEYS.includes(e.category));
            setData(services);
            setProjects(projRes?.data || []);
        } catch (e) {
            toast.showToast(e.message || 'Lỗi tải dữ liệu', 'error');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const resetForm = () => {
        setForm({
            category: SERVICE_CATEGORY_KEYS[0],
            recipientName: '',
            amount: '',
            paidAmount: '0',
            projectId: '',
            date: new Date().toISOString().slice(0, 10),
            notes: '',
        });
        setEditing(null);
    };

    const submit = async () => {
        const amount = parseFloat(form.amount);
        const paid = parseFloat(form.paidAmount) || 0;
        if (!amount || amount <= 0) return toast.showToast('Nhập số tiền', 'error');
        if (!form.recipientName.trim()) return toast.showToast('Nhập nhà cung cấp/thợ', 'error');
        if (paid > amount) return toast.showToast('Đã trả không được lớn hơn số tiền', 'error');

        const payload = {
            description: `${form.category} — ${form.recipientName}`,
            amount, paidAmount: paid,
            category: form.category,
            expenseType: 'Dịch vụ',
            projectId: form.projectId || null,
            date: form.date ? new Date(form.date).toISOString() : undefined,
            recipientType: 'external',
            recipientName: form.recipientName.trim(),
            notes: form.notes,
            status: paid >= amount ? 'Đã chi' : paid > 0 ? 'Chi 1 phần' : 'Chưa trả',
        };

        try {
            if (editing) {
                await apiFetch(`/api/project-expenses/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
                toast.showToast('Đã cập nhật', 'success');
            } else {
                await apiFetch('/api/project-expenses', { method: 'POST', body: JSON.stringify(payload) });
                toast.showToast('Đã lưu chi phí dịch vụ', 'success');
            }
            setShowModal(false);
            resetForm();
            load();
        } catch (e) {
            toast.showToast(e.message || 'Lỗi lưu', 'error');
        }
    };

    const openEdit = (item) => {
        setEditing(item);
        setForm({
            category: item.category,
            recipientName: item.recipientName || '',
            amount: String(item.amount),
            paidAmount: String(item.paidAmount || 0),
            projectId: item.projectId || '',
            date: item.date ? new Date(item.date).toISOString().slice(0, 10) : '',
            notes: item.notes || '',
        });
        setShowModal(true);
    };

    const pay = async (amount) => {
        if (!payModal) return;
        const n = parseFloat(amount);
        if (!n || n <= 0) return toast.showToast('Nhập số tiền hợp lệ', 'error');
        const newPaid = (payModal.paidAmount || 0) + n;
        if (newPaid > payModal.amount + 0.01) return toast.showToast('Vượt số tiền nợ', 'error');
        try {
            await apiFetch(`/api/project-expenses/${payModal.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    paidAmount: newPaid,
                    status: newPaid >= payModal.amount ? 'Đã chi' : 'Chi 1 phần',
                }),
            });
            toast.showToast(`Đã trả ${fmt(n)}`, 'success');
            setPayModal(null);
            load();
        } catch (e) { toast.showToast(e.message || 'Lỗi', 'error'); }
    };

    const del = async (item) => {
        if (!confirm(`Xóa "${item.description}"?`)) return;
        try {
            await apiFetch(`/api/project-expenses/${item.id}`, { method: 'DELETE' });
            toast.showToast('Đã xóa', 'success');
            load();
        } catch (e) { toast.showToast(e.message || 'Lỗi', 'error'); }
    };

    const filtered = data.filter(e => {
        if (categoryFilter && e.category !== categoryFilter) return false;
        if (filter === 'unpaid') return (e.paidAmount || 0) < e.amount;
        if (filter === 'paid') return (e.paidAmount || 0) >= e.amount;
        return true;
    });

    const totals = data.reduce((acc, e) => {
        const paid = e.paidAmount || 0;
        acc.total += e.amount;
        acc.paid += paid;
        acc.unpaid += Math.max(0, e.amount - paid);
        return acc;
    }, { total: 0, paid: 0, unpaid: 0 });

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>💼 Chi phí dịch vụ</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
                        Hạch toán các khoản mua dịch vụ phi vật lý: thiết kế, 3D, tư vấn thuê ngoài
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                    + Thêm chi phí dịch vụ
                </button>
            </div>

            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
                <SummaryCard label="Tổng chi phí" value={fmt(totals.total)} color="#234093" />
                <SummaryCard label="Đã trả" value={fmt(totals.paid)} color="#22c55e" />
                <SummaryCard label="Còn nợ" value={fmt(totals.unpaid)} color={totals.unpaid > 0 ? '#dc2626' : '#22c55e'} />
                <SummaryCard label="Số khoản" value={String(data.length)} color="#6b4fAF" />
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <FilterPill label="Tất cả" active={filter === 'all'} onClick={() => setFilter('all')} />
                <FilterPill label={`Chưa trả (${data.filter(e => (e.paidAmount || 0) < e.amount).length})`} active={filter === 'unpaid'} onClick={() => setFilter('unpaid')} />
                <FilterPill label="Đã trả" active={filter === 'paid'} onClick={() => setFilter('paid')} />
                <div style={{ width: 1, background: 'var(--border-color)', margin: '0 4px' }} />
                <FilterPill label="Mọi danh mục" active={!categoryFilter} onClick={() => setCategoryFilter('')} />
                {SERVICE_CATEGORIES.map(c => (
                    <FilterPill
                        key={c.key}
                        label={`${c.icon} ${c.key}`}
                        active={categoryFilter === c.key}
                        onClick={() => setCategoryFilter(categoryFilter === c.key ? '' : c.key)}
                    />
                ))}
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải…</div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có chi phí dịch vụ nào.
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã</th>
                                <th>Danh mục</th>
                                <th>Nhà cung cấp</th>
                                <th>Dự án</th>
                                <th>Ngày</th>
                                <th style={{ textAlign: 'right' }}>Số tiền</th>
                                <th style={{ textAlign: 'right' }}>Đã trả</th>
                                <th style={{ textAlign: 'right' }}>Còn</th>
                                <th>Trạng thái</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(e => {
                                const cat = SERVICE_CATEGORIES.find(c => c.key === e.category);
                                const paid = e.paidAmount || 0;
                                const remaining = e.amount - paid;
                                const st = statusOf(e.amount, paid);
                                return (
                                    <tr key={e.id}>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{e.code}</td>
                                        <td>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                                <span>{cat?.icon}</span>
                                                <span style={{ color: cat?.color }}>{e.category}</span>
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{e.recipientName || '—'}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {e.projectId ? projects.find(p => p.id === e.projectId)?.name || '—' : 'Không gắn dự án'}
                                        </td>
                                        <td style={{ fontSize: 12 }}>{fmtDate(e.date)}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(e.amount)}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#22c55e' }}>{fmt(paid)}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: remaining > 0 ? '#dc2626' : '#22c55e' }}>{fmt(remaining)}</td>
                                        <td>
                                            <span className="badge" style={{ background: st.bg, color: st.color, fontSize: 11 }}>{st.label}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {remaining > 0 && (
                                                    <button className="btn btn-sm btn-primary" onClick={() => setPayModal(e)} title="Thanh toán">
                                                        💰
                                                    </button>
                                                )}
                                                <button className="btn btn-sm btn-ghost" onClick={() => openEdit(e)} title="Sửa">✏️</button>
                                                <button className="btn btn-sm" style={{ color: '#ef4444' }} onClick={() => del(e)} title="Xóa">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
                        <div className="modal-header">
                            <h3>{editing ? 'Sửa chi phí dịch vụ' : 'Thêm chi phí dịch vụ'}</h3>
                            <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Danh mục *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                                    {SERVICE_CATEGORIES.map(c => (
                                        <button
                                            key={c.key}
                                            type="button"
                                            onClick={() => setForm({ ...form, category: c.key })}
                                            style={{
                                                padding: '10px', border: `1px solid ${form.category === c.key ? c.color : 'var(--border-color)'}`,
                                                background: form.category === c.key ? c.color + '15' : 'transparent',
                                                borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 13,
                                                display: 'flex', alignItems: 'center', gap: 6,
                                                color: form.category === c.key ? c.color : 'var(--text-primary)',
                                                fontWeight: form.category === c.key ? 600 : 400,
                                            }}
                                        >
                                            <span>{c.icon}</span> {c.key}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Nhà cung cấp / Đối tác *</label>
                                <input
                                    className="form-input"
                                    value={form.recipientName}
                                    onChange={e => setForm({ ...form, recipientName: e.target.value })}
                                    placeholder="Tên cá nhân / công ty đã thuê"
                                />
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Số tiền *</label>
                                    <input
                                        className="form-input" type="number"
                                        value={form.amount}
                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                        placeholder="VND"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Đã trả</label>
                                    <input
                                        className="form-input" type="number"
                                        value={form.paidAmount}
                                        onChange={e => setForm({ ...form, paidAmount: e.target.value })}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Dự án (optional — không chọn = chi phí công ty)</label>
                                <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                                    <option value="">— Không gắn dự án —</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                </select>
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Ngày</label>
                                    <input
                                        className="form-input" type="date"
                                        value={form.date}
                                        onChange={e => setForm({ ...form, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea
                                    className="form-input" rows={2}
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    placeholder="Mô tả hạng mục, deadline, điều kiện..."
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => { setShowModal(false); resetForm(); }}>Hủy</button>
                            <button className="btn btn-primary" onClick={submit}>{editing ? 'Cập nhật' : 'Lưu'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pay modal */}
            {payModal && <PayModal item={payModal} onClose={() => setPayModal(null)} onPay={pay} />}
        </div>
    );
}

function SummaryCard({ label, value, color }) {
    return (
        <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
        </div>
    );
}

function FilterPill({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                background: active ? 'var(--primary)' : 'var(--bg-card)',
                color: active ? '#fff' : 'var(--text-primary)',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`,
                cursor: 'pointer',
            }}
        >{label}</button>
    );
}

function PayModal({ item, onClose, onPay }) {
    const remaining = item.amount - (item.paidAmount || 0);
    const [amount, setAmount] = useState(String(remaining));
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                <div className="modal-header">
                    <h3>Thanh toán: {item.recipientName}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Còn phải trả</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>{fmt(remaining)}</div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Số tiền thanh toán</label>
                        <input
                            className="form-input" type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            style={{ fontSize: 18, fontWeight: 600 }}
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
                    <button className="btn btn-primary" onClick={() => onPay(amount)}>✓ Xác nhận thanh toán</button>
                </div>
            </div>
        </div>
    );
}
