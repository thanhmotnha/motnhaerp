'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export default function QuotationsPage() {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const router = useRouter();

    const fetchData = () => {
        setLoading(true);
        fetch('/api/quotations').then(r => r.json()).then(d => { setQuotations(d); setLoading(false); });
    };
    useEffect(fetchData, []);

    const filtered = quotations.filter(q => {
        if (filterStatus && q.status !== filterStatus) return false;
        if (search && !q.code.toLowerCase().includes(search.toLowerCase()) &&
            !(q.customer?.name || '').toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Xóa báo giá này?')) return;
        await fetch(`/api/quotations/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const handleCreateContract = async (q, e) => {
        e.stopPropagation();
        router.push(`/contracts/create?quotationId=${q.id}&customerId=${q.customerId}&projectId=${q.projectId || ''}&type=${encodeURIComponent(q.type)}&value=${q.grandTotal}`);
    };

    const stColor = {
        'Nháp': 'badge-default',
        'Gửi KH': 'badge-info',
        'Xác nhận': 'badge-warning',
        'Hợp đồng': 'badge-success',
        'Từ chối': 'badge-danger',
    };

    return (
        <div>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card"><div className="stat-icon">📄</div><div><div className="stat-value">{quotations.length}</div><div className="stat-label">Tổng BG</div></div></div>
                <div className="stat-card"><div className="stat-icon">🟡</div><div><div className="stat-value">{quotations.filter(q => q.status === 'Xác nhận').length}</div><div className="stat-label">Chờ ký HĐ</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value">{quotations.filter(q => q.status === 'Hợp đồng').length}</div><div className="stat-label">Đã ký HĐ</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmt(quotations.filter(q => q.status === 'Hợp đồng').reduce((s, q) => s + q.grandTotal, 0))}</div><div className="stat-label">Giá trị HĐ</div></div></div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <h3>Danh sách báo giá</h3>
                    <button className="btn btn-primary" onClick={() => router.push('/quotations/create')}>➕ Tạo báo giá mới</button>
                </div>
                <div className="filter-bar">
                    <input type="text" className="form-input" placeholder="Tìm mã BG, KH..." value={search}
                        onChange={e => setSearch(e.target.value)} style={{ maxWidth: 250 }} />
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả</option>
                        <option>Nháp</option>
                        <option>Gửi KH</option>
                        <option>Xác nhận</option>
                        <option>Hợp đồng</option>
                        <option>Từ chối</option>
                    </select>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> : (
                    <table className="data-table">
                        <thead><tr>
                            <th>Mã BG</th><th>Khách hàng</th><th>Dự án</th><th>Loại</th>
                            <th>Tổng tiền</th><th>CK</th><th>VAT</th><th>Thành tiền</th>
                            <th>TT</th><th></th>
                        </tr></thead>
                        <tbody>{filtered.map(q => (
                            <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/quotations/${q.id}/edit`)}>
                                <td className="accent">{q.code}</td>
                                <td className="primary">{q.customer?.name}</td>
                                <td style={{ fontSize: 12 }}>{q.project?.name || '-'}</td>
                                <td><span style={{ fontSize: 11, opacity: 0.7 }}>{q.type}</span></td>
                                <td>{fmt(q.total)}</td>
                                <td>{q.discount}%</td>
                                <td>{q.vat}%</td>
                                <td style={{ fontWeight: 700 }}>{fmt(q.grandTotal)}</td>
                                <td><span className={`badge ${stColor[q.status] || 'badge-default'}`}>{q.status}</span></td>
                                <td style={{ display: 'flex', gap: 4 }}>
                                    {q.status === 'Xác nhận' && (
                                        <button className="btn btn-primary btn-sm" title="Tạo hợp đồng từ báo giá này"
                                            onClick={(e) => handleCreateContract(q, e)}>
                                            📜 Tạo HĐ
                                        </button>
                                    )}
                                    <button className="btn btn-ghost" title="Xem / In PDF"
                                        onClick={(e) => { e.stopPropagation(); window.open(`/quotations/${q.id}/pdf`, '_blank'); }}>
                                        📄
                                    </button>
                                    <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); router.push(`/quotations/${q.id}/edit`); }}>✏️</button>
                                    <button className="btn btn-ghost" onClick={(e) => handleDelete(q.id, e)}>🗑️</button>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                )}
            </div>

            {/* Thông tin phát sinh */}
            <div className="card" style={{ marginTop: 16, background: 'var(--surface-alt)', border: '1px dashed var(--border-color)' }}>
                <div className="card-body" style={{ padding: 12 }}>
                    <span style={{ fontSize: 12, opacity: 0.6 }}>
                        💡 <strong>Phát sinh:</strong> Tạo báo giá mới {'>'} chọn loại <em>&quot;Phát sinh&quot;</em> {'>'} liên kết với dự án đang thi công.
                        Sau khi KH xác nhận sẽ xuất hiện nút <strong>"Tạo HĐ phụ lục"</strong>.
                    </span>
                </div>
            </div>
        </div>
    );
}
