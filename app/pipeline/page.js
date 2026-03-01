'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

const PIPELINE_STAGES = [
    { key: 'CRM', label: 'CRM / Khảo sát', icon: '📊', statuses: ['Khảo sát', 'Báo giá'] },
    { key: 'design', label: 'Thiết kế', icon: '🎨', statuses: ['Thiết kế'] },
    { key: 'contract', label: 'Ký HĐ', icon: '📝', statuses: ['Chuẩn bị thi công'] },
    { key: 'construction', label: 'Thi công', icon: '🔨', statuses: ['Đang thi công'] },
    { key: 'warranty', label: 'Bảo hành', icon: '🛡️', statuses: ['Bảo hành'] },
    { key: 'complete', label: 'Hoàn thành', icon: '✅', statuses: ['Hoàn thành'] },
];

export default function PipelinePage() {
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStage, setSelectedStage] = useState(null);

    useEffect(() => { fetch('/api/projects?limit=1000').then(r => r.json()).then(d => { setProjects(d.data || []); setLoading(false); }); }, []);

    const stageCounts = PIPELINE_STAGES.map(stage => ({
        ...stage,
        projects: projects.filter(p => stage.statuses.includes(p.status)),
        count: projects.filter(p => stage.statuses.includes(p.status)).length,
    }));

    const filteredProjects = selectedStage
        ? stageCounts.find(s => s.key === selectedStage)?.projects || []
        : projects;

    const totalArea = projects.reduce((s, p) => s + (p.area || 0), 0);
    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);

    return (
        <div>
            <h2 style={{ marginBottom: 24 }}>📊 Pipeline dự án</h2>

            {/* Pipeline visual */}
            <div className="pipeline-stepper" style={{ marginBottom: 32 }}>
                {stageCounts.map((stage, i) => (
                    <div
                        key={stage.key}
                        className={`pipeline-step ${selectedStage === stage.key ? 'active' : ''} ${stage.count > 0 ? 'has-data' : ''}`}
                        onClick={() => setSelectedStage(selectedStage === stage.key ? null : stage.key)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="pipeline-step-icon">{stage.icon}</div>
                        <div className="pipeline-step-label">{stage.label}</div>
                        <div className="pipeline-step-count">{stage.count}</div>
                        {i < stageCounts.length - 1 && <div className="pipeline-connector"></div>}
                    </div>
                ))}
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}>
                <div className="stat-card"><div className="stat-icon">🏗️</div><div><div className="stat-value">{filteredProjects.length}</div><div className="stat-label">{selectedStage ? `DA giai đoạn ${selectedStage}` : 'Tổng dự án'}</div></div></div>
                <div className="stat-card"><div className="stat-icon">📐</div><div><div className="stat-value">{totalArea.toLocaleString('vi-VN')} m²</div><div className="stat-label">Tổng diện tích</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(totalBudget)}</div><div className="stat-label">Tổng ngân sách</div></div></div>
                <div className="stat-card"><div className="stat-icon">⚡</div><div><div className="stat-value">{projects.filter(p => ['Đang thi công', 'Thiết kế'].includes(p.status)).length}</div><div className="stat-label">Đang hoạt động</div></div></div>
            </div>

            {/* Project table */}
            <div className="card">
                <div className="card-header">
                    <h3>{selectedStage ? `Dự án — ${PIPELINE_STAGES.find(s => s.key === selectedStage)?.label}` : 'Tất cả dự án'}</h3>
                    {selectedStage && <button className="btn btn-secondary btn-sm" onClick={() => setSelectedStage(null)}>Xem tất cả</button>}
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                    <table className="data-table">
                        <thead><tr><th>Mã</th><th>Tên dự án</th><th>Khách hàng</th><th>Diện tích</th><th>Ngân sách</th><th>Tiến độ</th><th>Trạng thái</th></tr></thead>
                        <tbody>{filteredProjects.map(p => (
                            <tr key={p.id} onClick={() => router.push(`/projects/${p.id}`)} style={{ cursor: 'pointer' }}>
                                <td className="accent">{p.code}</td>
                                <td className="primary">{p.name}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.address}</div></td>
                                <td style={{ fontSize: 12 }}>{p.customer?.name}</td>
                                <td>{p.area} m²</td>
                                <td className="amount">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.budget)}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div className="progress-bar" style={{ flex: 1, maxWidth: 60 }}><div className="progress-fill" style={{ width: `${p.progress}%` }}></div></div>
                                        <span style={{ fontSize: 12 }}>{p.progress}%</span>
                                    </div>
                                </td>
                                <td><span className={`badge ${p.status === 'Hoàn thành' ? 'success' : p.status === 'Đang thi công' ? 'warning' : p.status === 'Thiết kế' ? 'info' : 'muted'}`}>{p.status}</span></td>
                            </tr>
                        ))}</tbody>
                    </table>
                )}
                {!loading && filteredProjects.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Không có dự án trong giai đoạn này</div>}
            </div>
        </div>
    );
}
