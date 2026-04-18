'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export default function CustomerDashboard() {
    const { data: session } = useSession();
    const [project, setProject] = useState(null);
    const [quotation, setQuotation] = useState(null);
    const [gallery, setGallery] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/customer/project').then(r => r.ok ? r.json() : null),
            fetch('/api/customer/quotation').then(r => r.ok ? r.json() : null),
            fetch('/api/customer/gallery').then(r => r.ok ? r.json() : { data: [] }),
        ]).then(([p, q, g]) => {
            setProject(p);
            setQuotation(q);
            setGallery(g?.data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>👋 Xin chào, {session?.user?.name || 'Khách hàng'}</h1>
                    <p>Cổng thông tin dự án của bạn</p>
                </div>
            </div>

            {/* Project Progress */}
            {project && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header" style={{ borderLeft: '4px solid var(--accent-primary)', paddingLeft: 12 }}>
                        <h3>🏗️ Dự án: {project.name}</h3>
                        <span className="status-badge" style={{ background: project.status === 'Đang thi công' ? 'var(--status-info)' : 'var(--status-success)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>
                            {project.status}
                        </span>
                    </div>
                    <div style={{ padding: '0 20px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-primary)' }}>{project.progress || 0}%</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tiến độ</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--status-success)' }}>{fmt(project.totalPaid)}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã thanh toán</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--status-warning)' }}>{fmt(project.contractValue - (project.totalPaid || 0))}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Còn lại</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 16, fontWeight: 700 }}>{project.contractValue ? fmt(project.contractValue) : 'Chưa ký HĐ'}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Giá trị HĐ</div>
                            </div>
                        </div>
                        {/* Progress bar */}
                        <div style={{ height: 10, background: 'var(--bg-secondary)', borderRadius: 5, marginBottom: 8 }}>
                            <div style={{ height: '100%', width: `${project.progress || 0}%`, background: 'linear-gradient(90deg, var(--accent-primary), var(--gold))', borderRadius: 5, transition: 'width 0.5s' }} />
                        </div>

                        {/* Milestones */}
                        {project.milestones && project.milestones.length > 0 && (
                            <div style={{ marginTop: 20 }}>
                                <h4 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-primary)' }}>📌 Tiến độ từng hạng mục</h4>
                                {project.milestones.map((m, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.completed ? 'var(--status-success)' : 'var(--border-color)', flexShrink: 0 }} />
                                        <div style={{ flex: 1, fontSize: 13 }}>{m.name}</div>
                                        <div style={{ fontSize: 12, color: m.completed ? 'var(--status-success)' : 'var(--text-muted)', fontWeight: 600 }}>
                                            {m.completed ? '✅ Hoàn thành' : m.dueDate ? `Dự kiến: ${new Date(m.dueDate).toLocaleDateString('vi')}` : 'Đang thực hiện'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* Payment history */}
                {project?.payments && (
                    <div className="card">
                        <div className="card-header"><h3>💳 Lịch sử thanh toán</h3></div>
                        <div className="table-container">
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>Đợt</th><th style={{ textAlign: 'right' }}>Số tiền</th><th>Ngày</th><th>TT</th></tr></thead>
                                <tbody>
                                    {project.payments.map((p, i) => (
                                        <tr key={i}>
                                            <td>{p.phase || `Đợt ${i + 1}`}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(p.paidAmount || p.amount)}</td>
                                            <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString('vi') : '-'}</td>
                                            <td><span style={{ color: p.status === 'Đã thu' ? 'var(--status-success)' : 'var(--status-warning)', fontWeight: 600, fontSize: 11 }}>{p.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Gallery */}
                <div className="card">
                    <div className="card-header"><h3>📸 Hình ảnh công trình</h3></div>
                    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {gallery.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                Chưa có hình ảnh
                            </div>
                        ) : gallery.map((img, i) => (
                            <div key={i} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                                <img src={img.url || img} alt={img.caption || `Ảnh ${i + 1}`}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    loading="lazy" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quotation */}
            {quotation && (
                <div className="card">
                    <div className="card-header">
                        <h3>📝 Báo giá: {quotation.code}</h3>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{quotation.status}</span>
                    </div>
                    <div style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng giá trị</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-primary)' }}>{fmt(quotation.grandTotal)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loại: {quotation.type}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>VAT: {quotation.vat}% · Quản lý: {quotation.managementFeeRate}%</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
