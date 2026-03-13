'use client';
import { useState, useRef } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { QUOTATION_TYPES } from '@/lib/quotation-constants';

const COVER_SLOTS = [
    { key: 'top', label: 'Bìa đầu (Top)', desc: 'Trang đầu tiên — logo, tên dự án, tên khách hàng. Nếu có AcroForm field "customerName", sẽ được tự động fill.' },
    { key: 'bottom', label: 'Bìa cuối (Bottom)', desc: 'Trang cuối — thông tin liên hệ, chính sách hậu mãi, điều khoản.' },
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function PdfCoverTab({ pdfCovers, setPdfCovers, toast }) {
    const [uploading, setUploading] = useState({});
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedType, setSelectedType] = useState('default');
    const fileRefs = { top: useRef(null), bottom: useRef(null) };

    // pdfCovers shape: { top: { default: { url, size, name }, "Thi công thô": {...} }, bottom: { ... } }
    const covers = pdfCovers || { top: {}, bottom: {} };

    const typeOptions = ['default', ...QUOTATION_TYPES];

    const handleUpload = async (slot) => {
        const input = fileRefs[slot]?.current;
        if (!input) return;
        input.click();
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.type !== 'application/pdf') {
                toast.error('Chỉ chấp nhận file PDF');
                return;
            }
            if (file.size > MAX_SIZE) {
                toast.error('File quá lớn (tối đa 10MB)');
                return;
            }
            setUploading(prev => ({ ...prev, [`${slot}_${selectedType}`]: true }));
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', 'pdf-covers');
                const res = await apiFetch('/api/upload', { method: 'POST', body: formData, raw: true });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Upload thất bại');

                setPdfCovers(prev => ({
                    ...prev,
                    [slot]: {
                        ...(prev?.[slot] || {}),
                        [selectedType]: { url: data.url, size: file.size, name: file.name },
                    },
                }));
                toast.success(`Đã upload ${COVER_SLOTS.find(s => s.key === slot)?.label}`);
            } catch (err) {
                toast.error(err.message || 'Lỗi upload');
            }
            setUploading(prev => ({ ...prev, [`${slot}_${selectedType}`]: false }));
            input.value = '';
        };
    };

    const handleRemove = (slot) => {
        if (!confirm('Xoá file bìa này?')) return;
        setPdfCovers(prev => {
            const updated = { ...prev, [slot]: { ...(prev?.[slot] || {}) } };
            delete updated[slot][selectedType];
            return updated;
        });
        toast.success('Đã xoá');
    };

    const getCover = (slot) => covers[slot]?.[selectedType] || null;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 20 }}>📎</span>
                <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>PDF Bìa — Đóng bìa tự động</h4>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                        Upload PDF bìa đầu & bìa cuối. Khi xuất "PDF trọn bộ", hệ thống ghép: Bìa đầu → Nội dung báo giá → Bìa cuối.
                    </p>
                </div>
            </div>

            {/* Type selector */}
            <div className="form-group" style={{ marginBottom: 24, maxWidth: 320 }}>
                <label className="form-label">Loại báo giá</label>
                <select
                    className="form-input"
                    value={selectedType}
                    onChange={e => setSelectedType(e.target.value)}
                >
                    {typeOptions.map(t => (
                        <option key={t} value={t}>{t === 'default' ? '🔗 Mặc định (tất cả)' : t}</option>
                    ))}
                </select>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Chọn loại cụ thể để upload bìa riêng, hoặc "Mặc định" áp dụng cho tất cả.
                </p>
            </div>

            {/* Cover slots */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {COVER_SLOTS.map(slot => {
                    const cover = getCover(slot.key);
                    const isUploading = uploading[`${slot.key}_${selectedType}`];
                    return (
                        <div key={slot.key} style={{
                            border: '2px dashed var(--border)', borderRadius: 12, padding: 20,
                            background: cover ? 'var(--bg-secondary)' : 'transparent',
                            transition: 'all 0.2s',
                        }}>
                            <h5 style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                                {slot.key === 'top' ? '📄 ' : '📃 '}{slot.label}
                            </h5>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px' }}>{slot.desc}</p>

                            <input
                                ref={fileRefs[slot.key]}
                                type="file"
                                accept=".pdf"
                                style={{ display: 'none' }}
                            />

                            {cover ? (
                                <div>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 14px', marginBottom: 10,
                                    }}>
                                        <span style={{ fontSize: 18 }}>📋</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {cover.name}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtSize(cover.size)}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            className="btn btn-sm"
                                            style={{ background: 'var(--accent-primary)', color: '#fff', flex: 1 }}
                                            onClick={() => setPreviewUrl(cover.url)}
                                        >
                                            👁️ Xem
                                        </button>
                                        <button
                                            className="btn btn-sm"
                                            style={{ flex: 1 }}
                                            onClick={() => handleUpload(slot.key)}
                                            disabled={isUploading}
                                        >
                                            {isUploading ? '⏳...' : '🔄 Thay'}
                                        </button>
                                        <button
                                            className="btn btn-sm"
                                            style={{ color: 'var(--danger)' }}
                                            onClick={() => handleRemove(slot.key)}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    className="btn"
                                    style={{
                                        width: '100%', padding: '20px 16px',
                                        border: '2px dashed var(--border)', borderRadius: 8,
                                        background: 'transparent', cursor: 'pointer',
                                        color: 'var(--text-muted)', fontSize: 13,
                                    }}
                                    onClick={() => handleUpload(slot.key)}
                                    disabled={isUploading}
                                >
                                    {isUploading ? '⏳ Đang upload...' : '📤 Chọn file PDF...'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Summary table */}
            {Object.keys(covers.top || {}).length + Object.keys(covers.bottom || {}).length > 0 && (
                <div style={{ marginTop: 24 }}>
                    <h5 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        📊 Tổng hợp bìa đã upload
                    </h5>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Loại BG</th>
                                <th style={{ textAlign: 'center', padding: '6px 8px' }}>Bìa đầu</th>
                                <th style={{ textAlign: 'center', padding: '6px 8px' }}>Bìa cuối</th>
                            </tr>
                        </thead>
                        <tbody>
                            {typeOptions.map(t => {
                                const top = covers.top?.[t];
                                const bottom = covers.bottom?.[t];
                                if (!top && !bottom) return null;
                                return (
                                    <tr key={t} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>{t === 'default' ? '🔗 Mặc định' : t}</td>
                                        <td style={{ textAlign: 'center', padding: '6px 8px' }}>{top ? '✅' : '—'}</td>
                                        <td style={{ textAlign: 'center', padding: '6px 8px' }}>{bottom ? '✅' : '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Preview Modal */}
            {previewUrl && (
                <div
                    onClick={() => setPreviewUrl(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '80vw', height: '85vh', background: '#fff', borderRadius: 12,
                            overflow: 'hidden', position: 'relative',
                        }}
                    >
                        <button
                            onClick={() => setPreviewUrl(null)}
                            style={{
                                position: 'absolute', top: 8, right: 12, zIndex: 10,
                                background: '#000', color: '#fff', border: 'none', borderRadius: 20,
                                width: 32, height: 32, fontSize: 16, cursor: 'pointer',
                            }}
                        >✕</button>
                        <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
                    </div>
                </div>
            )}
        </div>
    );
}
