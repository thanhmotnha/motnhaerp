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
        </div>
    );
}
