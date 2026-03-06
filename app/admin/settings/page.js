'use client';
import { useState, useEffect } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const SETTING_KEYS = [
    { key: 'company_name', label: 'Tên công ty', type: 'text', default: 'MỘT NHÀ' },
    { key: 'company_address', label: 'Địa chỉ', type: 'text', default: '' },
    { key: 'company_phone', label: 'Số điện thoại', type: 'text', default: '' },
    { key: 'company_email', label: 'Email', type: 'text', default: '' },
    { key: 'company_tax_code', label: 'Mã số thuế', type: 'text', default: '' },
    { key: 'company_bank_account', label: 'Số tài khoản', type: 'text', default: '' },
    { key: 'company_bank_name', label: 'Ngân hàng', type: 'text', default: '' },
    { key: 'default_vat', label: 'VAT mặc định (%)', type: 'number', default: '10' },
    { key: 'default_mgmt_fee', label: 'Phí quản lý mặc định (%)', type: 'number', default: '5' },
    { key: 'warranty_months', label: 'Bảo hành (tháng)', type: 'number', default: '12' },
    { key: 'payment_terms_default', label: 'Điều khoản thanh toán mặc định', type: 'textarea', default: 'Thanh toán theo tiến độ thi công' },
    { key: 'email_footer', label: 'Footer email', type: 'textarea', default: 'Trân trọng, MỘT NHÀ Team' },
];

export default function SettingsPage() {
    const { role } = useRole();
    const router = useRouter();
    const toast = useToast();
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (role && role !== 'giam_doc') { router.replace('/'); return; }
        apiFetch('/api/admin/settings')
            .then(data => { setSettings(data || {}); setLoading(false); })
            .catch(() => {
                // Initialize with defaults if no settings exist
                const defaults = {};
                SETTING_KEYS.forEach(s => { defaults[s.key] = s.default; });
                setSettings(defaults);
                setLoading(false);
            });
    }, [role]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiFetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            toast.success('Đã lưu cài đặt');
        } catch (e) {
            toast.error(e.message || 'Lỗi lưu cài đặt');
        }
        setSaving(false);
    };

    if (role && role !== 'giam_doc') return null;
    if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h3>⚙️ Cài đặt hệ thống</h3>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Đang lưu...' : '💾 Lưu cài đặt'}
                    </button>
                </div>

                <div style={{ padding: 20 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid var(--accent-primary)' }}>
                        🏢 Thông tin công ty
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                        {SETTING_KEYS.filter(s => s.key.startsWith('company_')).map(s => (
                            <div key={s.key} className="form-group">
                                <label className="form-label">{s.label}</label>
                                <input className="form-input"
                                    value={settings[s.key] || ''}
                                    onChange={e => setSettings({ ...settings, [s.key]: e.target.value })}
                                />
                            </div>
                        ))}
                    </div>

                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid var(--gold)' }}>
                        📋 Giá trị mặc định
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                        {SETTING_KEYS.filter(s => s.type === 'number').map(s => (
                            <div key={s.key} className="form-group">
                                <label className="form-label">{s.label}</label>
                                <input className="form-input" type="number"
                                    value={settings[s.key] || ''}
                                    onChange={e => setSettings({ ...settings, [s.key]: e.target.value })}
                                />
                            </div>
                        ))}
                    </div>

                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid var(--accent-primary)' }}>
                        📝 Template & Mẫu
                    </h4>
                    {SETTING_KEYS.filter(s => s.type === 'textarea').map(s => (
                        <div key={s.key} className="form-group" style={{ marginBottom: 16 }}>
                            <label className="form-label">{s.label}</label>
                            <textarea className="form-input" rows={3}
                                value={settings[s.key] || ''}
                                onChange={e => setSettings({ ...settings, [s.key]: e.target.value })}
                                style={{ resize: 'vertical' }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
