'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';

const ACTION_COLOR = {
    CREATE: 'success', create: 'success',
    UPDATE: 'info', update: 'info',
    DELETE: 'danger', delete: 'danger',
    APPROVE: 'success', approve: 'success',
    REJECT: 'danger', reject: 'danger',
};

export default function ActivityLogPage() {
    const { role } = useRole();
    const router = useRouter();
    const toast = useToast();

    const [logs, setLogs] = useState([]);
    const [entityTypes, setEntityTypes] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [filterType, setFilterType] = useState('');
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(null);

    useEffect(() => {
        if (role && !['giam_doc', 'pho_gd'].includes(role)) { router.replace('/'); }
    }, [role]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 50 });
            if (filterType) params.set('entityType', filterType);
            if (search.trim()) params.set('search', search.trim());
            const data = await apiFetch(`/api/admin/activity-log?${params}`);
            setLogs(data.data || []);
            setPagination(data.pagination || null);
            if (data.entityTypes) setEntityTypes(data.entityTypes);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, [page, filterType, search]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);
    useEffect(() => { setPage(1); }, [filterType, search]);

    const fmtDate = (d) => {
        const dt = new Date(d);
        return dt.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const badgeColor = (action) => ACTION_COLOR[action] || ACTION_COLOR[action?.toLowerCase()] || 'muted';

    if (role && !['giam_doc', 'pho_gd'].includes(role)) return null;

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h3>Nhật ký hoạt động</h3>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pagination?.total ?? 0} bản ghi</span>
                </div>

                <div className="filter-bar">
                    <input type="text" className="form-input" placeholder="Tìm theo thao tác, đối tượng, người dùng..."
                        value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
                    <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ maxWidth: 180 }}>
                        <option value="">Tất cả loại</option>
                        {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</div>
                ) : (
                    <>
                        <table className="data-table">
                            <thead><tr>
                                <th>Thời gian</th>
                                <th>Người dùng</th>
                                <th>Thao tác</th>
                                <th>Loại</th>
                                <th>Đối tượng</th>
                                <th></th>
                            </tr></thead>
                            <tbody>
                                {logs.map(log => (
                                    <>
                                        <tr key={log.id} style={{ cursor: log.diff ? 'pointer' : undefined }}
                                            onClick={() => log.diff && setExpanded(expanded === log.id ? null : log.id)}>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                {fmtDate(log.createdAt)}
                                            </td>
                                            <td style={{ fontWeight: 600, fontSize: 13 }}>{log.actor || '—'}</td>
                                            <td>
                                                <span className={`badge ${badgeColor(log.action)}`} style={{ textTransform: 'uppercase', fontSize: 11 }}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.entityType}</td>
                                            <td style={{ fontSize: 13 }}>{log.entityLabel || log.entityId}</td>
                                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {log.diff && (expanded === log.id ? '▲' : '▼')}
                                            </td>
                                        </tr>
                                        {expanded === log.id && log.diff && (
                                            <tr key={`${log.id}-diff`}>
                                                <td colSpan={6} style={{ background: 'var(--bg-secondary)', padding: '8px 16px' }}>
                                                    <pre style={{ fontSize: 11, margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-muted)', maxHeight: 200, overflow: 'auto' }}>
                                                        {JSON.stringify(log.diff, null, 2)}
                                                    </pre>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                        <Pagination pagination={pagination} onPageChange={setPage} />
                    </>
                )}
            </div>
        </div>
    );
}
