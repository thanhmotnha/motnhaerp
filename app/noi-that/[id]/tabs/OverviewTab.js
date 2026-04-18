'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const NEXT_ACTION = {
    draft: { label: 'Xác nhận đơn hàng', targetStatus: 'confirmed' },
    confirmed: { label: 'Chốt vật liệu', targetStatus: 'material_confirmed' },
    in_production: { label: 'Bắt đầu lắp đặt', targetStatus: 'installing' },
    installing: { label: 'Bàn giao & Bảo hành', targetStatus: 'warranty' },
};

const guessType = (applicationArea, materialName) => {
    const s = ((applicationArea || '') + ' ' + (materialName || '')).toLowerCase();
    if (s.includes('acrylic')) return 'ACRYLIC';
    if (s.includes('nẹp') || s.includes('nep')) return 'NEP';
    return 'VAN';
};

export default function OverviewTab({ order, onRefresh }) {
    const action = NEXT_ACTION[order.status];
    const [showEdit, setShowEdit] = useState(false);
    const [saving, setSaving] = useState(false);
    const [projects, setProjects] = useState([]);
    const [form, setForm] = useState({
        name: order.name || '',
        projectId: order.projectId || '',
        deliveryAddress: order.deliveryAddress || '',
        expectedDelivery: order.expectedDelivery ? order.expectedDelivery.slice(0, 10) : '',
        styleNote: order.styleNote || '',
        roomType: order.roomType || '',
        salesperson: order.salesperson || '',
        designer: order.designer || '',
        internalNote: order.internalNote || '',
    });

    // Reset form when order changes
    useEffect(() => {
        setForm({
            name: order.name || '',
            projectId: order.projectId || '',
            deliveryAddress: order.deliveryAddress || '',
            expectedDelivery: order.expectedDelivery ? order.expectedDelivery.slice(0, 10) : '',
            styleNote: order.styleNote || '',
            roomType: order.roomType || '',
            salesperson: order.salesperson || '',
            designer: order.designer || '',
            internalNote: order.internalNote || '',
        });
    }, [order.id]);

    const openEdit = async () => {
        if (projects.length === 0) {
            try {
                const res = await apiFetch('/api/projects?limit=500&status=Đang thi công');
                setProjects(res.data || []);
            } catch { setProjects([]); }
        }
        setShowEdit(true);
    };

    const saveEdit = async () => {
        setSaving(true);
        try {
            await apiFetch(`/api/furniture-orders/${order.id}`, {
                method: 'PUT',
                body: {
                    ...form,
                    projectId: form.projectId || null,
                    expectedDelivery: form.expectedDelivery || null,
                },
            });
            setShowEdit(false);
            onRefresh();
        } catch (err) { alert(err.message || 'Lỗi lưu'); }
        setSaving(false);
    };

    const advanceStatus = async () => {
        if (!action) return;
        if (!confirm(`Chuyển sang "${action.label}"?`)) return;
        try {
            await apiFetch(`/api/furniture-orders/${order.id}`, {
                method: 'PUT',
                body: { status: action.targetStatus },
            });

            if (action.targetStatus === 'material_confirmed') {
                const allItems = (order.materialSelections || []).flatMap(s => s.items || []);
                if (allItems.length > 0) {
                    const byType = { VAN: [], NEP: [], ACRYLIC: [] };
                    allItems.forEach(it => {
                        const type = guessType(it.applicationArea, it.materialName);
                        byType[type].push({
                            name: it.materialName || it.colorName || '',
                            colorCode: it.colorCode || '',
                            quantity: it.quantity || 0,
                            unit: it.unit || '',
                            unitPrice: it.unitPrice || 0,
                            notes: it.applicationArea || '',
                        });
                    });
                    await Promise.all(
                        Object.entries(byType)
                            .filter(([, items]) => items.length > 0)
                            .map(([type, items]) =>
                                apiFetch(`/api/furniture-orders/${order.id}/material-orders/${type}`, {
                                    method: 'PUT', body: { items },
                                })
                            )
                    );
                }
            }

            onRefresh();
        } catch (err) {
            alert(err.message || 'Lỗi cập nhật');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Thông tin đơn hàng</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={openEdit}>✏️ Sửa</button>
                        {action && (
                            <button className="btn btn-primary btn-sm" onClick={advanceStatus}>{action.label} →</button>
                        )}
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingBottom: 12 }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Khách hàng</div>
                        <div style={{ fontWeight: 600 }}>{order.customer?.name}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dự án</div>
                        <div>
                            {order.project ? (
                                <a href={`/projects/${order.project.code || order.projectId}`}
                                    style={{ color: 'var(--status-info)', textDecoration: 'none', fontWeight: 500 }}>
                                    {order.project.name}
                                </a>
                            ) : (
                                <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 12 }}
                                    onClick={openEdit}>
                                    + Gắn dự án
                                </button>
                            )}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Người bán</div>
                        <div>{order.salesperson || '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Thiết kế</div>
                        <div>{order.designer || '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Địa chỉ giao</div>
                        <div>{order.deliveryAddress || '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ngày giao dự kiến</div>
                        <div>{order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString('vi-VN') : '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phong cách</div>
                        <div>{order.styleNote || '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loại phòng</div>
                        <div>{order.roomType || '—'}</div>
                    </div>
                </div>
                {order.internalNote && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
                        📝 {order.internalNote}
                    </div>
                )}
            </div>

            {order.items?.length > 0 && (
                <div className="card">
                    <div className="card-header"><span className="card-title">Hạng mục</span></div>
                    <div className="table-container">
                        <table className="data-table" style={{ fontSize: 13 }}>
                            <thead><tr><th>Tên hạng mục</th><th>SL</th><th>ĐVT</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                            <tbody>
                                {order.items.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td>{item.quantity}</td>
                                        <td>{item.unit}</td>
                                        <td>{item.unitPrice?.toLocaleString('vi-VN')}</td>
                                        <td style={{ fontWeight: 600 }}>{item.amount?.toLocaleString('vi-VN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Edit modal */}
            {showEdit && (
                <div className="modal-overlay" onClick={() => setShowEdit(false)}>
                    <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">✏️ Chỉnh sửa đơn hàng</h3>
                            <button className="modal-close" onClick={() => setShowEdit(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tên đơn hàng</label>
                                <input className="form-input" value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gắn vào Dự án</label>
                                <select className="form-input" value={form.projectId}
                                    onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                                    <option value="">— Không gắn dự án —</option>
                                    {/* Always show the current project if exists */}
                                    {order.project && !projects.find(p => p.id === order.projectId) && (
                                        <option value={order.projectId}>{order.project.name}</option>
                                    )}
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Người bán</label>
                                    <input className="form-input" value={form.salesperson}
                                        onChange={e => setForm(f => ({ ...f, salesperson: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thiết kế</label>
                                    <input className="form-input" value={form.designer}
                                        onChange={e => setForm(f => ({ ...f, designer: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Phong cách</label>
                                    <input className="form-input" placeholder="VD: Hiện đại, Bắc Âu..." value={form.styleNote}
                                        onChange={e => setForm(f => ({ ...f, styleNote: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loại phòng</label>
                                    <input className="form-input" placeholder="VD: Phòng khách, Bếp..." value={form.roomType}
                                        onChange={e => setForm(f => ({ ...f, roomType: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ngày giao dự kiến</label>
                                    <input className="form-input" type="date" value={form.expectedDelivery}
                                        onChange={e => setForm(f => ({ ...f, expectedDelivery: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Địa chỉ giao hàng</label>
                                    <input className="form-input" placeholder="Số nhà, đường, quận..." value={form.deliveryAddress}
                                        onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ghi chú nội bộ</label>
                                <textarea className="form-input" rows={2} value={form.internalNote}
                                    onChange={e => setForm(f => ({ ...f, internalNote: e.target.value }))} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button className="btn btn-ghost" onClick={() => setShowEdit(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                                    {saving ? '⏳...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
