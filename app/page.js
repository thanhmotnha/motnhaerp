'use client';
import { useState, useEffect, useCallback } from 'react';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { useDashboardWidgets, WidgetConfigurator } from '@/components/dashboard/WidgetConfigurator';
import NotificationBell from '@/components/ui/NotificationBell';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtShort = (n) => {
    if (!n) return '0';
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}tỷ`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(0)}tr`;
    return new Intl.NumberFormat('vi-VN').format(n);
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const daysDiff = (d) => Math.floor((new Date(d) - new Date()) / 86400000);

function AlertBar({ stats }) {
    const alerts = [];
    if (stats.openWarranty > 0) alerts.push({ href: '/projects', icon: '🛡️', label: `${stats.openWarranty} bảo hành mở`, color: '#DC2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)' });
    if (stats.pendingLeave > 0) alerts.push({ href: '/hr', icon: '🗓️', label: `${stats.pendingLeave} đơn nghỉ chờ duyệt`, color: '#D97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.2)' });
    if (stats.overdueReceivable > 0) alerts.push({ href: '/reports', icon: '⚠️', label: `Phải thu quá hạn: ${fmtShort(stats.overdueReceivable)}`, color: '#DC2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)' });
    if (alerts.length === 0) return null;
    return (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {alerts.map((a, i) => (
                <a key={i} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: a.bg, border: `1px solid ${a.border}`, borderRadius: 8, color: a.color, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                    {a.icon} {a.label}
                </a>
            ))}
        </div>
    );
}

function TodayTasksWidget({ tasks }) {
    const { overdueWOs = [], pendingPOs = [], urgentCommitments = [], overdueContractPayments = [] } = tasks;
    const total = overdueWOs.length + pendingPOs.length + urgentCommitments.length + overdueContractPayments.length;
    const [open, setOpen] = useState(true);
    if (total === 0) return null;
    return (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #D97706' }}>
            <div className="card-header" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setOpen(o => !o)}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Việc cần xử lý
                    <span style={{ background: '#DC2626', color: '#fff', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 10, lineHeight: '18px' }}>{total}</span>
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
            </div>
            {open && (
                <div style={{ padding: '0 16px 16px' }}>
                    {overdueWOs.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phiếu CV quá hạn ({overdueWOs.length})</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {overdueWOs.map(wo => (
                                    <a key={wo.id} href={`/projects/${wo.project?.code || wo.projectId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: 'rgba(220,38,38,0.04)', borderRadius: 6, textDecoration: 'none', color: 'inherit', border: '1px solid rgba(220,38,38,0.12)' }}>
                                        <div>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{wo.title}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{wo.project?.code} · {wo.assignee || 'Chưa giao'}</span>
                                        </div>
                                        <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>Trễ {Math.abs(daysDiff(wo.dueDate))} ngày</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                    {pendingPOs.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PO chờ duyệt ({pendingPOs.length})</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {pendingPOs.map(po => (
                                    <a key={po.id} href="/purchasing" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: 'rgba(217,119,6,0.04)', borderRadius: 6, textDecoration: 'none', color: 'inherit', border: '1px solid rgba(217,119,6,0.15)' }}>
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
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#2D5CA3', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cam kết sắp đến hạn ({urgentCommitments.length})</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {urgentCommitments.map(c => (
                                    <a key={c.id} href={`/projects/${c.project?.code || c.projectId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: 'rgba(45,92,163,0.04)', borderRadius: 6, textDecoration: 'none', color: 'inherit', border: '1px solid rgba(45,92,163,0.12)' }}>
                                        <div>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{c.title}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{c.project?.code} · {c.assignee || '—'}</span>
                                        </div>
                                        <span style={{ fontSize: 11, color: daysDiff(c.deadline) <= 1 ? '#DC2626' : '#D97706', fontWeight: 600 }}>
                                            {daysDiff(c.deadline) === 0 ? 'Hôm nay' : `${daysDiff(c.deadline)} ngày`}
                                        </span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                    {overdueContractPayments.length > 0 && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Đợt thanh toán sắp đến hạn ({overdueContractPayments.length})</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {overdueContractPayments.map(p => (
                                    <a key={p.id} href={`/contracts/${p.contractId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: 'rgba(22,163,74,0.04)', borderRadius: 6, textDecoration: 'none', color: 'inherit', border: '1px solid rgba(22,163,74,0.12)' }}>
                                        <div>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{p.phase}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{p.contract?.code} · {p.contract?.project?.name}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>{fmt(p.amount)}</div>
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

function PaymentAlertsCard() {
    const [alerts, setAlerts] = useState(null);
    useEffect(() => { fetch('/api/dashboard/payment-alerts').then(r => r.json()).then(setAlerts).catch(() => {}); }, []);
    if (!alerts || alerts.count === 0) return null;
    return (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #D97706' }}>
            <div className="card-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    💳 Thanh toán cần thu
                    <span style={{ background: '#DC2626', color: '#fff', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 10 }}>{alerts.count}</span>
                </h3>
            </div>
            <div style={{ padding: '0 16px 16px' }}>
                {alerts.overdue.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quá hạn ({alerts.overdue.length}) — {fmt(alerts.totalOverdue)}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {alerts.overdue.slice(0, 5).map(p => (
                                <a key={p.id} href={`/contracts/${p.contractId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: 'rgba(220,38,38,0.04)', borderRadius: 6, textDecoration: 'none', color: 'inherit', border: '1px solid rgba(220,38,38,0.12)' }}>
                                    <div>
                                        <span style={{ fontWeight: 600, fontSize: 13 }}>{p.phase}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{p.contract?.code} · {p.contract?.customer?.name || p.contract?.project?.name}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>{fmt(p.amount - p.paidAmount)}</div>
                                        <div style={{ fontSize: 10, color: '#DC2626' }}>Trễ {Math.abs(daysDiff(p.dueDate))} ngày</div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                {alerts.upcoming.length > 0 && (
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sắp đến hạn ({alerts.upcoming.length}) — {fmt(alerts.totalUpcoming)}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {alerts.upcoming.slice(0, 5).map(p => (
                                <a key={p.id} href={`/contracts/${p.contractId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: 'rgba(217,119,6,0.04)', borderRadius: 6, textDecoration: 'none', color: 'inherit', border: '1px solid rgba(217,119,6,0.12)' }}>
                                    <div>
                                        <span style={{ fontWeight: 600, fontSize: 13 }}>{p.phase}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{p.contract?.code} · {p.contract?.customer?.name || p.contract?.project?.name}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(p.amount - p.paidAmount)}</div>
                                        <div style={{ fontSize: 10, color: '#D97706' }}>{daysDiff(p.dueDate) === 0 ? 'Hôm nay' : `${daysDiff(p.dueDate)} ngày`}</div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ActivityFeed() {
    const [items, setItems] = useState(null);
    useEffect(() => {
        fetch('/api/activity-log?limit=12').then(r => r.json()).then(d => setItems(d.items || d)).catch(() => setItems([]));
    }, []);
    const ago = (d) => {
        const mins = Math.floor((Date.now() - new Date(d)) / 60000);
        if (mins < 1) return 'vừa xong';
        if (mins < 60) return `${mins} phút trước`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} giờ trước`;
        return `${Math.floor(hrs / 24)} ngày trước`;
    };
    const iconMap = { CREATE: '🆕', UPDATE: '✏️', DELETE: '🗑️', APPROVE: '✅', REJECT: '❌' };
    return (
        <div className="card">
            <div className="card-header" style={{ borderLeft: '4px solid #2D5CA3', paddingLeft: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>📰 Hoạt động gần đây</h3>
                <a href="/activity-log" style={{ fontSize: 12, color: '#234093', textDecoration: 'none', fontWeight: 600 }}>Xem tất cả →</a>
            </div>
            <div style={{ padding: '8px 16px 16px', maxHeight: 380, overflowY: 'auto' }}>
                {items === null ? (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>Đang tải...</div>
                ) : items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>Chưa có hoạt động</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {items.map((item, i) => (
                            <div key={item.id || i} style={{
                                display: 'flex', alignItems: 'flex-start', gap: 10,
                                padding: '10px 12px', borderRadius: 8,
                                background: i % 2 === 0 ? 'transparent' : 'rgba(35,64,147,0.02)',
                                borderBottom: '1px solid var(--border-color)',
                            }}>
                                <span style={{ fontSize: 16, marginTop: 1 }}>{iconMap[item.action] || '📌'}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                                        <strong style={{ color: '#234093' }}>{item.userName || item.user?.name || 'Hệ thống'}</strong>
                                        <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>
                                            {item.action === 'CREATE' ? 'đã tạo' : item.action === 'UPDATE' ? 'đã cập nhật' : item.action === 'APPROVE' ? 'đã duyệt' : item.action === 'DELETE' ? 'đã xóa' : item.action?.toLowerCase() || ''}
                                        </span>
                                        <span style={{ fontWeight: 600, marginLeft: 4 }}>{item.entityType || item.module || ''}</span>
                                        {item.entityName && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>"{item.entityName}"</span>}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ago(item.createdAt)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function UpcomingMilestones() {
    const [milestones, setMilestones] = useState(null);
    useEffect(() => {
        fetch('/api/dashboard/milestones').then(r => r.json()).then(setMilestones).catch(() => setMilestones([]));
    }, []);
    return (
        <div className="card">
            <div className="card-header" style={{ borderLeft: '4px solid #7C3AED', paddingLeft: 12 }}>
                <h3>📅 Mốc sắp tới</h3>
            </div>
            <div style={{ padding: '8px 16px 16px', maxHeight: 380, overflowY: 'auto' }}>
                {milestones === null ? (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>Đang tải...</div>
                ) : milestones.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>🎉 Không có mốc nào sắp tới</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {milestones.map((m, i) => {
                            const d = daysDiff(m.dueDate);
                            const urgentColor = d <= 1 ? '#DC2626' : d <= 3 ? '#D97706' : '#234093';
                            return (
                                <a key={m.id || i} href={m.href || '#'} style={{
                                    display: 'block', padding: '10px 12px', borderRadius: 8,
                                    border: `1px solid ${urgentColor}22`, background: `${urgentColor}06`,
                                    textDecoration: 'none', color: 'inherit',
                                    transition: 'background 0.15s',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: urgentColor }}>
                                            {d === 0 ? '🔴 Hôm nay' : d === 1 ? '🟠 Ngày mai' : `📌 ${d} ngày`}
                                        </span>
                                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDate(m.dueDate)}</span>
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{m.title}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.subTitle || m.projectName || ''}</div>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [debtData, setDebtData] = useState(null);
    const [pnlAlerts, setPnlAlerts] = useState([]);
    const [monthlyData, setMonthlyData] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const { widgets, showConfig, setShowConfig, toggleWidget, moveWidget, resetConfig } = useDashboardWidgets();

    const load = useCallback((showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        Promise.all([
            fetch('/api/dashboard').then(r => r.json()),
            fetch('/api/reports/debt').then(r => r.json()),
            fetch('/api/reports/project-pnl').then(r => r.json()),
        ]).then(([dashboard, debt, pnl]) => {
            setData(dashboard);
            setDebtData(debt);
            setPnlAlerts((pnl.rows || []).filter(r => r.alert));
            setLoading(false);
            setRefreshing(false);
        }).catch(() => { setLoading(false); setRefreshing(false); });
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        fetch(`/api/reports/monthly?year=${selectedYear}`)
            .then(r => r.json())
            .then(setMonthlyData)
            .catch(() => {});
    }, [selectedYear]);

    if (loading) return <SkeletonDashboard />;

    const s = data.stats;
    const collectionRate = s.totalContractValue > 0 ? Math.round(s.totalPaid / s.totalContractValue * 100) : 0;
    const profit = s.revenue - s.expense;
    const now = new Date().toLocaleString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div>
            {/* Dashboard header */}
            <div style={{
                background: 'linear-gradient(135deg, #234093 0%, #2D5CA3 100%)',
                borderRadius: 16,
                padding: '20px 24px',
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
            }}>
                <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>Tổng quan hệ thống</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>{now}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#fff', fontSize: 13 }}>
                        <span style={{ opacity: 0.7, fontSize: 11 }}>DA đang chạy </span><strong>{s.activeProjects}</strong>
                    </div>
                    <div style={{ background: 'rgba(219,179,94,0.2)', border: '1px solid rgba(219,179,94,0.35)', borderRadius: 8, padding: '6px 14px', color: '#DBB35E', fontSize: 13 }}>
                        <span style={{ opacity: 0.8, fontSize: 11 }}>Tháng này </span><strong>{fmtShort(s.thisMonthRevenue)}</strong>
                    </div>
                    <button onClick={() => setShowConfig(true)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#fff', fontSize: 12, cursor: 'pointer', transition: 'background 0.2s' }} title="Tùy chỉnh Dashboard">
                        ⚙️ Tùy chỉnh
                    </button>
                    <button onClick={() => load(true)} disabled={refreshing} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#fff', fontSize: 12, cursor: 'pointer', transition: 'background 0.2s' }}>
                        {refreshing ? '...' : '↻ Làm mới'}
                    </button>
                    <NotificationBell style={{ filter: 'brightness(10)' }} />
                </div>
            </div>

            {/* Alerts */}
            <AlertBar stats={s} />

            {/* Urgent tasks */}
            {data.todayTasks && <TodayTasksWidget tasks={data.todayTasks} />}

            {/* Payment alerts */}
            <PaymentAlertsCard />

            {/* KPI Cards — Tier 1: Revenue + Collection + Profit */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid #DBB35E' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Doanh thu tháng này</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#234093', margin: '2px 0' }}>{fmtShort(s.thisMonthRevenue)}</div>
                    {s.revenueGrowth != null && (
                        <div style={{ fontSize: 11, color: s.revenueGrowth >= 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                            {s.revenueGrowth >= 0 ? '▲' : '▼'} {Math.abs(s.revenueGrowth)}% so tháng trước
                        </div>
                    )}
                </div>
                <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid #234093' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Còn phải thu</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#234093', margin: '2px 0' }}>{fmtShort(Math.max(0, s.totalContractValue - s.totalPaid))}</div>
                    <div style={{ fontSize: 11, color: collectionRate < 50 ? '#DC2626' : '#16A34A', fontWeight: 600 }}>Đã thu {collectionRate}%</div>
                </div>
                <div className="card" style={{ padding: '16px 20px', borderTop: `3px solid ${profit >= 0 ? '#16A34A' : '#DC2626'}` }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Lợi nhuận tích lũy</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: profit >= 0 ? '#16A34A' : '#DC2626', margin: '2px 0' }}>{fmtShort(profit)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>DT {fmtShort(s.revenue)} · CP {fmtShort(s.expense)}</div>
                </div>
            </div>

            {/* KPI Cards — Tier 2: Operational */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Dự án đang chạy', value: s.activeProjects, sub: `/ ${s.projects} tổng`, accent: '#234093' },
                    { label: 'Hợp đồng', value: s.contracts, sub: fmtShort(s.totalContractValue), accent: '#2D5CA3' },
                    { label: 'WO chờ xử lý', value: s.pendingWorkOrders, sub: `/ ${s.workOrders} tổng WO`, accent: s.pendingWorkOrders > 5 ? '#D97706' : '#234093' },
                    { label: 'Khách hàng', value: s.customers, sub: `${s.products} sản phẩm`, accent: '#234093' },
                ].map(k => (
                    <div key={k.label} className="card" style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: k.accent }}>{k.value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{k.sub}</div>
                    </div>
                ))}
            </div>

            {/* KPI Cards — Tier 3: HR & Pipeline */}
            {(data.hrSummary || data.pipelineSummary?.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                    {data.hrSummary && <>
                        <a href="/hr" className="card" style={{ padding: '12px 16px', textDecoration: 'none', color: 'inherit', transition: 'box-shadow 0.2s' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Chấm công hôm nay</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#16A34A' }}>{data.hrSummary.presentToday}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>/{data.hrSummary.totalEmployees}</span></div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Vắng: {data.hrSummary.absentToday}</div>
                        </a>
                        <a href="/hr" className="card" style={{ padding: '12px 16px', textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Đi trễ hôm nay</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: data.hrSummary.lateToday > 0 ? '#D97706' : '#16A34A' }}>{data.hrSummary.lateToday}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>nhân viên</div>
                        </a>
                        <a href="/hr" className="card" style={{ padding: '12px 16px', textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Đơn nghỉ chờ duyệt</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: data.hrSummary.pendingLeave > 0 ? '#DC2626' : '#234093' }}>{data.hrSummary.pendingLeave}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>đơn pending</div>
                        </a>
                    </>}
                    {data.pipelineSummary?.length > 0 && (
                        <a href="/customers" className="card" style={{ padding: '12px 16px', textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Pipeline KH</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#2D5CA3' }}>{data.pipelineSummary.reduce((a, p) => a + p.count, 0)}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmtShort(data.pipelineSummary.reduce((a, p) => a + p.estimatedValue, 0))} ước tính</div>
                        </a>
                    )}
                </div>
            )}

            {/* Financial + Project Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* Financial overview */}
                <div className="card">
                    <div className="card-header" style={{ borderLeft: '4px solid #234093', paddingLeft: 12 }}>
                        <h3>Tài chính tổng quan</h3>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Doanh thu tích lũy</span>
                            <span style={{ color: '#16A34A', fontWeight: 700, fontSize: 14 }}>{fmt(s.revenue)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Chi phí tích lũy</span>
                            <span style={{ color: '#DC2626', fontWeight: 700, fontSize: 14 }}>{fmt(s.expense)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, paddingTop: 10, borderTop: '1px solid var(--border-color)' }}>
                            <span style={{ fontWeight: 700 }}>Lợi nhuận</span>
                            <span style={{ color: profit >= 0 ? '#16A34A' : '#DC2626', fontWeight: 800, fontSize: 16 }}>{fmt(profit)}</span>
                        </div>
                        <div style={{ background: '#F4F6FA', borderRadius: 10, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng HĐ</span>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{fmt(s.totalContractValue)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã thu</span>
                                <span style={{ fontWeight: 600, fontSize: 13, color: '#16A34A' }}>{fmt(s.totalPaid)}</span>
                            </div>
                            <div style={{ height: 7, background: '#E2E8F0', borderRadius: 4 }}>
                                <div style={{ height: '100%', width: `${collectionRate}%`, background: 'linear-gradient(90deg, #234093, #2D5CA3)', borderRadius: 4, transition: 'width 0.5s ease' }} />
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>Tỷ lệ thu: <strong style={{ color: '#234093' }}>{collectionRate}%</strong></div>
                        </div>
                    </div>
                </div>

                {/* Project status */}
                <div className="card">
                    <div className="card-header" style={{ borderLeft: '4px solid #DBB35E', paddingLeft: 12 }}>
                        <h3>Dự án theo trạng thái</h3>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                        {data.projectsByStatus.sort((a, b) => b._count - a._count).map((ps, i) => {
                            const pct = s.projects > 0 ? Math.round(ps._count / s.projects * 100) : 0;
                            const barColor = i === 0 ? '#234093' : i === 1 ? '#2D5CA3' : i === 2 ? '#DBB35E' : '#C6C6C6';
                            return (
                                <div key={ps.status} style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ps.status}</span>
                                        <span style={{ fontSize: 13, fontWeight: 700 }}>{ps._count}</span>
                                    </div>
                                    <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3 }}>
                                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Recent projects */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header" style={{ borderLeft: '4px solid #234093', paddingLeft: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Dự án gần đây</h3>
                    <a href="/projects" style={{ fontSize: 12, color: '#234093', textDecoration: 'none', fontWeight: 600 }}>Xem tất cả →</a>
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr><th>Mã DA</th><th>Tên dự án</th><th>Khách hàng</th><th>Ngân sách</th><th>Tiến độ</th><th>Trạng thái</th></tr>
                        </thead>
                        <tbody>
                            {data.recentProjects.map(p => (
                                <tr key={p.id} onClick={() => window.location.href = `/projects/${p.code}`} style={{ cursor: 'pointer' }}>
                                    <td style={{ fontWeight: 600, color: '#234093' }}>{p.code}</td>
                                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                                    <td>{p.customer?.name}</td>
                                    <td>{fmt(p.budget)}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ flex: 1, height: 5, background: '#E2E8F0', borderRadius: 3 }}>
                                                <div style={{ height: '100%', width: `${p.progress}%`, background: 'linear-gradient(90deg, #234093, #2D5CA3)', borderRadius: 3 }} />
                                            </div>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28 }}>{p.progress}%</span>
                                        </div>
                                    </td>
                                    <td><span className="badge badge-info">{p.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header" style={{ borderLeft: '4px solid #DBB35E', paddingLeft: 12 }}>
                    <h3>⚡ Thao tác nhanh</h3>
                </div>
                <div style={{ padding: '12px 20px 16px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {[
                        { href: '/quotations?new=1', icon: '📋', label: 'Tạo báo giá', bg: '#234093' },
                        { href: '/customers?new=1', icon: '👤', label: 'Thêm khách hàng', bg: '#2D5CA3' },
                        { href: '/projects?new=1', icon: '🏗️', label: 'Tạo dự án', bg: '#16A34A' },
                        { href: '/purchasing?new=1', icon: '🛒', label: 'Tạo PO', bg: '#D97706' },
                        { href: '/work-orders?new=1', icon: '📝', label: 'Tạo lệnh CV', bg: '#7C3AED' },
                        { href: '/expenses?new=1', icon: '💰', label: 'Ghi chi phí', bg: '#DC2626' },
                    ].map(a => (
                        <a key={a.href} href={a.href} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 18px', borderRadius: 10,
                            background: a.bg, color: '#fff',
                            textDecoration: 'none', fontSize: 13, fontWeight: 600,
                            transition: 'opacity 0.2s, transform 0.15s',
                            boxShadow: `0 2px 8px ${a.bg}33`,
                        }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <span style={{ fontSize: 16 }}>{a.icon}</span> {a.label}
                        </a>
                    ))}
                </div>
            </div>

            {/* Activity Feed + Upcoming Milestones */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
                <ActivityFeed />
                <UpcomingMilestones />
            </div>

            {/* Low stock */}
            {data.lowStockProducts?.length > 0 && (
                <div className="card" style={{ borderLeft: '4px solid #DC2626' }}>
                    <div className="card-header" style={{ paddingLeft: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            Sản phẩm hết hàng
                            <span style={{ background: '#DC2626', color: '#fff', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 10 }}>{data.lowStockProducts.length}</span>
                        </h3>
                        <a href="/products" style={{ fontSize: 12, color: '#234093', textDecoration: 'none', fontWeight: 600 }}>Xem tất cả →</a>
                    </div>
                    <div style={{ padding: '8px 16px 14px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {data.lowStockProducts.map(p => (
                                <a key={p.id} href={`/products/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(220,38,38,0.05)', borderRadius: 8, border: '1px solid rgba(220,38,38,0.15)', textDecoration: 'none', color: 'inherit', fontSize: 12 }}>
                                    {p.image && <img src={p.image} style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} alt="" />}
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                                        <div style={{ fontSize: 10, color: '#DC2626' }}>Tồn: {p.stock}{p.minStock > 0 && ` / min ${p.minStock}`}</div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Widget Configurator */}
            {showConfig && (
                <WidgetConfigurator
                    widgets={widgets}
                    onToggle={toggleWidget}
                    onMove={moveWidget}
                    onReset={resetConfig}
                    onClose={() => setShowConfig(false)}
                />
            )}
        </div>
    );
}
