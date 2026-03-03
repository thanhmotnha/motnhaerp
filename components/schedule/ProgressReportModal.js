'use client';
import { useState } from 'react';

export default function ProgressReportModal({ task, projectId, onClose, onSubmitted }) {
    const [progressTo, setProgressTo] = useState(task.progress + 10 > 100 ? 100 : task.progress + 10);
    const [description, setDescription] = useState('');
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleUpload = async (files) => {
        setUploading(true);
        const uploaded = [];
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                if (res.ok) {
                    const data = await res.json();
                    uploaded.push(data.url);
                }
            } catch { /* skip failed uploads */ }
        }
        setImages(prev => [...prev, ...uploaded]);
        setUploading(false);
    };

    const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        if (images.length === 0) { setError('Bắt buộc đính kèm ít nhất 1 ảnh hiện trường'); return; }
        if (progressTo <= task.progress) { setError(`Tiến độ mới phải lớn hơn ${task.progress}%`); return; }

        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/progress-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: task.id,
                    projectId,
                    progressTo,
                    description,
                    images,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Lỗi'); setSubmitting(false); return; }
            onSubmitted();
        } catch {
            setError('Lỗi kết nối');
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <div className="modal-header">
                    <h3>📤 Cập nhật tiến độ</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {/* Task Info */}
                    <div style={{ padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 8, marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{task.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            WBS: {task.wbs || '—'} • {task.assignee || 'Chưa gán'}
                        </div>
                    </div>

                    {/* Current Progress (readonly) */}
                    <div className="form-group">
                        <label className="form-label">Tiến độ hiện tại</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress-bar" style={{ flex: 1 }}>
                                <div className="progress-fill" style={{ width: `${task.progress}%` }}></div>
                            </div>
                            <span style={{ fontWeight: 700, fontSize: 14, minWidth: 40 }}>{task.progress}%</span>
                        </div>
                    </div>

                    {/* New Progress */}
                    <div className="form-group">
                        <label className="form-label">Tiến độ mới *</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <input
                                type="range"
                                min={task.progress + 1}
                                max={100}
                                value={progressTo}
                                onChange={e => setProgressTo(Number(e.target.value))}
                                style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                            />
                            <span style={{
                                fontWeight: 800,
                                fontSize: 20,
                                minWidth: 50,
                                textAlign: 'right',
                                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>{progressTo}%</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label className="form-label">Mô tả công việc</label>
                        <textarea
                            className="form-input"
                            rows={2}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="VD: Đã lăn xong lót tầng 1"
                        />
                    </div>

                    {/* Image Upload */}
                    <div className="form-group">
                        <label className="form-label">Hình ảnh hiện trường * <span style={{ color: 'var(--status-danger)', fontWeight: 400 }}>(bắt buộc)</span></label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                            {images.map((url, i) => (
                                <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '2px solid var(--border)' }}>
                                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button
                                        onClick={() => removeImage(i)}
                                        style={{
                                            position: 'absolute', top: 2, right: 2,
                                            width: 20, height: 20, borderRadius: '50%',
                                            background: 'rgba(239,68,68,0.9)', color: '#fff',
                                            border: 'none', cursor: 'pointer', fontSize: 12,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>×</button>
                                </div>
                            ))}
                            <label style={{
                                width: 80, height: 80, borderRadius: 8,
                                border: '2px dashed var(--border)',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)',
                                transition: 'border-color 0.2s',
                            }}>
                                <span style={{ fontSize: 24, marginBottom: 2 }}>📷</span>
                                {uploading ? 'Đang tải...' : 'Thêm ảnh'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    style={{ display: 'none' }}
                                    onChange={e => handleUpload(Array.from(e.target.files))}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: 'var(--status-danger)', fontSize: 12, marginTop: 8 }}>
                            ⚠️ {error}
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || uploading}>
                        {submitting ? 'Đang gửi...' : '📤 Lưu & Gửi Báo cáo'}
                    </button>
                </div>
            </div>
        </div>
    );
}
