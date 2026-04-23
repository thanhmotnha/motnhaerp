'use client';
import { useState, useEffect, useCallback } from 'react';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { useDashboardWidgets, WidgetConfigurator } from '@/components/dashboard/WidgetConfigurator';
import NotificationBell from '@/components/ui/NotificationBell';
import { useRole } from '@/contexts/RoleContext';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtShort = (n) => {
    if (!n) return '0';
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}tỷ`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(0)}tr`;
    return new Intl.NumberFormat('vi-VN').format(n);
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const daysDiff = (d) => Math.floor((new Date(d) - new Date()) / 86400000);

function AlertBar({ stats, canViewFinance }) {
    const alerts = [];
    if (stats.openWarranty > 0) alerts.push({ href: '/projects', icon: '🛡️', label: `${stats.openWarranty} bảo hành mở`, color: '#DC2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)' });
    if (stats.pendingLeave > 0) alerts.push({ href: '/hr', icon: '🗓️', label: `${stats.pendingLeave} đơn nghỉ chờ duyệt`, color: '#D97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.2)' });
    if (canViewFinance && stats.overdueReceivable > 0) alerts.push({ href: '/reports', icon: '⚠️', label: `Phải thu quá hạn: ${fmtShort(stats.overdueReceivable)}`, color: '#DC2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)' });
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

function ServiceDebtCard({ enabled }) {
    const [summary, setSummary] = useState(null);
    const [loadErr, setLoadErr] = useState(false);
    useEffect(() => {
        if (!enabled) return;
        fetch('/api/dashboard/service-summary')
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(setSummary)
            .catch(() => setLoadErr(true));
    }, [enabled]);
    if (!enabled || loadErr) return null;
    if (!summary) return null;
    const pendingTotal = summary.pending?.total || 0;
    const pendingCount = summary.pending?.count || 0;
    const paidCount = summary.paid?.count || 0;
    const top = summary.topUnpaidBySupplier || [];
    const cats = summary.byCategory || [];
    return (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #DC2626' }}>
            <div className="card-header" style={{ paddingLeft: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    💼 Công nợ dịch vụ
                    {pendingCount > 0 && (
                        <span style={{ background: '#DC2626', color: '#fff', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 10 }}>{pendingCount}</span>
                    )}
                </h3>
                <a href="/expenses/services" style={{ fontSize: 12, color: '#234093', textDecoration: 'none', fontWeight: 600 }}>Xem chi tiết →</a>
            </div>
            <div style={{ padding: '14px 20px 18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: top.length || cats.length ? 16 : 0 }}>
                    <div style={{ padding: '14px 16px', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Tổng còn nợ</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#DC2626', lineHeight: 1.1 }}>{fmt(pendingTotal)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{pendingCount} khoản chưa trả</div>
                    </div>
                    <div style={{ padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Đã thanh toán (tích lũy)</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#16A34A', lineHeight: 1.1 }}>{fmt(summary.paid?.total || 0)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{paidCount} khoản đã xong</div>
                    </div>
                </div>
                {(top.length > 0 || cats.length > 0) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                        {top.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top còn nợ theo NCC / Thầu phụ</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {top.map((t, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 6, background: 'var(--bg-secondary)' }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.recipientName}</div>
                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.recipientType} · {t.debtCount} khoản</div>
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginLeft: 8, whiteSpace: 'nowrap' }}>{fmtShort(t.remaining)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {cats.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theo hạng mục</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {cats.map((c, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 6, background: 'var(--bg-secondary)' }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.category}</div>
                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.count} khoản</div>
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', marginLeft: 8, whiteSpace: 'nowrap' }}>{fmtShort(c.totalPending)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
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

function MonthlyMiniChart({ months, selectedYear }) {
    const currentMonth = selectedYear === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
    const display = (months || []).filter(m => m.month <= currentMonth && (m.revenue > 0 || m.expense > 0)).slice(-6);
    if (!display.length) return (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: 12 }}>Chưa có dữ liệu tháng {selectedYear}</div>
    );
    const maxVal = Math.max(...display.flatMap(m => [m.revenue, m.expense]), 1);
    const barW = 18, gap = 6, colW = barW * 2 + gap + 14;
    const W = display.length * colW + 20, H = 80;
    return (
        <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: '100%', height: 120, display: 'block' }}>
            {display.map((m, i) => {
                const x = 10 + i * colW;
                const rh = Math.max(2, Math.round((m.revenue / maxVal) * H));
                const eh = Math.max(2, Math.round((m.expense / maxVal) * H));
                return (
                    <g key={m.label}>
                        <rect x={x} y={H - rh} width={barW} height={rh} fill="#234093" rx={2} opacity={0.85} />
                        <rect x={x + barW + gap / 2} y={H - eh} width={barW} height={eh} fill="#F97316" rx={2} opacity={0.85} />
                        <text x={x + barW} y={H + 16} textAnchor="middle" fontSize={9} fill="#888">{m.label}</text>
                    </g>
                );
            })}
            <text x={4} y={H + 16} fontSize={9} fill="#234093">■ DT</text>
            <text x={display.length * colW - 20} y={H + 16} fontSize={9} fill="#F97316">■ CP</text>
        </svg>
    );
}

function AlertProjectsCard({ rows }) {
    if (!rows || rows.length === 0) return (
        <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ borderLeft: '4px solid #16A34A', paddingLeft: 12 }}>
                <h3>✅ Dự án cần chú ý</h3>
            </div>
            <div style={{ padding: '16px 20px', color: '#16A34A', fontSize: 13 }}>Tất cả dự án đều đang ổn định.</div>
        </div>
    );
    return (
        <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ borderLeft: '4px solid #D97706', paddingLeft: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    ⚠️ Dự án cần chú ý
                    <span style={{ background: '#DC2626', color: '#fff', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 10 }}>{rows.length}</span>
                </h3>
                <a href="/reports/pl-by-project" style={{ fontSize: 12, color: '#234093', textDecoration: 'none', fontWeight: 600 }}>Xem tất cả P&L →</a>
            </div>
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Mã DA</th>
                            <th>Tên dự án</th>
                            <th>Loại</th>
                            <th style={{ textAlign: 'right' }}>Doanh thu</th>
                            <th style={{ textAlign: 'right' }}>Chi phí</th>
                            <th style={{ textAlign: 'right' }}>Margin</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.slice(0, 10).map(r => (
                            <tr key={r.id}
                                onClick={() => window.location.href = `/projects/${r.code}`}
                                style={{ cursor: 'pointer', background: r.margin < 0 ? 'rgba(220,38,38,0.04)' : 'rgba(217,119,6,0.04)' }}
                            >
                                <td style={{ fontWeight: 600, color: '#234093' }}>{r.code}</td>
                                <td style={{ fontWeight: 500 }}>{r.name}</td>
                                <td style={{ fontSize: 12 }}>{r.groupType}</td>
                                <td style={{ textAlign: 'right', fontSize: 13 }}>{fmtShort(r.paidByCustomer)}</td>
                                <td style={{ textAlign: 'right', fontSize: 13 }}>{fmtShort(r.totalCost)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: r.margin < 0 ? '#DC2626' : '#D97706' }}>{r.margin?.toFixed(1)}%</td>
                                <td><span className="badge badge-info">{r.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function DebtPanels({ debtData }) {
    if (!debtData) return null;
    const panels = [
        { title: 'Công nợ NCC', total: debtData.supplierTotal, items: debtData.topSuppliers?.slice(0, 4) || [], color: '#7C3AED' },
        { title: 'Công nợ Nhà thầu', total: debtData.contractorTotal, items: debtData.topContractors?.slice(0, 4) || [], color: '#DC2626' },
    ];
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {panels.map(panel => (
                <div key={panel.title} className="card">
                    <div className="card-header" style={{ borderLeft: `4px solid ${panel.color}`, paddingLeft: 12 }}>
                        <h3>{panel.title}</h3>
                        <span style={{ fontSize: 18, fontWeight: 800, color: panel.color }}>{fmtShort(panel.total)}</span>
                    </div>
                    <div style={{ padding: '8px 16px 12px' }}>
                        {panel.items.length === 0 ? (
                            <div style={{ color: '#16A34A', fontSize: 12 }}>Không có công nợ</div>
                        ) : panel.items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < panel.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.name}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: panel.color }}>{fmtShort(item.totalDebt)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function Dashboard() {
    const { permissions } = useRole();
    const canViewFinance = permissions?.canViewFinance ?? false;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [debtData, setDebtData] = useState(null);
    const [pnlAlerts, setPnlAlerts] = useState([]);
    const [monthlyData, setMonthlyData] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [refreshTick, setRefreshTick] = useState(0);
    const { widgets, showConfig, setShowConfig, toggleWidget, moveWidget, resetConfig } = useDashboardWidgets();

    const load = useCallback((showRefresh = false) => {
        if (showRefresh) {
            setRefreshing(true);
            setRefreshTick(t => t + 1);
        }
        const requests = [fetch('/api/dashboard').then(r => r.json())];
        if (canViewFinance) {
            requests.push(fetch('/api/reports/debt').then(r => r.json()));
            requests.push(fetch('/api/reports/project-pnl').then(r => r.json()));
        }
        Promise.all(requests).then(([dashboard, debt, pnl]) => {
            setData(dashboard);
            if (canViewFinance) {
                setDebtData(debt);
                setPnlAlerts((pnl.rows || []).filter(r => r.alert));
            }
            setLoading(false);
            setRefreshing(false);
        }).catch(() => { setLoading(false); setRefreshing(false); });
    }, [canViewFinance]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!canViewFinance) return;
        fetch(`/api/reports/monthly?year=${selectedYear}`)
            .then(r => r.json())
            .then(setMonthlyData)
            .catch(() => {});
    }, [selectedYear, canViewFinance]);

    if (loading) return <SkeletonDashboard />;
    if (!data?.stats) return <SkeletonDashboard />;

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
                    {canViewFinance && (
                        <div style={{ background: 'rgba(219,179,94,0.2)', border: '1px solid rgba(219,179,94,0.35)', borderRadius: 8, padding: '6px 14px', color: '#DBB35E', fontSize: 13 }}>
                            <span style={{ opacity: 0.8, fontSize: 11 }}>Tháng này </span><strong>{fmtShort(s.thisMonthRevenue)}</strong>
                        </div>
                    )}
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
            <AlertBar stats={s} canViewFinance={canViewFinance} />

            {/* Urgent tasks */}
            {data.todayTasks && <TodayTasksWidget tasks={data.todayTasks} />}

            {/* Payment alerts */}
            <PaymentAlertsCard />

            {/* Công nợ dịch vụ (chỉ giam_doc + ke_toan — API tự chặn theo role) */}
            <ServiceDebtCard key={refreshTick} enabled={canViewFinance} />

            {/* Block 1 — Tài chính tháng này (chỉ giam_doc + ke_toan) */}
            {canViewFinance && (() => {
                const curMonthIdx = new Date().getMonth();
                const cm = monthlyData?.months?.[curMonthIdx] || { revenue: 0, expense: 0, profit: 0 };
                const thisMonthExpense = cm.expense;
                const thisMonthProfit = cm.revenue - cm.expense;
                const yearOptions = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];
                return (
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header" style={{ borderLeft: '4px solid #DBB35E', paddingLeft: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>📊 Tài chính tháng này</h3>
                            <select
                                className="form-input"
                                style={{ width: 100, fontSize: 12, padding: '4px 8px' }}
                                value={selectedYear}
                                onChange={e => setSelectedYear(Number(e.target.value))}
                            >
                                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div style={{ padding: '12px 16px 8px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
                                {[
                                    { label: 'Doanh thu tháng', value: s.thisMonthRevenue, color: '#234093', sub: s.revenueGrowth != null ? `${s.revenueGrowth >= 0 ? '▲' : '▼'} ${Math.abs(s.revenueGrowth)}% tháng trước` : null, subColor: s.revenueGrowth >= 0 ? '#16A34A' : '#DC2626' },
                                    { label: 'Chi phí tháng', value: thisMonthExpense, color: '#F97316', sub: null },
                                    { label: 'Lợi nhuận tháng', value: thisMonthProfit, color: thisMonthProfit >= 0 ? '#16A34A' : '#DC2626', sub: null },
                                    { label: 'Còn phải thu', value: Math.max(0, s.totalContractValue - s.totalPaid), color: '#2D5CA3', sub: `Đã thu ${collectionRate}%`, subColor: collectionRate < 50 ? '#DC2626' : '#16A34A' },
                                    { label: 'Công nợ NCC', value: debtData?.supplierTotal || 0, color: '#7C3AED', sub: null },
                                    { label: 'Công nợ nhà thầu', value: debtData?.contractorTotal || 0, color: '#DC2626', sub: null },
                                ].map(k => (
                                    <div key={k.label} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10, borderTop: `3px solid ${k.color}` }}>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k.label}</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{fmtShort(k.value)}</div>
                                        {k.sub && <div style={{ fontSize: 10, color: k.subColor || 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{k.sub}</div>}
                                    </div>
                                ))}
                            </div>
                            <MonthlyMiniChart months={monthlyData?.months} selectedYear={selectedYear} />
                        </div>
                    </div>
                );
            })()}

            {/* Block 3 — Dự án cần chú ý (chỉ giam_doc + ke_toan) */}
            {canViewFinance && <AlertProjectsCard rows={pnlAlerts} />}

            {/* Block 4 — Công nợ (chỉ giam_doc + ke_toan) */}
            {canViewFinance && <DebtPanels debtData={debtData} />}

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
            <div style={{ display: 'grid', gridTemplateColumns: canViewFinance ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 20 }}>
                {/* Financial overview (chỉ giam_doc + ke_toan) */}
                {canViewFinance && <div className="card">
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
                </div>}

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
