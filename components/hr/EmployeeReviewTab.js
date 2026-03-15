'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const TYPES = ['Quý', '6 tháng', 'Năm', 'Thử việc', 'Khác'];
const RATINGS = [
    { value: 5, label: 'Xuất sắc', color: '#10b981', icon: '⭐' },
    { value: 4, label: 'Tốt', color: '#3b82f6', icon: '👍' },
    { value: 3, label: 'Đạt', color: '#f59e0b', icon: '✅' },
    { value: 2, label: 'Cần cải thiện', color: '#f97316', icon: '⚠️' },
    { value: 1, label: 'Không đạt', color: '#ef4444', icon: '❌' },
];

export default function EmployeeReviewTab() {
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ type: 'Quý', period: '', rating: 3, content: '', reviewer: '', goals: '' });

    useEffect(() => {
        fetch('/api/employees').then(r => r.json()).then(d => setEmployees(d.employees || d));
    }, []);

    const loadReviews = (empId) => {
        if (!empId) return;
        setLoading(true);
        fetch(`/api/employees/${empId}/reviews`).then(r => r.json()).then(d => { setReviews(d); setLoading(false); });
    };
    useEffect(() => { if (selectedEmp) loadReviews(selectedEmp); }, [selectedEmp]);

    const handleSubmit = async () => {
        if (!selectedEmp || !form.content.trim()) return alert('Chọn nhân viên và nhập nội dung');
        await fetch(`/api/employees/${selectedEmp}/reviews`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
        setShowForm(false);
        setForm({ type: 'Quý', period: '', rating: 3, content: '', reviewer: '', goals: '' });
        loadReviews(selectedEmp);
    };

    const ratingInfo = (r) => RATINGS.find(x => x.value === r) || RATINGS[2];

    return (
        <div>
            <div className="card-header" style={{ marginBottom: 16 }}>
                <span className="card-title">📊 Đánh giá nhân viên</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Thêm đánh giá</button>
            </div>

            {/* Employee selector */}
            <div style={{ marginBottom: 16 }}>
                <select className="form-select" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} style={{ maxWidth: 300 }}>
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.position || 'N/A'}</option>)}
                </select>
            </div>

            {/* Add form */}
            {showForm && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid var(--border-light)' }}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Loại đánh giá</label>
                            <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Kỳ đánh giá</label>
                            <input className="form-input" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} placeholder="VD: Q1/2025" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Người đánh giá</label>
                            <input className="form-input" value={form.reviewer} onChange={e => setForm({ ...form, reviewer: e.target.value })} placeholder="Tên quản lý" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Xếp loại</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {RATINGS.map(r => (
                                <button key={r.value} onClick={() => setForm({ ...form, rating: r.value })}
                                    style={{ padding: '6px 14px', borderRadius: 8, border: form.rating === r.value ? `2px solid ${r.color}` : '2px solid var(--border-light)',
                                        background: form.rating === r.value ? `${r.color}22` : 'var(--bg-card)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: r.color }}>
                                    {r.icon} {r.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nội dung đánh giá</label>
                        <textarea className="form-input" rows={3} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Nhận xét chi tiết..." />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Mục tiêu tiếp theo</label>
                        <textarea className="form-input" rows={2} value={form.goals} onChange={e => setForm({ ...form, goals: e.target.value })} placeholder="Mục tiêu cho kỳ tiếp theo..." />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Hủy</button>
                        <button className="btn btn-primary btn-sm" onClick={handleSubmit}>Lưu đánh giá</button>
                    </div>
                </div>
            )}

            {/* Reviews list */}
            {!selectedEmp ? (
                <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chọn nhân viên để xem đánh giá</div>
            ) : loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
            ) : reviews.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chưa có đánh giá nào</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {reviews.map(r => {
                        const ri = ratingInfo(r.rating);
                        return (
                            <div key={r.id} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16, border: '1px solid var(--border-light)', borderLeft: `4px solid ${ri.color}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span className="badge" style={{ background: `${ri.color}22`, color: ri.color, fontWeight: 700 }}>{ri.icon} {ri.label}</span>
                                        <span className="badge muted">{r.type}</span>
                                        {r.period && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.period}</span>}
                                    </div>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(r.date)}</span>
                                </div>
                                <p style={{ margin: '0 0 6px', fontSize: 14, lineHeight: 1.5 }}>{r.content}</p>
                                {r.goals && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>🎯 Mục tiêu: {r.goals}</p>}
                                {r.reviewer && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>👤 Người đánh giá: {r.reviewer}</div>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
