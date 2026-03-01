'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/fetchClient';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import { QUOTATION_STATUSES, STATUS_BADGE, fmtCurrency } from '@/lib/quotation-constants';

export default function QuotationsPage() {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const router = useRouter();
    const toast = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (filterStatus) params.set('status', filterStatus);
            if (search.trim()) params.set('search', search.trim());
            const d = await apiFetch(`/api/quotations?${params}`);
            setQuotations(d.data || []);
            setPagination(d.pagination || null);
        } catch (e) {
            toast.error(e.message);
        }
        setLoading(false);
    }, [page, filterStatus, search]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Reset to page 1 when filters change
    useEffect(() => { setPage(1); }, [filterStatus, search]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await apiFetch(`/api/quotations/${deleteTarget}`, { method: 'DELETE' });
            toast.success('Đã xóa báo giá');
            fetchData();
        } catch (e) {
            toast.error(e.message);
        }
        setDeleteTarget(null);
    };

    const handleCreateContract = (q, e) => {
        e.stopPropagation();
        router.push(`/contracts/create?quotationId=${q.id}&customerId=${q.customerId}&projectId=${q.projectId || ''}&type=${encodeURIComponent(q.type)}&value=${q.grandTotal}`);
    };

    // Stats from current page data (for display)
    const allOnPage = quotations;
    const totalCount = pagination?.total || allOnPage.length;
    const confirmedCount = allOnPage.filter(q => q.status === 'Xác nhận').length;
    const contractCount = allOnPage.filter(q => q.status === 'Hợp đồng').length;
    const contractValue = allOnPage.filter(q => q.status === 'Hợp đồng').reduce((s, q) => s + q.grandTotal, 0);

    return (
        <div>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card"><div className="stat-icon">📄</div><div><div className="stat-value">{totalCount}</div><div className="stat-label">Tổng BG</div></div></div>
                <div className="stat-card"><div className="stat-icon">🟡</div><div><div className="stat-value">{confirmedCount}</div><div className="stat-label">Chờ ký HĐ</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value">{contractCount}</div><div className="stat-label">Đã ký HĐ</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmtCurrency(contractValue)}</div><div className="stat-label">Giá trị HĐ</div></div></div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <h3>Danh sách báo giá</h3>
                    <button className="btn btn-primary" onClick={() => router.push('/quotations/create')}>+ Tạo báo giá mới</button>
                </div>
                <div className="filter-bar">
                    <input type="text" className="form-input" placeholder="Tìm mã BG, khách hàng..." value={search}
                        onChange={e => setSearch(e.target.value)} style={{ maxWidth: 250 }} />
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 160 }}>
                        <option value="">Tất cả trạng thái</option>
                        {QUOTATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
                ) : quotations.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có báo giá nào</div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="quotation-list-desktop">
                            <table className="data-table">
                                <thead><tr>
                                    <th>Mã BG</th><th>Khách hàng</th><th>Dự án</th><th>Loại</th>
                                    <th>Tổng tiền</th><th>CK</th><th>VAT</th><th>Thành tiền</th>
                                    <th>TT</th><th></th>
                                </tr></thead>
                                <tbody>{quotations.map(q => (
                                    <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/quotations/${q.id}/edit`)}>
                                        <td className="accent">{q.code}</td>
                                        <td className="primary">{q.customer?.name}</td>
                                        <td style={{ fontSize: 12 }}>{q.project?.name || '-'}</td>
                                        <td><span style={{ fontSize: 11, opacity: 0.7 }}>{q.type}</span></td>
                                        <td>{fmtCurrency(q.total)}</td>
                                        <td>{q.discount}%</td>
                                        <td>{q.vat}%</td>
                                        <td style={{ fontWeight: 700 }}>{fmtCurrency(q.grandTotal)}</td>
                                        <td><span className={`badge ${STATUS_BADGE[q.status] || 'muted'}`}>{q.status}</span></td>
                                        <td style={{ display: 'flex', gap: 4 }}>
                                            {q.status === 'Xác nhận' && (
                                                <button className="btn btn-primary btn-sm" title="Tạo hợp đồng"
                                                    onClick={(e) => handleCreateContract(q, e)}>
                                                    Tạo HĐ
                                                </button>
                                            )}
                                            <button className="btn btn-ghost" title="Xem PDF"
                                                onClick={(e) => { e.stopPropagation(); window.open(`/quotations/${q.id}/pdf`, '_blank'); }}>
                                                📄
                                            </button>
                                            <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); router.push(`/quotations/${q.id}/edit`); }}>✏️</button>
                                            <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); setDeleteTarget(q.id); }}>🗑️</button>
                                        </td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>

                        {/* Mobile card view */}
                        <div className="quotation-list-mobile">
                            {quotations.map(q => (
                                <div key={q.id} className="quotation-mobile-card" onClick={() => router.push(`/quotations/${q.id}/edit`)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{q.code}</span>
                                        <span className={`badge ${STATUS_BADGE[q.status] || 'muted'}`}>{q.status}</span>
                                    </div>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{q.customer?.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                        {q.project?.name || '-'} &middot; {q.type}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 700, fontSize: 15 }}>{fmtCurrency(q.grandTotal)}</span>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); window.open(`/quotations/${q.id}/pdf`, '_blank'); }}>📄</button>
                                            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(q.id); }}>🗑️</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Pagination pagination={pagination} onPageChange={setPage} />
                    </>
                )}
            </div>

            <div className="card" style={{ marginTop: 16, background: 'var(--surface-alt)', border: '1px dashed var(--border-color)' }}>
                <div className="card-body" style={{ padding: 12 }}>
                    <span style={{ fontSize: 12, opacity: 0.6 }}>
                        <strong>Phát sinh:</strong> Tạo báo giá mới {'>'} chọn loại <em>&quot;Phát sinh&quot;</em> {'>'} liên kết với dự án đang thi công.
                        Sau khi KH xác nhận sẽ xuất hiện nút <strong>&quot;Tạo HĐ phụ lục&quot;</strong>.
                    </span>
                </div>
            </div>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Xóa báo giá"
                message="Bạn có chắc muốn xóa báo giá này? Hành động không thể hoàn tác."
                confirmText="Xóa"
                variant="danger"
            />
        </div>
    );
}
