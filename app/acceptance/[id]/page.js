'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import { useRole } from '@/contexts/RoleContext';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_COLORS = {
    'Chờ duyệt': { bg: 'rgba(234,179,8,0.1)', color: '#ca8a04' },
    'Đạt': { bg: 'rgba(34,197,94,0.1)', color: '#16a34a' },
    'Không đạt': { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
};

const ITEM_STATUS_LABELS = { pass: '✅ Đạt', fail: '❌ Không đạt', na: '⬜ N/A' };

export default function AcceptanceDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const { role } = useRole();

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingItems, setEditingItems] = useState(false);
    const [items, setItems] = useState([]);
    const [signedByCustomer, setSignedByCustomer] = useState('');
    const [showApprovePanel, setShowApprovePanel] = useState(false);

    const canApprove = ['giam_doc', 'pho_gd'].includes(role);

    const load = async () => {
        try {
            const data = await apiFetch(`/api/acceptance/${id}`);
            setReport(data);
            setItems(Array.isArray(data.items) ? data.items : []);
            setSignedByCustomer(data.signedByCustomer || '');
        } catch { showToast('Không tải được biên bản', 'error'); }
        setLoading(false);
    };

    useEffect(() => { load(); }, [id]);

    const saveItems = async () => {
        setSaving(true);
        try {
            await apiFetch(`/api/acceptance/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ items }),
            });
            showToast('Đã cập nhật hạng mục', 'success');
            setEditingItems(false);
            load();
        } catch (e) { showToast(e.message, 'error'); }
        setSaving(false);
    };

    const approve = async (status) => {
        setSaving(true);
        try {
            await apiFetch(`/api/acceptance/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ status, signedByCustomer }),
            });
            showToast(status === 'Đạt' ? 'Đã duyệt: Đạt' : 'Đã đánh dấu: Không đạt', 'success');
            setShowApprovePanel(false);
            load();
        } catch (e) { showToast(e.message, 'error'); }
        setSaving(false);
    };

    const updateItem = (i, field, val) =>
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

    const addItem = () => setItems(prev => [...prev, { name: '', status: 'pass', note: '' }]);
    const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    if (!report) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--status-danger)' }}>Không tìm thấy biên bản</div>;

    const st = STATUS_COLORS[report.status] || {};
    const failCount = items.filter(i => i.status === 'fail').length;
    const passCount = items.filter(i => i.status === 'pass').length;

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button className="btn btn-ghost btn-sm" onClick={() => router.push('/acceptance')} style={{ marginBottom: 8 }}>
                        ← Danh sách
                    </button>
                    <h1>{report.code} — {report.title}</h1>
                    <p style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: st.bg, color: st.color }}>
                            {report.status}
                        </span>
                        {report.project && <span className="badge info">{report.project.code}</span>}
                    </p>
                </div>
                <div className="page-header-right">
                    {canApprove && report.status === 'Chờ duyệt' && (
                        <button className="btn btn-primary" onClick={() => setShowApprovePanel(true)}>
                            Duyệt biên bản
                        </button>
                    )}
                </div>
            </div>

            {/* Approval panel */}
            {showApprovePanel && (
                <div className="card" style={{ marginBottom: 20, border: '2px solid var(--accent-primary)' }}>
                    <div className="card-header"><span className="card-title">Duyệt biên bản nghiệm thu</span></div>
                    <div style={{ padding: '16px 20px' }}>
                        <div style={{ marginBottom: 14 }}>
                            <label className="form-label">Đại diện khách hàng ký nhận</label>
                            <input className="form-input" value={signedByCustomer} onChange={e => setSignedByCustomer(e.target.value)}
                                placeholder="Họ tên đại diện KH" style={{ maxWidth: 300 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-primary" onClick={() => approve('Đạt')} disabled={saving}>
                                ✅ Duyệt — Đạt
                            </button>
                            <button className="btn" style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}
                                onClick={() => approve('Không đạt')} disabled={saving}>
                                ❌ Không đạt
                            </button>
                            <button className="btn btn-ghost" onClick={() => setShowApprovePanel(false)}>Hủy</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Signed info */}
            {report.signedAt && (
                <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(34,197,94,0.08)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Đã duyệt lúc {fmtDate(report.signedAt)}
                    {report.signedByCustomer && <> · KH ký nhận: <strong>{report.signedByCustomer}</strong></>}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
                {/* Checklist items */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Hạng mục nghiệm thu ({items.length})</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: 'var(--status-success)' }}>✅ {passCount} đạt</span>
                            {failCount > 0 && <span style={{ fontSize: 12, color: 'var(--status-danger)' }}>❌ {failCount} không đạt</span>}
                            {!editingItems ? (
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditingItems(true)}>Chỉnh sửa</button>
                            ) : (
                                <>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingItems(false); setItems(Array.isArray(report.items) ? report.items : []); }}>Hủy</button>
                                    <button className="btn btn-primary btn-sm" onClick={saveItems} disabled={saving}>Lưu</button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40%' }}>Hạng mục</th>
                                    <th style={{ width: '15%' }}>Kết quả</th>
                                    <th>Ghi chú</th>
                                    {editingItems && <th style={{ width: 36 }}></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Chưa có hạng mục nào</td></tr>
                                ) : items.map((it, i) => (
                                    <tr key={i}>
                                        <td>
                                            {editingItems
                                                ? <input className="form-input" style={{ margin: 0 }} value={it.name} onChange={e => updateItem(i, 'name', e.target.value)} />
                                                : <span style={{ fontWeight: 500 }}>{it.name}</span>
                                            }
                                        </td>
                                        <td>
                                            {editingItems
                                                ? <select className="form-select" style={{ margin: 0 }} value={it.status} onChange={e => updateItem(i, 'status', e.target.value)}>
                                                    <option value="pass">✅ Đạt</option>
                                                    <option value="fail">❌ Không đạt</option>
                                                    <option value="na">⬜ N/A</option>
                                                </select>
                                                : <span style={{ fontSize: 12 }}>{ITEM_STATUS_LABELS[it.status] || it.status}</span>
                                            }
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {editingItems
                                                ? <input className="form-input" style={{ margin: 0 }} value={it.note || ''} onChange={e => updateItem(i, 'note', e.target.value)} />
                                                : it.note || '—'
                                            }
                                        </td>
                                        {editingItems && (
                                            <td>
                                                <button className="btn btn-ghost btn-sm" onClick={() => removeItem(i)}
                                                    style={{ color: 'var(--status-danger)', padding: '2px 6px' }}>✕</button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {editingItems && (
                        <div style={{ padding: '8px 20px' }}>
                            <button className="btn btn-ghost btn-sm" onClick={addItem}>+ Thêm hạng mục</button>
                        </div>
                    )}
                </div>

                {/* Info sidebar */}
                <div className="card" style={{ alignSelf: 'start' }}>
                    <div className="card-header"><span className="card-title">Thông tin</span></div>
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                        <InfoRow label="Dự án" value={report.project ? `${report.project.code} — ${report.project.name}` : '—'} />
                        {report.milestone && <InfoRow label="Mốc công trình" value={report.milestone.name} />}
                        <InfoRow label="Cán bộ nghiệm thu" value={report.inspector || '—'} />
                        <InfoRow label="Đại diện khách hàng" value={report.customerRep || '—'} />
                        <InfoRow label="Người lập" value={report.createdBy || '—'} />
                        <InfoRow label="Ngày tạo" value={fmtDate(report.createdAt)} />
                        {report.notes && (
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Ghi chú</div>
                                <div style={{ padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 6 }}>{report.notes}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 500 }}>{value}</div>
        </div>
    );
}
