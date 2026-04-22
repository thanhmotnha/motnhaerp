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

const TEMPLATES = [
    {
        id: 'xuong-morning',
        icon: '🔨',
        title: 'Giao việc xưởng',
        target: 'role',
        role: 'kho',
        body: () => {
            const d = new Date().toLocaleDateString('vi-VN');
            return `🔨 CÔNG VIỆC XƯỞNG — ${d}\n\n1. \n2. \n3. \n\n⏰ Deadline: 17:00\n📞 Thắc mắc gọi quản đốc ngay.\nCố lên anh em!`;
        },
    },
    {
        id: 'giamsat-morning',
        icon: '🔍',
        title: 'Brief giám sát',
        target: 'role',
        role: 'ky_thuat',
        body: () => {
            const d = new Date().toLocaleDateString('vi-VN');
            return `🔍 LỊCH GIÁM SÁT — ${d}\n\n🏗️ Dự án sáng:\n- \n\n🏗️ Dự án chiều:\n- \n\n⚠ Điểm cần chú ý:\n- \n\n📸 Ảnh check-in trước 18h hôm nay.`;
        },
    },
    {
        id: 'daily-report',
        icon: '📊',
        title: 'Báo cáo cuối ngày',
        target: 'all',
        body: () => {
            const d = new Date().toLocaleDateString('vi-VN');
            return `📊 BÁO CÁO NGÀY — ${d}\n\n🏗️ Thi công: \n🔨 Xưởng hoàn thành: \n💰 Thu hôm nay: \n🆕 Khách mới: \n⚠ Vấn đề cần giải quyết: \n\nNgày mai tiếp tục cố gắng!`;
        },
    },
    {
        id: 'meeting',
        icon: '📣',
        title: 'Thông báo họp',
        target: 'all',
        body: () => `📣 THÔNG BÁO HỌP\n\n🕐 Thời gian: \n📍 Địa điểm: \n📝 Nội dung: \n\n✅ Có mặt đúng giờ.`,
    },
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

    const applyTemplate = (t) => {
        setText(t.body());
        setTarget(t.target);
        if (t.role) setRole(t.role);
    };

    return (
        <div style={{ padding: 20, maxWidth: 760 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📢 Nhắn Zalo OA</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 20px' }}>
                Chọn mẫu có sẵn hoặc soạn tự do — gửi cho 1 role hoặc toàn công ty
            </p>

            {/* Template quick pick */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 8 }}>MẪU NHANH</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
                    {TEMPLATES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => applyTemplate(t)}
                            style={{
                                padding: '12px', borderRadius: 10, border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left',
                                display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                        >
                            <span style={{ fontSize: 22 }}>{t.icon}</span>
                            <span style={{ fontWeight: 600 }}>{t.title}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                → {t.target === 'all' ? 'Toàn bộ' : ROLES.find(r => r.key === t.role)?.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

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
