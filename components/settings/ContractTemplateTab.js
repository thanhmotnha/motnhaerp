'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CONTRACT_VARIABLES, fillVariables } from '@/lib/contractVariables';
import { CONTRACT_TYPES } from '@/lib/contractTemplates';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), { ssr: false });

export default function ContractTemplateTab() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null); // null = list view, object = edit view
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    const load = () => {
        setLoading(true);
        fetch('/api/contract-templates').then(r => r.json()).then(d => {
            setTemplates(Array.isArray(d) ? d : []);
            setLoading(false);
        }).catch(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const startCreate = () => {
        setEditing({ name: '', type: 'Thi công thô', body: '', isDefault: false, isNew: true });
        setPreviewMode(false);
    };

    const startEdit = (t) => {
        setEditing({ ...t, isNew: false });
        setPreviewMode(false);
    };

    const handleSave = async () => {
        if (!editing.name?.trim()) return alert('Nhập tên mẫu!');
        setSaving(true);
        try {
            const url = editing.isNew ? '/api/contract-templates' : `/api/contract-templates/${editing.id}`;
            const res = await fetch(url, {
                method: editing.isNew ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editing.name, type: editing.type, body: editing.body, isDefault: editing.isDefault }),
            });
            if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi lưu'); }
            load();
            setEditing(null);
        } catch (e) { alert('Lỗi: ' + e.message); }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa mẫu hợp đồng này?')) return;
        await fetch(`/api/contract-templates/${id}`, { method: 'DELETE' });
        load();
    };

    // Preview with sample data
    const sampleData = {
        contract: { code: 'HD-2026-001', name: 'HĐ Thi công thô - Biệt thự ABC', type: editing?.type || 'Thi công thô', contractValue: 1500000000, signDate: new Date(), startDate: new Date(), endDate: new Date(Date.now() + 180 * 86400000) },
        customer: { name: 'Nguyễn Văn An', phone: '0948 869 890', address: '123 Đường Nguyễn Huệ, Q.1, TP.HCM', citizenId: '001234567890', representative: 'Nguyễn Văn An' },
        project: { name: 'Biệt thự ABC', address: '456 Đường XYZ, Q.2, TP.HCM' },
        payments: [
            { phase: 'Đặt cọc', pct: 30, amount: 450000000 },
            { phase: 'Hoàn thành 50%', pct: 40, amount: 600000000 },
            { phase: 'Nghiệm thu', pct: 30, amount: 450000000 },
        ],
    };

    // === EDIT VIEW ===
    if (editing) {
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}>{editing.isNew ? '➕ Tạo mẫu mới' : `✏️ Sửa: ${editing.name}`}</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost" onClick={() => setEditing(null)}>← Quay lại</button>
                        <button className="btn btn-secondary" onClick={() => setPreviewMode(!previewMode)}>
                            {previewMode ? '✏️ Soạn thảo' : '👁️ Xem thử'}
                        </button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? '⏳...' : '💾 Lưu mẫu'}
                        </button>
                    </div>
                </div>

                {/* Meta fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px auto', gap: 12, marginBottom: 16 }}>
                    <div>
                        <label className="form-label">Tên mẫu *</label>
                        <input className="form-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="VD: Mẫu HĐ Thi công thô" />
                    </div>
                    <div>
                        <label className="form-label">Loại HĐ</label>
                        <select className="form-select" value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })}>
                            {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            <input type="checkbox" checked={editing.isDefault} onChange={e => setEditing({ ...editing, isDefault: e.target.checked })} />
                            Mặc định
                        </label>
                    </div>
                </div>

                {/* Editor or Preview */}
                {previewMode ? (
                    <div className="card">
                        <div className="card-header"><h4 style={{ margin: 0 }}>👁️ Preview (dữ liệu mẫu)</h4></div>
                        <div className="card-body" style={{ padding: '24px 32px' }}>
                            <div dangerouslySetInnerHTML={{ __html: fillVariables(editing.body, sampleData) }}
                                style={{ fontSize: 14, lineHeight: 1.8 }} />
                        </div>
                    </div>
                ) : (
                    <RichTextEditor
                        value={editing.body}
                        onChange={body => setEditing(prev => ({ ...prev, body }))}
                        placeholder="Soạn nội dung mẫu hợp đồng tại đây... Dùng nút {  } Chèn biến để thêm biến tự động"
                        variables={CONTRACT_VARIABLES}
                    />
                )}
            </div>
        );
    }

    // === LIST VIEW ===
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Quản lý biểu mẫu hợp đồng với biến tự động <code>{`{{Tên_biến}}`}</code>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={startCreate}>➕ Tạo mẫu mới</button>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Đang tải...</div>
            ) : templates.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Chưa có mẫu hợp đồng nào</div>
                    <div style={{ fontSize: 13 }}>Bấm "➕ Tạo mẫu mới" để bắt đầu soạn biểu mẫu hợp đồng</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                    {templates.map(t => (
                        <div key={t.id} className="card" style={{ cursor: 'pointer', transition: 'all 0.15s', border: t.isDefault ? '2px solid var(--accent-primary)' : undefined }}
                            onClick={() => startEdit(t)}>
                            <div className="card-body" style={{ padding: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            📝 {t.name}
                                            {t.isDefault && <span className="badge success" style={{ fontSize: 10 }}>Mặc định</span>}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            <span className="badge info" style={{ fontSize: 10 }}>{t.type}</span>
                                            <span style={{ marginLeft: 8 }}>
                                                {t.body ? `${Math.round(t.body.length / 10)} từ` : 'Chưa có nội dung'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                            Cập nhật: {new Date(t.updatedAt).toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--status-danger)' }}
                                        onClick={e => { e.stopPropagation(); handleDelete(t.id); }}>
                                        🗑
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
