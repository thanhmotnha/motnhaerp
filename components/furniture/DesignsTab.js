'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtDate, fmtDateTime } from './constants';

export default function DesignsTab({ order, onRefresh, toast, role }) {
    const [showUpload, setShowUpload] = useState(false);
    const [form, setForm] = useState({ fileUrl: '', versionLabel: '', description: '', renderImageUrl: '' });
    const [submitting, setSubmitting] = useState(false);
    const [approveForm, setApproveForm] = useState({ designId: null, action: '', customerFeedback: '', approvedByName: '', rejectionReason: '' });
    const [showDocPicker, setShowDocPicker] = useState(false);
    const [projectDocs, setProjectDocs] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const loadProjectDocs = async () => {
        if (!order.projectId) return;
        setLoadingDocs(true);
        try {
            const res = await apiFetch(`/api/project-documents?projectId=${order.projectId}&limit=50`);
            setProjectDocs(res.data || []);
        } catch (e) { toast.error(e.message); }
        setLoadingDocs(false);
    };

    const selectDoc = (doc) => {
        setForm(f => ({ ...f, fileUrl: doc.fileUrl || '', versionLabel: doc.name || '' }));
        setShowDocPicker(false);
        setShowUpload(true);
    };

    const uploadDesign = async (e) => {
        e.preventDefault();
        if (!form.fileUrl) { toast.error('Nhập link file bản vẽ'); return; }
        setSubmitting(true);
        try {
            await apiFetch(`/api/furniture-orders/${order.id}/designs`, { method: 'POST', body: JSON.stringify(form) });
            toast.success('Đã tải lên bản vẽ mới');
            setShowUpload(false);
            setForm({ fileUrl: '', versionLabel: '', description: '', renderImageUrl: '' });
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setSubmitting(false);
    };

    const handleApprove = async (designId, action) => {
        try {
            await apiFetch(`/api/furniture-orders/${order.id}/designs?designId=${designId}`, {
                method: 'PUT',
                body: JSON.stringify({ action, ...approveForm }),
            });
            toast.success(action === 'approve' ? 'Đã duyệt bản vẽ' : 'Đã từ chối bản vẽ');
            setApproveForm({ designId: null, action: '', customerFeedback: '', approvedByName: '', rejectionReason: '' });
            onRefresh();
        } catch (e) { toast.error(e.message); }
    };

    const DESIGN_STATUS = { draft: 'Nháp', submitted: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', superseded: 'Thay thế' };
    const DESIGN_COLOR = { draft: 'muted', submitted: 'warning', approved: 'success', rejected: 'danger', superseded: 'muted' };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>Bản vẽ thiết kế ({order.designs?.length || 0})</div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {order.projectId && (
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}
                            onClick={() => { setShowDocPicker(!showDocPicker); if (!showDocPicker && !projectDocs.length) loadProjectDocs(); }}>
                            Chọn từ tài liệu dự án
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowUpload(!showUpload)} style={{ fontSize: 12, padding: '5px 12px' }}>+ Upload bản vẽ</button>
                </div>
            </div>

            {showDocPicker && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Tài liệu dự án {order.project?.code}</div>
                    {loadingDocs ? (
                        <div style={{ color: 'var(--text-muted)', padding: 12 }}>Đang tải...</div>
                    ) : projectDocs.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Dự án chưa có tài liệu nào</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                            {projectDocs.map(doc => (
                                <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                                    <div>
                                        <div style={{ fontWeight: 500, fontSize: 13 }}>{doc.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.category || '—'} · {fmtDate(doc.createdAt)}</div>
                                    </div>
                                    <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => selectDoc(doc)}>Chọn</button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ marginTop: 10 }}>
                        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setShowDocPicker(false)}>Đóng</button>
                    </div>
                </div>
            )}

            {showUpload && (
                <form onSubmit={uploadDesign} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Upload bản vẽ mới</div>
                    <div><label className="form-label">Link file bản vẽ *</label><input className="form-input" placeholder="https://drive.google.com/..." value={form.fileUrl} onChange={set('fileUrl')} required /></div>
                    <div><label className="form-label">Link render 3D (nếu có)</label><input className="form-input" placeholder="https://..." value={form.renderImageUrl} onChange={set('renderImageUrl')} /></div>
                    <div><label className="form-label">Nhãn phiên bản</label><input className="form-input" placeholder="Bản vẽ v1" value={form.versionLabel} onChange={set('versionLabel')} /></div>
                    <div><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={form.description} onChange={set('description')} /></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ fontSize: 12 }}>{submitting ? '...' : 'Upload'}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)} style={{ fontSize: 12 }}>Hủy</button>
                    </div>
                </form>
            )}

            {(order.designs || []).length === 0
                ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có bản vẽ nào</div>
                : (order.designs || []).map(d => (
                    <div key={d.id} style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                                <span style={{ fontWeight: 700, fontSize: 14 }}>v{d.versionNumber} — {d.versionLabel}</span>
                                <span className={`badge ${DESIGN_COLOR[d.status]}`} style={{ marginLeft: 8, fontSize: 10 }}>{DESIGN_STATUS[d.status]}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {fmtDateTime(d.createdAt)} · {d.submittedBy}
                            </div>
                        </div>
                        {d.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{d.description}</div>}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>Xem bản vẽ</a>}
                            {d.renderImageUrl && <a href={d.renderImageUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>Xem render 3D</a>}
                        </div>
                        {d.status === 'approved' && (
                            <div style={{ fontSize: 11, color: 'var(--status-success)' }}>
                                Duyệt bởi: {d.approvedByName} · {fmtDateTime(d.approvedAt)}
                                {d.customerFeedback && <div>Phản hồi KH: {d.customerFeedback}</div>}
                            </div>
                        )}
                        {d.status === 'rejected' && d.rejectionReason && (
                            <div style={{ fontSize: 11, color: 'var(--status-danger)' }}>Lý do từ chối: {d.rejectionReason}</div>
                        )}
                        {['submitted', 'draft'].includes(d.status) && (
                            approveForm.designId === d.id ? (
                                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ fontWeight: 600, fontSize: 12 }}>{approveForm.action === 'approve' ? 'Xác nhận duyệt' : 'Từ chối bản vẽ'}</div>
                                    <div><label className="form-label">Người duyệt</label><input className="form-input" value={approveForm.approvedByName} onChange={e => setApproveForm(f => ({ ...f, approvedByName: e.target.value }))} /></div>
                                    <div><label className="form-label">Phản hồi KH</label><textarea className="form-input" rows={2} value={approveForm.customerFeedback} onChange={e => setApproveForm(f => ({ ...f, customerFeedback: e.target.value }))} /></div>
                                    {approveForm.action === 'reject' && <div><label className="form-label">Lý do từ chối</label><textarea className="form-input" rows={2} value={approveForm.rejectionReason} onChange={e => setApproveForm(f => ({ ...f, rejectionReason: e.target.value }))} /></div>}
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className={`btn btn-${approveForm.action === 'approve' ? 'primary' : 'secondary'}`} style={{ fontSize: 11, color: approveForm.action === 'reject' ? 'var(--status-danger)' : '' }} onClick={() => handleApprove(d.id, approveForm.action)}>
                                            {approveForm.action === 'approve' ? 'Xác nhận duyệt' : 'Từ chối'}
                                        </button>
                                        <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => setApproveForm({ designId: null, action: '', customerFeedback: '', approvedByName: '', rejectionReason: '' })}>Hủy</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                    <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setApproveForm({ designId: d.id, action: 'approve', customerFeedback: '', approvedByName: '', rejectionReason: '' })}>Duyệt</button>
                                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--status-danger)' }} onClick={() => setApproveForm({ designId: d.id, action: 'reject', customerFeedback: '', approvedByName: '', rejectionReason: '' })}>Từ chối</button>
                                </div>
                            )
                        )}
                    </div>
                ))
            }
        </div>
    );
}
