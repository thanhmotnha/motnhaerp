'use client';
import { useState } from 'react';
import { fmtVND, fmtDate } from '@/lib/projectUtils';

export default function ContractorTab({ project: p, projectId, onRefresh }) {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ contractorId: '', contractAmount: '', paidAmount: '0', description: '', dueDate: '', status: 'Chưa TT' });
    const [contractors, setContractors] = useState([]);
    const [editId, setEditId] = useState(null);
    const [editPaid, setEditPaid] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [saving, setSaving] = useState(false);

    const pays = p.contractorPays || [];
    const totalContract = pays.reduce((s, c) => s + (Number(c.contractAmount) || 0), 0);
    const totalPaid = pays.reduce((s, c) => s + (Number(c.paidAmount) || 0), 0);

    const openModal = async () => {
        if (contractors.length === 0) {
            const res = await fetch('/api/contractors?limit=500');
            const json = await res.json();
            setContractors(json.data || []);
        }
        setForm({ contractorId: '', contractAmount: '', paidAmount: '0', description: '', dueDate: '', status: 'Chưa TT' });
        setShowModal(true);
    };

    const create = async () => {
        if (!form.contractorId) return alert('Chọn thầu phụ!');
        if (!form.contractAmount) return alert('Nhập giá trị hợp đồng!');
        setSaving(true);
        const res = await fetch('/api/contractor-payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, projectId, contractAmount: Number(form.contractAmount), paidAmount: Number(form.paidAmount) || 0 }),
        });
        setSaving(false);
        if (!res.ok) return alert('Lỗi tạo thầu phụ');
        setShowModal(false);
        onRefresh();
    };

    const updatePaid = async (id) => {
        await fetch(`/api/contractor-payments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paidAmount: Number(editPaid), status: editStatus }),
        });
        setEditId(null);
        onRefresh();
    };

    const remove = async (id) => {
        if (!confirm('Xóa thầu phụ này khỏi dự án?')) return;
        await fetch(`/api/contractor-payments/${id}`, { method: 'DELETE' });
        onRefresh();
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
                    <span>Tổng HĐ thầu: <strong>{fmtVND(totalContract)}</strong></span>
                    <span>Đã thanh toán: <strong style={{ color: 'var(--status-success)' }}>{fmtVND(totalPaid)}</strong></span>
                    <span>Còn lại: <strong style={{ color: 'var(--status-danger)' }}>{fmtVND(totalContract - totalPaid)}</strong></span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={openModal}>+ Thêm thầu phụ</button>
            </div>

            {pays.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có thầu phụ</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Thầu phụ</th>
                                <th>Mô tả</th>
                                <th>Giá trị HĐ</th>
                                <th>Đã TT</th>
                                <th>Còn lại</th>
                                <th>Trạng thái</th>
                                <th>Hạn TT</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {pays.map(cp => {
                                const remain = (Number(cp.contractAmount) || 0) - (Number(cp.paidAmount) || 0);
                                const isEditing = editId === cp.id;
                                return (
                                    <tr key={cp.id}>
                                        <td style={{ fontWeight: 600 }}>{cp.contractor?.name}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cp.description || '—'}</td>
                                        <td>{fmtVND(cp.contractAmount)}</td>
                                        <td>
                                            {isEditing
                                                ? <input className="form-input" style={{ width: 110, padding: '4px 6px', fontSize: 12 }} type="number" value={editPaid} onChange={e => setEditPaid(e.target.value)} />
                                                : <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmtVND(cp.paidAmount)}</span>
                                            }
                                        </td>
                                        <td style={{ color: remain > 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 600 }}>{fmtVND(remain)}</td>
                                        <td>
                                            {isEditing
                                                ? <select className="form-input" style={{ fontSize: 12, padding: '4px 6px' }} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                                                    {['Chưa TT', 'TT một phần', 'Đã TT'].map(s => <option key={s}>{s}</option>)}
                                                  </select>
                                                : <span className={`badge ${cp.status === 'Đã TT' ? 'success' : cp.status === 'TT một phần' ? 'warning' : 'muted'}`}>{cp.status}</span>
                                            }
                                        </td>
                                        <td style={{ fontSize: 12 }}>{fmtDate(cp.dueDate)}</td>
                                        <td>
                                            {isEditing ? (
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => updatePaid(cp.id)}>Lưu</button>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setEditId(null)}>Hủy</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => { setEditId(cp.id); setEditPaid(String(cp.paidAmount || 0)); setEditStatus(cp.status || 'Chưa TT'); }}>✏ Cập nhật</button>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--status-danger)' }} onClick={() => remove(cp.id)}>🗑</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Thêm thầu phụ</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thầu phụ *</label>
                                <select className="form-input" value={form.contractorId} onChange={e => setForm({ ...form, contractorId: e.target.value })}>
                                    <option value="">— Chọn thầu phụ —</option>
                                    {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mô tả công việc</label>
                                <input className="form-input" placeholder="Xây thô, lắp điện nước..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Giá trị HĐ (VND) *</label>
                                    <input className="form-input" type="number" value={form.contractAmount} onChange={e => setForm({ ...form, contractAmount: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã thanh toán (VND)</label>
                                    <input className="form-input" type="number" value={form.paidAmount} onChange={e => setForm({ ...form, paidAmount: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hạn thanh toán</label>
                                    <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Trạng thái</label>
                                    <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        {['Chưa TT', 'TT một phần', 'Đã TT'].map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={create} disabled={saving}>
                                    {saving ? 'Đang lưu...' : 'Thêm thầu phụ'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
