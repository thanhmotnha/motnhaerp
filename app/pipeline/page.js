'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const fmtC = (n) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);
const fmtFull = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

const PIPELINE_STAGES = [
    { key: 'CRM', label: 'CRM / Khảo sát', icon: '📊', statuses: ['Khảo sát', 'Báo giá'], color: 'var(--text-muted)' },
    { key: 'design', label: 'Thiết kế', icon: '🎨', statuses: ['Thiết kế'], color: 'var(--accent-primary)' },
    { key: 'contract', label: 'Ký HĐ', icon: '📝', statuses: ['Chuẩn bị thi công'], color: 'var(--status-info)' },
    { key: 'construction', label: 'Thi công', icon: '🔨', statuses: ['Đang thi công'], color: 'var(--status-warning)' },
    { key: 'warranty', label: 'Bảo hành', icon: '🛡️', statuses: ['Bảo hành'], color: 'var(--status-success)' },
    { key: 'complete', label: 'Hoàn thành', icon: '✅', statuses: ['Hoàn thành'], color: 'var(--status-success)' },
];

const LS_KEY = 'pipeline_monthly_target';

export default function PipelinePage() {
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStage, setSelectedStage] = useState(null);
    const [editingTarget, setEditingTarget] = useState(false);
    const [monthlyTarget, setMonthlyTarget] = useState(0);
    const [targetInput, setTargetInput] = useState('');
    const { role } = useRole();
    const canSeeFinance = ['giam_doc', 'pho_gd', 'ke_toan'].includes(role);

    useEffect(() => {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) setMonthlyTarget(Number(saved));
    }, []);

    const saveTarget = () => {
        const val = Number(String(targetInput).replace(/[^0-9]/g, '')) || 0;
        setMonthlyTarget(val);
        localStorage.setItem(LS_KEY, val);
        setEditingTarget(false);
    };

    useEffect(() => {
        fetch('/api/projects?limit=1000').then(r => r.json()).then(d => {
            setProjects(d.data || []);
            setLoading(false);
        });
    }, []);

    const stageData = PIPELINE_STAGES.map(stage => {
        const ps = projects.filter(p => stage.statuses.includes(p.status));
        return {
            ...stage,
            projects: ps,
            count: ps.length,
            totalContract: ps.reduce((s, p) => s + (p.contractValue || 0), 0),
        };
    });

    const activeStage = selectedStage ? stageData.find(s => s.key === selectedStage) : null;
    const filteredProjects = activeStage ? activeStage.projects : projects;

    const displayContract = activeStage
        ? activeStage.totalContract
        : projects.reduce((s, p) => s + (p.contractValue || 0), 0);
    const displayArea = filteredProjects.reduce((s, p) => s + (p.area || 0), 0);
    const displayAvgProgress = filteredProjects.length > 0
        ? Math.round(filteredProjects.reduce((s, p) => s + (p.progress || 0), 0) / filteredProjects.length)
        : 0;

    const maxContract = Math.max(...stageData.map(s => s.totalContract), 1);

    // KPI calculations
    const totalPipelineValue = projects.reduce((s, p) => s + (p.contractValue || 0), 0);
    const activeValue = stageData
        .filter(s => ['construction', 'warranty', 'complete'].includes(s.key))
        .reduce((s, st) => s + st.totalContract, 0);
    const targetPct = monthlyTarget > 0 ? Math.min(Math.round((activeValue / monthlyTarget) * 100), 100) : 0;
    const totalProjects = projects.length;
    const wonProjects = projects.filter(p => ['Chuẩn bị thi công', 'Đang thi công', 'Bảo hành', 'Hoàn thành'].includes(p.status)).length;
    const winRate = totalProjects > 0 ? Math.round((wonProjects / totalProjects) * 100) : 0;

    return (
        <div>
            <h2 style={{ marginBottom: 24 }}>📊 Pipeline dự án</h2>

            {/* Pipeline stepper */}
            <div className="pipeline-stepper" style={{ marginBottom: 24 }}>
                {stageData.map((stage, i) => (
                    <div
                        key={stage.key}
                        className={`pipeline-step ${selectedStage === stage.key ? 'active' : ''} ${stage.count > 0 ? 'has-data' : ''}`}
                        onClick={() => setSelectedStage(selectedStage === stage.key ? null : stage.key)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="pipeline-step-icon">{stage.icon}</div>
                        <div className="pipeline-step-label">{stage.label}</div>
                        <div className="pipeline-step-count">{stage.count}</div>
                        {canSeeFinance && stage.totalContract > 0 && (
                            <div style={{ fontSize: 10, color: stage.color, fontWeight: 600, marginTop: 2 }}>
                                {fmtC(stage.totalContract)}đ
                            </div>
                        )}
                        {i < stageData.length - 1 && <div className="pipeline-connector"></div>}
                    </div>
                ))}
            </div>

            {/* Funnel bar — giá trị HĐ theo stage */}
            {canSeeFinance && (
                <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Giá trị hợp đồng theo giai đoạn
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {stageData.filter(s => s.count > 0).map(stage => {
                            const barW = Math.round((stage.totalContract / maxContract) * 100);
                            return (
                                <div
                                    key={stage.key}
                                    onClick={() => setSelectedStage(selectedStage === stage.key ? null : stage.key)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', opacity: selectedStage && selectedStage !== stage.key ? 0.4 : 1, transition: 'opacity 0.2s' }}
                                >
                                    <div style={{ width: 120, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
                                        {stage.icon} {stage.label}
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ flex: 1, height: 14, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${barW}%`, background: stage.color, borderRadius: 3, opacity: 0.8, transition: 'width 0.3s' }} />
                                        </div>
                                        <div style={{ width: 90, fontSize: 12, fontWeight: 600, textAlign: 'right', color: stage.color }}>
                                            {fmtC(stage.totalContract)}đ
                                        </div>
                                        <div style={{ width: 36, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                                            {stage.count} DA
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* KPI Target (finance only) */}
            {canSeeFinance && (
                <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                            KPI Pipeline tháng này
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setTargetInput(monthlyTarget); setEditingTarget(v => !v); }}>
                            {editingTarget ? 'Đóng' : '⚙ Đặt mục tiêu'}
                        </button>
                    </div>
                    {editingTarget && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <input className="form-input" style={{ margin: 0, flex: 1 }} type="number" placeholder="Nhập mục tiêu doanh thu (VND)" value={targetInput} onChange={e => setTargetInput(e.target.value)} />
                            <button className="btn btn-primary btn-sm" onClick={saveTarget}>Lưu</button>
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Tổng pipeline</div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-primary)' }}>{fmtC(totalPipelineValue)}đ</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Win Rate</div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: winRate >= 50 ? 'var(--status-success)' : 'var(--status-warning)' }}>
                                {winRate}% <span style={{ fontSize: 11, fontWeight: 400 }}>({wonProjects}/{totalProjects} DA)</span>
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                                {monthlyTarget > 0 ? `Mục tiêu: ${fmtC(monthlyTarget)}đ` : 'Chưa đặt mục tiêu'}
                            </div>
                            {monthlyTarget > 0 && (
                                <>
                                    <div style={{ fontWeight: 700, fontSize: 16, color: targetPct >= 80 ? 'var(--status-success)' : targetPct >= 50 ? 'var(--status-warning)' : 'var(--status-danger)' }}>
                                        {targetPct}%
                                    </div>
                                    <div className="progress-bar" style={{ height: 6, marginTop: 4 }}>
                                        <div className="progress-fill" style={{ width: `${targetPct}%`, background: targetPct >= 80 ? 'var(--status-success)' : targetPct >= 50 ? 'var(--status-warning)' : 'var(--status-danger)' }} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-icon">🏗️</div>
                    <div>
                        <div className="stat-value">{filteredProjects.length}</div>
                        <div className="stat-label">{activeStage ? activeStage.label : 'Tổng dự án'}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📐</div>
                    <div>
                        <div className="stat-value">{displayArea.toLocaleString('vi-VN')} m²</div>
                        <div className="stat-label">Tổng diện tích</div>
                    </div>
                </div>
                {canSeeFinance && (
                    <div className="stat-card">
                        <div className="stat-icon">💰</div>
                        <div>
                            <div className="stat-value">{fmtC(displayContract)}đ</div>
                            <div className="stat-label">Giá trị HĐ</div>
                        </div>
                    </div>
                )}
                <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div>
                        <div className="stat-value">{displayAvgProgress}%</div>
                        <div className="stat-label">Tiến độ TB</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⚡</div>
                    <div>
                        <div className="stat-value">{projects.filter(p => ['Đang thi công', 'Thiết kế'].includes(p.status)).length}</div>
                        <div className="stat-label">Đang hoạt động</div>
                    </div>
                </div>
            </div>

            {/* Project table */}
            <div className="card">
                <div className="card-header">
                    <h3>
                        {activeStage ? `${activeStage.icon} ${activeStage.label}` : 'Tất cả dự án'}
                        {activeStage && canSeeFinance && activeStage.totalContract > 0 && (
                            <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>
                                — Tổng HĐ: <strong style={{ color: activeStage.color }}>{fmtFull(activeStage.totalContract)}</strong>
                            </span>
                        )}
                    </h3>
                    {selectedStage && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedStage(null)}>Xem tất cả</button>
                    )}
                </div>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã</th>
                                <th>Tên dự án</th>
                                <th>Khách hàng</th>
                                <th>Diện tích</th>
                                {canSeeFinance && <th>Giá trị HĐ</th>}
                                <th>Tiến độ</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProjects.map(p => (
                                <tr key={p.id} onClick={() => router.push(`/projects/${p.id}`)} style={{ cursor: 'pointer' }}>
                                    <td className="accent">{p.code}</td>
                                    <td className="primary">
                                        {p.name}
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.address}</div>
                                    </td>
                                    <td style={{ fontSize: 12 }}>{p.customer?.name}</td>
                                    <td>{p.area ? `${p.area} m²` : '—'}</td>
                                    {canSeeFinance && (
                                        <td className="amount">{p.contractValue ? fmtFull(p.contractValue) : '—'}</td>
                                    )}
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div className="progress-bar" style={{ flex: 1, maxWidth: 60 }}>
                                                <div className="progress-fill" style={{ width: `${p.progress || 0}%` }} />
                                            </div>
                                            <span style={{ fontSize: 12 }}>{p.progress || 0}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${p.status === 'Hoàn thành' ? 'success' : p.status === 'Đang thi công' ? 'warning' : p.status === 'Thiết kế' ? 'info' : 'muted'}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!loading && filteredProjects.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>
                        Không có dự án trong giai đoạn này
                    </div>
                )}
            </div>
        </div>
    );
}
