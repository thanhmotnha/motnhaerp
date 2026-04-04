'use client';
import { useState } from 'react';
import { fmtVND, fmtDate, calcPhaseAmounts, PAYMENT_TEMPLATES, CONTRACT_TYPES } from '@/lib/projectUtils';

export default function ContractTab({ project: p, projectId, onRefresh }) {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', type: 'Thi công thô', contractValue: '', signDate: '', startDate: '', endDate: '', notes: '' });
    const [phases, setPhases] = useState([]);
    const [saving, setSaving] = useState(false);

    const setTypeAndPhases = (type) => {
        const template = PAYMENT_TEMPLATES[type] || [];
        setForm(f => ({ ...f, type, name: '' }));
        setPhases(calcPhaseAmounts(template, form.contractValue));
    };

    const setValueAndRecalc = (contractValue) => {
        setForm(f => ({ ...f, contractValue }));
        setPhases(prev => calcPhaseAmounts(prev, contractValue));
    };

    const updatePhase = (idx, field, value) => {
        setPhases(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            if (field === 'pct') {
                updated[idx].amount = Math.round((Number(form.contractValue) || 0) * Number(value) / 100);
            }
            return updated;
        });
    };

    const createContract = async () => {
        if (!form.contractValue) return alert('Nhập giá trị hợp đồng!');
        setSaving(true);
        const cName = form.name.trim() || `HĐ ${form.type} - ${p.name}`;
        const res = await fetch('/api/contracts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, name: cName, contractValue: Number(form.contractValue) || 0, projectId, customerId: p.customerId, paymentPhases: phases }),
        });
        setSaving(false);
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo HĐ'); }
        setShowModal(false);
        setForm({ name: '', type: 'Thi công thô', contractValue: '', signDate: '', startDate: '', endDate: '', notes: '' });
        setPhases([]);
        onRefresh();
    };

    const contracts = p.contracts || [];
    const totalContract = contracts.reduce((s, c) => s + (Number(c.contractValue) || 0), 0);
    const totalPaid = contracts.reduce((s, c) => s + (c.payments || []).filter(ph => ph.status === 'Đã thanh toán').reduce((a, ph) => a + (Number(ph.amount) || 0), 0), 0);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
                    <span>Tổng HĐ: <strong>{fmtVND(totalContract)}</strong></span>
                    <span>Đã thu: <strong style={{ color: 'var(--status-success)' }}>{fmtVND(totalPaid)}</strong></span>
                    <span>Còn lại: <strong style={{ color: 'var(--status-danger)' }}>{fmtVND(totalContract - totalPaid)}</strong></span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Thêm hợp đồng</button>
            </div>

            {contracts.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có hợp đồng</div>
            ) : (
                contracts.map(c => {
                    const paid = (c.payments || []).filter(ph => ph.status === 'Đã thanh toán').reduce((s, ph) => s + (Number(ph.amount) || 0), 0);
                    const pct = c.contractValue > 0 ? Math.round((paid / c.contractValue) * 100) : 0;
                    return (
                        <div key={c.id} className="card" style={{ marginBottom: 16 }}>
                            <div className="card-header" style={{ marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                        {c.code} • Ký: {fmtDate(c.signDate)} • Giá trị: <strong>{fmtVND(c.contractValue)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                        <div style={{ flex: 1, maxWidth: 200, height: 6, background: 'var(--bg-secondary)', borderRadius: 3 }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--status-success)' : 'var(--accent-primary)', borderRadius: 3 }} />
                                        </div>
                                        <span style={{ fontSize: 12 }}>Thu {pct}% ({fmtVND(paid)})</span>
                                    </div>
                                </div>
                                <a href={`/contracts/${c.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>Xem chi tiết →</a>
                            </div>

                            {(c.payments || []).length > 0 && (
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Đợt thanh toán</th>
                                                <th>%</th>
                                                <th>Số tiền</th>
                                                <th>Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {c.payments.map((ph, i) => {
                                                const phasePct = c.contractValue > 0 ? Math.round((ph.amount / c.contractValue) * 100) : 0;
                                                return (
                                                <tr key={i}>
                                                    <td>{ph.phase}</td>
                                                    <td>{phasePct}%</td>
                                                    <td style={{ fontWeight: 600 }}>{fmtVND(ph.amount)}</td>
                                                    <td>
                                                        <span className={`badge ${ph.status === 'Đã thanh toán' ? 'success' : ph.status === 'Đến hạn' ? 'warning' : 'muted'}`}>
                                                            {ph.status || 'Chưa thanh toán'}
                                                        </span>
                                                    </td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Thêm hợp đồng</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 4px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loại HĐ</label>
                                    <select className="form-input" value={form.type} onChange={e => setTypeAndPhases(e.target.value)}>
                                        {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Giá trị HĐ (VND)</label>
                                    <input className="form-input" type="number" placeholder="0" value={form.contractValue} onChange={e => setValueAndRecalc(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tên HĐ (để trống = tự động)</label>
                                <input className="form-input" placeholder={`HĐ ${form.type} - ${p.name}`} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ngày ký</label>
                                    <input className="form-input" type="date" value={form.signDate} onChange={e => setForm({ ...form, signDate: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bắt đầu</label>
                                    <input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Kết thúc</label>
                                    <input className="form-input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                                </div>
                            </div>

                            {phases.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Lịch thanh toán</div>
                                    <table className="data-table" style={{ fontSize: 12 }}>
                                        <thead><tr><th>Đợt</th><th>%</th><th>Số tiền</th></tr></thead>
                                        <tbody>
                                            {phases.map((ph, i) => (
                                                <tr key={i}>
                                                    <td><input className="form-input" style={{ padding: '4px 8px', fontSize: 12 }} value={ph.phase} onChange={e => updatePhase(i, 'phase', e.target.value)} /></td>
                                                    <td><input className="form-input" style={{ padding: '4px 8px', fontSize: 12, width: 60 }} type="number" value={ph.pct} onChange={e => updatePhase(i, 'pct', e.target.value)} /></td>
                                                    <td style={{ fontWeight: 600 }}>{fmtVND(ph.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <textarea className="form-input" rows={2} placeholder="Ghi chú..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={createContract} disabled={saving}>
                                    {saving ? 'Đang lưu...' : 'Tạo hợp đồng'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
