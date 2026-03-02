'use client';
import { useState, useEffect } from 'react';

export default function TemplateImportModal({ projectId, projectStartDate, onClose, onImported }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState('');
    const [startDate, setStartDate] = useState(projectStartDate ? new Date(projectStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        fetch('/api/schedule-templates')
            .then(r => r.json())
            .then(d => { setTemplates(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const handleImport = async () => {
        if (!selectedId || !startDate) return;
        setImporting(true);
        try {
            const res = await fetch('/api/schedule-tasks/import-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, templateId: selectedId, startDate }),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Lỗi import');
                return;
            }
            const data = await res.json();
            alert(`Đã import ${data.count} hạng mục thành công!`);
            onImported();
        } catch {
            alert('Lỗi kết nối');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                <div className="modal-header"><h3>📥 Import mẫu tiến độ</h3><button className="modal-close" onClick={onClose}>×</button></div>
                <div className="modal-body">
                    {loading ? (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải mẫu...</div>
                    ) : templates.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center' }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có mẫu tiến độ nào.</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Admin cần tạo mẫu tại mục Quản lý Mẫu Tiến độ trước.</div>
                        </div>
                    ) : (
                        <>
                            <div className="form-group"><label className="form-label">Chọn mẫu *</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {templates.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setSelectedId(t.id)}
                                            className={`btn ${selectedId === t.id ? 'btn-primary' : 'btn-ghost'}`}
                                            style={{ justifyContent: 'space-between', padding: '12px 16px', textAlign: 'left' }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{t.name}</div>
                                                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{t.type} • {t._count?.items || 0} hạng mục</div>
                                            </div>
                                            {selectedId === t.id && <span>✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label className="form-label">Ngày bắt đầu dự án *</label>
                                <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Tất cả hạng mục sẽ được trải dài từ ngày này theo thứ tự và thời lượng mặc định.</div>
                            </div>
                        </>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
                    <button className="btn btn-primary" onClick={handleImport} disabled={!selectedId || importing}>
                        {importing ? 'Đang import...' : '📥 Import'}
                    </button>
                </div>
            </div>
        </div>
    );
}
