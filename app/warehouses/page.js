'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const EMPTY = { name: '', address: '', manager: '', phone: '', status: 'Hoạt động' };

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const d = await apiFetch('/api/warehouses');
            setWarehouses(Array.isArray(d) ? d : []);
        } catch (e) { alert(e.message); }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY);
        setShowForm(true);
    };

    const openEdit = (w) => {
        setEditing(w);
        setForm({
            name: w.name,
            address: w.address || '',
            manager: w.manager || '',
            phone: w.phone || '',
            status: w.status || 'Hoạt động',
        });
        setShowForm(true);
    };

    const save = async () => {
        if (!form.name.trim()) return alert('Tên kho bắt buộc');
        setSaving(true);
        try {
            if (editing) {
                await apiFetch(`/api/warehouses/${editing.id}`, { method: 'PUT', body: form });
            } else {
                await apiFetch('/api/warehouses', { method: 'POST', body: form });
            }
            setShowForm(false);
            load();
        } catch (e) { alert(e.message); }
        setSaving(false);
    };

    const remove = async (w) => {
        if (!confirm(`Xóa kho "${w.name}"?`)) return;
        try {
            await apiFetch(`/api/warehouses/${w.id}`, { method: 'DELETE' });
            load();
        } catch (e) { alert(e.message); }
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>🏭 Quản lý kho</h2>
                <button className="btn btn-primary" onClick={openCreate}>+ Thêm kho</button>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã</th>
                                <th>Tên kho</th>
                                <th>Địa chỉ</th>
                                <th>Người phụ trách</th>
                                <th>SĐT</th>
                                <th style={{ textAlign: 'center' }}>Số SP</th>
                                <th>Trạng thái</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {warehouses.map(w => (
                                <tr key={w.id}>
                                    <td className="accent">{w.code}</td>
                                    <td className="primary">{w.name}</td>
                                    <td style={{ fontSize: 12 }}>{w.address || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{w.manager || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{w.phone || '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{w._count?.products || 0}</td>
                                    <td>
                                        <span className="badge" style={{
                                            background: w.status === 'Hoạt động' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)',
                                            color: w.status === 'Hoạt động' ? 'var(--status-success)' : 'var(--text-muted)',
                                            fontSize: 11, padding: '2px 8px',
                                        }}>{w.status}</span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(w)} title="Sửa">✏️</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => remove(w)} title="Xóa" style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {warehouses.length === 0 && (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chưa có kho nào</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h3>{editing ? 'Sửa kho' : 'Thêm kho mới'}</h3>
                            <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label className="form-label">Tên kho *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Kho Ngô Hùng" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label className="form-label">Địa chỉ</label>
                                <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div className="form-group">
                                    <label className="form-label">Người phụ trách</label>
                                    <input className="form-input" value={form.manager} onChange={e => setForm({ ...form, manager: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">SĐT</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Trạng thái</label>
                                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <option value="Hoạt động">Hoạt động</option>
                                    <option value="Ngừng">Ngừng</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={save} disabled={saving}>
                                {saving ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Tạo kho')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
