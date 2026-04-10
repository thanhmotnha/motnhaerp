'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const FIELDS = [
    { key: 'leadApiKey', label: 'Lead API Key', type: 'readonly', hint: 'Dùng trong WordPress webhook header: x-api-key' },
    { key: 'facebookPageToken', label: 'Facebook Page Access Token', type: 'password', hint: 'Lấy từ Facebook Developer → App → Page Access Token' },
    { key: 'facebookAppSecret', label: 'Facebook App Secret', type: 'password', hint: 'Dùng để xác thực chữ ký webhook' },
    { key: 'facebookVerifyToken', label: 'Facebook Verify Token', type: 'text', hint: 'Tự đặt chuỗi bất kỳ, nhập vào khi kết nối webhook trên Facebook' },
    { key: 'zaloOaToken', label: 'Zalo OA Access Token', type: 'password', hint: 'Lấy từ Zalo OA Manager → Cài đặt → API' },
    { key: 'zaloRecipients', label: 'Zalo UID nhận thông báo', type: 'textarea', hint: 'Mỗi UID một dòng hoặc cách nhau bằng dấu phẩy' },
];

export default function IntegrationTab() {
    const [values, setValues] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [seedingImages, setSeedingImages] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        apiFetch('/api/admin/settings')
            .then(data => {
                const init = {};
                FIELDS.forEach(f => { init[f.key] = data[f.key] || ''; });
                setValues(init);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiFetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            showToast('Đã lưu cài đặt tích hợp', 'success');
        } catch (e) {
            showToast(e.message || 'Lỗi lưu', 'error');
        }
        setSaving(false);
    };

    const handleRegenerate = async () => {
        const newKey = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        setValues(prev => ({ ...prev, leadApiKey: newKey }));
    };

    const handleSeedVanThaiImages = async () => {
        if (!confirm('Upload toàn bộ ảnh Ván Thái lên R2? Quá trình có thể mất 2-3 phút.')) return;
        setSeedingImages(true);
        try {
            const res = await apiFetch('/api/admin/seed-van-thai-images', { method: 'POST' });
            showToast(`✅ Upload xong: ${res.uploaded} ảnh, bỏ qua: ${res.skipped}, lỗi: ${res.failed}`, 'success');
        } catch (e) {
            showToast(e.message || 'Lỗi upload', 'error');
        }
        setSeedingImages(false);
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        showToast('Đã copy!', 'success');
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div style={{ maxWidth: 640 }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 13 }}>
                Cấu hình kết nối WordPress, Facebook Lead Ads và Zalo OA.
            </p>

            {FIELDS.map(f => (
                <div key={f.key} className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label">{f.label}</label>
                    {f.type === 'textarea' ? (
                        <textarea
                            className="form-input"
                            rows={3}
                            value={values[f.key] || ''}
                            onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                            style={{ resize: 'vertical' }}
                        />
                    ) : f.type === 'readonly' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                className="form-input"
                                readOnly
                                value={values[f.key] || '(chưa tạo)'}
                                style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
                            />
                            <button className="btn btn-secondary btn-sm" onClick={() => handleCopy(values[f.key])}>Copy</button>
                            <button className="btn btn-secondary btn-sm" onClick={handleRegenerate}>Tạo mới</button>
                        </div>
                    ) : (
                        <input
                            className="form-input"
                            type={f.type}
                            value={values[f.key] || ''}
                            onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                        />
                    )}
                    {f.hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{f.hint}</div>}
                </div>
            ))}

            <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    <strong>WordPress webhook URL:</strong>{' '}
                    <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>
                        {typeof window !== 'undefined' ? window.location.origin : ''}/api/leads/intake
                    </code>
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                    <strong>Facebook webhook URL:</strong>{' '}
                    <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>
                        {typeof window !== 'undefined' ? window.location.origin : ''}/api/leads/facebook
                    </code>
                </p>
            </div>

            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Đang lưu...' : '💾 Lưu cài đặt'}
            </button>

            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>🖼️ Upload ảnh sản phẩm lên R2</div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Tải ảnh Ván Melamin Thái Lan từ nguồn gốc lên Cloudflare R2 để lưu trữ lâu dài.
                    Chỉ cần chạy 1 lần.
                </p>
                <button className="btn btn-secondary" onClick={handleSeedVanThaiImages} disabled={seedingImages}>
                    {seedingImages ? '⏳ Đang upload... (2-3 phút)' : '☁️ Upload ảnh Ván Thái → R2'}
                </button>
            </div>
        </div>
    );
}
