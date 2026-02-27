'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const TYPE_OPTIONS = ['Thiết kế kiến trúc', 'Thiết kế nội thất', 'Thi công thô', 'Thi công hoàn thiện', 'Thi công nội thất'];

// Payment templates per contract type
const PAYMENT_TEMPLATES = {
    'Thiết kế kiến trúc': [
        { phase: 'Đặt cọc thiết kế', pct: 50 },
        { phase: 'Nghiệm thu bản vẽ', pct: 50 },
    ],
    'Thiết kế nội thất': [
        { phase: 'Đặt cọc thiết kế nội thất', pct: 50 },
        { phase: 'Nghiệm thu phối cảnh 3D', pct: 30 },
        { phase: 'Nghiệm thu bản vẽ triển khai', pct: 20 },
    ],
    'Thi công thô': [
        { phase: 'Đặt cọc thi công', pct: 30 },
        { phase: 'Hoàn thiện móng + khung', pct: 30 },
        { phase: 'Hoàn thiện xây thô', pct: 30 },
        { phase: 'Nghiệm thu bàn giao thô', pct: 10 },
    ],
    'Thi công hoàn thiện': [
        { phase: 'Đặt cọc hoàn thiện', pct: 30 },
        { phase: 'Hoàn thiện trát + ốp lát', pct: 25 },
        { phase: 'Hoàn thiện sơn + điện nước', pct: 25 },
        { phase: 'Nghiệm thu bàn giao', pct: 20 },
    ],
    'Thi công nội thất': [
        { phase: 'Đặt cọc nội thất', pct: 50 },
        { phase: 'Giao hàng + lắp đặt', pct: 40 },
        { phase: 'Nghiệm thu hoàn thiện', pct: 10 },
    ],
};

export default function CreateContractPage() {
    const router = useRouter();
    const [customers, setCustomers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [saving, setSaving] = useState(false);
    const [paymentPhases, setPaymentPhases] = useState([]);

    const [form, setForm] = useState({
        name: '', type: 'Thi công thô', contractValue: 0, signDate: '', startDate: '', endDate: '',
        paymentTerms: '', notes: '', customerId: '', projectId: '', quotationId: '',
    });

    useEffect(() => {
        fetch('/api/customers').then(r => r.json()).then(setCustomers);
        fetch('/api/projects').then(r => r.json()).then(setProjects);
        fetch('/api/quotations').then(r => r.json()).then(setQuotations);
    }, []);

    // Auto-load template when type changes
    useEffect(() => {
        const tmpl = PAYMENT_TEMPLATES[form.type] || [];
        setPaymentPhases(tmpl.map(t => ({
            phase: t.phase,
            pct: t.pct,
            amount: Math.round((form.contractValue || 0) * t.pct / 100),
        })));
    }, [form.type]);

    // Recalc amounts when contractValue changes
    useEffect(() => {
        setPaymentPhases(prev => prev.map(p => ({
            ...p,
            amount: Math.round((form.contractValue || 0) * p.pct / 100),
        })));
    }, [form.contractValue]);

    const availableQuotations = quotations.filter(q => q.status === 'Hợp đồng' && (q._count?.contracts || 0) === 0);
    const filteredProjects = form.customerId ? projects.filter(p => p.customerId === form.customerId) : projects;

    const totalPhasePct = paymentPhases.reduce((s, p) => s + (p.pct || 0), 0);
    const totalPhaseAmount = paymentPhases.reduce((s, p) => s + (p.amount || 0), 0);

    const selectQuotation = (qId) => {
        const q = quotations.find(x => x.id === qId);
        if (q) {
            setForm(f => ({
                ...f,
                quotationId: qId,
                customerId: q.customerId || f.customerId,
                projectId: q.projectId || f.projectId,
                type: q.type || f.type,
                contractValue: q.grandTotal || q.total || f.contractValue,
                name: f.name || `HĐ ${q.type} - ${q.customer?.name || ''}`.trim(),
            }));
        } else {
            setForm(f => ({ ...f, quotationId: '' }));
        }
    };

    const updatePhase = (idx, field, value) => {
        setPaymentPhases(prev => prev.map((p, i) => {
            if (i !== idx) return p;
            const updated = { ...p, [field]: value };
            if (field === 'pct') updated.amount = Math.round((form.contractValue || 0) * (Number(value) || 0) / 100);
            if (field === 'amount') updated.pct = form.contractValue ? Math.round((Number(value) || 0) / form.contractValue * 100) : 0;
            return updated;
        }));
    };

    const addPhase = () => setPaymentPhases(prev => [...prev, { phase: '', pct: 0, amount: 0 }]);
    const removePhase = (idx) => setPaymentPhases(prev => prev.filter((_, i) => i !== idx));

    const handleSave = async () => {
        if (!form.name.trim()) return alert('Nhập tên hợp đồng!');
        if (!form.customerId) return alert('Chọn khách hàng!');
        if (!form.projectId) return alert('Chọn dự án!');
        setSaving(true);
        try {
            const res = await fetch('/api/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, paymentPhases }),
            });
            if (res.ok) {
                const saved = await res.json();
                alert('Đã tạo hợp đồng thành công!');
                router.push(`/contracts/${saved.id}`);
            } else {
                const err = await res.json();
                alert('Lỗi: ' + (err.error || 'Unknown'));
            }
        } catch (e) { alert('Lỗi: ' + e.message); }
        setSaving(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0 }}>📝 Tạo hợp đồng mới</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => router.back()}>← Quay lại</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? '⏳ Đang lưu...' : '💾 Tạo hợp đồng'}</button>
                </div>
            </div>

            {/* Chọn từ báo giá */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3>📄 Tạo từ báo giá (tùy chọn)</h3></div>
                <div className="card-body">
                    {availableQuotations.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Chưa có báo giá nào ở trạng thái "Hợp đồng". Bạn vẫn có thể tạo hợp đồng thủ công bên dưới.</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                            {availableQuotations.map(q => (
                                <div key={q.id}
                                    onClick={() => selectQuotation(q.id)}
                                    style={{
                                        border: form.quotationId === q.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                        borderRadius: 10, padding: 14, cursor: 'pointer',
                                        background: form.quotationId === q.id ? 'var(--primary-alpha)' : 'var(--bg-card)',
                                        transition: 'all 0.2s',
                                    }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="badge info" style={{ fontSize: 11 }}>{q.code}</span>
                                        <span className="badge success">{q.status}</span>
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{q.customer?.name || 'N/A'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{q.type}</div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', marginTop: 6 }}>{fmt(q.grandTotal || q.total || 0)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Form thông tin hợp đồng */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3>Thông tin hợp đồng</h3></div>
                <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                        <div>
                            <label className="form-label">Tên hợp đồng *</label>
                            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: HĐ Thi công thô - Biệt thự ABC" />
                        </div>
                        <div>
                            <label className="form-label">Khách hàng *</label>
                            <select className="form-select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value, projectId: '' })}>
                                <option value="">-- Chọn khách hàng --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Dự án *</label>
                            <select className="form-select" value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                                <option value="">-- Chọn dự án --</option>
                                {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Loại hợp đồng</label>
                            <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Giá trị hợp đồng</label>
                            <input className="form-input" type="number" value={form.contractValue || ''} onChange={e => setForm({ ...form, contractValue: parseFloat(e.target.value) || 0 })} />
                            {form.contractValue > 0 && <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>{fmt(form.contractValue)}</div>}
                        </div>
                        <div>
                            <label className="form-label">Ngày ký</label>
                            <input className="form-input" type="date" value={form.signDate} onChange={e => setForm({ ...form, signDate: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Ngày bắt đầu</label>
                            <input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Ngày kết thúc</label>
                            <input className="form-input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                        <label className="form-label">Ghi chú</label>
                        <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ghi chú thêm..." />
                    </div>
                </div>
            </div>

            {/* Tiến độ thanh toán */}
            <div className="card">
                <div className="card-header">
                    <h3>💰 Tiến độ thanh toán</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: totalPhasePct === 100 ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: 600 }}>
                            Tổng: {totalPhasePct}%
                        </span>
                        {form.contractValue > 0 && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>= {fmt(totalPhaseAmount)}</span>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={addPhase}>➕ Thêm đợt</button>
                    </div>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {paymentPhases.length === 0 ? (
                        <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                            Chọn loại hợp đồng để tự động tạo tiến độ thanh toán
                        </div>
                    ) : (
                        <table className="data-table" style={{ margin: 0 }}>
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>#</th>
                                    <th>Giai đoạn thanh toán</th>
                                    <th style={{ width: 100, textAlign: 'center' }}>%</th>
                                    <th style={{ width: 180, textAlign: 'right' }}>Số tiền</th>
                                    <th style={{ width: 50 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentPhases.map((p, idx) => (
                                    <tr key={idx}>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{idx + 1}</td>
                                        <td>
                                            <input className="form-input form-input-compact" value={p.phase}
                                                onChange={e => updatePhase(idx, 'phase', e.target.value)}
                                                placeholder="Tên đợt thanh toán" style={{ width: '100%' }} />
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <input className="form-input form-input-compact" type="number" value={p.pct || ''}
                                                    onChange={e => updatePhase(idx, 'pct', parseFloat(e.target.value) || 0)}
                                                    style={{ width: 60, textAlign: 'center' }} />
                                                <span style={{ fontSize: 12 }}>%</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <input className="form-input form-input-compact" type="number" value={p.amount || ''}
                                                onChange={e => updatePhase(idx, 'amount', parseFloat(e.target.value) || 0)}
                                                style={{ width: '100%', textAlign: 'right' }} />
                                        </td>
                                        <td>
                                            <button className="btn btn-ghost" onClick={() => removePhase(idx)}
                                                style={{ padding: '2px 6px', fontSize: 11, color: 'var(--status-danger)' }}>✕</button>
                                        </td>
                                    </tr>
                                ))}
                                <tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                                    <td></td>
                                    <td>Tổng cộng</td>
                                    <td style={{ textAlign: 'center', color: totalPhasePct === 100 ? 'var(--status-success)' : 'var(--status-danger)' }}>{totalPhasePct}%</td>
                                    <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{fmt(totalPhaseAmount)}</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
