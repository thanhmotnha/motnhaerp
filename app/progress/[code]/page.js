'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
export default function CustomerProgressPage() {
    const { code } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => { fetch(`/api/progress/${code}`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [code]);
    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#94a3b8' }}>Đang tải...</div>;
    if (!data || data.error) return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#ef4444' }}>Không tìm thấy dự án</div>;
    const p = data;
    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#e2e8f0', padding: '40px 20px' }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ fontSize: 12, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>CẬP NHẬT TIẾN ĐỘ DỰ ÁN</div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f8fafc', margin: 0 }}>{p.name}</h1>
                    <div style={{ color: '#94a3b8', marginTop: 8 }}>{p.customer?.name} • {p.address}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 32, marginBottom: 24, textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: 56, fontWeight: 800, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{p.progress}%</div>
                    <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>Tiến độ tổng</div>
                    <div style={{ height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden', marginTop: 16 }}><div style={{ height: '100%', width: `${p.progress}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: 5, transition: 'width 0.5s' }}></div></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 16 }}>
                        <div><div style={{ fontWeight: 700, fontSize: 18 }}>{p.area}m²</div><div style={{ fontSize: 11, color: '#64748b' }}>Diện tích</div></div>
                        <div><div style={{ fontWeight: 700, fontSize: 18 }}>{p.floors} tầng</div><div style={{ fontSize: 11, color: '#64748b' }}>Số tầng</div></div>
                        <div><div style={{ fontWeight: 700, fontSize: 18 }}>{p.status}</div><div style={{ fontSize: 11, color: '#64748b' }}>Trạng thái</div></div>
                    </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#f8fafc' }}>Chi tiết hạng mục</div>
                {p.milestones.map((m, i) => (
                    <div key={m.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 20, marginBottom: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span style={{ width: 28, height: 28, borderRadius: '50%', background: m.progress === 100 ? '#22c55e' : m.progress > 0 ? '#3b82f6' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{m.progress === 100 ? '✓' : i + 1}</span>
                                <span style={{ fontWeight: 600 }}>{m.name}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: m.progress === 100 ? '#22c55e' : m.progress > 0 ? '#3b82f6' : '#64748b' }}>{m.progress}%</span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', width: `${m.progress}%`, background: m.progress === 100 ? '#22c55e' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: 3 }}></div></div>
                    </div>
                ))}
                <div style={{ textAlign: 'center', marginTop: 40, fontSize: 12, color: '#475569' }}>Cập nhật gần nhất: {new Date().toLocaleDateString('vi-VN')} • ERP Construction</div>
            </div>
        </div>
    );
}
