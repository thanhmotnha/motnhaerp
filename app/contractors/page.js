'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

import { fetchPartnerTypes, DEFAULT_CONTRACTOR_TYPES } from '@/lib/partnerTypes';

const fmt = v => new Intl.NumberFormat('vi-VN').format(v || 0);

export default function ContractorsPage() {
    const { role } = useRole();
    const router = useRouter();
    const toast = useToast();
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [CONTRACTOR_TYPES, setContractorTypes] = useState(DEFAULT_CONTRACTOR_TYPES);
    const canManage = ['giam_doc', 'pho_gd', 'ke_toan'].includes(role);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/contractors');
            setContractors(res.data || []);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
        fetchPartnerTypes().then(({ contractorTypes }) => setContractorTypes(contractorTypes));
    }, [fetchData]);

    const filtered = contractors.filter(c =>
        !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.code?.toLowerCase().includes(search.toLowerCase()) ||
        c.specialty?.toLowerCase().includes(search.toLowerCase())
    );

    const totalContract = contractors.reduce((s, c) => s + (c.payments || []).reduce((t, p) => t + (p.contractAmount || 0), 0), 0);
    const totalPaid = contractors.reduce((s, c) => s + (c.payments || []).reduce((t, p) => t + (p.paidAmount || 0), 0), 0);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0 }}>Nhà thầu phụ</h2>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Quản lý nhà thầu phụ & lao động thuê ngoài</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => router.push('/partners')}>🏢 Quản lý NCC & Thầu phụ</button>
                    {canManage && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Thêm thầu phụ</button>}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Tổng thầu phụ', value: contractors.length, color: 'var(--primary)' },
                    { label: 'Giá trị HĐ', value: fmt(totalContract) + 'đ', color: '#3b82f6' },
                    { label: 'Đã thanh toán', value: fmt(totalPaid) + 'đ', color: '#22c55e' },
                    { label: 'Còn phải trả', value: fmt(totalContract - totalPaid) + 'đ', color: '#f59e0b' },
                ].map(k => (
                    <div key={k.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: 16 }}>
                <input className="form-input" placeholder="Tìm theo tên, mã, chuyên ngành..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div className="card" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr><th>Mã</th><th>Tên</th><th>Chuyên ngành</th><th>SĐT</th><th>Giá trị HĐ</th><th>Đã TT</th><th>Rating</th></tr>
                        </thead>
                        <tbody>
                            {filtered.map(c => {
                                const contractAmt = (c.payments || []).reduce((t, p) => t + (p.contractAmount || 0), 0);
                                const paidAmt = (c.payments || []).reduce((t, p) => t + (p.paidAmount || 0), 0);
                                return (
                                    <tr key={c.id}>
                                        <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{c.code}</td>
                                        <td style={{ fontWeight: 500 }}>{c.name}</td>
                                        <td>{c.specialty || '—'}</td>
                                        <td>{c.phone || '—'}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(contractAmt)}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(paidAmt)}</td>
                                        <td>{c.rating ? '⭐'.repeat(Math.min(c.rating, 5)) : '—'}</td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Chưa có nhà thầu phụ</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && <ContractorForm onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchData(); }} toast={toast} />}
        </div>
    );
}

function ContractorForm({ onClose, onSuccess, toast }) {
    const [form, setForm] = useState({ name: '', type: 'Thầu xây dựng', phone: '', taxCode: '', bankAccount: '', bankName: '', address: '', notes: '' });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name) return toast.error('Vui lòng nhập tên');
        setSaving(true);
        try {
            await apiFetch('/api/contractors', { method: 'POST', body: JSON.stringify(form) });
            toast.success('Thêm nhà thầu phụ thành công');
            onSuccess();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                <h3 style={{ marginTop: 0 }}>Thêm nhà thầu phụ</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label className="form-label">Tên *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Loại *</label>
                            <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {CONTRACTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label">SĐT</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group"><label className="form-label">Số TK ngân hàng</label><input className="form-input" value={form.bankAccount} onChange={e => setForm({ ...form, bankAccount: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">Ngân hàng</label><input className="form-input" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group"><label className="form-label">MST</label><input className="form-input" value={form.taxCode} onChange={e => setForm({ ...form, taxCode: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">Địa chỉ</label><input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Ghi chú</label><input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                        <button type="button" className="btn" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Thêm thầu phụ'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
