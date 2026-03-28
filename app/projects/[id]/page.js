'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fmtVND, fmtDate } from '@/lib/projectUtils';
import OverviewTab from './tabs/OverviewTab';
import ContractTab from './tabs/ContractTab';
import MilestoneTab from './tabs/MilestoneTab';
import MaterialTab from './tabs/MaterialTab';
import ContractorTab from './tabs/ContractorTab';
import DocumentTab from './tabs/DocumentTab';
import WarrantyTab from './tabs/WarrantyTab';

const PIPELINE = [
    { key: 'Khảo sát', label: 'CRM', icon: '📊' },
    { key: 'Thiết kế', label: 'Thiết kế', icon: '🎨' },
    { key: 'Ký HĐ', label: 'Ký HĐ', icon: '📝' },
    { key: 'Đang thi công', label: 'Thi công', icon: '🔨' },
    { key: 'Bảo hành', label: 'Bảo hành', icon: '🛡️' },
    { key: 'Hoàn thành', label: 'Hậu mãi', icon: '✅' },
];
const STATUS_MAP = Object.fromEntries(PIPELINE.map((s, i) => [s.key, i]));

const TABS = [
    { key: 'overview', label: 'Tổng quan', icon: '📋' },
    { key: 'contracts', label: 'Hợp đồng', icon: '📝', countKey: 'contracts' },
    { key: 'milestones', label: 'Tiến độ', icon: '📊', countKey: 'milestones' },
    { key: 'materials', label: 'Vật tư', icon: '🧱', countKey: 'materialPlans' },
    { key: 'contractors', label: 'Thầu phụ', icon: '👷', countKey: 'contractorPays' },
    { key: 'documents', label: 'Tài liệu', icon: '📁', countKey: 'documents' },
    { key: 'warranty', label: 'Bảo hành', icon: '🛡️' },
];

export default function ProjectDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    const fetchData = () => {
        setLoading(true);
        fetch(`/api/projects/${id}`)
            .then(r => r.json())
            .then(d => { setProject(d); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(fetchData, [id]);

    if (loading || !project) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    }

    const p = project;
    const pipelineIdx = STATUS_MAP[p.status] ?? 0;
    const pnl = p.pnl || {};

    const now = new Date();
    const end = p.endDate ? new Date(p.endDate) : null;
    const overdueDays = end ? Math.ceil((now - end) / 86400000) : 0;
    const budgetRate = (p.budget || 0) > 0 ? ((p.spent || 0) / p.budget) * 100 : 0;
    const isDone = p.status === 'Hoàn thành';
    let health = 'success', healthLabel = '🟢 Bình thường';
    if (!isDone && (overdueDays > 30 || budgetRate > 100)) {
        health = 'danger'; healthLabel = overdueDays > 30 ? `🔴 Trễ ${overdueDays} ngày` : '🔴 Vượt NS';
    } else if (!isDone && (overdueDays > 0 || budgetRate > 80)) {
        health = 'warning'; healthLabel = overdueDays > 0 ? `🟡 Trễ ${overdueDays} ngày` : '🟡 Cần theo dõi';
    }

    const TAB_COMPONENTS = {
        overview: <OverviewTab project={p} projectId={id} onRefresh={fetchData} />,
        contracts: <ContractTab project={p} projectId={id} onRefresh={fetchData} />,
        milestones: <MilestoneTab project={p} projectId={id} onRefresh={fetchData} />,
        materials: <MaterialTab project={p} projectId={id} onRefresh={fetchData} />,
        contractors: <ContractorTab project={p} projectId={id} onRefresh={fetchData} />,
        documents: <DocumentTab project={p} projectId={id} onRefresh={fetchData} />,
        warranty: <WarrantyTab project={p} projectId={id} onRefresh={fetchData} />,
    };

    return (
        <div>
            <button className="btn btn-secondary" onClick={() => router.push('/projects')} style={{ marginBottom: 16 }}>
                ← Quay lại
            </button>

            {/* Project Header */}
            <div className="card" style={{ marginBottom: 24, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--text-accent)', fontSize: 14, fontWeight: 600 }}>{p.code}</span>
                            <span className={`badge ${p.status === 'Hoàn thành' ? 'success' : p.status === 'Đang thi công' ? 'warning' : 'info'}`}>{p.status}</span>
                            {p.phase && <span className="badge muted">{p.phase}</span>}
                            <span className={`badge ${health}`}>{healthLabel}</span>
                            {(pnl.profit ?? 0) >= 0
                                ? <span className="badge success">📈 Lãi {fmtVND(pnl.profit)}</span>
                                : <span className="badge danger">📉 Lỗ {fmtVND(Math.abs(pnl.profit))}</span>
                            }
                        </div>
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{p.name}</h2>
                        <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 13 }}>
                            {p.customer?.name} • {p.address}
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                            {p.manager && <span>👤 PM: <strong>{p.manager}</strong></span>}
                            {p.designer && <span>🎨 TK: {p.designer}</span>}
                            {p.supervisor && <span>🔧 GS: {p.supervisor}</span>}
                        </div>
                        {(p.startDate || p.endDate) && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, fontSize: 12 }}>
                                <span style={{ color: 'var(--text-muted)' }}>📅 {fmtDate(p.startDate)} → {fmtDate(p.endDate)}</span>
                                {!isDone && overdueDays > 0 && (
                                    <span className="badge danger" style={{ fontSize: 11 }}>⚠ Trễ {overdueDays} ngày</span>
                                )}
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 32, fontWeight: 700 }}>{Number(p.progress) || 0}%</div>
                        <div className="progress-bar" style={{ width: 120 }}>
                            <div className="progress-fill" style={{ width: `${Number(p.progress) || 0}%` }} />
                        </div>
                    </div>
                </div>

                {/* Pipeline */}
                <div className="pipeline">
                    {PIPELINE.map((stage, i) => (
                        <div className="pipeline-step" key={stage.key}>
                            <div className={`pipeline-node ${i === pipelineIdx ? 'active' : i < pipelineIdx ? 'completed' : ''}`}>
                                <div className="pipeline-dot">{i < pipelineIdx ? '✓' : stage.icon}</div>
                                <span className="pipeline-label">{stage.label}</span>
                            </div>
                            {i < PIPELINE.length - 1 && <div className={`pipeline-line ${i < pipelineIdx ? 'completed' : ''}`} />}
                        </div>
                    ))}
                </div>

                {/* Quick Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 8 }}>
                    {[
                        { v: `${Number(p.area) || 0}m²`, l: 'Diện tích' },
                        { v: `${p.floors || 0} tầng`, l: 'Số tầng' },
                        { v: fmtVND(p.contractValue), l: 'Giá trị HĐ' },
                        { v: fmtVND(p.paidAmount), l: 'Đã thu' },
                        { v: fmtVND(pnl.debtFromCustomer), l: 'KH còn nợ', c: (pnl.debtFromCustomer || 0) > 0 ? 'var(--status-danger)' : 'var(--status-success)' },
                    ].map(s => (
                        <div key={s.l} style={{ textAlign: 'center', padding: '8px 0' }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: s.c || 'var(--text-primary)' }}>{s.v}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.l}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tab Bar */}
            <div className="project-tabs">
                {TABS.map(t => {
                    const count = t.countKey ? (p[t.countKey]?.length || 0) : 0;
                    return (
                        <button key={t.key} className={`project-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                            <span>{t.icon}</span> {t.label}
                            {count > 0 && <span className="tab-count">{count}</span>}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div style={{ marginTop: 16 }}>
                {TAB_COMPONENTS[tab]}
            </div>
        </div>
    );
}
