'use client';
import { fmt } from '@/lib/quotation-constants';

export default function QuotationSummary({ hook }) {
    const {
        form, setForm,
        directCost, managementFee, adjustmentAmount, total,
        discountAmount, vatAmount, grandTotal,
    } = hook;

    return (
        <div className="card">
            <div className="card-header"><h3>Tổng kết báo giá</h3></div>
            <div className="card-body">
                <div className="quotation-summary-grid">
                    <div className="quotation-summary-row">
                        <span>Chi phí trực tiếp</span>
                        <span className="quotation-summary-value">{fmt(directCost)} đ</span>
                    </div>
                    <div className="quotation-summary-row">
                        <span>Phí quản lý <input className="form-input form-input-compact" type="number"
                            value={form.managementFeeRate || ''} onChange={e => setForm({ ...form, managementFeeRate: parseFloat(e.target.value) || 0 })}
                            style={{ width: 50, display: 'inline-block', margin: '0 4px' }} />%</span>
                        <span className="quotation-summary-value">{fmt(managementFee)} đ</span>
                    </div>
                    <div className="quotation-summary-row">
                        <span>Phí thiết kế <input className="form-input form-input-compact" type="number"
                            value={form.designFee || ''} onChange={e => setForm({ ...form, designFee: parseFloat(e.target.value) || 0 })}
                            style={{ width: 90, display: 'inline-block', marginLeft: 6 }} /></span>
                        <span className="quotation-summary-value">{fmt(form.designFee)} đ</span>
                    </div>
                    <div className="quotation-summary-row">
                        <span>Chi phí khác <input className="form-input form-input-compact" type="number"
                            value={form.otherFee || ''} onChange={e => setForm({ ...form, otherFee: parseFloat(e.target.value) || 0 })}
                            style={{ width: 90, display: 'inline-block', marginLeft: 6 }} /></span>
                        <span className="quotation-summary-value">{fmt(form.otherFee)} đ</span>
                    </div>
                    <div className="quotation-summary-row">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>Điều chỉnh giá
                            <input className="form-input form-input-compact" type="number"
                                value={form.adjustment || ''} onChange={e => setForm({ ...form, adjustment: parseFloat(e.target.value) || 0 })}
                                style={{ width: 100, display: 'inline-block' }} placeholder="+tăng / -giảm" />
                            <div style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-light)', fontSize: 11 }}>
                                <button type="button" onClick={() => setForm({ ...form, adjustmentType: 'amount' })}
                                    style={{ padding: '2px 8px', border: 'none', cursor: 'pointer', background: form.adjustmentType === 'amount' ? 'var(--primary)' : 'transparent', color: form.adjustmentType === 'amount' ? '#fff' : 'var(--text-secondary)', fontWeight: 600 }}>đ</button>
                                <button type="button" onClick={() => setForm({ ...form, adjustmentType: 'percent' })}
                                    style={{ padding: '2px 8px', border: 'none', cursor: 'pointer', background: form.adjustmentType === 'percent' ? 'var(--primary)' : 'transparent', color: form.adjustmentType === 'percent' ? '#fff' : 'var(--text-secondary)', fontWeight: 600 }}>%</button>
                            </div>
                            {form.adjustmentType === 'percent' && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>tính theo %</span>}
                        </span>
                        <span className="quotation-summary-value" style={{ color: adjustmentAmount > 0 ? 'var(--status-success)' : adjustmentAmount < 0 ? 'var(--status-danger)' : '' }}>
                            {adjustmentAmount >= 0 ? '+' : ''}{fmt(adjustmentAmount)} đ
                        </span>
                    </div>
                    <div className="quotation-summary-row quotation-summary-subtotal">
                        <span>Tổng cộng</span><span className="quotation-summary-value">{fmt(total)} đ</span>
                    </div>
                    <div className="quotation-summary-row">
                        <span>Chiết khấu <input className="form-input form-input-compact" type="number"
                            value={form.discount || ''} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })}
                            style={{ width: 50, display: 'inline-block', margin: '0 4px' }} />%</span>
                        <span className="quotation-summary-value" style={{ color: 'var(--status-danger)' }}>-{fmt(discountAmount)} đ</span>
                    </div>
                    <div className="quotation-summary-row">
                        <span>VAT <input className="form-input form-input-compact" type="number"
                            value={form.vat || ''} onChange={e => setForm({ ...form, vat: parseFloat(e.target.value) || 0 })}
                            style={{ width: 50, display: 'inline-block', margin: '0 4px' }} />%</span>
                        <span className="quotation-summary-value">{fmt(vatAmount)} đ</span>
                    </div>
                    <div className="quotation-summary-row quotation-summary-grand">
                        <span>TỔNG GIÁ TRỊ BÁO GIÁ</span><span className="quotation-summary-value">{fmt(grandTotal)} đ</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
