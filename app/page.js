'use client';
import { useState, useEffect } from 'react';
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtShort = (n) => { if (!n) return '0'; if (n >= 1e9) return `${(n / 1e9).toFixed(1)}tỷ`; if (n >= 1e6) return `${(n / 1e6).toFixed(0)}tr`; return new Intl.NumberFormat('vi-VN').format(n); };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const daysDiff = (d) => Math.floor((new Date(d) - new Date()) / 86400000);

function TodayTasksWidget({ tasks }) {
    const { overdueWOs = [], pendingPOs = [], urgentCommitments = [], overdueContractPayments = [] } = tasks;
    const total = overdueWOs.length + pendingPOs.length + urgentCommitments.length + overdueContractPayments.length;
    const [open, setOpen] = useState(true);
    if (total === 0) return null;
    return (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--status-warning)' }}>
            <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    ⚡ Việc cần xử lý
                    <span className="badge" style={{ background: 'var(--status-danger)', color: '#fff', fontSize: 11 }}>{total}</span>
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
            </div>
            {open && (
                <div style={{ padding: '0 16px 16px' }}>
                    {overdueWOs.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--status-danger)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                🔴 Phiếu công việc quá hạn ({overdueWOs.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {overdueWOs.map(wo => (
                                    <a key={wo.id} href={`/projects/${wo.projectId}`}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(220,38,38,0.04)', borderRadius: 6, textDecoration: 'none', color: 'inherit', border: '1px solid rgba(220,38,38,0.12)' }}>
                                        <div>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{wo.title}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{wo.project?.code} · {wo.assignee || 'Chưa giao'}</span>
                                        </div>
                                        <span style={{ fontSize: 11, color: 'var(--status-danger)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            Trễ {Math.abs(daysDiff(wo.dueDate))} ngày
                                        </span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                    {pendingPOs.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--status-warning)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                🟡 PO chờ duyệt ({pendingPOs.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {pendingPOs.map(po => (
                                    <a key={po.id} href="/purchasing"
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(245,158,11,0.04)', borderRadius: 6, textDecoration: 'none', color: 'inherit', border: '1px solid rgba(245,158,11,0.15)' }}>
                                        <div>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{po.code}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{po.supplier} · {po.project?.name || 'Không có DA'}</span>
                                        </div>
                                        <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(po.totalAmount)}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                    {urgentCommitments.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--status-info)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                🔵 Cam kết sắp đến hạn ({urgentCommitments.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {urgentCommitments.map(c => (
                                    <a key={c.id} href={`/projects/${c.projectId}`}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(59,130,246,0.04)', borderRadius: 6, textDecoration: 'none', color: 'inherit', border: '1px solid rgba(59,130,246,0.12)' }}>
                                        <div>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{c.title}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{c.project?.code} · {c.assignee || '—'}</span>
                                        </div>
                                        <span style={{ fontSize: 11, color: daysDiff(c.deadline) <= 1 ? 'var(--status-danger)' : 'var(--status-warning)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            {daysDiff(c.deadline) === 0 ? 'Hôm nay' : `${daysDiff(c.deadline)} ngày`}
                                        </span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                    {overdueContractPayments.length > 0 && (
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--status-success)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                💰 Đợt thanh toán sắp đến hạn ({overdueContractPayments.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {overdueContractPayments.map(p => (
                                    <a key={p.id} href={`/contracts/${p.contractId}`}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(34,197,94,0.04)', borderRadius: 6, textDecoration: 'none', color: 'inherit', border: '1px solid rgba(34,197,94,0.12)' }}>
                                        <div>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{p.phase}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{p.contract?.code} · {p.contract?.project?.name}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--status-success)' }}>{fmt(p.amount)}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(p.dueDate)}</div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch('/api/dashboard').then(r => r.json()).then(d => { setData(d); setLoading(false); });
    }, []);
    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>;
    const s = data.stats;
    const collectionRate = s.totalContractValue > 0 ? Math.round(s.totalPaid / s.totalContractValue * 100) : 0;
    const profit = s.revenue - s.expense;

    return (
        <div>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, marginBottom: 16 }}>
                {[
                    { icon: '💹', label: 'Tháng này', value: fmtShort(s.thisMonthRevenue), sub: s.revenueGrowth != null ? `${s.revenueGrowth >= 0 ? '▲' : '▼'} ${Math.abs(s.revenueGrowth)}% vs tháng trước` : null, subColor: s.revenueGrowth >= 0 ? 'var(--status-success)' : 'var(--status-danger)' },
                    { icon: '🏗️', label: 'DA đang chạy', value: s.activeProjects, sub: `/ ${s.projects} tổng` },
                    { icon: '📝', label: 'Hợp đồng', value: s.contracts, sub: fmtShort(s.totalContractValue) + ' giá trị' },
                    { icon: '💰', label: 'Còn phải thu', value: fmtShort(Math.max(0, s.totalContractValue - s.totalPaid)), sub: `Đã thu ${collectionRate}%`, subColor: collectionRate < 50 ? 'var(--status-danger)' : 'var(--status-success)' },
                    { icon: '🔧', label: 'WO chờ XL', value: s.pendingWorkOrders, sub: `/ ${s.workOrders} tổng WO`, subColor: s.pendingWorkOrders > 5 ? 'var(--status-warning)' : 'var(--text-muted)' },
                    { icon: '👥', label: 'Khách hàng', value: s.customers, sub: `${s.products} sản phẩm` },
                ].map(k => (
                    <div key={k.label} className="card" style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{k.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, margin: '2px 0' }}>{k.value}</div>
                        {k.sub && <div style={{ fontSize: 11, color: k.subColor || 'var(--text-muted)' }}>{k.sub}</div>}
                    </div>
                ))}
            </div>

            {/* Alert strip */}
            {(s.openWarranty > 0 || s.pendingLeave > 0 || s.overdueReceivable > 0) && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    {s.openWarranty > 0 && (
                        <a href="/projects" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, color: 'var(--status-danger)', fontSize: 13, fontWeight: 600 }}>
                            🛡️ {s.openWarranty} ticket bảo hành mở
                        </a>
                    )}
                    {s.pendingLeave > 0 && (
                        <a href="/hr" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, color: 'var(--status-warning)', fontSize: 13, fontWeight: 600 }}>
                            🗓️ {s.pendingLeave} đơn nghỉ phép chờ duyệt
                        </a>
                    )}
                    {s.overdueReceivable > 0 && (
                        <a href="/reports" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, color: 'var(--status-danger)', fontSize: 13, fontWeight: 600 }}>
                            ⚠️ Phải thu quá hạn: {fmt(s.overdueReceivable)}
                        </a>
                    )}
                </div>
            )}

            {data.todayTasks && <div style={{ marginBottom: 20 }}><TodayTasksWidget tasks={data.todayTasks} /></div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div className="card">
                    <div className="card-header"><h3>Tổng quan tài chính</h3></div>
                    <div style={{ padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ fontSize: 13 }}>Doanh thu tích lũy</span><span style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(s.revenue)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ fontSize: 13 }}>Chi phí tích lũy</span><span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>{fmt(s.expense)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                            <span style={{ fontWeight: 700 }}>Lợi nhuận</span>
                            <span style={{ color: profit >= 0 ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: 800, fontSize: 16 }}>{fmt(profit)}</span>
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng HĐ</span><span style={{ fontWeight: 600, fontSize: 13 }}>{fmt(s.totalContractValue)}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã thu</span><span style={{ fontWeight: 600, fontSize: 13, color: 'var(--status-success)' }}>{fmt(s.totalPaid)}</span></div>
                            <div className="progress-bar"><div className="progress-fill" style={{ width: `${collectionRate}%` }}></div></div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>Tỷ lệ thu: {collectionRate}%</div>
                        </div>
                        {s.thisMonthRevenue > 0 && (
                            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Doanh thu tháng này</span>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-primary)' }}>{fmt(s.thisMonthRevenue)}</div>
                                    {s.revenueGrowth != null && <div style={{ fontSize: 10, color: s.revenueGrowth >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{s.revenueGrowth >= 0 ? '▲' : '▼'} {Math.abs(s.revenueGrowth)}% vs tháng trước</div>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="card">
                    <div className="card-header"><h3>Dự án theo trạng thái</h3></div>
                    <div style={{ padding: 20 }}>
                        {data.projectsByStatus.sort((a, b) => b._count - a._count).map(ps => {
                            const pct2 = data.stats.projects > 0 ? Math.round(ps._count / data.stats.projects * 100) : 0;
                            return (
                                <div key={ps.status} style={{ marginBottom: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 13 }}>{ps.status}</span>
                                        <span style={{ fontSize: 13, fontWeight: 700 }}>{ps._count}</span>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3 }}>
                                        <div style={{ height: '100%', width: `${pct2}%`, background: 'var(--accent-primary)', borderRadius: 3, transition: 'width 0.4s' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {data.lowStockProducts?.length > 0 && (
                <div className="card" style={{ marginTop: 24, borderLeft: '3px solid #dc2626' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>⚠️ Sản phẩm hết hàng <span className="badge" style={{ background: '#dc2626', color: '#fff', fontSize: 11 }}>{data.lowStockProducts.length}</span></h3>
                        <a href="/products" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Xem tất cả →</a>
                    </div>
                    <div style={{ padding: '8px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {data.lowStockProducts.map(p => (
                                <a key={p.id} href={`/products/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(231,76,60,0.06)', borderRadius: 8, border: '1px solid rgba(231,76,60,0.15)', textDecoration: 'none', color: 'inherit', fontSize: 12 }}>
                                    {p.image && <img src={p.image} style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} alt="" />}
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                                        <div style={{ fontSize: 10, color: '#dc2626' }}>Tồn: {p.stock}{p.minStock > 0 && ` / min ${p.minStock}`}</div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Furniture block */}
            {data.furniture && (data.furniture.byStatus.in_production > 0 || data.furniture.byStatus.design_review > 0 || data.furniture.inProduction?.length > 0) && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Nội Thất May Đo</h3>
                        <a href="/furniture" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Xem tất cả →</a>
                    </div>
                    <div style={{ padding: '10px 16px 6px' }}>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                            {[
                                { label: 'Đang SX', val: data.furniture.byStatus.in_production || 0, color: 'var(--status-warning)' },
                                { label: 'Chờ duyệt TK', val: data.furniture.byStatus.design_review || 0, color: 'var(--status-warning)' },
                                { label: 'Đang lắp', val: data.furniture.byStatus.installing || 0, color: 'var(--accent-primary)' },
                                { label: 'Hoàn thành', val: data.furniture.byStatus.completed || 0, color: 'var(--status-success)' },
                            ].map(({ label, val, color }) => (
                                <div key={label} style={{ padding: '8px 14px', background: 'var(--bg-secondary)', borderRadius: 8, textAlign: 'center' }}>
                                    <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                                </div>
                            ))}
                        </div>
                        {(data.furniture.inProduction || []).length > 0 && (
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>Mã đơn</th><th>Tên đơn hàng</th><th>Khách hàng</th><th>Trạng thái</th><th>Ngày giao</th></tr></thead>
                                <tbody>
                                    {data.furniture.inProduction.map(o => {
                                        const statusLabel = { in_production: 'Đang SX', design_review: 'Chờ duyệt TK', installing: 'Đang lắp' };
                                        const statusColor = { in_production: 'warning', design_review: 'warning', installing: 'info' };
                                        return (
                                            <tr key={o.id} onClick={() => window.location.href = `/furniture/${o.id}`} style={{ cursor: 'pointer' }}>
                                                <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{o.code}</td>
                                                <td>{o.name}</td>
                                                <td>{o.customer?.name}</td>
                                                <td><span className={`badge ${statusColor[o.status]}`}>{statusLabel[o.status]}</span></td>
                                                <td style={{ color: 'var(--text-muted)' }}>{o.expectedDelivery ? new Date(o.expectedDelivery).toLocaleDateString('vi-VN') : '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header"><h3>Dự án gần đây</h3></div>
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Mã DA</th><th>Tên dự án</th><th>Khách hàng</th><th>Ngân sách</th><th>Tiến độ</th><th>Trạng thái</th></tr></thead>
                        <tbody>
                            {data.recentProjects.map(p => (
                                <tr key={p.id} onClick={() => window.location.href = `/projects/${p.id}`} style={{ cursor: 'pointer' }}>
                                    <td className="accent">{p.code}</td>
                                    <td className="primary">{p.name}</td>
                                    <td>{p.customer?.name}</td>
                                    <td>{fmt(p.budget)}</td>
                                    <td><div className="progress-bar"><div className="progress-fill" style={{ width: `${p.progress}%` }}></div></div><span style={{ fontSize: 11 }}>{p.progress}%</span></td>
                                    <td><span className="badge badge-info">{p.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
