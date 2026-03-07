'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtMoney, fmtDate } from './constants';

export default function PaymentsTab({ order, onRefresh, toast, paidPct }) {
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ amount: '', type: 'installment', method: 'bank_transfer', reference: '', note: '' });
    const [submitting, setSubmitting] = useState(false);

    const addPayment = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await apiFetch(`/api/furniture-orders/${order.id}/payments`, {
                method: 'POST',
                body: JSON.stringify({ ...form, amount: Number(form.amount) }),
            });
            toast.success('Đã ghi nhận thanh toán');
            setShowAdd(false);
            setForm({ amount: '', type: 'installment', method: 'bank_transfer', reference: '', note: '' });
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setSubmitting(false);
    };

    const TYPE_LABEL = { deposit: 'Đặt cọc', installment: 'Thanh toán đợt', final: 'Thanh toán cuối', refund: 'Hoàn tiền' };
    const METHOD_LABEL = { cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', card: 'Thẻ' };
    const payments = order.payments || [];

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>Lịch sử thanh toán</div>
                <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} style={{ fontSize: 12, padding: '5px 12px' }}>+ Ghi nhận TT</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                    { label: 'Tổng đơn hàng', val: fmtMoney(order.confirmedAmount) + 'đ', color: 'var(--accent-primary)' },
                    { label: 'Đã thanh toán', val: fmtMoney(order.paidAmount) + 'đ', color: 'var(--status-success)' },
                    { label: 'Còn lại', val: fmtMoney(order.confirmedAmount - order.paidAmount) + 'đ', color: 'var(--status-danger)' },
                ].map(({ label, val, color }) => (
                    <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                        <div style={{ fontWeight: 700, color, fontSize: 15 }}>{val}</div>
                    </div>
                ))}
            </div>

            {showAdd && (
                <form onSubmit={addPayment} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Ghi nhận thanh toán mới</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div><label className="form-label">Số tiền *</label><input type="number" className="form-input" required min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                        <div><label className="form-label">Loại</label>
                            <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                        <div><label className="form-label">Phương thức</label>
                            <select className="form-select" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                                {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                    </div>
                    <div><label className="form-label">Số tham chiếu</label><input className="form-input" placeholder="Số GD ngân hàng..." value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} /></div>
                    <div><label className="form-label">Ghi chú</label><input className="form-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ fontSize: 12 }}>{submitting ? '...' : 'Lưu'}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)} style={{ fontSize: 12 }}>Hủy</button>
                    </div>
                </form>
            )}

            {payments.length === 0
                ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có thanh toán nào</div>
                : <table className="data-table">
                    <thead><tr><th>Ngày</th><th>Loại</th><th>Phương thức</th><th>Số tiền</th><th>Tham chiếu</th><th>Ghi chú</th></tr></thead>
                    <tbody>
                        {payments.map(p => (
                            <tr key={p.id}>
                                <td style={{ fontSize: 12 }}>{fmtDate(p.paidAt)}</td>
                                <td><span className="badge info" style={{ fontSize: 10 }}>{TYPE_LABEL[p.type] || p.type}</span></td>
                                <td style={{ fontSize: 12 }}>{METHOD_LABEL[p.method] || p.method}</td>
                                <td style={{ fontWeight: 700, color: p.type === 'refund' ? 'var(--status-danger)' : 'var(--status-success)', fontSize: 13 }}>
                                    {p.type === 'refund' ? '-' : ''}{fmtMoney(p.amount)}đ
                                </td>
                                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.note || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            }
        </div>
    );
}
