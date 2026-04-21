'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const INTERACTION_TYPES = ['Gặp trực tiếp', 'Điện thoại', 'Zalo', 'Email', 'Ghi chú'];
const INTEREST_LEVELS = [
    { key: 'Nóng', color: '#dc2626', bg: '#fee2e2' },
    { key: 'Ấm', color: '#d97706', bg: '#fef3c7' },
    { key: 'Lạnh', color: '#2563eb', bg: '#dbeafe' },
];
const OUTCOMES = ['', 'Báo giá', 'Đặt cọc', 'Từ chối', 'Cần gặp lại'];

export default function CheckinModal({ customerId, customerName, open, onClose, onDone }) {
    const { data: session } = useSession();
    const [type, setType] = useState('Gặp trực tiếp');
    const [content, setContent] = useState('');
    const [photos, setPhotos] = useState([]);
    const [interestLevel, setInterestLevel] = useState('');
    const [outcome, setOutcome] = useState('');
    const [companionIds, setCompanionIds] = useState([]);
    const [users, setUsers] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        fetch('/api/users').then(r => r.ok ? r.json() : []).then(arr => {
            setUsers((arr || []).filter(u => u.id !== session?.user?.id));
        });
    }, [open, session?.user?.id]);

    useEffect(() => {
        if (!open) {
            setType('Gặp trực tiếp'); setContent(''); setPhotos([]);
            setInterestLevel(''); setOutcome(''); setCompanionIds([]); setError('');
        }
    }, [open]);

    if (!open) return null;

    const handleFiles = async (files) => {
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                setError(`${file.name} quá 5MB`);
                continue;
            }
            const placeholder = { url: '', name: file.name, uploading: true };
            setPhotos(prev => [...prev, placeholder]);
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', 'checkin');
            try {
                const r = await fetch('/api/upload', { method: 'POST', body: fd });
                if (!r.ok) throw new Error('Upload fail');
                const { url } = await r.json();
                setPhotos(prev => prev.map(p => p === placeholder ? { url, name: file.name, uploading: false } : p));
            } catch (e) {
                setError(`Upload ${file.name} lỗi`);
                setPhotos(prev => prev.filter(p => p !== placeholder));
            }
        }
    };

    const submit = async () => {
        if (!content.trim()) { setError('Nhập nội dung'); return; }
        if (photos.some(p => p.uploading)) { setError('Đợi ảnh upload xong'); return; }
        setSubmitting(true); setError('');
        try {
            const r = await fetch(`/api/customers/${customerId}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    content: content.trim(),
                    photos: photos.map(p => p.url).filter(Boolean),
                    interestLevel,
                    outcome,
                    companionIds,
                }),
            });
            if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                throw new Error(err.error || 'Lỗi');
            }
            onDone?.();
            onClose();
        } catch (e) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, width: '95vw' }}>
                <div className="modal-header">
                    <h3>📸 Check-in: {customerName}</h3>
                    <button className="btn-icon" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Loại gặp</div>
                        <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                            {INTERACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>

                    <label>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Nội dung *</div>
                        <textarea className="form-input" rows={4} value={content} onChange={e => setContent(e.target.value)} placeholder="Nội dung trao đổi..." />
                    </label>

                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Ảnh (tối đa 10, mỗi ảnh 5MB)</div>
                        <input type="file" accept="image/*" capture="environment" multiple onChange={e => handleFiles(e.target.files)} />
                        {photos.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6, marginTop: 8 }}>
                                {photos.map((p, i) => (
                                    <div key={i} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 6, overflow: 'hidden', background: '#f1f5f9' }}>
                                        {p.uploading
                                            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 11 }}>Đang tải…</div>
                                            : <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        }
                                        <button className="btn-icon" style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: 2 }}
                                            onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Mức độ quan tâm</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {INTEREST_LEVELS.map(lv => (
                                <button key={lv.key} type="button"
                                    onClick={() => setInterestLevel(interestLevel === lv.key ? '' : lv.key)}
                                    style={{
                                        padding: '6px 16px', borderRadius: 999, border: `1px solid ${lv.color}`,
                                        background: interestLevel === lv.key ? lv.color : lv.bg,
                                        color: interestLevel === lv.key ? '#fff' : lv.color,
                                        cursor: 'pointer', fontWeight: 600,
                                    }}>{lv.key}</button>
                            ))}
                        </div>
                    </div>

                    <label>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Kết quả</div>
                        <select className="form-select" value={outcome} onChange={e => setOutcome(e.target.value)}>
                            {OUTCOMES.map(o => <option key={o} value={o}>{o || '(chưa có)'}</option>)}
                        </select>
                    </label>

                    <label>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Đi cùng ai (optional)</div>
                        <select className="form-select" multiple size={Math.min(5, Math.max(3, users.length))}
                            value={companionIds}
                            onChange={e => setCompanionIds([...e.target.selectedOptions].map(o => o.value))}>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                        </select>
                    </label>

                    {error && <div style={{ color: '#dc2626', fontSize: 13 }}>⚠ {error}</div>}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
                    <button className="btn btn-primary" onClick={submit} disabled={submitting}>
                        {submitting ? 'Đang lưu…' : 'Lưu check-in'}
                    </button>
                </div>
            </div>
        </div>
    );
}
