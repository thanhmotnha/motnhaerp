'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

function WODetailModal({ wo, onClose, onUpdated }) {
    const [uploading, setUploading] = useState(false);
    const [images, setImages] = useState(() => { try { return JSON.parse(wo.images || '[]'); } catch { return []; } });
    const fileRef = useRef();
    const [tasks, setTasks] = useState([]);
    const [linkTaskId, setLinkTaskId] = useState(wo.scheduleTaskId || '');
    const [linking, setLinking] = useState(false);

    useEffect(() => {
        if (!wo.projectId) return;
        fetch(`/api/schedule-tasks?projectId=${wo.projectId}`).then(r => r.ok ? r.json() : []).then(setTasks).catch(() => {});
    }, [wo.projectId]);

    const handleLinkTask = async () => {
        setLinking(true);
        await fetch(`/api/work-orders/${wo.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheduleTaskId: linkTaskId || null }),
        });
        setLinking(false);
        onUpdated();
    };

    const handleUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setUploading(true);
        const newUrls = [];
        for (const file of files) {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', 'work-orders');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const d = await res.json();
            if (d.url) newUrls.push(d.url);
        }
        const updated = [...images, ...newUrls];
        setImages(updated);
        await fetch(`/api/work-orders/${wo.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: JSON.stringify(updated) }),
        });
        setUploading(false);
        onUpdated();
    };

    const handleDeleteImg = async (url) => {
        const updated = images.filter(u => u !== url);
        setImages(updated);
        await fetch(`/api/work-orders/${wo.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: JSON.stringify(updated) }),
        });
        onUpdated();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 12, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'auto' }}>
                <div className="card-header" style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 1 }}>
                    <h3>{wo.code} — {wo.title}</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>
                <div style={{ padding: 20 }}>
                    {wo.description && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 6 }}>{wo.description}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, fontSize: 13 }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Dự án:</span> <strong>{wo.project?.code}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Người thực hiện:</span> <strong>{wo.assignee || '—'}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Ưu tiên:</span> <span className={`badge ${wo.priority === 'Cao' ? 'danger' : wo.priority === 'Trung bình' ? 'warning' : 'muted'}`}>{wo.priority}</span></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Hạn:</span> <strong>{fmtDate(wo.dueDate)}</strong></div>
                        {wo.completedAt && <div><span style={{ color: 'var(--text-muted)' }}>Hoàn thành:</span> <strong>{fmtDate(wo.completedAt)}</strong></div>}
                    </div>

                    {/* Liên kết Task tiến độ */}
                    <div style={{ marginBottom: 20, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🔗 Liên kết task tiến độ</div>
                        {wo.scheduleTask ? (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                Đang liên kết: <strong style={{ color: 'var(--accent-primary)' }}>{wo.scheduleTask.name}</strong>
                                {wo.scheduleTask.startDate && <span> · {fmtDate(wo.scheduleTask.startDate)} → {fmtDate(wo.scheduleTask.endDate)}</span>}
                                <span className={`badge ${wo.scheduleTask.status === 'done' ? 'success' : 'warning'}`} style={{ marginLeft: 6 }}>{wo.scheduleTask.status}</span>
                            </div>
                        ) : (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Chưa liên kết task nào.</div>
                        )}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <select className="form-select" style={{ flex: 1, fontSize: 12 }} value={linkTaskId} onChange={e => setLinkTaskId(e.target.value)}>
                                <option value="">— Bỏ liên kết —</option>
                                {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button className="btn btn-secondary btn-sm" onClick={handleLinkTask} disabled={linking}>
                                {linking ? '...' : 'Lưu'}
                            </button>
                        </div>
                    </div>

                    {/* Ảnh hoàn công */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>📷 Ảnh hoàn công ({images.length})</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                                {uploading ? 'Đang upload...' : '+ Thêm ảnh'}
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
                        </div>
                        {images.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                {images.map((url, i) => (
                                    <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                        <img src={url} alt={`Ảnh ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button onClick={() => handleDeleteImg(url)}
                                            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', fontSize: 11 }}>✕</button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-secondary)', borderRadius: 6 }}>
                                Chưa có ảnh hoàn công. Bấm "Thêm ảnh" để upload.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function WorkOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [selectedWO, setSelectedWO] = useState(null);
    const router = useRouter();

    const fetchOrders = () => {
        fetch('/api/work-orders?limit=1000').then(r => r.json()).then(d => { setOrders(d.data || []); setLoading(false); });
    };
    useEffect(fetchOrders, []);

    const updateStatus = async (id, status) => {
        await fetch(`/api/work-orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        fetchOrders();
    };

    const filtered = orders.filter(w => {
        if (filterStatus && w.status !== filterStatus) return false;
        if (filterPriority && w.priority !== filterPriority) return false;
        if (search && !w.title.toLowerCase().includes(search.toLowerCase()) && !w.code.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const pending = orders.filter(w => w.status === 'Chờ xử lý').length;
    const inProgress = orders.filter(w => w.status === 'Đang xử lý').length;
    const done = orders.filter(w => w.status === 'Hoàn thành').length;
    const highPriority = orders.filter(w => w.priority === 'Cao').length;

    return (
        <div>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon revenue">📋</span></div><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{orders.length}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tổng phiếu</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon quotations">⏳</span></div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-warning)', marginTop: 8 }}>{pending}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chờ xử lý</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon projects">🔄</span></div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-info)', marginTop: 8 }}>{inProgress}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đang xử lý</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon customers">✅</span></div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-success)', marginTop: 8 }}>{done}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hoàn thành</div></div>
                <div className="stat-card"><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-danger)' }}>{highPriority}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ưu tiên cao</div></div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header"><span className="card-title">Phiếu công việc</span></div>
                <div className="filter-bar">
                    <input type="text" className="form-input" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 250 }} />
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả TT</option><option>Chờ xử lý</option><option>Đang xử lý</option><option>Hoàn thành</option><option>Quá hạn</option>
                    </select>
                    <select className="form-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                        <option value="">Tất cả ưu tiên</option><option>Cao</option><option>Trung bình</option><option>Thấp</option>
                    </select>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                    <div className="table-container"><table className="data-table">
                        <thead><tr><th>Mã</th><th>Tiêu đề</th><th>Dự án</th><th>Loại</th><th>Ưu tiên</th><th>Người thực hiện</th><th>Hạn</th><th>Ảnh</th><th>Trạng thái</th></tr></thead>
                        <tbody>{filtered.map(wo => {
                            const imgCount = (() => { try { return JSON.parse(wo.images || '[]').length; } catch { return 0; } })();
                            return (
                                <tr key={wo.id}>
                                    <td className="accent" style={{ cursor: 'pointer' }} onClick={() => setSelectedWO(wo)}>{wo.code}</td>
                                    <td className="primary" style={{ cursor: 'pointer' }} onClick={() => setSelectedWO(wo)}>
                                        {wo.title}
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{wo.description}</div>
                                    </td>
                                    <td><span className="badge info">{wo.project?.code}</span> <span style={{ fontSize: 12 }}>{wo.project?.name}</span></td>
                                    <td><span className="badge muted">{wo.category}</span></td>
                                    <td><span className={`badge ${wo.priority === 'Cao' ? 'danger' : wo.priority === 'Trung bình' ? 'warning' : 'muted'}`}>{wo.priority}</span></td>
                                    <td style={{ fontSize: 13 }}>{wo.assignee || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(wo.dueDate)}</td>
                                    <td>
                                        <button onClick={() => setSelectedWO(wo)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: imgCount > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                                            📷 {imgCount > 0 ? imgCount : '+'}
                                        </button>
                                    </td>
                                    <td>
                                        <select value={wo.status} onChange={e => updateStatus(wo.id, e.target.value)} className="form-select" style={{ padding: '4px 28px 4px 8px', fontSize: 12, minWidth: 110 }}>
                                            <option>Chờ xử lý</option><option>Đang xử lý</option><option>Hoàn thành</option><option>Quá hạn</option>
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}</tbody>
                    </table></div>
                )}
            </div>

            {selectedWO && <WODetailModal wo={selectedWO} onClose={() => setSelectedWO(null)} onUpdated={() => { fetchOrders(); }} />}
        </div>
    );
}
