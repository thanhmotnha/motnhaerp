'use client';
import { useState, useEffect } from 'react';
import { useRole } from '@/contexts/RoleContext';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

const STATUS_COLORS = {
    'Chưa đặt': { color: '#94a3b8', bg: '#f1f5f9' },
    'Đã đặt': { color: '#f59e0b', bg: '#fef3c7' },
    'Đã nhận đủ': { color: '#22c55e', bg: '#dcfce7' },
    'Đã nhận 1 phần': { color: '#3b82f6', bg: '#dbeafe' },
};

const REQ_STATUS_COLORS = {
    'Chờ xử lý': { color: '#f59e0b', bg: '#fef3c7' },
    'Đã duyệt': { color: '#22c55e', bg: '#dcfce7' },
    'Đã từ chối': { color: '#ef4444', bg: '#fee2e2' },
    'Vượt dự toán - Chờ duyệt': { color: '#8b5cf6', bg: '#ede9fe' },
};

export default function MaterialPlansPage() {
    const { role } = useRole();
    const [tab, setTab] = useState('plans');
    const [plans, setPlans] = useState([]);
    const [reqs, setReqs] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [showReqModal, setShowReqModal] = useState(false);
    const [reqForm, setReqForm] = useState({ materialPlanId: '', projectId: '', requestedQty: '', requestedDate: '', notes: '', createdBy: '' });

    const fetchData = async () => {
        setLoading(true);
        const params = new URLSearchParams({ limit: '1000' });
        if (search) params.set('search', search);
        const [pRes, rRes, prRes] = await Promise.all([
            fetch(`/api/material-plans?${params}`).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(`/api/material-requisitions?${filterProject ? `projectId=${filterProject}` : ''}`).then(r => r.json()).catch(() => []),
            fetch('/api/projects?limit=500').then(r => r.json()).catch(() => ({ data: [] })),
        ]);
        setPlans(pRes.data || []);
        setReqs(Array.isArray(rRes) ? rRes : (rRes.data || []));
        setProjects(prRes.data || []);
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, [filterProject]);

    const filteredPlans = plans.filter(p => {
        if (filterProject && p.projectId !== filterProject) return false;
        if (search) {
            const s = search.toLowerCase();
            return p.product?.name?.toLowerCase().includes(s) || p.product?.code?.toLowerCase().includes(s) || p.project?.name?.toLowerCase().includes(s);
        }
        return true;
    });

    const openReqModal = (plan) => {
        setReqForm({ materialPlanId: plan.id, projectId: plan.projectId, requestedQty: '', requestedDate: '', notes: '', createdBy: '' });
        setShowReqModal(true);
    };
    const submitReq = async () => {
        if (!reqForm.requestedQty || Number(reqForm.requestedQty) <= 0) return alert('Nhập số lượng yêu cầu!');
        await fetch('/api/material-requisitions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...reqForm, requestedQty: Number(reqForm.requestedQty) }) });
        setShowReqModal(false);
        fetchData();
    };

    // KPI
    const totalPlans = filteredPlans.length;
    const totalBudget = filteredPlans.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const notOrdered = filteredPlans.filter(p => p.status === 'Chưa đặt').length;
    const fullyReceived = filteredPlans.filter(p => p.status === 'Đã nhận đủ').length;
    const kpis = [
        { label: 'Tổng VT kế hoạch', value: fmtNum(totalPlans), icon: '📦', color: 'var(--accent-primary)' },
        { label: 'Tổng dự toán', value: fmt(totalBudget), icon: '💰', color: '#f59e0b', small: true },
        { label: 'Chưa đặt', value: notOrdered, icon: '⏳', color: '#ef4444' },
        { label: 'Đã nhận đủ', value: fullyReceived, icon: '✅', color: '#22c55e' },
    ];

    const tabs = [
        { key: 'plans', label: '📦 Kế hoạch VT', count: totalPlans },
        { key: 'reqs', label: '📋 Yêu cầu mua', count: reqs.length },
    ];

    return (
        <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div><h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Kế hoạch & Yêu cầu vật tư</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Quản lý kế hoạch vật tư dự án và yêu cầu mua sắm</p></div>
            </div>

            {/* KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
                {kpis.map(k => (
                    <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 28 }}>{k.icon}</span>
                        <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div><div style={{ fontSize: k.small ? 16 : 22, fontWeight: 700, color: k.color }}>{k.value}</div></div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 16 }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '10px 20px', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)', background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent', marginBottom: -2, cursor: 'pointer' }}>
                        {t.label} <span style={{ fontSize: 11, opacity: 0.7 }}>({t.count})</span>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <input className="input" placeholder="Tìm sản phẩm / dự án..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchData()} style={{ width: 260 }} />
                <select className="input" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ width: 220 }}>
                    <option value="">Tất cả dự án</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Đang tải...</div> : tab === 'plans' ? (
                /* Plans Table */
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                        <thead><tr>
                            <th>Sản phẩm</th><th>Dự án</th><th>SL KH</th><th>Đã đặt</th><th>Đã nhận</th><th>Đơn giá</th><th>Thành tiền</th><th>Trạng thái</th><th>Thao tác</th>
                        </tr></thead>
                        <tbody>
                            {filteredPlans.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Chưa có kế hoạch vật tư</td></tr>}
                            {filteredPlans.map(p => {
                                const st = STATUS_COLORS[p.status] || STATUS_COLORS['Chưa đặt'];
                                const pct = p.quantity > 0 ? Math.round((p.receivedQty / p.quantity) * 100) : 0;
                                return (
                                    <tr key={p.id}>
                                        <td><div style={{ fontWeight: 600, fontSize: 13 }}>{p.product?.name || '—'}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.product?.code}</div></td>
                                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.project?.code || '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtNum(p.quantity)} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.product?.unit}</span></td>
                                        <td style={{ textAlign: 'right' }}>{fmtNum(p.orderedQty)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span>{fmtNum(p.receivedQty)}</span>
                                            {p.quantity > 0 && <div style={{ width: 50, height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 3, display: 'inline-block', marginLeft: 6 }}><div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct >= 100 ? '#22c55e' : '#3b82f6', borderRadius: 2 }} /></div>}
                                        </td>
                                        <td style={{ textAlign: 'right', fontSize: 12 }}>{fmt(p.unitPrice)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12 }}>{fmt(p.totalAmount)}</td>
                                        <td><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: st.bg, color: st.color }}>{p.status}</span></td>
                                        <td><button className="btn btn-ghost btn-sm" onClick={() => openReqModal(p)} title="Tạo yêu cầu mua">📋+</button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Requisitions Table */
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                        <thead><tr>
                            <th>Mã YC</th><th>Sản phẩm</th><th>SL yêu cầu</th><th>Ngày cần</th><th>Người tạo</th><th>Trạng thái</th><th>Ghi chú</th>
                        </tr></thead>
                        <tbody>
                            {reqs.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Chưa có yêu cầu mua</td></tr>}
                            {reqs.map(r => {
                                const st = REQ_STATUS_COLORS[r.status] || REQ_STATUS_COLORS['Chờ xử lý'];
                                return (
                                    <tr key={r.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: 13 }}>{r.code}</td>
                                        <td><div style={{ fontWeight: 600, fontSize: 13 }}>{r.materialPlan?.product?.name || '—'}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.materialPlan?.product?.code}</div></td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtNum(r.requestedQty)} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.materialPlan?.product?.unit}</span></td>
                                        <td style={{ fontSize: 12 }}>{fmtDate(r.requestedDate)}</td>
                                        <td style={{ fontSize: 12 }}>{r.createdBy || '—'}</td>
                                        <td><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: st.bg, color: st.color }}>{r.status}</span></td>
                                        <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Req Modal */}
            {showReqModal && (
                <div className="modal-overlay" onClick={() => setShowReqModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header"><h3>Tạo yêu cầu mua vật tư</h3><button className="btn btn-ghost" onClick={() => setShowReqModal(false)}>✕</button></div>
                        <div style={{ display: 'grid', gap: 12, padding: '16px 0' }}>
                            <div><label className="form-label">Số lượng yêu cầu *</label>
                                <input className="input" type="number" value={reqForm.requestedQty} onChange={e => setReqForm({ ...reqForm, requestedQty: e.target.value })} placeholder="0" /></div>
                            <div><label className="form-label">Ngày cần</label>
                                <input className="input" type="date" value={reqForm.requestedDate} onChange={e => setReqForm({ ...reqForm, requestedDate: e.target.value })} /></div>
                            <div><label className="form-label">Người yêu cầu</label>
                                <input className="input" value={reqForm.createdBy} onChange={e => setReqForm({ ...reqForm, createdBy: e.target.value })} placeholder="Tên nhân sự" /></div>
                            <div><label className="form-label">Ghi chú</label>
                                <textarea className="input" rows={2} value={reqForm.notes} onChange={e => setReqForm({ ...reqForm, notes: e.target.value })} /></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button className="btn btn-secondary" onClick={() => setShowReqModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={submitReq}>Tạo yêu cầu</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
