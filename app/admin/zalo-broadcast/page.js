'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const ROLES = [
    { key: 'giam_doc', label: '👑 Giám đốc' },
    { key: 'ke_toan', label: '📋 Hành chính' },
    { key: 'kinh_doanh', label: '💼 Kinh doanh' },
    { key: 'kho', label: '🏭 Xưởng' },
    { key: 'ky_thuat', label: '🔧 Kỹ thuật' },
    { key: 'thiet_ke', label: '🎨 Thiết kế' },
];

export default function ZaloBroadcastPage() {
    const toast = useToast();
    const [target, setTarget] = useState('all');
    const [role, setRole] = useState('kho');
    const [text, setText] = useState('');
    const [preview, setPreview] = useState(0);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const qs = new URLSearchParams({ target });
        if (target === 'role') qs.set('role', role);
        apiFetch(`/api/admin/zalo-broadcast?${qs}`).then(r => setPreview(r?.eligibleCount || 0)).catch(() => { });
    }, [target, role]);

    const send = async () => {
        if (!text.trim()) return toast.showToast('Nhập nội dung', 'error');
        if (!confirm(`Gửi tin tới ${preview} người?`)) return;
        setSending(true);
        setResult(null);
        try {
            const res = await apiFetch('/api/admin/zalo-broadcast', {
                method: 'POST',
                body: JSON.stringify({ target, role: target === 'role' ? role : undefined, text }),
            });
            setResult(res);
            toast.showToast(`Đã gửi ${res.sent}/${res.total}`, 'success');
        } catch (e) {
            toast.showToast(e.message || 'Lỗi', 'error');
        }
        setSending(false);
    };

    return (
        <div style={{ padding: 20, maxWidth: 700 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📢 Gửi thông báo Zalo OA</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 20px' }}>
                Gửi tin từ OA công ty đến tất cả nhân viên đã liên kết Zalo
            </p>

            <div className="card" style={{ padding: 20 }}>
                <div className="form-group">
                    <label className="form-label">Gửi cho</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <TargetPill label="Toàn bộ" active={target === 'all'} onClick={() => setTarget('all')} />
                        <TargetPill label="Theo vai trò" active={target === 'role'} onClick={() => setTarget('role')} />
                    </div>
                </div>

                {target === 'role' && (
                    <div className="form-group">
                        <label className="form-label">Vai trò</label>
                        <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                            {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                        </select>
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Nội dung *</label>
                    <textarea
                        className="form-input"
                        rows={6}
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder={'VD: Sáng thứ Hai họp giao ban 8:00. Vui lòng có mặt đúng giờ.'}
                    />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {text.length} ký tự
                    </div>
                </div>

                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 16,
                }}>
                    <span style={{ fontSize: 13 }}>
                        ✓ Sẽ gửi tới <strong style={{ color: 'var(--primary)' }}>{preview}</strong> người đã liên kết Zalo
                    </span>
                </div>

                <button className="btn btn-primary" onClick={send} disabled={sending || !text.trim() || preview === 0}>
                    {sending ? 'Đang gửi...' : `📨 Gửi ngay (${preview} người)`}
                </button>

                {result && (
                    <div style={{ marginTop: 16, padding: 12, background: result.sent > 0 ? '#dcfce7' : '#fee2e2', borderRadius: 8 }}>
                        <strong>Kết quả:</strong> Đã gửi {result.sent}/{result.total} tin
                        {result.skipped && <div style={{ fontSize: 12, color: '#991b1b', marginTop: 4 }}>⚠ {result.skipped}</div>}
                    </div>
                )}
            </div>

            <div className="card" style={{ padding: 16, marginTop: 16, background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>💡 Ghi chú</div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <li>Nhân viên phải follow OA Một Nhà + đã được nhập <strong>Zalo ID</strong> vào hệ thống</li>
                    <li>Tin chỉ gửi được khi user vừa tương tác với OA trong 24h (free tier)</li>
                    <li>Sau 24h phải dùng ZNS template (trả phí ~250đ/tin)</li>
                    <li>Xem/nhập Zalo ID tại <strong>Cài đặt → Người dùng</strong></li>
                </ul>
            </div>
        </div>
    );
}

function TargetPill({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                background: active ? 'var(--primary)' : 'var(--bg-card)',
                color: active ? '#fff' : 'var(--text-primary)',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`,
                cursor: 'pointer',
            }}
        >{label}</button>
    );
}
