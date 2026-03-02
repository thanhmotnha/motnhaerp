'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

export default function CustomerProgressPage() {
    const { code } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch(`/api/progress/${code}`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [code]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#94a3b8' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #334155', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
                Đang tải...
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
    if (!data || data.error) return (
        <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#ef4444' }}>Không tìm thấy dự án</div>
    );

    const p = data;
    const tasks = p.tasks || [];
    const thisWeek = p.thisWeekTasks || [];
    const logs = p.logs || [];
    const milestones = p.milestones || [];

    // Use schedule tasks if available, fallback to milestones
    const hasSchedule = tasks.length > 0;

    const renderTask = (task, depth = 0) => {
        const isGroup = task.children && task.children.length > 0;
        const barColor = task.progress === 100 ? '#22c55e' : task.progress > 0 ? '#3b82f6' : '#334155';
        return (
            <div key={task.id}>
                <div style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingLeft: depth * 20 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{
                                width: 24, height: 24, borderRadius: '50%',
                                background: task.progress === 100 ? '#22c55e' : task.progress > 0 ? '#3b82f6' : '#334155',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 700, flexShrink: 0,
                            }}>{task.progress === 100 ? '✓' : ''}</span>
                            <span style={{ fontWeight: isGroup ? 700 : 500, fontSize: 14 }}>{task.name}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: barColor, fontSize: 13 }}>{task.progress}%</span>
                    </div>
                    <div style={{ marginLeft: depth * 20 + 32, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${task.progress}%`, background: barColor, borderRadius: 3, transition: 'width 0.5s' }}></div>
                    </div>
                </div>
                {task.children && task.children.sort((a, b) => a.order - b.order).map(c => renderTask(c, depth + 1))}
            </div>
        );
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', color: '#e2e8f0', padding: '40px 20px' }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontSize: 11, color: '#475569', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>CẬP NHẬT TIẾN ĐỘ DỰ ÁN</div>
                    <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f8fafc', margin: 0 }}>{p.name}</h1>
                    <div style={{ color: '#94a3b8', marginTop: 6, fontSize: 13 }}>{p.customer?.name} • {p.address}</div>
                </div>

                {/* Big Progress */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 32, marginBottom: 24, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ fontSize: 64, fontWeight: 800, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>{p.progress}%</div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Tiến độ tổng</div>
                    <div style={{ height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden', marginTop: 16 }}>
                        <div style={{ height: '100%', width: `${p.progress}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: 6, transition: 'width 0.8s ease' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 16 }}>
                        <div><div style={{ fontWeight: 700, fontSize: 18 }}>{p.area}m²</div><div style={{ fontSize: 10, color: '#64748b' }}>Diện tích</div></div>
                        <div><div style={{ fontWeight: 700, fontSize: 18 }}>{p.floors} tầng</div><div style={{ fontSize: 10, color: '#64748b' }}>Số tầng</div></div>
                        <div><div style={{ fontWeight: 700, fontSize: 18 }}>{p.status}</div><div style={{ fontSize: 10, color: '#64748b' }}>Trạng thái</div></div>
                    </div>
                </div>

                {/* This Week Tasks */}
                {thisWeek.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 2s infinite' }}></span>
                            Đang thực hiện tuần này
                        </div>
                        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
                        {thisWeek.map(t => (
                            <div key={t.id} style={{ background: 'rgba(59,130,246,0.08)', borderRadius: 10, padding: '12px 16px', marginBottom: 8, border: '1px solid rgba(59,130,246,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{fmtDate(t.startDate)} → {fmtDate(t.endDate)}</div>
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: t.progress > 0 ? '#3b82f6' : '#64748b' }}>{t.progress}%</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tasks WBS */}
                {hasSchedule ? (
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#f8fafc' }}>Chi tiết hạng mục</div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '4px 20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {tasks.map(t => renderTask(t, 0))}
                        </div>
                    </div>
                ) : (
                    /* Fallback: old milestones */
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#f8fafc' }}>Chi tiết hạng mục</div>
                        {milestones.map((m, i) => (
                            <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: m.progress === 100 ? '#22c55e' : m.progress > 0 ? '#3b82f6' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{m.progress === 100 ? '✓' : i + 1}</span>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</span>
                                    </div>
                                    <span style={{ fontWeight: 700, color: m.progress === 100 ? '#22c55e' : m.progress > 0 ? '#3b82f6' : '#64748b' }}>{m.progress}%</span>
                                </div>
                                <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${m.progress}%`, background: m.progress === 100 ? '#22c55e' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: 3 }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tracking Logs */}
                {logs.length > 0 && (
                    <div style={{ marginTop: 32 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#f8fafc' }}>📒 Nhật ký gần đây</div>
                        {logs.slice(0, 10).map(log => (
                            <div key={log.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 16px', marginBottom: 6, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                <span>{log.content}</span>
                                <span style={{ color: '#64748b', fontSize: 11, flexShrink: 0, marginLeft: 12 }}>{fmtDate(log.createdAt)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: '#334155' }}>
                    Cập nhật: {new Date().toLocaleDateString('vi-VN')} • HomeERP
                </div>
            </div>
        </div>
    );
}
