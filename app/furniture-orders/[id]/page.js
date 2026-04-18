'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package, Palette, Layers, CreditCard, Factory, ChevronRight, ExternalLink, Edit3, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

const STATUS_MAP = {
    draft: { label: 'Nháp', color: '#94a3b8', bg: '#f1f5f9', icon: '📝' },
    confirmed: { label: 'Đã duyệt', color: '#3b82f6', bg: '#dbeafe', icon: '✅' },
    design_review: { label: 'Duyệt TK', color: '#a855f7', bg: '#f3e8ff', icon: '🎨' },
    design_approved: { label: 'TK OK', color: '#8b5cf6', bg: '#ede9fe', icon: '✨' },
    material_confirmed: { label: 'Chốt VL', color: '#06b6d4', bg: '#cffafe', icon: '🧱' },
    in_production: { label: 'Đang SX', color: '#f59e0b', bg: '#fef3c7', icon: '🔧' },
    qc_done: { label: 'QC xong', color: '#14b8a6', bg: '#ccfbf1', icon: '🔍' },
    installing: { label: 'Lắp đặt', color: '#6366f1', bg: '#e0e7ff', icon: '🏗️' },
    completed: { label: 'Hoàn thành', color: '#22c55e', bg: '#dcfce7', icon: '🎉' },
    cancelled: { label: 'Đã hủy', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
    // Production & items
    quality_check: { label: 'Kiểm QC', color: '#8b5cf6', bg: '#ede9fe', icon: '🔍' },
    ready: { label: 'Sẵn giao', color: '#10b981', bg: '#d1fae5', icon: '📦' },
    delivered: { label: 'Đã giao', color: '#06b6d4', bg: '#cffafe', icon: '🚚' },
    on_hold: { label: 'Tạm dừng', color: '#f59e0b', bg: '#fef3c7', icon: '⏸️' },
    planned: { label: 'Kế hoạch', color: '#94a3b8', bg: '#f1f5f9', icon: '📋' },
    in_progress: { label: 'Đang thực hiện', color: '#3b82f6', bg: '#dbeafe', icon: '⚙️' },
    paused: { label: 'Tạm dừng', color: '#f59e0b', bg: '#fef3c7', icon: '⏸️' },
    // Design
    submitted: { label: 'Đã gửi', color: '#3b82f6', bg: '#dbeafe', icon: '📤' },
    approved: { label: 'Duyệt', color: '#22c55e', bg: '#dcfce7', icon: '✅' },
    rejected: { label: 'Từ chối', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
    superseded: { label: 'Cũ', color: '#94a3b8', bg: '#f1f5f9', icon: '📁' },
    // Material
    pending: { label: 'Chờ', color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
    reviewing: { label: 'Đang xem', color: '#3b82f6', bg: '#dbeafe', icon: '👁️' },
    changed: { label: 'Đã đổi', color: '#94a3b8', bg: '#f1f5f9', icon: '🔄' },
};

const Badge = ({ status }) => {
    const s = STATUS_MAP[status] || { label: status, color: '#94a3b8', bg: '#f1f5f9' };
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 12, background: s.bg, color: s.color }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />{s.label}
        </span>
    );
};

const TABS = [
    { key: 'info', label: 'Tổng quan', icon: Package },
    { key: 'items', label: 'Hạng mục', icon: Layers },
    { key: 'designs', label: 'Thiết kế', icon: Palette },
    { key: 'materials', label: 'Vật liệu', icon: Factory },
    { key: 'payments', label: 'Thanh toán', icon: CreditCard },
];

const WORKFLOW = ['draft', 'confirmed', 'design_review', 'design_approved', 'material_confirmed', 'in_production', 'qc_done', 'installing', 'completed'];

// ─── MAIN COMPONENT ──────────────────────────────────────
export default function FurnitureOrderDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('info');
    const [transitioning, setTransitioning] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/furniture-orders/${id}`);
            if (!r.ok) throw new Error();
            setOrder(await r.json());
        } catch { }
        setLoading(false);
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const advanceStatus = async () => {
        const idx = WORKFLOW.indexOf(order.status);
        if (idx < 0 || idx >= WORKFLOW.length - 1) return;
        const next = WORKFLOW[idx + 1];
        if (!confirm(`Chuyển trạng thái → "${STATUS_MAP[next]?.label}"?`)) return;
        setTransitioning(true);
        try {
            await fetch(`/api/furniture-orders/${id}/status`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: next }),
            });
            await load();
        } catch { }
        setTransitioning(false);
    };

    if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    if (!order) return <div style={{ padding: 60, textAlign: 'center' }}>Không tìm thấy đơn hàng</div>;

    const st = STATUS_MAP[order.status] || STATUS_MAP.draft;
    const currentStep = WORKFLOW.indexOf(order.status);
    const paid = order.paidAmount || 0;
    const total = order.totalAmount || 0;

    return (
        <div>
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => router.push('/furniture-orders')} style={{ padding: '6px 10px' }}>
                    <ArrowLeft size={18} />
                </button>
                <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-accent)', fontWeight: 600 }}>{order.code}</span>
                        <Badge status={order.status} />
                    </div>
                    <h2 style={{ margin: '4px 0 0', fontSize: 20 }}>{order.name || 'Đơn nội thất'}</h2>
                </div>
                {currentStep >= 0 && currentStep < WORKFLOW.length - 1 && order.status !== 'cancelled' && (
                    <button className="btn btn-primary" onClick={advanceStatus} disabled={transitioning} style={{ gap: 6 }}>
                        {transitioning ? '...' : <>Chuyển → {STATUS_MAP[WORKFLOW[currentStep + 1]]?.label} <ChevronRight size={16} /></>}
                    </button>
                )}
            </div>

            {/* ── Workflow Progress ── */}
            {order.status !== 'cancelled' && (
                <div className="card" style={{ marginBottom: 20, padding: '16px 20px', overflowX: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 700 }}>
                        {WORKFLOW.map((step, i) => {
                            const s = STATUS_MAP[step];
                            const done = i <= currentStep;
                            const active = i === currentStep;
                            return (
                                <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 13, fontWeight: 700,
                                            background: active ? s.color : done ? 'var(--color-success)' : 'var(--bg-tertiary)',
                                            color: done || active ? '#fff' : 'var(--text-muted)',
                                            border: active ? `2px solid ${s.color}` : 'none',
                                            boxShadow: active ? `0 0 0 3px ${s.bg}` : 'none',
                                        }}>
                                            {done && !active ? '✓' : i + 1}
                                        </div>
                                        <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? s.color : done ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            {s.label}
                                        </span>
                                    </div>
                                    {i < WORKFLOW.length - 1 && (
                                        <div style={{ height: 2, flex: 1, background: i < currentStep ? 'var(--color-success)' : 'var(--bg-tertiary)', minWidth: 12 }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Tab Bar ── */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', borderBottom: '2px solid var(--bg-tertiary)', paddingBottom: 0 }}>
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
                            color: tab === t.key ? 'var(--color-primary)' : 'var(--text-secondary)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            borderBottom: tab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                            marginBottom: -2, whiteSpace: 'nowrap',
                        }}>
                        <t.icon size={16} /> {t.label}
                        {t.key === 'items' && <span style={{ fontSize: 11, background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 8, marginLeft: 2 }}>{order.items?.length || 0}</span>}
                        {t.key === 'designs' && <span style={{ fontSize: 11, background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 8, marginLeft: 2 }}>{order.designs?.length || 0}</span>}
                        {t.key === 'payments' && <span style={{ fontSize: 11, background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 8, marginLeft: 2 }}>{order.payments?.length || 0}</span>}
                    </button>
                ))}
            </div>

            {/* ── Tab Content ── */}
            {tab === 'info' && <InfoTab order={order} />}
            {tab === 'items' && <ItemsTab items={order.items || []} />}
            {tab === 'designs' && <DesignsTab designs={order.designs || []} />}
            {tab === 'materials' && <MaterialsTab selections={order.materialSelections || []} />}
            {tab === 'payments' && <PaymentsTab payments={order.payments || []} total={total} paid={paid} />}
        </div>
    );
}

// ─── INFO TAB ─────────────────────────────────────────────
function InfoTab({ order }) {
    const paid = order.paidAmount || 0;
    const total = order.totalAmount || 0;
    const remaining = total - paid;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {/* Left: Order Info */}
            <div className="card" style={{ padding: 20 }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 15 }}>📋 Thông tin đơn hàng</h4>
                <div style={{ display: 'grid', gap: 10 }}>
                    <InfoRow label="Mã đơn" value={order.code} accent />
                    <InfoRow label="Tên" value={order.name} />
                    <InfoRow label="Khách hàng" value={order.customer?.name} />
                    <InfoRow label="Dự án" value={order.project ? order.project.name : '—'} />
                    <InfoRow label="Báo giá" value={order.quotation?.code} />
                    <InfoRow label="Hợp đồng" value={order.contract?.code} />
                    <InfoRow label="Giao dự kiến" value={fmtDate(order.expectedDelivery)} />
                    {order.deliveredAt && <InfoRow label="Ngày giao thực" value={fmtDate(order.deliveredAt)} />}
                    <InfoRow label="Ngày tạo" value={fmtDateTime(order.createdAt)} />
                    {order.notes && <InfoRow label="Ghi chú" value={order.notes} />}
                </div>
            </div>

            {/* Right: Financial Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card" style={{ padding: 20 }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 15 }}>💰 Tài chính</h4>
                    <div style={{ display: 'grid', gap: 10 }}>
                        <InfoRow label="Tổng tiền hàng" value={fmt(total)} bold />
                        <InfoRow label="Đã thanh toán" value={fmt(paid)} accent />
                        <InfoRow label="Còn lại" value={fmt(remaining)} warn={remaining > 0} />
                        {total > 0 && (
                            <div style={{ marginTop: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>
                                    <span>Tiến độ thanh toán</span>
                                    <span style={{ fontWeight: 600 }}>{pct(paid, total)}%</span>
                                </div>
                                <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct(paid, total)}%`, background: pct(paid, total) >= 100 ? 'var(--color-success)' : 'var(--color-primary)', borderRadius: 4, transition: 'width 0.3s' }} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="card" style={{ padding: 20 }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 15 }}>📊 Thống kê</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <MiniStat label="Hạng mục" value={order.items?.length || 0} icon="📦" />
                        <MiniStat label="Bản TK" value={order.designs?.length || 0} icon="🎨" />
                        <MiniStat label="Đợt VL" value={order.materialSelections?.length || 0} icon="🧱" />
                        <MiniStat label="Lô SX" value={order.batches?.length || 0} icon="🏭" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value, accent, bold, warn }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>{label}</span>
            <span style={{
                fontSize: 13, textAlign: 'right', wordBreak: 'break-word',
                fontWeight: bold ? 700 : accent ? 600 : 400,
                color: warn ? 'var(--color-warning)' : accent ? 'var(--text-accent)' : 'var(--text-primary)',
            }}>{value || '—'}</span>
        </div>
    );
}

function MiniStat({ label, value, icon }) {
    return (
        <div style={{ textAlign: 'center', padding: 10, borderRadius: 8, background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>{icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
        </div>
    );
}

// ─── ITEMS TAB ────────────────────────────────────────────
function ItemsTab({ items }) {
    if (!items.length) return <Empty text="Chưa có hạng mục nào" />;
    const total = items.reduce((s, i) => s + (i.amount || 0), 0);
    return (
        <div className="card">
            <div className="table-container"><table className="data-table">
                <thead><tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Hạng mục</th>
                    <th>Sản phẩm</th>
                    <th style={{ textAlign: 'center' }}>SL</th>
                    <th>ĐVT</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                    <th>Trạng thái</th>
                    <th>Ghi chú</th>
                </tr></thead>
                <tbody>
                    {items.map((item, i) => (
                        <tr key={item.id}>
                            <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                            <td className="primary">{item.name}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.product?.name || '—'}</td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                            <td style={{ fontSize: 12 }}>{item.unit}</td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(item.unitPrice)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(item.amount)}</td>
                            <td><Badge status={item.status} /></td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.notes || '—'}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot><tr>
                    <td colSpan={6} style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>Tổng cộng:</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--text-accent)' }}>{fmt(total)}</td>
                    <td colSpan={2} />
                </tr></tfoot>
            </table></div>
        </div>
    );
}

// ─── DESIGNS TAB ──────────────────────────────────────────
function DesignsTab({ designs }) {
    if (!designs.length) return <Empty text="Chưa có bản thiết kế nào" />;
    return (
        <div style={{ display: 'grid', gap: 12 }}>
            {designs.map(d => (
                <div key={d.id} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-accent)' }}>
                                    Phiên bản {d.versionNumber}
                                </span>
                                {d.versionLabel && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({d.versionLabel})</span>}
                                <Badge status={d.status} />
                            </div>
                            {d.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px' }}>{d.description}</p>}
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                                {d.submittedAt && <span>Gửi: {fmtDate(d.submittedAt)} ({d.submittedBy})</span>}
                                {d.approvedAt && <span style={{ color: 'var(--color-success)' }}>✓ Duyệt: {fmtDate(d.approvedAt)} ({d.approvedByName})</span>}
                                {d.rejectionReason && <span style={{ color: 'var(--color-danger)' }}>✗ Lý do: {d.rejectionReason}</span>}
                            </div>
                            {d.customerFeedback && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0', fontStyle: 'italic' }}>💬 KH: {d.customerFeedback}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {d.fileUrl && (
                                <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px', gap: 4 }}>
                                    <ExternalLink size={14} /> File TK
                                </a>
                            )}
                            {d.renderImageUrl && (
                                <a href={d.renderImageUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px', gap: 4 }}>
                                    <ExternalLink size={14} /> Render
                                </a>
                            )}
                        </div>
                    </div>
                    {d.technicalSpec && (
                        <div style={{ marginTop: 10, padding: 10, borderRadius: 6, background: 'var(--bg-secondary)', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
                            📐 {d.technicalSpec}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── MATERIALS TAB ────────────────────────────────────────
function MaterialsTab({ selections }) {
    if (!selections.length) return <Empty text="Chưa chốt vật liệu" />;
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            {selections.map(sel => (
                <div key={sel.id} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>Đợt {sel.selectionRound}</span>
                            {sel.title && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>— {sel.title}</span>}
                            <Badge status={sel.status} />
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {sel.confirmedAt && <span style={{ color: 'var(--color-success)' }}>✓ Xác nhận: {fmtDate(sel.confirmedAt)} ({sel.confirmedByName})</span>}
                        </div>
                    </div>
                    {sel.notes && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px', fontStyle: 'italic' }}>{sel.notes}</p>}
                    {sel.items?.length > 0 && (
                        <div className="table-container"><table className="data-table" style={{ fontSize: 12 }}>
                            <thead><tr>
                                <th>Vật liệu</th><th>Mã</th><th>Màu</th><th>Loại bề mặt</th>
                                <th>Nhà CC</th><th>Khu vực SD</th><th style={{ textAlign: 'center' }}>SL</th>
                                <th style={{ textAlign: 'right' }}>Đơn giá</th>
                            </tr></thead>
                            <tbody>{sel.items.map(it => (
                                <tr key={it.id}>
                                    <td className="primary">{it.materialName}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{it.materialCode || '—'}</td>
                                    <td>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            {it.colorCode && <span style={{ width: 12, height: 12, borderRadius: 3, background: it.colorCode, border: '1px solid var(--bg-tertiary)', flexShrink: 0 }} />}
                                            {it.colorName || '—'}
                                        </span>
                                    </td>
                                    <td>{it.finishType || '—'}</td>
                                    <td>{it.supplier || '—'}</td>
                                    <td>{it.applicationArea || '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{it.quantity > 0 ? `${it.quantity} ${it.unit}` : '—'}</td>
                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{it.unitPrice > 0 ? fmt(it.unitPrice) : '—'}</td>
                                </tr>
                            ))}</tbody>
                        </table></div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── PAYMENTS TAB ─────────────────────────────────────────
const PAYMENT_TYPE_MAP = {
    deposit: { label: 'Cọc', color: '#3b82f6', bg: '#dbeafe' },
    installment: { label: 'Đợt', color: '#f59e0b', bg: '#fef3c7' },
    final: { label: 'Cuối', color: '#22c55e', bg: '#dcfce7' },
    refund: { label: 'Hoàn', color: '#ef4444', bg: '#fee2e2' },
};

function PaymentsTab({ payments, total, paid }) {
    const remaining = total - paid;
    return (
        <div>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmt(total)}</div><div className="stat-label">Tổng đơn</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ color: 'var(--color-success)' }}>{fmt(paid)}</div><div className="stat-label">Đã thu ({pct(paid, total)}%)</div></div></div>
                <div className="stat-card"><div className="stat-icon">{remaining > 0 ? '⚠️' : '🎉'}</div><div><div className="stat-value" style={{ color: remaining > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>{fmt(remaining)}</div><div className="stat-label">Còn lại</div></div></div>
            </div>

            {/* Progress bar */}
            {total > 0 && (
                <div className="card" style={{ padding: '12px 20px', marginBottom: 16 }}>
                    <div style={{ height: 10, borderRadius: 5, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct(paid, total)}%`, background: pct(paid, total) >= 100 ? 'var(--color-success)' : 'var(--color-primary)', borderRadius: 5, transition: 'width 0.3s' }} />
                    </div>
                </div>
            )}

            {/* Payment List */}
            {payments.length === 0 ? <Empty text="Chưa có thanh toán nào" /> : (
                <div className="card">
                    <div className="table-container"><table className="data-table">
                        <thead><tr>
                            <th>Ngày</th><th>Loại</th><th>Phương thức</th>
                            <th style={{ textAlign: 'right' }}>Số tiền</th>
                            <th>Mã tham chiếu</th><th>Ghi chú</th><th>Người tạo</th>
                        </tr></thead>
                        <tbody>{payments.map(p => {
                            const t = PAYMENT_TYPE_MAP[p.type] || { label: p.type, color: '#94a3b8', bg: '#f1f5f9' };
                            return (
                                <tr key={p.id}>
                                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDateTime(p.paidAt)}</td>
                                    <td>
                                        <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: t.bg, color: t.color }}>{t.label}</span>
                                    </td>
                                    <td style={{ fontSize: 12 }}>{p.method || '—'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: p.type === 'refund' ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                        {p.type === 'refund' ? '-' : '+'}{fmt(p.amount)}
                                    </td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                                    <td style={{ fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.note || '—'}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.createdBy || '—'}</td>
                                </tr>
                            );
                        })}</tbody>
                    </table></div>
                </div>
            )}
        </div>
    );
}

function Empty({ text }) {
    return <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>{text}</div>;
}
