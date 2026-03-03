'use client';
import { useState, useEffect } from 'react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function ProgressHistoryModal({ task, onClose, onReject }) {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejecting, setRejecting] = useState(null); // report id being rejected
    const [rejectNote, setRejectNote] = useState('');
    const [lightbox, setLightbox] = useState(null); // image url for fullscreen

    useEffect(() => {
        fetch(`/api/progress-reports?taskId=${task.id}`)
            .then(r => r.ok ? r.json() : [])
            .then(d => { setReports(Array.isArray(d) ? d : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [task.id]);

    const handleReject = async (reportId) => {
        const res = await fetch(`/api/progress-reports/${reportId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Từ chối', rejectionNote: rejectNote }),
        });
        if (res.ok) {
            setRejecting(null);
            setRejectNote('');
            // Refresh
            const updated = await fetch(`/api/progress-reports?taskId=${task.id}`).then(r => r.json());
            setReports(updated);
            if (onReject) onReject();
        }
    };

    const statusColor = (s) => s === 'Đã duyệt' ? 'var(--status-success)' : s === 'Từ chối' ? 'var(--status-danger)' : 'var(--status-warning)';
    const statusIcon = (s) => s === 'Đã duyệt' ? '✅' : s === 'Từ chối' ? '❌' : '⏳';

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                    <div className="modal-header">
                        <h3>📋 Lịch sử cập nhật: {task.name}</h3>
                        <button className="modal-close" onClick={onClose}>×</button>
                    </div>
                    <div className="modal-body" style={{ overflow: 'auto', flex: 1 }}>
                        {/* Current Status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 10 }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: `conic-gradient(var(--accent-primary) ${task.progress * 3.6}deg, var(--border) 0deg)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                                    {task.progress}%
                                </div>
                            </div>
                            <div>
                                <div style={{ fontWeight: 700 }}>{task.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {task.assignee || 'Chưa gán'} • {reports.length} lần cập nhật
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : reports.length === 0 ? (
                            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                                Chưa có báo cáo nào
                            </div>
                        ) : (
                            <div style={{ position: 'relative', paddingLeft: 20 }}>
                                {/* Timeline line */}
                                <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />

                                {reports.map((r, i) => {
                                    let imgs = [];
                                    try { imgs = JSON.parse(r.images); } catch { imgs = []; }

                                    return (
                                        <div key={r.id} style={{ position: 'relative', marginBottom: 20, paddingLeft: 20 }}>
                                            {/* Timeline dot */}
                                            <div style={{
                                                position: 'absolute', left: -16, top: 4,
                                                width: 12, height: 12, borderRadius: '50%',
                                                background: statusColor(r.status),
                                                border: '2px solid var(--bg-primary)',
                                            }} />

                                            <div style={{ padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                                {/* Header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: 12 }}>{statusIcon(r.status)}</span>
                                                        <span style={{ fontWeight: 700, fontSize: 14 }}>{r.progressFrom}% → {r.progressTo}%</span>
                                                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: statusColor(r.status) + '20', color: statusColor(r.status), fontWeight: 600 }}>
                                                            {r.status}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(r.reportDate)}</div>
                                                </div>

                                                {/* Reporter */}
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                                                    👤 {r.createdBy || 'Giám sát'}
                                                </div>

                                                {/* Description */}
                                                {r.description && (
                                                    <div style={{ fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>{r.description}</div>
                                                )}

                                                {/* Rejection note */}
                                                {r.status === 'Từ chối' && r.rejectionNote && (
                                                    <div style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 6, fontSize: 12, color: 'var(--status-danger)', marginBottom: 8 }}>
                                                        ❌ {r.rejectionNote}
                                                    </div>
                                                )}

                                                {/* Images */}
                                                {imgs.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                                        {imgs.map((url, j) => (
                                                            <img
                                                                key={j}
                                                                src={url}
                                                                alt={`Ảnh ${j + 1}`}
                                                                onClick={() => setLightbox(url)}
                                                                style={{
                                                                    width: 72, height: 72, objectFit: 'cover',
                                                                    borderRadius: 8, cursor: 'pointer',
                                                                    transition: 'transform 0.2s',
                                                                    border: '2px solid var(--border)',
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Reject button (only for latest approved report) */}
                                                {i === 0 && r.status === 'Đã duyệt' && onReject && (
                                                    rejecting === r.id ? (
                                                        <div style={{ marginTop: 8 }}>
                                                            <input
                                                                className="form-input"
                                                                placeholder="Lý do từ chối..."
                                                                value={rejectNote}
                                                                onChange={e => setRejectNote(e.target.value)}
                                                                style={{ marginBottom: 6, fontSize: 12 }}
                                                            />
                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => setRejecting(null)}>Hủy</button>
                                                                <button className="btn btn-sm" style={{ background: 'var(--status-danger)', color: '#fff' }} onClick={() => handleReject(r.id)}>Xác nhận từ chối</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--status-danger)' }} onClick={() => setRejecting(r.id)}>
                                                            ✋ Từ chối báo cáo này
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {lightbox && (
                <div onClick={() => setLightbox(null)} style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    background: 'rgba(0,0,0,0.9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'zoom-out',
                }}>
                    <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12 }} />
                </div>
            )}
        </>
    );
}
