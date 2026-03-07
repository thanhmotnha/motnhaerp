'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtDate, fmtMoney } from './constants';

export default function OverviewTab({ order, paidPct, onRefresh, role, toast }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        name: order.name, description: order.description || '', styleNote: order.styleNote || '',
        roomType: order.roomType || '', deliveryAddress: order.deliveryAddress || '',
        salesperson: order.salesperson || '', designer: order.designer || '',
        expectedDelivery: order.expectedDelivery ? order.expectedDelivery.split('T')[0] : '',
        internalNote: order.internalNote || '',
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await apiFetch(`/api/furniture-orders/${order.id}`, { method: 'PUT', body: JSON.stringify(form) });
            toast.success('Đã lưu');
            setEditing(false);
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    const activeItems = (order.items || []).filter(i => i.status !== 'cancelled');

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Left: Info card */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontWeight: 600 }}>Thông tin đơn hàng</div>
                    {!editing
                        ? <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setEditing(true)}>Sửa</button>
                        : <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setEditing(false)}>Hủy</button>
                            <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={save} disabled={saving}>{saving ? '...' : 'Lưu'}</button>
                        </div>
                    }
                </div>
                {editing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div><label className="form-label">Tên đơn hàng</label><input className="form-input" value={form.name} onChange={set('name')} /></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div><label className="form-label">Phong cách</label><input className="form-input" value={form.styleNote} onChange={set('styleNote')} /></div>
                            <div><label className="form-label">Phòng/khu vực</label><input className="form-input" value={form.roomType} onChange={set('roomType')} /></div>
                            <div><label className="form-label">Tư vấn</label><input className="form-input" value={form.salesperson} onChange={set('salesperson')} /></div>
                            <div><label className="form-label">Thiết kế viên</label><input className="form-input" value={form.designer} onChange={set('designer')} /></div>
                        </div>
                        <div><label className="form-label">Ngày giao dự kiến</label><input type="date" className="form-input" value={form.expectedDelivery} onChange={set('expectedDelivery')} /></div>
                        <div><label className="form-label">Địa chỉ giao hàng</label><input className="form-input" value={form.deliveryAddress} onChange={set('deliveryAddress')} /></div>
                        <div><label className="form-label">Mô tả yêu cầu</label><textarea className="form-input" rows={2} value={form.description} onChange={set('description')} /></div>
                        <div><label className="form-label">Ghi chú nội bộ</label><textarea className="form-input" rows={2} value={form.internalNote} onChange={set('internalNote')} /></div>
                    </div>
                ) : (
                    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: 13 }}>
                        {[
                            ['Mã đơn', order.code],
                            ['Khách hàng', `${order.customer?.name} (${order.customer?.phone})`],
                            ['Dự án', order.project ? `${order.project.code} — ${order.project.name}` : 'Độc lập'],
                            ['Báo giá', order.quotation ? order.quotation.code : '—'],
                            ['Phong cách', order.styleNote || '—'],
                            ['Phòng/khu vực', order.roomType || '—'],
                            ['Tư vấn', order.salesperson || '—'],
                            ['Thiết kế viên', order.designer || '—'],
                            ['Ngày tạo', fmtDate(order.createdAt)],
                            ['Ngày giao dự kiến', fmtDate(order.expectedDelivery)],
                            ['Ngày giao thực tế', fmtDate(order.deliveredAt)],
                            ['Địa chỉ', order.deliveryAddress || '—'],
                        ].map(([k, v]) => (
                            <><dt key={k} style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{k}</dt><dd key={k + 'v'} style={{ margin: 0, fontWeight: v === '—' ? 400 : 500 }}>{v}</dd></>
                        ))}
                    </dl>
                )}
            </div>

            {/* Right: Finance card + description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card">
                    <div style={{ fontWeight: 600, marginBottom: 12 }}>Tài chính</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                        {[
                            { label: 'Tổng xác nhận', val: fmtMoney(order.confirmedAmount) + 'đ', color: 'var(--accent-primary)' },
                            { label: 'Đã hủy', val: fmtMoney(order.cancelledAmount) + 'đ', color: 'var(--status-danger)' },
                            { label: 'Đặt cọc', val: fmtMoney(order.depositAmount) + 'đ', color: 'var(--text-muted)' },
                            { label: 'Đã thanh toán', val: fmtMoney(order.paidAmount) + 'đ', color: 'var(--status-success)' },
                        ].map(({ label, val, color }) => (
                            <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                                <div style={{ fontWeight: 700, color }}>{val}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span>Tiến độ thanh toán</span><span style={{ fontWeight: 600 }}>{paidPct}%</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${paidPct}%`, background: paidPct >= 100 ? 'var(--status-success)' : 'var(--accent-primary)', borderRadius: 4, transition: 'width 0.3s' }} />
                        </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                        Còn lại: <strong style={{ color: 'var(--status-danger)' }}>{fmtMoney(order.confirmedAmount - order.paidAmount)}đ</strong>
                    </div>
                </div>

                <div className="card">
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Tóm tắt hạng mục</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {[
                            { label: 'Tổng món', val: order.items?.length || 0 },
                            { label: 'Hoạt động', val: activeItems.length },
                            { label: 'Đã hủy', val: (order.items || []).filter(i => i.status === 'cancelled').length },
                        ].map(({ label, val }) => (
                            <div key={label} style={{ flex: 1, textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 0' }}>
                                <div style={{ fontSize: 20, fontWeight: 700 }}>{val}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {order.description && (
                    <div className="card">
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Yêu cầu khách hàng</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{order.description}</div>
                    </div>
                )}
                {order.internalNote && (
                    <div className="card" style={{ borderLeft: '3px solid var(--status-warning)' }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Ghi chú nội bộ</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{order.internalNote}</div>
                    </div>
                )}
                <CustomerLinkCard order={order} onRefresh={onRefresh} toast={toast} />
            </div>
        </div>
    );
}

function CustomerLinkCard({ order, onRefresh, toast }) {
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const publicUrl = order.publicToken
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/public/furniture/${order.publicToken}`
        : null;

    const generateToken = async () => {
        setGenerating(true);
        try {
            await apiFetch(`/api/furniture-orders/${order.id}/token`, { method: 'POST' });
            toast.success('Đã tạo link khách hàng (72 giờ)');
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setGenerating(false);
    };

    const revokeToken = async () => {
        if (!confirm('Thu hồi link khách hàng?')) return;
        try {
            await apiFetch(`/api/furniture-orders/${order.id}/token`, { method: 'DELETE' });
            toast.success('Đã thu hồi link');
            onRefresh();
        } catch (e) { toast.error(e.message); }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(publicUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const isExpired = order.tokenExpiresAt && new Date(order.tokenExpiresAt) < new Date();

    return (
        <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Link khách hàng</div>
            {publicUrl && !isExpired ? (
                <div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <input className="form-input" readOnly value={publicUrl} style={{ fontSize: 11, flex: 1 }} />
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }} onClick={copyLink}>
                            {copied ? 'Đã copy!' : 'Copy'}
                        </button>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                        Hết hạn: {new Date(order.tokenExpiresAt).toLocaleString('vi-VN')}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={generateToken} disabled={generating}>Gia hạn 72h</button>
                        <button className="btn btn-secondary" style={{ fontSize: 12, color: 'var(--status-danger)' }} onClick={revokeToken}>Thu hồi</button>
                    </div>
                </div>
            ) : (
                <div>
                    {isExpired && <div style={{ fontSize: 12, color: 'var(--status-danger)', marginBottom: 8 }}>Link đã hết hạn</div>}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                        Tạo link để khách hàng xem đơn hàng và duyệt bản vẽ (không cần đăng nhập, hết hạn sau 72h).
                    </div>
                    <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={generateToken} disabled={generating}>
                        {generating ? 'Đang tạo...' : 'Tạo link khách hàng'}
                    </button>
                </div>
            )}
        </div>
    );
}
