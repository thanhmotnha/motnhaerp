'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const emptyItem = () => ({ itemName: '', quantity: 1, unit: 'bộ', amount: 0, notes: '' });
const STATUS_LABEL = { DRAFT: 'Nháp', SENT: 'Đã gửi', SIGNED: 'Đã ký' };
const STATUS_BADGE = { DRAFT: 'secondary', SENT: 'warning', SIGNED: 'success' };

export default function AcceptanceTab({ orderId, order, onRefresh }) {
    const [certs, setCerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newItems, setNewItems] = useState([emptyItem()]);
    const [customerName, setCustomerName] = useState(order.customer?.name || '');
    const [creating, setCreating] = useState(false);
    const [sendingId, setSendingId] = useState(null);
    const [sentUrl, setSentUrl] = useState(null);

    const fetchCerts = useCallback(async () => {
        setLoading(true);
        const data = await apiFetch(`/api/furniture-orders/${orderId}/acceptance`);
        setCerts(data);
        setLoading(false);
    }, [orderId]);

    useEffect(() => { fetchCerts(); }, [fetchCerts]);

    const createCert = async () => {
        const validItems = newItems.filter(i => i.itemName.trim());
        if (validItems.length === 0) return alert('Thêm ít nhất 1 hạng mục!');
        setCreating(true);
        try {
            await apiFetch(`/api/furniture-orders/${orderId}/acceptance`, {
                method: 'POST',
                body: { customerName, items: validItems },
            });
            setShowCreateModal(false);
            setNewItems([emptyItem()]);
            await fetchCerts();
        } catch (err) {
            alert(err.message || 'Lỗi tạo biên bản');
        } finally {
            setCreating(false);
        }
    };

    const sendCert = async (aid) => {
        setSendingId(aid);
        try {
            const data = await apiFetch(`/api/furniture-orders/${orderId}/acceptance/${aid}/send`, { method: 'POST' });
            setSentUrl(data.publicUrl);
            await fetchCerts();
        } catch (err) {
            alert(err.message || 'Lỗi gửi link');
        } finally {
            setSendingId(null);
        }
    };

    const updateNewItem = (idx, field, value) =>
        setNewItems(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Tạo biên bản nghiệm thu</button>
            </div>

            {sentUrl && (
                <div className="card" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                    <div style={{ fontSize: 13 }}>
                        ✅ Link gửi khách:{' '}
                        <a href={sentUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--status-success)', fontWeight: 600 }}>{sentUrl}</a>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }}
                        onClick={() => { navigator.clipboard.writeText(sentUrl); alert('Đã copy!'); }}>📋 Copy link</button>
                </div>
            )}

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : certs.length === 0 ? (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có biên bản nghiệm thu</div>
            ) : (
                certs.map(cert => (
                    <div className="card" key={cert.id}>
                        <div className="card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <code style={{ fontSize: 13 }}>{cert.code}</code>
                                <span className={`badge ${STATUS_BADGE[cert.status] || 'secondary'}`}>
                                    {STATUS_LABEL[cert.status] || cert.status}
                                </span>
                                {cert.signedAt && (
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        Ký {new Date(cert.signedAt).toLocaleDateString('vi-VN')}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {cert.status !== 'SIGNED' && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => sendCert(cert.id)} disabled={sendingId === cert.id}>
                                        {sendingId === cert.id ? 'Đang gửi...' : '🔗 Gửi link KH'}
                                    </button>
                                )}
                                {cert.publicToken && (
                                    <a href={`/public/acceptance/${cert.publicToken}`} target="_blank" rel="noopener noreferrer"
                                        className="btn btn-ghost btn-sm">👁 Xem</a>
                                )}
                            </div>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Khách hàng: {cert.customerName}</div>
                        <table className="data-table" style={{ fontSize: 12 }}>
                            <thead><tr><th>Hạng mục</th><th>SL</th><th>ĐVT</th><th>Thành tiền</th><th>Ngày NT</th></tr></thead>
                            <tbody>
                                {cert.items?.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.itemName}</td>
                                        <td>{item.quantity}</td>
                                        <td>{item.unit}</td>
                                        <td>{item.amount?.toLocaleString('vi-VN')}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>
                                            {item.acceptedAt ? new Date(item.acceptedAt).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Tổng:</td>
                                    <td style={{ fontWeight: 700 }}>{cert.items?.reduce((s, i) => s + i.amount, 0).toLocaleString('vi-VN')}</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ))
            )}

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Tạo biên bản nghiệm thu</h3>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tên khách hàng</label>
                                <input className="form-input" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                            </div>
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>Hạng mục</th><th>SL</th><th>ĐVT</th><th>Thành tiền</th><th></th></tr></thead>
                                <tbody>
                                    {newItems.map((item, i) => (
                                        <tr key={i}>
                                            <td><input className="form-input" style={{ fontSize: 12 }} value={item.itemName} onChange={e => updateNewItem(i, 'itemName', e.target.value)} placeholder="Tên hạng mục" /></td>
                                            <td><input type="number" className="form-input" style={{ fontSize: 12, width: 60 }} value={item.quantity} onChange={e => updateNewItem(i, 'quantity', Number(e.target.value))} /></td>
                                            <td><input className="form-input" style={{ fontSize: 12, width: 60 }} value={item.unit} onChange={e => updateNewItem(i, 'unit', e.target.value)} /></td>
                                            <td><input type="number" className="form-input" style={{ fontSize: 12, width: 110 }} value={item.amount} onChange={e => updateNewItem(i, 'amount', Number(e.target.value))} /></td>
                                            <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={() => setNewItems(p => p.filter((_, j) => j !== i))}>🗑</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button className="btn btn-ghost btn-sm" onClick={() => setNewItems(p => [...p, emptyItem()])}>+ Thêm hạng mục</button>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={createCert} disabled={creating}>
                                    {creating ? 'Đang tạo...' : 'Tạo biên bản'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
