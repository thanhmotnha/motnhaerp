'use client';
import { useState, useEffect } from 'react';

const fmtMoney = (v) => v?.toLocaleString('vi-VN') || '0';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function PublicFurniturePage({ params }) {
    const { token } = params;
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(`/api/public/furniture/${token}`)
            .then(r => r.json())
            .then(d => { if (d.error) setError(d.error); else setOrder(d); })
            .catch(() => setError('Không thể tải trang'))
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) return <CenteredMsg msg="Đang tải..." />;
    if (error) return <CenteredMsg msg={error} isError />;

    const latestDesign = order.designs?.[0];
    const approvedDesign = order.designs?.find(d => d.status === 'approved');

    return (
        <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '20px 16px', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
                {/* Brand header */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', letterSpacing: -0.5 }}>HomeERP</div>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>Nội thất & Xây dựng</div>
                </div>

                {/* Order info card */}
                <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Mã đơn hàng</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>{order.code}</div>
                        </div>
                        <StatusBadge status={order.status} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{order.name}</div>
                    <div style={{ fontSize: 13, color: '#666' }}>{order.customer?.name} · {order.customer?.phone}</div>
                    {order.roomType && <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{order.styleNote} · {order.roomType}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                        <InfoChip label="Tổng giá trị" val={fmtMoney(order.confirmedAmount) + 'đ'} accent />
                        <InfoChip label="Ngày giao dự kiến" val={fmtDate(order.expectedDelivery)} />
                    </div>
                </div>

                {/* Items */}
                {(order.items || []).length > 0 && (
                    <Section title="Hạng mục đặt hàng">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {order.items.map((item, i) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8f9fa', borderRadius: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 500, fontSize: 14 }}>{i + 1}. {item.name}</div>
                                        {item.notes && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{item.notes}</div>}
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                                        <div style={{ fontWeight: 700, color: '#1a1a2e' }}>{fmtMoney(item.amount)}đ</div>
                                        <div style={{ fontSize: 11, color: '#999' }}>{item.quantity} {item.unit}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Design approval */}
                {(order.designs || []).length > 0 && (
                    <Section title="Bản vẽ thiết kế">
                        {order.designs.map(d => (
                            <DesignCard key={d.id} design={d} orderId={order.id} token={token} onApproved={() => {
                                // Reload
                                setLoading(true);
                                fetch(`/api/public/furniture/${token}`).then(r => r.json())
                                    .then(data => { setOrder(data); setLoading(false); });
                            }} />
                        ))}
                    </Section>
                )}

                {/* Material selections */}
                {(order.materialSelections || []).some(s => s.status === 'confirmed') && (
                    <Section title="Vật liệu đã chốt">
                        {order.materialSelections.filter(s => s.status === 'confirmed').map(sel => (
                            <div key={sel.id} style={{ marginBottom: 12 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Đợt {sel.selectionRound}</div>
                                {(sel.items || []).map(mi => (
                                    <div key={mi.id} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                                        <span style={{ flex: 1 }}>{mi.materialName}</span>
                                        {mi.colorCode && <span style={{ color: '#666' }}>Màu: {mi.colorCode}</span>}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </Section>
                )}

                <div style={{ textAlign: 'center', fontSize: 11, color: '#bbb', marginTop: 32, paddingBottom: 20 }}>
                    Trang này được tạo bởi HomeERP · Chỉ dành cho khách hàng được ủy quyền
                </div>
            </div>
        </div>
    );
}

function DesignCard({ design, token, onApproved }) {
    const [showForm, setShowForm] = useState(false);
    const [action, setAction] = useState('');
    const [form, setForm] = useState({ approvedByName: '', customerFeedback: '', rejectionReason: '' });
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(null);

    const STATUS_LABEL = { draft: 'Nháp', submitted: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', superseded: 'Đã thay thế' };
    const STATUS_COLOR = { draft: '#999', submitted: '#e67e22', approved: '#27ae60', rejected: '#e74c3c', superseded: '#999' };

    const submit = async () => {
        if (!form.approvedByName) { alert('Vui lòng nhập tên người duyệt'); return; }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/public/furniture/${token}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ designId: design.id, action, ...form }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Lỗi');
            setDone(action);
            onApproved();
        } catch (e) { alert(e.message); }
        setSubmitting(false);
    };

    return (
        <div style={{ border: `2px solid ${design.status === 'approved' ? '#27ae60' : '#eee'}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>v{design.versionNumber} — {design.versionLabel}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[design.status] }}>{STATUS_LABEL[design.status]}</span>
            </div>
            {design.description && <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>{design.description}</div>}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {design.fileUrl && (
                    <a href={design.fileUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-block', padding: '8px 16px', background: '#f0f4ff', borderRadius: 8, fontSize: 13, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                        Xem bản vẽ
                    </a>
                )}
                {design.renderImageUrl && (
                    <a href={design.renderImageUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-block', padding: '8px 16px', background: '#f0fdf4', borderRadius: 8, fontSize: 13, color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>
                        Xem render 3D
                    </a>
                )}
            </div>

            {design.status === 'approved' && (
                <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontSize: 12, color: '#16a34a' }}>
                    Duyệt bởi: <strong>{design.approvedByName}</strong>
                    {design.customerFeedback && <div style={{ marginTop: 4, color: '#555' }}>Phản hồi: {design.customerFeedback}</div>}
                </div>
            )}
            {design.status === 'rejected' && design.rejectionReason && (
                <div style={{ padding: '8px 12px', background: '#fff5f5', borderRadius: 8, fontSize: 12, color: '#e74c3c' }}>
                    Từ chối: {design.rejectionReason}
                </div>
            )}

            {['submitted', 'draft'].includes(design.status) && (
                done ? (
                    <div style={{ padding: '10px 14px', background: done === 'approve' ? '#f0fdf4' : '#fff5f5', borderRadius: 8, fontWeight: 600, color: done === 'approve' ? '#16a34a' : '#e74c3c' }}>
                        {done === 'approve' ? 'Bạn đã duyệt bản vẽ này.' : 'Bạn đã từ chối bản vẽ này.'}
                    </div>
                ) : showForm ? (
                    <div style={{ marginTop: 12, padding: 16, background: '#f8f9fa', borderRadius: 10 }}>
                        <div style={{ fontWeight: 600, marginBottom: 10, color: action === 'approve' ? '#16a34a' : '#e74c3c' }}>
                            {action === 'approve' ? 'Xác nhận duyệt bản vẽ' : 'Từ chối bản vẽ'}
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Tên người duyệt *</label>
                            <input style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                                placeholder="Họ tên của bạn" value={form.approvedByName} onChange={e => setForm(f => ({ ...f, approvedByName: e.target.value }))} />
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Phản hồi / yêu cầu chỉnh sửa</label>
                            <textarea style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                                rows={3} value={form.customerFeedback} onChange={e => setForm(f => ({ ...f, customerFeedback: e.target.value }))} />
                        </div>
                        {action === 'reject' && (
                            <div style={{ marginBottom: 8 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Lý do từ chối *</label>
                                <textarea style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                                    rows={2} value={form.rejectionReason} onChange={e => setForm(f => ({ ...f, rejectionReason: e.target.value }))} />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                                background: action === 'approve' ? '#16a34a' : '#e74c3c', color: '#fff' }}
                                onClick={submit} disabled={submitting}>
                                {submitting ? 'Đang xử lý...' : (action === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối')}
                            </button>
                            <button style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', background: '#fff', fontWeight: 500 }}
                                onClick={() => { setShowForm(false); setAction(''); }}>
                                Hủy
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: '#16a34a', color: '#fff' }}
                            onClick={() => { setAction('approve'); setShowForm(true); }}>
                            Duyệt bản vẽ
                        </button>
                        <button style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e74c3c', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#e74c3c', background: '#fff' }}
                            onClick={() => { setAction('reject'); setShowForm(true); }}>
                            Yêu cầu chỉnh sửa
                        </button>
                    </div>
                )
            )}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: '#1a1a2e' }}>{title}</div>
            {children}
        </div>
    );
}

function InfoChip({ label, val, accent }) {
    return (
        <div style={{ background: accent ? '#f0f4ff' : '#f8f9fa', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 700, color: accent ? '#2563eb' : '#1a1a2e', fontSize: 15 }}>{val}</div>
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        draft: ['#999', '#f5f5f5', 'Nháp'],
        confirmed: ['#2563eb', '#eff6ff', 'Đã xác nhận'],
        design_review: ['#d97706', '#fffbeb', 'Chờ duyệt TK'],
        design_approved: ['#16a34a', '#f0fdf4', 'TK đã duyệt'],
        material_confirmed: ['#16a34a', '#f0fdf4', 'Đã chốt VL'],
        in_production: ['#d97706', '#fffbeb', 'Đang SX'],
        qc_done: ['#16a34a', '#f0fdf4', 'Đã QC'],
        installing: ['#d97706', '#fffbeb', 'Đang lắp'],
        completed: ['#16a34a', '#f0fdf4', 'Hoàn thành'],
        cancelled: ['#e74c3c', '#fff5f5', 'Đã hủy'],
    };
    const [color, bg, label] = map[status] || ['#999', '#f5f5f5', status];
    return <div style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, color, background: bg }}>{label}</div>;
}

function CenteredMsg({ msg, isError }) {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ textAlign: 'center', color: isError ? '#e74c3c' : '#666' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{isError ? '⚠️' : '⏳'}</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{msg}</div>
            </div>
        </div>
    );
}
