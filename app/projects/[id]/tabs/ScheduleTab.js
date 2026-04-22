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

    // Import Dự toán G8/G9
    const [importing, setImporting] = useState(false);
    const [dutoanPreview, setDutoanPreview] = useState(null);
    const [dutoanFile, setDutoanFile] = useState(null);
    const [dutoanReplaceAll, setDutoanReplaceAll] = useState(false);
    const [dutoanCommitting, setDutoanCommitting] = useState(false);

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
            const res = await fetch(`/api/projects/${projectId}/material-plans/import-dutoan`, { method: 'POST', body: fd });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Lỗi lưu');
            toast.showToast(`Đã lưu ${json.imported.scheduleItems} hạng mục thi công`, 'success');
            setDutoanPreview(null);
            setDutoanFile(null);
            setDutoanReplaceAll(false);
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
                    <div className="modal" style={{ maxWidth: 960, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">📥 Xem trước file dự toán</h3>
                            <button className="modal-close" onClick={() => !dutoanCommitting && setDutoanPreview(null)}>×</button>
                        </div>

                        <div style={{ padding: 10, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
                            💡 File dự toán chỉ tạo <b>hạng mục thi công</b> để theo dõi tiến độ + chênh lệch đơn giá. Vật tư đặt hàng dùng nút <b>📂 Import Excel</b> ở tab Vật tư với file vật tư riêng.
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 16 }}>
                            <div className="stat-card"><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{dutoanPreview.summary.scheduleItems.total}</div><div style={{ fontSize: 12 }}>🏗️ Hạng mục thi công</div></div>
                            <div className="stat-card"><div style={{ fontSize: 18, fontWeight: 700 }}>{fmtVND(dutoanPreview.summary.scheduleItems.totalBudget)}</div><div style={{ fontSize: 12 }}>💰 Tổng dự toán</div></div>
                        </div>

                        <details open style={{ marginBottom: 16 }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '6px 0' }}>🏗️ Hạng mục thi công ({dutoanPreview.scheduleItems.length})</summary>
                            <div className="table-container" style={{ maxHeight: 320, overflowY: 'auto' }}>
                                <table className="data-table" style={{ fontSize: 12 }}>
                                    <thead><tr><th>STT</th><th>Hạng mục</th><th>Tên công tác</th><th>ĐV</th><th style={{ textAlign: 'right' }}>Khối lượng</th><th style={{ textAlign: 'right' }}>Đơn giá dự toán</th><th style={{ textAlign: 'right' }}>Thành tiền</th></tr></thead>
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
                            </div>
                        </details>

                        <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 12 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                                <input type="checkbox" checked={dutoanReplaceAll} onChange={e => setDutoanReplaceAll(e.target.checked)} disabled={items.length === 0} />
                                <span>🗑️ Xóa {items.filter(m => !m.isLocked).length} hạng mục chưa khóa hiện tại trước khi import</span>
                            </label>
                            {items.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Dự án chưa có hạng mục thi công</div>}
                        </div>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setDutoanPreview(null)} disabled={dutoanCommitting}>Hủy</button>
                            <button className="btn btn-primary" onClick={commitDutoan} disabled={dutoanCommitting}>
                                {dutoanCommitting ? '⏳ Đang lưu...' : `✓ Xác nhận import (${dutoanPreview.summary.scheduleItems.total} hạng mục)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
