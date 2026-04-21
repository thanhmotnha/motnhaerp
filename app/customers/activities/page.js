'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetchClient';
import { useRole } from '@/contexts/RoleContext';

const OUTCOMES = ['', 'Báo giá', 'Đặt cọc', 'Từ chối', 'Cần gặp lại'];

export default function ActivitiesPage() {
    const { permissions } = useRole();
    const [items, setItems] = useState([]);
    const [salesPeople, setSalesPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        salesPersonId: '',
        from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        to: new Date().toISOString().slice(0, 10),
        outcome: '',
    });
    const [lightbox, setLightbox] = useState(null);

    useEffect(() => {
        fetch('/api/users?role=kinh_doanh').then(r => r.ok ? r.json() : []).then(setSalesPeople);
    }, []);

    useEffect(() => {
        setLoading(true);
        const qs = new URLSearchParams();
        if (filters.salesPersonId) qs.set('salesPersonId', filters.salesPersonId);
        if (filters.from) qs.set('from', filters.from);
        if (filters.to) qs.set('to', `${filters.to}T23:59:59`);
        if (filters.outcome) qs.set('outcome', filters.outcome);
        qs.set('limit', '50');
        apiFetch(`/api/customer-interactions?${qs}`)
            .then(res => setItems(res?.data || []))
            .finally(() => setLoading(false));
    }, [filters.salesPersonId, filters.from, filters.to, filters.outcome]);

    if (!permissions.canViewAllActivities) {
        return <div className="card" style={{ padding: 40, textAlign: 'center' }}>Bạn không có quyền xem trang này.</div>;
    }

    const summary = items.reduce((acc, it) => {
        const name = it.createdByUser?.name || 'Ẩn danh';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {});

    return (
        <div style={{ padding: 16 }}>
            <h2>📋 Hoạt động NVKD</h2>

            <div className="card" style={{ padding: 12, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select className="form-select" value={filters.salesPersonId} onChange={e => setFilters(f => ({ ...f, salesPersonId: e.target.value }))} style={{ width: 220 }}>
                    <option value="">Tất cả NVKD</option>
                    {salesPeople.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <input type="date" className="form-input" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} style={{ width: 160 }} />
                <input type="date" className="form-input" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} style={{ width: 160 }} />
                <select className="form-select" value={filters.outcome} onChange={e => setFilters(f => ({ ...f, outcome: e.target.value }))} style={{ width: 180 }}>
                    {OUTCOMES.map(o => <option key={o} value={o}>{o || 'Mọi kết quả'}</option>)}
                </select>
            </div>

            <div className="card" style={{ padding: 12, marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div><strong>Tổng:</strong> {items.length}</div>
                {Object.entries(summary).map(([name, n]) => (
                    <div key={name}><strong>{name}:</strong> {n}</div>
                ))}
            </div>

            {loading && <div style={{ padding: 20, textAlign: 'center' }}>Đang tải…</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(it => (
                    <div key={it.id} className="card" style={{ padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div>
                                <Link href={`/customers/${it.customer?.id}`} style={{ fontWeight: 600 }}>{it.customer?.code} — {it.customer?.name}</Link>
                                <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>{it.customer?.phone}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(it.date).toLocaleString('vi-VN')}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6, alignItems: 'center' }}>
                            <span className="badge">{it.type}</span>
                            {it.interestLevel && <span className="badge" style={{ background: '#fef3c7', color: '#d97706' }}>{it.interestLevel}</span>}
                            {it.outcome && <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>{it.outcome}</span>}
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                NVKD: {it.createdByUser?.name || '?'}
                                {it.companions?.length > 0 && <> · Đi cùng: {it.companions.map(c => c.name).join(', ')}</>}
                            </span>
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{it.content}</div>
                        {it.photos?.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 4, marginTop: 8 }}>
                                {it.photos.map((url, i) => (
                                    <img key={i} src={url} alt="" onClick={() => setLightbox(url)}
                                        style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }} />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {!loading && items.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có hoạt động trong khoảng này.</div>}
            </div>

            {lightbox && (
                <div onClick={() => setLightbox(null)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
                }}>
                    <img src={lightbox} style={{ maxWidth: '95%', maxHeight: '95%' }} alt="" />
                </div>
            )}
        </div>
    );
}
