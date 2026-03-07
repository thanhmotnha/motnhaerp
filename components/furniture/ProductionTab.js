'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtDate } from './constants';

function TimelineBar({ batch }) {
    if (!batch.plannedStartDate && !batch.actualStartDate) return null;

    const pStart = batch.plannedStartDate ? new Date(batch.plannedStartDate) : null;
    const pEnd = batch.plannedEndDate ? new Date(batch.plannedEndDate) : null;
    const aStart = batch.actualStartDate ? new Date(batch.actualStartDate) : null;
    const aEnd = batch.actualEndDate ? new Date(batch.actualEndDate) : null;
    const now = new Date();

    const plannedDays = pStart && pEnd ? Math.ceil((pEnd - pStart) / 86400000) : null;
    const actualDays = aStart ? Math.ceil(((aEnd || now) - aStart) / 86400000) : null;
    const isOverdue = pEnd && !aEnd && now > pEnd;
    const overdueDays = isOverdue ? Math.ceil((now - pEnd) / 86400000) : 0;
    const daysRemaining = pEnd && !aEnd && now <= pEnd ? Math.ceil((pEnd - now) / 86400000) : null;

    return (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Tiến độ thời gian</div>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, marginBottom: 6, flexWrap: 'wrap' }}>
                {pStart && <span>KH bắt đầu: <strong>{fmtDate(pStart)}</strong></span>}
                {pEnd && <span>KH xong: <strong>{fmtDate(pEnd)}</strong></span>}
                {plannedDays && <span>({plannedDays} ngày)</span>}
            </div>
            {aStart && (
                <div style={{ display: 'flex', gap: 16, fontSize: 11, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span>TT bắt đầu: <strong style={{ color: 'var(--accent-primary)' }}>{fmtDate(aStart)}</strong></span>
                    {aEnd && <span>TT xong: <strong style={{ color: 'var(--status-success)' }}>{fmtDate(aEnd)}</strong></span>}
                    {actualDays !== null && <span>({actualDays} ngày)</span>}
                </div>
            )}
            {/* Timeline bars */}
            {plannedDays && (
                <div style={{ position: 'relative', height: 20, marginBottom: 4 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: 'var(--border-color)', borderRadius: 4 }} />
                    {aStart && (
                        <div style={{
                            position: 'absolute', top: 0, left: 0,
                            width: `${Math.min(100, actualDays ? (actualDays / plannedDays) * 100 : 0)}%`,
                            height: 8, borderRadius: 4,
                            background: isOverdue ? 'var(--status-danger)' : aEnd ? 'var(--status-success)' : 'var(--accent-primary)',
                            transition: 'width 0.3s',
                        }} />
                    )}
                </div>
            )}
            <div style={{ fontSize: 11, fontWeight: 600 }}>
                {aEnd ? (
                    <span style={{ color: 'var(--status-success)' }}>✓ Hoàn thành {actualDays && plannedDays ? (actualDays <= plannedDays ? `(đúng hạn)` : `(trễ ${actualDays - plannedDays} ngày)`) : ''}</span>
                ) : isOverdue ? (
                    <span style={{ color: 'var(--status-danger)' }}>⚠ Trễ {overdueDays} ngày</span>
                ) : daysRemaining !== null ? (
                    <span style={{ color: daysRemaining <= 3 ? 'var(--status-warning)' : 'var(--text-muted)' }}>Còn {daysRemaining} ngày</span>
                ) : null}
            </div>
        </div>
    );
}

function ProgressBar({ batch }) {
    const items = batch.batchItems || [];
    if (!items.length) return null;
    const totalPlanned = items.reduce((s, i) => s + (i.plannedQty || 0), 0);
    const totalCompleted = items.reduce((s, i) => s + (i.completedQty || 0), 0);
    const totalPassed = items.reduce((s, i) => s + (i.qcPassedQty || 0), 0);
    const pctComplete = totalPlanned ? Math.round((totalCompleted / totalPlanned) * 100) : 0;
    const pctPassed = totalPlanned ? Math.round((totalPassed / totalPlanned) * 100) : 0;

    return (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span>SX: {totalCompleted}/{totalPlanned}</span><span style={{ fontWeight: 600 }}>{pctComplete}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pctComplete}%`, background: 'var(--accent-primary)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span>QC: {totalPassed}/{totalPlanned}</span><span style={{ fontWeight: 600, color: 'var(--status-success)' }}>{pctPassed}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pctPassed}%`, background: 'var(--status-success)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
            </div>
        </div>
    );
}

function WorkersList({ workers, onEdit }) {
    if (!workers?.length) return <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>Chưa gán thợ</div>;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {workers.map((w, i) => (
                <span key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '3px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <strong>{w.name}</strong>
                    {w.role && <span style={{ color: 'var(--text-muted)' }}>({w.role})</span>}
                    {w.phone && <span style={{ color: 'var(--text-muted)' }}>· {w.phone}</span>}
                </span>
            ))}
            {onEdit && <button style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: 11 }} onClick={onEdit}>Sửa</button>}
        </div>
    );
}

function WorkerEditor({ workers, onChange, onSave, onCancel, saving }) {
    const addWorker = () => onChange([...workers, { name: '', role: '', phone: '' }]);
    const removeWorker = (idx) => onChange(workers.filter((_, i) => i !== idx));
    const updateWorker = (idx, key, val) => onChange(workers.map((w, i) => i === idx ? { ...w, [key]: val } : w));

    return (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Danh sách thợ/nhóm thợ</div>
            {workers.map((w, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 6, marginBottom: 6, alignItems: 'end' }}>
                    <div><label className="form-label" style={{ fontSize: 10 }}>Tên *</label><input className="form-input" style={{ fontSize: 12 }} value={w.name} onChange={e => updateWorker(i, 'name', e.target.value)} placeholder="Nguyễn Văn A" /></div>
                    <div><label className="form-label" style={{ fontSize: 10 }}>Vai trò</label><input className="form-input" style={{ fontSize: 12 }} value={w.role} onChange={e => updateWorker(i, 'role', e.target.value)} placeholder="Thợ mộc" /></div>
                    <div><label className="form-label" style={{ fontSize: 10 }}>SĐT</label><input className="form-input" style={{ fontSize: 12 }} value={w.phone} onChange={e => updateWorker(i, 'phone', e.target.value)} placeholder="09xxx" /></div>
                    <button type="button" style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: 16, paddingBottom: 4 }} onClick={() => removeWorker(i)}>×</button>
                </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={addWorker}>+ Thêm thợ</button>
                <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={onSave} disabled={saving}>{saving ? '...' : 'Lưu'}</button>
                <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={onCancel}>Hủy</button>
            </div>
        </div>
    );
}

export default function ProductionTab({ order, onRefresh, toast, role }) {
    const [workshops, setWorkshops] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ workshopId: '', plannedStartDate: '', plannedEndDate: '', notes: '', supervisorName: '' });
    const [newWorkers, setNewWorkers] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [expandedBatch, setExpandedBatch] = useState(null);
    const [qcEdits, setQcEdits] = useState({});
    const [savingQc, setSavingQc] = useState(false);
    const [editingWorkers, setEditingWorkers] = useState(null); // batchId
    const [editWorkerList, setEditWorkerList] = useState([]);
    const [savingWorkers, setSavingWorkers] = useState(false);

    useEffect(() => {
        apiFetch('/api/workshops').then(d => setWorkshops(Array.isArray(d) ? d : [])).catch(() => { });
    }, []);

    const parseWorkers = (b) => {
        try { return JSON.parse(b.assignedWorkers || '[]'); } catch { return []; }
    };

    const createBatch = async (e) => {
        e.preventDefault();
        if (!form.workshopId) { toast.error('Chọn xưởng sản xuất'); return; }
        setSubmitting(true);
        try {
            await apiFetch('/api/production-batches', {
                method: 'POST',
                body: JSON.stringify({
                    furnitureOrderId: order.id, ...form,
                    assignedWorkers: newWorkers.filter(w => w.name.trim()),
                }),
            });
            toast.success('Đã tạo lệnh sản xuất');
            setShowCreate(false);
            setNewWorkers([]);
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

    const saveWorkers = async (batchId) => {
        setSavingWorkers(true);
        try {
            await apiFetch(`/api/production-batches/${batchId}`, {
                method: 'PUT',
                body: JSON.stringify({ assignedWorkers: editWorkerList.filter(w => w.name.trim()) }),
            });
            toast.success('Đã cập nhật danh sách thợ');
            setEditingWorkers(null);
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setSavingWorkers(false);
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div><label className="form-label">Xưởng sản xuất *</label>
                            <select className="form-select" value={form.workshopId} onChange={e => setForm(f => ({ ...f, workshopId: e.target.value }))} required>
                                <option value="">-- Chọn xưởng --</option>
                                {workshops.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
                            </select>
                        </div>
                        <div><label className="form-label">Quản đốc</label><input className="form-input" value={form.supervisorName} onChange={e => setForm(f => ({ ...f, supervisorName: e.target.value }))} placeholder="Tên quản đốc" /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div><label className="form-label">Ngày bắt đầu</label><input type="date" className="form-input" value={form.plannedStartDate} onChange={e => setForm(f => ({ ...f, plannedStartDate: e.target.value }))} /></div>
                        <div><label className="form-label">Ngày hoàn thành dự kiến</label><input type="date" className="form-input" value={form.plannedEndDate} onChange={e => setForm(f => ({ ...f, plannedEndDate: e.target.value }))} /></div>
                    </div>
                    <div><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>

                    {/* Workers section in create form */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>Thợ/nhóm thợ</div>
                            <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setNewWorkers(w => [...w, { name: '', role: '', phone: '' }])}>+ Thêm thợ</button>
                        </div>
                        {newWorkers.map((w, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 6, marginBottom: 6, alignItems: 'end' }}>
                                <div><input className="form-input" style={{ fontSize: 12 }} value={w.name} onChange={e => setNewWorkers(ws => ws.map((ww, ii) => ii === i ? { ...ww, name: e.target.value } : ww))} placeholder="Tên thợ *" /></div>
                                <div><input className="form-input" style={{ fontSize: 12 }} value={w.role} onChange={e => setNewWorkers(ws => ws.map((ww, ii) => ii === i ? { ...ww, role: e.target.value } : ww))} placeholder="Vai trò" /></div>
                                <div><input className="form-input" style={{ fontSize: 12 }} value={w.phone} onChange={e => setNewWorkers(ws => ws.map((ww, ii) => ii === i ? { ...ww, phone: e.target.value } : ww))} placeholder="SĐT" /></div>
                                <button type="button" style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: 16 }} onClick={() => setNewWorkers(ws => ws.filter((_, ii) => ii !== i))}>×</button>
                            </div>
                        ))}
                    </div>

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
                    const workers = parseWorkers(batch);
                    return (
                        <div key={batch.id} style={{ border: '1px solid var(--border-color)', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                                onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: 14 }}>{batch.code}</span>
                                    <span className={`badge ${BCOLOR[batch.status]}`} style={{ fontSize: 10 }}>{BSTATUS[batch.status]}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Xưởng: {batch.workshop?.name}</span>
                                    {batch.supervisorName && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· QĐ: {batch.supervisorName}</span>}
                                    {workers.length > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {workers.length} thợ</span>}
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
                                    {/* Timeline + Progress */}
                                    <TimelineBar batch={batch} />
                                    <ProgressBar batch={batch} />

                                    {/* Assigned Workers */}
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Thợ phân công</div>
                                        {editingWorkers === batch.id ? (
                                            <WorkerEditor
                                                workers={editWorkerList}
                                                onChange={setEditWorkerList}
                                                onSave={() => saveWorkers(batch.id)}
                                                onCancel={() => setEditingWorkers(null)}
                                                saving={savingWorkers}
                                            />
                                        ) : (
                                            <WorkersList workers={workers} onEdit={() => { setEditingWorkers(batch.id); setEditWorkerList([...workers]); }} />
                                        )}
                                    </div>

                                    {/* QC Table */}
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
