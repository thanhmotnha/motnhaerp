'use client';
import { useMemo, useState } from 'react';
import { fmtVND } from '@/lib/projectUtils';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

export default function ScheduleTab({ project: p, projectId, onRefresh }) {
    const toast = useToast();
    const [filterCategory, setFilterCategory] = useState('');
    const [filterMode, setFilterMode] = useState('all'); // all | diff | missing
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [savingId, setSavingId] = useState(null);

    // Import Dự toán G8/G9 (1 file → 2 phần: hạng mục + vật tư)
    const [importing, setImporting] = useState(false);
    const [dutoanPreview, setDutoanPreview] = useState(null);
    const [dutoanFile, setDutoanFile] = useState(null);
    const [dutoanReplaceAll, setDutoanReplaceAll] = useState(false);
    const [dutoanCommitting, setDutoanCommitting] = useState(false);
    const [dupeStrategy, setDupeStrategy] = useState('both'); // both | schedule | material
    const [activePreviewTab, setActivePreviewTab] = useState('schedule'); // schedule | materials | duplicates

    const previewDutoan = async (file) => {
        if (!file) return;
        setImporting(true);
        setDutoanFile(file);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('mode', 'preview');
            const res = await fetch(`/api/projects/${projectId}/material-plans/import-dutoan`, { method: 'POST', body: fd });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Lỗi đọc file');
            setDutoanPreview(json);
        } catch (err) {
            toast.showToast(err.message || 'Không đọc được file', 'error');
            setDutoanFile(null);
        } finally { setImporting(false); }
    };

    const commitDutoan = async () => {
        if (!dutoanFile) return;
        setDutoanCommitting(true);
        try {
            const fd = new FormData();
            fd.append('file', dutoanFile);
            fd.append('mode', 'commit');
            fd.append('replaceAll', dutoanReplaceAll ? 'true' : 'false');
            fd.append('dupeStrategy', dupeStrategy);
            const res = await fetch(`/api/projects/${projectId}/material-plans/import-dutoan`, { method: 'POST', body: fd });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Lỗi lưu');
            const { scheduleItems: s, materials: m } = json.imported;
            toast.showToast(`Đã lưu ${s} hạng mục + ${m} vật tư`, 'success');
            setDutoanPreview(null);
            setDutoanFile(null);
            setDutoanReplaceAll(false);
            setDupeStrategy('both');
            onRefresh();
        } catch (err) {
            toast.showToast(err.message || 'Lỗi', 'error');
        } finally { setDutoanCommitting(false); }
    };

    const items = useMemo(
        () => (p?.materialPlans || []).filter(m => m.costType === 'Thi công'),
        [p?.materialPlans]
    );

    const categories = useMemo(
        () => Array.from(new Set(items.map(it => it.category).filter(Boolean))).sort(),
        [items]
    );

    // Áp filter
    const filtered = useMemo(() => {
        return items.filter(it => {
            if (filterCategory && it.category !== filterCategory) return false;
            const qty = Number(it.quantity) || 0;
            const budgetPrice = Number(it.budgetUnitPrice) || 0;
            const actualPrice = Number(it.unitPrice) || 0;
            const actualTotal = qty * actualPrice;
            const budgetTotal = qty * budgetPrice;
            const diff = actualTotal - budgetTotal;
            if (filterMode === 'diff' && (actualPrice === 0 || diff === 0)) return false;
            if (filterMode === 'missing' && actualPrice > 0) return false;
            return true;
        });
    }, [items, filterCategory, filterMode]);

    // Stats
    const stats = useMemo(() => {
        let totalBudget = 0;
        let totalActual = 0;
        let withActual = 0;
        for (const it of items) {
            const qty = Number(it.quantity) || 0;
            const bp = Number(it.budgetUnitPrice) || 0;
            const ap = Number(it.unitPrice) || 0;
            totalBudget += qty * bp;
            if (ap > 0) {
                totalActual += qty * ap;
                withActual += 1;
            }
        }
        return {
            count: items.length,
            totalBudget,
            totalActual,
            diff: totalActual - totalBudget,
            withActual,
        };
    }, [items]);

    const startEdit = (it) => {
        if (it.isLocked) return;
        setEditingId(it.id);
        setEditValue(String(Number(it.unitPrice) || ''));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    const saveUnitPrice = async (it) => {
        const raw = String(editValue).replace(/[,\s]/g, '');
        const newVal = Number(raw);
        if (!Number.isFinite(newVal) || newVal < 0) {
            toast.error('Đơn giá không hợp lệ');
            return;
        }
        if (newVal === (Number(it.unitPrice) || 0)) {
            cancelEdit();
            return;
        }
        setSavingId(it.id);
        try {
            await apiFetch(`/api/material-plans/${it.id}`, {
                method: 'PUT',
                body: { unitPrice: newVal },
            });
            toast.success('Đã cập nhật đơn giá thực tế');
            cancelEdit();
            if (onRefresh) onRefresh();
        } catch (err) {
            toast.error(err?.message || 'Không lưu được đơn giá');
        } finally {
            setSavingId(null);
        }
    };

    const diffColor = (pct) => {
        if (pct > 5) return 'var(--status-danger)';
        if (pct > 0) return 'var(--status-warning)';
        if (pct < 0) return 'var(--status-success)';
        return 'var(--text-muted)';
    };

    return (
        <div>
            {/* Stats cards */}
            <div
                className="stats-grid"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: 16 }}
            >
                <div className="stat-card">
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-info)' }}>{stats.count}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>🏗️ Tổng hạng mục</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{fmtVND(stats.totalBudget)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📋 Tổng dự toán</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-success)' }}>{fmtVND(stats.totalActual)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>💰 Tổng thực tế</div>
                </div>
                <div className="stat-card">
                    <div
                        style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: stats.diff > 0 ? 'var(--status-danger)' : (stats.diff < 0 ? 'var(--status-success)' : 'var(--text-muted)'),
                        }}
                    >
                        {stats.diff > 0 ? '+' : ''}{fmtVND(stats.diff)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📈 Chênh lệch</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-warning)' }}>
                        {stats.withActual}/{stats.count}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>✅ Đã có giá thực tế</div>
                </div>
            </div>

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                    className="form-select form-select-compact"
                    style={{ maxWidth: 240 }}
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                >
                    <option value="">Tất cả hạng mục</option>
                    {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                <select
                    className="form-select form-select-compact"
                    style={{ maxWidth: 220 }}
                    value={filterMode}
                    onChange={e => setFilterMode(e.target.value)}
                >
                    <option value="all">Tất cả</option>
                    <option value="diff">Có chênh lệch</option>
                    <option value="missing">Chưa có giá thực tế</option>
                </select>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label className="btn btn-sm" style={{ cursor: importing ? 'wait' : 'pointer', opacity: importing ? 0.6 : 1, background: 'var(--status-info)', color: '#fff' }}
                        title="Import file dự toán G8/G9 (.xls có sheet 'Dự thầu'). Tự tạo hạng mục thi công với đơn giá dự toán.">
                        {importing ? '⏳' : '📥 Import Dự toán'}
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            style={{ display: 'none' }}
                            disabled={importing}
                            onChange={e => { const f = e.target.files?.[0]; if (f) previewDutoan(f); e.target.value = ''; }}
                        />
                    </label>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => window.open(`/api/projects/${projectId}/budget-vs-actual/export`, '_blank')}
                        title="Tải Excel so sánh dự toán vs thực tế (cả hạng mục + vật tư)"
                    >
                        📊 Export so sánh
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Hiển thị {filtered.length}/{items.length} hạng mục
                    </span>
                </div>
            </div>

            {/* Bảng */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">🏗️ Hạng mục thi công</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Click đơn giá thực tế để chỉnh sửa (Enter để lưu, Esc để hủy)
                    </span>
                </div>

                {items.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        Chưa có hạng mục thi công nào cho dự án này. Hãy import từ file dự toán ở tab Vật tư.
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        Không có hạng mục nào khớp với bộ lọc.
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>STT</th>
                                    <th>Hạng mục</th>
                                    <th>Tên công tác</th>
                                    <th>ĐV</th>
                                    <th style={{ textAlign: 'right' }}>Khối lượng</th>
                                    <th style={{ textAlign: 'right' }}>Đơn giá dự toán</th>
                                    <th style={{ textAlign: 'right' }}>Đơn giá thực tế</th>
                                    <th style={{ textAlign: 'right' }}>Chênh lệch %</th>
                                    <th style={{ textAlign: 'right' }}>TT dự toán</th>
                                    <th style={{ textAlign: 'right' }}>TT thực tế</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((it, idx) => {
                                    const qty = Number(it.quantity) || 0;
                                    const bp = Number(it.budgetUnitPrice) || 0;
                                    const ap = Number(it.unitPrice) || 0;
                                    const budgetTotal = qty * bp;
                                    const actualTotal = qty * ap;
                                    const hasActual = ap > 0;
                                    const diffPct = hasActual && bp > 0 ? ((ap - bp) / bp) * 100 : null;
                                    const isEditing = editingId === it.id;
                                    const isSaving = savingId === it.id;
                                    const locked = !!it.isLocked;

                                    return (
                                        <tr key={it.id}>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{idx + 1}</td>
                                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{it.category || '—'}</td>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{it.product?.name || '—'}</div>
                                                {it.notes && (
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{it.notes}</div>
                                                )}
                                            </td>
                                            <td style={{ fontSize: 12 }}>{it.product?.unit || '—'}</td>
                                            <td style={{ textAlign: 'right', fontSize: 13 }}>{qty}</td>
                                            <td style={{ textAlign: 'right', fontSize: 13, fontFamily: 'monospace' }}>
                                                {bp > 0 ? fmtVND(bp) : '—'}
                                            </td>
                                            <td style={{ textAlign: 'right', fontSize: 13 }}>
                                                {isEditing ? (
                                                    <input
                                                        autoFocus
                                                        type="number"
                                                        className="form-input"
                                                        style={{ width: 130, padding: '4px 6px', fontSize: 12, textAlign: 'right' }}
                                                        value={editValue}
                                                        disabled={isSaving}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        onBlur={() => saveUnitPrice(it)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') { e.preventDefault(); saveUnitPrice(it); }
                                                            else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                                                        }}
                                                    />
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(it)}
                                                        disabled={locked}
                                                        title={locked ? 'Hạng mục đã khóa' : 'Bấm để chỉnh sửa'}
                                                        style={{
                                                            background: 'none',
                                                            border: '1px dashed transparent',
                                                            padding: '2px 6px',
                                                            borderRadius: 4,
                                                            cursor: locked ? 'not-allowed' : 'pointer',
                                                            fontFamily: 'monospace',
                                                            fontSize: 13,
                                                            fontWeight: hasActual ? 600 : 400,
                                                            color: hasActual ? 'var(--text-primary)' : 'var(--text-muted)',
                                                            opacity: locked ? 0.6 : 1,
                                                        }}
                                                        onMouseEnter={e => { if (!locked) e.currentTarget.style.borderColor = 'var(--border)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; }}
                                                    >
                                                        {hasActual ? fmtVND(ap) : '—'}
                                                    </button>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: diffPct === null ? 'var(--text-muted)' : diffColor(diffPct) }}>
                                                {diffPct === null
                                                    ? '—'
                                                    : `${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1)}%`}
                                            </td>
                                            <td style={{ textAlign: 'right', fontSize: 13, fontFamily: 'monospace' }}>
                                                {budgetTotal > 0 ? fmtVND(budgetTotal) : '—'}
                                            </td>
                                            <td style={{ textAlign: 'right', fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: hasActual ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                {hasActual ? fmtVND(actualTotal) : '—'}
                                            </td>
                                            <td>
                                                {locked ? (
                                                    <span className="badge" style={{ fontSize: 11, padding: '2px 6px', background: 'var(--bg-secondary)' }}>
                                                        🔒 Khóa
                                                    </span>
                                                ) : hasActual ? (
                                                    <span className="badge" style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(34,197,94,0.12)', color: 'var(--status-success)' }}>
                                                        ✓ Có giá TT
                                                    </span>
                                                ) : (
                                                    <span className="badge" style={{ fontSize: 11, padding: '2px 6px', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                                                        Chờ nhập giá
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                    <td colSpan={8} style={{ textAlign: 'right' }}>Tổng (theo bộ lọc):</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                        {fmtVND(filtered.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.budgetUnitPrice) || 0), 0))}
                                    </td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                        {fmtVND(filtered.reduce((s, it) => {
                                            const ap = Number(it.unitPrice) || 0;
                                            return s + (ap > 0 ? (Number(it.quantity) || 0) * ap : 0);
                                        }, 0))}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {dutoanPreview && (
                <div className="modal-overlay" onClick={() => !dutoanCommitting && setDutoanPreview(null)}>
                    <div className="modal" style={{ maxWidth: 1100, maxHeight: '94vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">📥 Xem trước file dự toán G8/G9</h3>
                            <button className="modal-close" onClick={() => !dutoanCommitting && setDutoanPreview(null)}>×</button>
                        </div>

                        <div style={{ padding: 10, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
                            💡 1 file → 2 phần độc lập: <b>hạng mục thi công</b> (từ sheet &quot;Dự thầu&quot;) + <b>vật tư</b> (từ &quot;Tổng hợp VT&quot; mục VẬT LIỆU). Vật tư tự match với Product có sẵn qua Mã chuẩn/Mã số/tên.
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8, marginBottom: 14 }}>
                            <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>{dutoanPreview.summary.scheduleItems.total}</div><div style={{ fontSize: 11 }}>🏗️ Hạng mục</div></div>
                            <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-info)' }}>{dutoanPreview.summary.materials.total}</div><div style={{ fontSize: 11 }}>🧱 Vật tư</div></div>
                            <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-success)' }}>{dutoanPreview.summary.materials.matched}</div><div style={{ fontSize: 11 }}>✅ Đã có SP</div></div>
                            <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-warning)' }}>{dutoanPreview.summary.materials.newToCreate}</div><div style={{ fontSize: 11 }}>🆕 Sẽ tạo SP</div></div>
                            <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: dutoanPreview.summary.duplicates > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{dutoanPreview.summary.duplicates}</div><div style={{ fontSize: 11 }}>⚠️ Trùng tên</div></div>
                        </div>

                        {/* Tab selector */}
                        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-color)', marginBottom: 8 }}>
                            <button onClick={() => setActivePreviewTab('schedule')}
                                style={{ padding: '8px 14px', border: 'none', background: 'none', borderBottom: activePreviewTab === 'schedule' ? '2px solid var(--primary)' : '2px solid transparent', color: activePreviewTab === 'schedule' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                                🏗️ Hạng mục ({dutoanPreview.scheduleItems.length})
                            </button>
                            <button onClick={() => setActivePreviewTab('materials')}
                                style={{ padding: '8px 14px', border: 'none', background: 'none', borderBottom: activePreviewTab === 'materials' ? '2px solid var(--primary)' : '2px solid transparent', color: activePreviewTab === 'materials' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                                🧱 Vật tư ({dutoanPreview.materials.length})
                            </button>
                            {dutoanPreview.duplicates.length > 0 && (
                                <button onClick={() => setActivePreviewTab('duplicates')}
                                    style={{ padding: '8px 14px', border: 'none', background: 'none', borderBottom: activePreviewTab === 'duplicates' ? '2px solid var(--status-danger)' : '2px solid transparent', color: activePreviewTab === 'duplicates' ? 'var(--status-danger)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                                    ⚠️ Trùng ({dutoanPreview.duplicates.length})
                                </button>
                            )}
                        </div>

                        {/* Tab content */}
                        <div className="table-container" style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 14 }}>
                            {activePreviewTab === 'schedule' && (
                                <table className="data-table" style={{ fontSize: 12 }}>
                                    <thead><tr><th>STT</th><th>Hạng mục</th><th>Tên công tác</th><th>ĐV</th><th style={{ textAlign: 'right' }}>Khối lượng</th><th style={{ textAlign: 'right' }}>Đơn giá</th><th style={{ textAlign: 'right' }}>Thành tiền</th></tr></thead>
                                    <tbody>
                                        {dutoanPreview.scheduleItems.map((it, i) => (
                                            <tr key={i}>
                                                <td>{it.stt}</td>
                                                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{it.section}</td>
                                                <td>{it.name}</td>
                                                <td>{it.unit}</td>
                                                <td style={{ textAlign: 'right' }}>{it.quantity}</td>
                                                <td style={{ textAlign: 'right' }}>{fmtVND(it.unitPrice)}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtVND(it.totalAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {activePreviewTab === 'materials' && (
                                <table className="data-table" style={{ fontSize: 12 }}>
                                    <thead><tr><th>STT</th><th>Tên vật tư</th><th>ĐV</th><th style={{ textAlign: 'right' }}>SL</th><th style={{ textAlign: 'right' }}>Đơn giá</th><th>Mã chuẩn</th><th>SP hệ thống</th></tr></thead>
                                    <tbody>
                                        {dutoanPreview.materials.map((m, i) => (
                                            <tr key={i}>
                                                <td>{m.stt}</td>
                                                <td>{m.name}</td>
                                                <td>{m.unit}</td>
                                                <td style={{ textAlign: 'right' }}>{m.quantity}</td>
                                                <td style={{ textAlign: 'right' }}>{fmtVND(m.unitPrice)}</td>
                                                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{m.maChuan || m.maSo || '—'}</td>
                                                <td>
                                                    {m.matchedProduct ? (
                                                        <span style={{ color: 'var(--status-success)', fontSize: 11 }}>✓ {m.matchedProduct.code}</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--status-warning)', fontSize: 11 }}>🆕 Tạo mới</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {activePreviewTab === 'duplicates' && (
                                <table className="data-table" style={{ fontSize: 12 }}>
                                    <thead><tr><th>Tên item</th><th style={{ textAlign: 'right' }}>Hạng mục (SL × đơn giá)</th><th style={{ textAlign: 'right' }}>Vật tư (SL × đơn giá)</th></tr></thead>
                                    <tbody>
                                        {dutoanPreview.duplicates.map((d, i) => (
                                            <tr key={i}>
                                                <td>{d.name}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {d.schedule ? <>{d.schedule.quantity} × {fmtVND(d.schedule.unitPrice)}</> : '—'}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {d.material ? <>{d.material.quantity} × {fmtVND(d.material.unitPrice)} {d.material.matched && <span style={{ color: 'var(--status-success)', fontSize: 10 }}>(✓ {d.material.productCode})</span>}</> : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Dupe strategy + replaceAll */}
                        {dutoanPreview.duplicates.length > 0 && (
                            <div style={{ padding: 12, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, marginBottom: 10 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>⚠️ Xử lý {dutoanPreview.duplicates.length} item xuất hiện ở cả 2 sheet</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                                        <input type="radio" name="dupe" value="both" checked={dupeStrategy === 'both'} onChange={() => setDupeStrategy('both')} />
                                        <div><b>Giữ cả 2</b> (mặc định) — hạng mục có vật tư trọn gói + riêng vật tư đầu vào (phản ánh BÁN vs MUA)</div>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                                        <input type="radio" name="dupe" value="schedule" checked={dupeStrategy === 'schedule'} onChange={() => setDupeStrategy('schedule')} />
                                        <div><b>Chỉ giữ Hạng mục</b> — bỏ {dutoanPreview.duplicates.length} vật tư trùng (không tính kép)</div>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                                        <input type="radio" name="dupe" value="material" checked={dupeStrategy === 'material'} onChange={() => setDupeStrategy('material')} />
                                        <div><b>Chỉ giữ Vật tư</b> — bỏ {dutoanPreview.duplicates.length} hạng mục trùng</div>
                                    </label>
                                </div>
                            </div>
                        )}

                        <div style={{ padding: 10, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 12 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                                <input type="checkbox" checked={dutoanReplaceAll} onChange={e => setDutoanReplaceAll(e.target.checked)} />
                                <span>🗑️ Xóa toàn bộ hạng mục + vật tư chưa khóa hiện tại trước khi import</span>
                            </label>
                        </div>

                        {(() => {
                            const dupeCount = dutoanPreview.duplicates.length;
                            const schedCount = dutoanPreview.scheduleItems.length - (dupeStrategy === 'material' ? dupeCount : 0);
                            const matCount = dutoanPreview.materials.length - (dupeStrategy === 'schedule' ? dupeCount : 0);
                            return (
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        Sẽ lưu: <b>{schedCount}</b> hạng mục + <b>{matCount}</b> vật tư
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-ghost" onClick={() => setDutoanPreview(null)} disabled={dutoanCommitting}>Hủy</button>
                                        <button className="btn btn-primary" onClick={commitDutoan} disabled={dutoanCommitting}>
                                            {dutoanCommitting ? '⏳ Đang lưu...' : `✓ Xác nhận import`}
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
