'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtDate } from './constants';

export default function ProductionTab({ order, onRefresh, toast, role }) {
    const [workshops, setWorkshops] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ workshopId: '', plannedStartDate: '', plannedEndDate: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);
    const [expandedBatch, setExpandedBatch] = useState(null);
    const [qcEdits, setQcEdits] = useState({});
    const [savingQc, setSavingQc] = useState(false);

    useEffect(() => {
        apiFetch('/api/workshops').then(d => setWorkshops(Array.isArray(d) ? d : [])).catch(() => { });
    }, []);

    const createBatch = async (e) => {
        e.preventDefault();
        if (!form.workshopId) { toast.error('Chọn xưởng sản xuất'); return; }
        setSubmitting(true);
        try {
            await apiFetch('/api/production-batches', {
                method: 'POST',
                body: JSON.stringify({ furnitureOrderId: order.id, ...form }),
            });
            toast.success('Đã tạo lệnh sản xuất');
            setShowCreate(false);
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setSubmitting(false);
    };

    const updateBatchStatus = async (batch, newStatus) => {
        try {
            await apiFetch(`/api/production-batches/${batch.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
            toast.success(`Lệnh ${batch.code} → ${BSTATUS[newStatus]}`);
            onRefresh();
        } catch (e) { toast.error(e.message); }
    };

    const saveQc = async (batch) => {
        const batchItemUpdates = Object.entries(qcEdits).map(([itemId, vals]) => ({ id: itemId, ...vals }));
        if (!batchItemUpdates.length) return;
        setSavingQc(true);
        try {
            await apiFetch(`/api/production-batches/${batch.id}`, { method: 'PUT', body: JSON.stringify({ batchItemUpdates }) });
            toast.success('Đã lưu kết quả QC');
            setQcEdits({});
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setSavingQc(false);
    };

    const setQc = (itemId, key, val) => setQcEdits(q => ({ ...q, [itemId]: { ...q[itemId], [key]: Number(val) } }));

    const BSTATUS = { planned: 'Chờ', in_progress: 'Đang SX', paused: 'Tạm dừng', completed: 'Xong', cancelled: 'Hủy' };
    const BCOLOR = { planned: 'muted', in_progress: 'warning', paused: 'info', completed: 'success', cancelled: 'danger' };
    const BNEXT = { planned: 'in_progress', in_progress: 'completed', paused: 'in_progress' };
    const BNEXT_LABEL = { planned: 'Bắt đầu SX', in_progress: 'Hoàn thành', paused: 'Tiếp tục' };
    const batches = order.batches || [];

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>Lệnh sản xuất ({batches.length})</div>
                {['giam_doc', 'pho_gd', 'quan_ly_du_an'].includes(role) && (
                    <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)} style={{ fontSize: 12, padding: '5px 12px' }}>+ Tạo lệnh SX</button>
                )}
            </div>

            {showCreate && (
                <form onSubmit={createBatch} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Lệnh sản xuất mới</div>
                    <div><label className="form-label">Xưởng sản xuất *</label>
                        <select className="form-select" value={form.workshopId} onChange={e => setForm(f => ({ ...f, workshopId: e.target.value }))} required>
                            <option value="">-- Chọn xưởng --</option>
                            {workshops.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div><label className="form-label">Ngày bắt đầu</label><input type="date" className="form-input" value={form.plannedStartDate} onChange={e => setForm(f => ({ ...f, plannedStartDate: e.target.value }))} /></div>
                        <div><label className="form-label">Ngày hoàn thành dự kiến</label><input type="date" className="form-input" value={form.plannedEndDate} onChange={e => setForm(f => ({ ...f, plannedEndDate: e.target.value }))} /></div>
                    </div>
                    <div><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ fontSize: 12 }}>{submitting ? '...' : 'Tạo lệnh'}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)} style={{ fontSize: 12 }}>Hủy</button>
                    </div>
                </form>
            )}

            {batches.length === 0
                ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có lệnh sản xuất nào</div>
                : batches.map(batch => {
                    const isExpanded = expandedBatch === batch.id;
                    const hasQcEdits = Object.keys(qcEdits).length > 0;
                    return (
                        <div key={batch.id} style={{ border: '1px solid var(--border-color)', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                                onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontWeight: 700, fontSize: 14 }}>{batch.code}</span>
                                    <span className={`badge ${BCOLOR[batch.status]}`} style={{ fontSize: 10 }}>{BSTATUS[batch.status]}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Xưởng: {batch.workshop?.name}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    {BNEXT[batch.status] && (
                                        <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 10px' }}
                                            onClick={e => { e.stopPropagation(); updateBatchStatus(batch, BNEXT[batch.status]); }}>
                                            {BNEXT_LABEL[batch.status]}
                                        </button>
                                    )}
                                    {batch.status === 'in_progress' && (
                                        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }}
                                            onClick={e => { e.stopPropagation(); updateBatchStatus(batch, 'paused'); }}>
                                            Tạm dừng
                                        </button>
                                    )}
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                                </div>
                            </div>

                            {isExpanded && (
                                <div style={{ padding: 16 }}>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                                        {batch.plannedStartDate && <>Bắt đầu: {fmtDate(batch.plannedStartDate)} · </>}
                                        {batch.plannedEndDate && <>Hoàn thành dự kiến: {fmtDate(batch.plannedEndDate)}</>}
                                        {batch.actualStartDate && <> · Thực tế bắt đầu: {fmtDate(batch.actualStartDate)}</>}
                                    </div>

                                    {(batch.batchItems || []).length > 0 && (
                                        <>
                                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Tiến độ & QC từng hạng mục</div>
                                            <table className="data-table" style={{ fontSize: 12 }}>
                                                <thead><tr>
                                                    <th>Hạng mục</th><th>KH</th><th>Hoàn thành</th><th>QC Đạt</th><th>QC Lỗi</th><th>Ghi chú QC</th>
                                                </tr></thead>
                                                <tbody>
                                                    {batch.batchItems.map(bi => {
                                                        const edit = qcEdits[bi.id] || {};
                                                        const isEditing = batch.status === 'in_progress' || batch.status === 'completed';
                                                        return (
                                                            <tr key={bi.id}>
                                                                <td style={{ fontWeight: 500 }}>{bi.furnitureOrderItem?.name}</td>
                                                                <td>{bi.plannedQty}</td>
                                                                <td>
                                                                    {isEditing
                                                                        ? <input type="number" className="form-input" min={0} max={bi.plannedQty}
                                                                            style={{ width: 65 }}
                                                                            value={edit.completedQty ?? bi.completedQty}
                                                                            onChange={e => setQc(bi.id, 'completedQty', e.target.value)} />
                                                                        : bi.completedQty}
                                                                </td>
                                                                <td>
                                                                    {isEditing
                                                                        ? <input type="number" className="form-input" min={0}
                                                                            style={{ width: 65, borderColor: 'var(--status-success)' }}
                                                                            value={edit.qcPassedQty ?? (bi.qcPassedQty || 0)}
                                                                            onChange={e => setQc(bi.id, 'qcPassedQty', e.target.value)} />
                                                                        : <span style={{ color: 'var(--status-success)' }}>{bi.qcPassedQty || 0}</span>}
                                                                </td>
                                                                <td>
                                                                    {isEditing
                                                                        ? <input type="number" className="form-input" min={0}
                                                                            style={{ width: 65, borderColor: 'var(--status-danger)' }}
                                                                            value={edit.qcFailedQty ?? (bi.qcFailedQty || 0)}
                                                                            onChange={e => setQc(bi.id, 'qcFailedQty', e.target.value)} />
                                                                        : <span style={{ color: (bi.qcFailedQty || 0) > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{bi.qcFailedQty || 0}</span>}
                                                                </td>
                                                                <td>
                                                                    {isEditing
                                                                        ? <input className="form-input" style={{ minWidth: 120 }}
                                                                            value={edit.qcNote ?? (bi.qcNote || '')}
                                                                            onChange={e => setQcEdits(q => ({ ...q, [bi.id]: { ...q[bi.id], qcNote: e.target.value } }))} />
                                                                        : <span style={{ color: 'var(--text-muted)' }}>{bi.qcNote || '—'}</span>}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            {(batch.status === 'in_progress' || batch.status === 'completed') && (
                                                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                                                    <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => saveQc(batch)} disabled={savingQc || !hasQcEdits}>
                                                        {savingQc ? 'Đang lưu...' : 'Lưu kết quả QC'}
                                                    </button>
                                                    {hasQcEdits && <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setQcEdits({})}>Hủy thay đổi</button>}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {batch.notes && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>Ghi chú: {batch.notes}</div>}
                                </div>
                            )}
                        </div>
                    );
                })
            }
        </div>
    );
}
