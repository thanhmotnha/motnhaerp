'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import OverheadExpenseModal from '@/components/finance/OverheadExpenseModal';

const fmt = v => new Intl.NumberFormat('vi-VN').format(v || 0);

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function OverheadPage() {
    const { role } = useRole();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('expenses');
    const canManage = ['giam_doc', 'ke_toan'].includes(role);

    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [expLoading, setExpLoading] = useState(true);
    const [expMonth, setExpMonth] = useState(getCurrentMonth());
    const [showExpForm, setShowExpForm] = useState(false);
    const [editExpense, setEditExpense] = useState(null);

    const [batches, setBatches] = useState([]);
    const [batchLoading, setBatchLoading] = useState(false);
    const [showBatchForm, setShowBatchForm] = useState(false);
    const [viewBatchId, setViewBatchId] = useState(null);

    // Summary tab state
    const [summaryData, setSummaryData] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
    const [summaryView, setSummaryView] = useState('by-project'); // 'by-project' | 'by-batch'

    const fetchExpenses = useCallback(async () => {
        setExpLoading(true);
        try {
            const [res, cats] = await Promise.all([
                apiFetch(`/api/overhead/expenses?month=${expMonth}&limit=200`),
                apiFetch('/api/expense-categories'),
            ]);
            setExpenses(res.data || []);
            setCategories(cats || []);
        } catch (e) { toast.error(e.message); }
        setExpLoading(false);
    }, [expMonth]);

    const fetchBatches = useCallback(async () => {
        setBatchLoading(true);
        try {
            const res = await apiFetch('/api/overhead/batches?limit=50');
            setBatches(res.data || []);
        } catch (e) { toast.error(e.message); }
        setBatchLoading(false);
    }, []);

    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
        try {
            const res = await apiFetch(`/api/overhead/summary?year=${summaryYear}`);
            setSummaryData(res);
        } catch (e) { toast.error(e.message); }
        setSummaryLoading(false);
    }, [summaryYear]);

    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
    useEffect(() => { if (activeTab === 'batches') fetchBatches(); }, [activeTab, fetchBatches]);
    useEffect(() => { if (activeTab === 'summary') fetchSummary(); }, [activeTab, fetchSummary]);

    const approveExpense = async (id) => {
        try {
            await apiFetch(`/api/overhead/expenses/${id}/approve`, { method: 'PATCH' });
            toast.success('Đã duyệt');
            fetchExpenses();
        } catch (e) { toast.error(e.message); }
    };

    const deleteExpense = async (id) => {
        if (!confirm('Xóa khoản chi phí này?')) return;
        try {
            await apiFetch(`/api/overhead/expenses/${id}`, { method: 'DELETE' });
            toast.success('Đã xóa');
            fetchExpenses();
        } catch (e) { toast.error(e.message); }
    };

    const deleteBatch = async (id) => {
        if (!confirm('Xóa đợt phân bổ này?')) return;
        try {
            await apiFetch(`/api/overhead/batches/${id}`, { method: 'DELETE' });
            toast.success('Đã xóa');
            fetchBatches();
        } catch (e) { toast.error(e.message); }
    };

    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
    const totalApproved = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
    const pendingCount = expenses.filter(e => e.status === 'draft').length;

    const statusBadge = (s) => ({
        draft: { label: 'Chờ duyệt', color: '#f59e0b' },
        approved: { label: 'Đã duyệt', color: '#22c55e' },
        confirmed: { label: 'Đã xác nhận', color: '#3b82f6' },
    }[s] || { label: s, color: '#6b7280' });

    const monthOptions = [];
    const now = new Date();
    for (let y = now.getFullYear(); y >= now.getFullYear() - 1; y--) {
        for (let m = 12; m >= 1; m--) {
            const val = `${y}-${String(m).padStart(2, '0')}`;
            monthOptions.push({ val, label: `Tháng ${m}/${y}` });
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0 }}>Chi phí chung</h2>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Ghi nhận & phân bổ chi phí vận hành công ty vào dự án</div>
                </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 24 }}>
                {[['expenses', '📋 Chi phí'], ['batches', '📊 Đợt phân bổ'], ['summary', '📈 Tổng hợp']].map(([key, label]) => (
                    <button key={key} onClick={() => setActiveTab(key)} style={{
                        padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
                        borderBottom: activeTab === key ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === key ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === key ? 600 : 400, marginBottom: -2,
                    }}>{label}</button>
                ))}
            </div>

            {activeTab === 'expenses' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                        <select className="form-select" value={expMonth} onChange={e => setExpMonth(e.target.value)} style={{ width: 180 }}>
                            {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                        </select>
                        {canManage && (
                            <button className="btn btn-primary" onClick={() => { setEditExpense(null); setShowExpForm(true); }}>+ Thêm chi phí</button>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                        {[
                            { label: 'Tổng tháng', value: fmt(totalAmount) + 'đ', color: 'var(--primary)' },
                            { label: 'Đã duyệt', value: fmt(totalApproved) + 'đ', color: '#22c55e' },
                            { label: 'Chờ duyệt', value: pendingCount + ' khoản', color: '#f59e0b' },
                        ].map(k => (
                            <div key={k.label} className="card" style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
                            </div>
                        ))}
                    </div>

                    {expLoading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                    ) : (
                        <div className="card" style={{ overflow: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr><th>Mã</th><th>Mô tả</th><th>Danh mục</th><th>Ngày</th><th style={{ textAlign: 'right' }}>Số tiền</th><th>Trạng thái</th><th>Chứng từ</th><th></th></tr>
                                </thead>
                                <tbody>
                                    {expenses.map(e => {
                                        const s = statusBadge(e.status);
                                        return (
                                            <tr key={e.id}>
                                                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{e.code}</td>
                                                <td>{e.description}</td>
                                                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{e.category?.name || '—'}</td>
                                                <td style={{ fontSize: 13 }}>{new Date(e.date).toLocaleDateString('vi-VN')}</td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(e.amount)}</td>
                                                <td><span className="badge" style={{ background: s.color + '20', color: s.color, fontSize: 11 }}>{s.label}</span></td>
                                                <td>{e.proofUrl ? <a href={e.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: 12 }}>📎 Xem</a> : '—'}</td>
                                                <td>
                                                    {canManage && e.status === 'draft' && (
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <button className="btn btn-sm btn-ghost" onClick={() => { setEditExpense(e); setShowExpForm(true); }}>Sửa</button>
                                                            <button className="btn btn-sm" style={{ color: '#22c55e', border: '1px solid #22c55e' }} onClick={() => approveExpense(e.id)}>Duyệt</button>
                                                            <button className="btn btn-sm" style={{ color: '#ef4444' }} onClick={() => deleteExpense(e.id)}>Xóa</button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {expenses.length === 0 && (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Chưa có chi phí chung trong tháng này</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'batches' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        {canManage && (
                            <button className="btn btn-primary" onClick={() => setShowBatchForm(true)}>+ Tạo đợt phân bổ</button>
                        )}
                    </div>
                    {batchLoading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                    ) : (
                        <div className="card" style={{ overflow: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr><th>Mã</th><th>Tên</th><th>Kỳ</th><th style={{ textAlign: 'right' }}>Tổng CP</th><th>Trạng thái</th><th>Ngày XN</th><th></th></tr>
                                </thead>
                                <tbody>
                                    {batches.map(b => {
                                        const s = statusBadge(b.status);
                                        return (
                                            <tr key={b.id}>
                                                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.code}</td>
                                                <td>{b.name}</td>
                                                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{b.period || '—'}</td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(b.totalAmount)}</td>
                                                <td><span className="badge" style={{ background: s.color + '20', color: s.color, fontSize: 11 }}>{s.label}</span></td>
                                                <td style={{ fontSize: 13 }}>{b.confirmedAt ? new Date(b.confirmedAt).toLocaleDateString('vi-VN') : '—'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button className="btn btn-sm btn-ghost" onClick={() => setViewBatchId(b.id)}>Xem</button>
                                                        {canManage && b.status === 'draft' && (
                                                            <button className="btn btn-sm" style={{ color: '#ef4444' }} onClick={() => deleteBatch(b.id)}>Xóa</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {batches.length === 0 && (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Chưa có đợt phân bổ</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'summary' && (
                <div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                        <select className="form-select" value={summaryYear}
                            onChange={e => setSummaryYear(Number(e.target.value))}
                            style={{ width: 120 }}>
                            {[0, 1, 2].map(offset => {
                                const y = new Date().getFullYear() - offset;
                                return <option key={y} value={y}>Năm {y}</option>;
                            })}
                        </select>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {[['by-project', '👷 Theo dự án'], ['by-batch', '📦 Theo đợt']].map(([v, label]) => (
                                <button key={v} className={`btn btn-sm${summaryView === v ? ' btn-primary' : ''}`}
                                    onClick={() => setSummaryView(v)}>{label}</button>
                            ))}
                        </div>
                    </div>

                    {summaryLoading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                    ) : !summaryData ? null : summaryView === 'by-project' ? (
                        <SummaryByProject data={summaryData} fmt={fmt} />
                    ) : (
                        <SummaryByBatch data={summaryData} fmt={fmt} />
                    )}
                </div>
            )}

            {showExpForm && (
                <OverheadExpenseModal
                    expense={editExpense}
                    categories={categories}
                    onClose={() => { setShowExpForm(false); setEditExpense(null); }}
                    onSuccess={() => { setShowExpForm(false); setEditExpense(null); fetchExpenses(); }}
                    toast={toast}
                />
            )}
            {showBatchForm && (
                <BatchCreateForm
                    onClose={() => setShowBatchForm(false)}
                    onSuccess={() => { setShowBatchForm(false); fetchBatches(); }}
                    toast={toast}
                />
            )}
            {viewBatchId && (
                <BatchDetailModal
                    batchId={viewBatchId}
                    onClose={() => { setViewBatchId(null); fetchBatches(); }}
                    toast={toast}
                    canManage={canManage}
                />
            )}
        </div>
    );
}

function SummaryByProject({ data, fmt }) {
    const { batches, projects } = data;
    if (!batches.length) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Chưa có đợt phân bổ nào được xác nhận trong năm này.
        </div>
    );

    // Build lookup: projectId → batchId → allocation
    const lookup = {};
    for (const b of batches) {
        for (const a of (b.allocations ?? [])) {
            if (!lookup[a.projectId]) lookup[a.projectId] = {};
            lookup[a.projectId][b.id] = a;
        }
    }

    return (
        <div className="card" style={{ overflow: 'auto' }}>
            <table className="data-table">
                <thead>
                    <tr>
                        <th style={{ minWidth: 180 }}>Dự án</th>
                        {batches.map(b => (
                            <th key={b.id} style={{ textAlign: 'right', minWidth: 130 }}>
                                {b.code}
                                {b.period && <div style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}>{b.period}</div>}
                            </th>
                        ))}
                        <th style={{ textAlign: 'right', minWidth: 130, color: 'var(--primary)' }}>Tổng cộng</th>
                    </tr>
                </thead>
                <tbody>
                    {projects.map(p => (
                        <tr key={p.id}>
                            <td>
                                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{p.code}</span>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.name}</div>
                            </td>
                            {batches.map(b => {
                                const a = lookup[p.id]?.[b.id];
                                return (
                                    <td key={b.id} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                        {a ? (
                                            <>
                                                {fmt(a.amount)}đ
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.ratio}%</div>
                                            </>
                                        ) : '—'}
                                    </td>
                                );
                            })}
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                                {fmt(p.totalAllocated)}đ
                            </td>
                        </tr>
                    ))}
                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                        <td>Tổng đợt</td>
                        {batches.map(b => (
                            <td key={b.id} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                {fmt(b.totalAmount)}đ
                            </td>
                        ))}
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--primary)' }}>
                            {fmt(batches.reduce((s, b) => s + b.totalAmount, 0))}đ
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function SummaryByBatch({ data, fmt }) {
    const { batches, projects } = data;
    if (!batches.length) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Chưa có đợt phân bổ nào được xác nhận trong năm này.
        </div>
    );

    // Build lookup: batchId → projectId → allocation
    const lookup = {};
    for (const b of batches) {
        lookup[b.id] = {};
        for (const a of (b.allocations ?? [])) {
            lookup[b.id][a.projectId] = a;
        }
    }

    return (
        <div className="card" style={{ overflow: 'auto' }}>
            <table className="data-table">
                <thead>
                    <tr>
                        <th style={{ minWidth: 140 }}>Đợt phân bổ</th>
                        <th style={{ minWidth: 100 }}>Kỳ</th>
                        {projects.map(p => (
                            <th key={p.id} style={{ textAlign: 'right', minWidth: 120 }}>
                                {p.code}
                                <div style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}>{p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name}</div>
                            </th>
                        ))}
                        <th style={{ textAlign: 'right', minWidth: 120, color: 'var(--primary)' }}>Tổng đợt</th>
                    </tr>
                </thead>
                <tbody>
                    {batches.map(b => (
                        <tr key={b.id}>
                            <td style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>{b.code}</td>
                            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{b.period || '—'}</td>
                            {projects.map(p => {
                                const a = lookup[b.id]?.[p.id];
                                return (
                                    <td key={p.id} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                        {a ? (
                                            <>
                                                {fmt(a.amount)}đ
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.ratio}%</div>
                                            </>
                                        ) : '—'}
                                    </td>
                                );
                            })}
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                                {fmt(b.totalAmount)}đ
                            </td>
                        </tr>
                    ))}
                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                        <td colSpan={2}>Tổng theo dự án</td>
                        {projects.map(p => (
                            <td key={p.id} style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--primary)' }}>
                                {fmt(p.totalAllocated)}đ
                            </td>
                        ))}
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--primary)' }}>
                            {fmt(batches.reduce((s, b) => s + b.totalAmount, 0))}đ
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function BatchCreateForm({ onClose, onSuccess, toast }) {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ name: '', period: getCurrentMonth(), notes: '' });
    const [approvedExpenses, setApprovedExpenses] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loadingExp, setLoadingExp] = useState(true);
    const [allocations, setAllocations] = useState([]);
    const [calculating, setCalculating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [createdBatchId, setCreatedBatchId] = useState(null);
    const [selectedTotal, setSelectedTotal] = useState(0);

    useEffect(() => {
        setLoadingExp(true);
        apiFetch(`/api/overhead/expenses?status=approved&month=${form.period}&limit=200`)
            .then(res => { setApprovedExpenses(res.data || []); setLoadingExp(false); })
            .catch(e => { toast.error(e.message); setLoadingExp(false); });
    }, [form.period]);

    useEffect(() => {
        const total = approvedExpenses.filter(e => selectedIds.includes(e.id)).reduce((s, e) => s + e.amount, 0);
        setSelectedTotal(total);
    }, [selectedIds, approvedExpenses]);

    const toggleId = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const toggleAll = () => setSelectedIds(selectedIds.length === approvedExpenses.length ? [] : approvedExpenses.map(e => e.id));

    const createAndCalculate = async () => {
        if (!form.name.trim()) return toast.error('Vui lòng nhập tên đợt');
        if (selectedIds.length === 0) return toast.error('Chọn ít nhất 1 khoản chi phí');
        setSaving(true);
        try {
            const batch = await apiFetch('/api/overhead/batches', {
                method: 'POST',
                body: JSON.stringify({ ...form, expenseIds: selectedIds }),
            });
            setCreatedBatchId(batch.id);
            setCalculating(true);
            const calc = await apiFetch(`/api/overhead/batches/${batch.id}/calculate`, { method: 'POST' });
            setAllocations(calc.suggestions || []);
            setStep(2);
        } catch (e) { toast.error(e.message); }
        setSaving(false);
        setCalculating(false);
    };

    const updateAllocation = (projectId, ratio) => {
        const newRatio = parseFloat(ratio) || 0;
        setAllocations(prev => prev.map(a =>
            a.projectId === projectId
                ? { ...a, ratio: newRatio, amount: parseFloat(((newRatio / 100) * selectedTotal).toFixed(0)), isOverride: true }
                : a
        ));
    };

    const confirmBatch = async () => {
        if (!createdBatchId) return;
        setSaving(true);
        try {
            await apiFetch(`/api/overhead/batches/${createdBatchId}/confirm`, {
                method: 'POST',
                body: JSON.stringify({ allocations }),
            });
            toast.success('Đã xác nhận đợt phân bổ');
            onSuccess();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={ev => ev.stopPropagation()} style={{ maxWidth: 680 }}>
                <h3 style={{ marginTop: 0 }}>Tạo đợt phân bổ — Bước {step}/2</h3>

                {step === 1 && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Tên đợt *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Chi phí chung tháng 3/2026" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Kỳ</label>
                                <input className="form-input" type="month" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                            <label className="form-label">Ghi chú</label>
                            <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Chọn chi phí đã duyệt trong kỳ ({approvedExpenses.length}):</div>
                        {loadingExp ? (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : (
                            <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12 }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 32 }}><input type="checkbox" checked={selectedIds.length === approvedExpenses.length && approvedExpenses.length > 0} onChange={toggleAll} /></th>
                                            <th>Mã</th><th>Mô tả</th><th>Danh mục</th><th style={{ textAlign: 'right' }}>Số tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {approvedExpenses.map(e => (
                                            <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => toggleId(e.id)}>
                                                <td><input type="checkbox" checked={selectedIds.includes(e.id)} onChange={() => {}} /></td>
                                                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.code}</td>
                                                <td>{e.description}</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.category?.name || '—'}</td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(e.amount)}</td>
                                            </tr>
                                        ))}
                                        {approvedExpenses.length === 0 && (
                                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Không có chi phí đã duyệt trong kỳ này</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 600 }}>Đã chọn: {fmt(selectedTotal)}đ ({selectedIds.length} khoản)</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn" onClick={onClose}>Hủy</button>
                                <button className="btn btn-primary" onClick={createAndCalculate} disabled={saving || selectedIds.length === 0}>
                                    {saving ? 'Đang xử lý...' : 'Tiếp → Phân bổ'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                            Tổng phân bổ: <strong style={{ color: 'var(--text-primary)' }}>{fmt(selectedTotal)}đ</strong>. Tỷ lệ theo doanh thu/giá trị hợp đồng dự án.
                        </div>
                        {calculating ? (
                            <div style={{ padding: 30, textAlign: 'center' }}>Đang tính tỷ lệ...</div>
                        ) : (
                            <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Dự án</th><th style={{ textAlign: 'right' }}>Doanh thu</th><th style={{ textAlign: 'right', width: 90 }}>Tỷ lệ %</th><th style={{ textAlign: 'right' }}>Phân bổ (đ)</th></tr>
                                    </thead>
                                    <tbody>
                                        {allocations.map(a => (
                                            <tr key={a.projectId}>
                                                <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{a.projectCode}</span> {a.projectName}</td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{fmt(a.revenue)}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <input
                                                        type="number" min="0" max="100" step="0.01"
                                                        value={a.ratio}
                                                        onChange={e => updateAllocation(a.projectId, e.target.value)}
                                                        style={{ width: 70, textAlign: 'right', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13 }}
                                                    />
                                                    {a.isOverride && <span style={{ color: '#f59e0b', fontSize: 10, marginLeft: 2 }}>*</span>}
                                                </td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(a.amount)}</td>
                                            </tr>
                                        ))}
                                        {allocations.length === 0 && (
                                            <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Không có dự án để phân bổ</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <button className="btn" onClick={() => setStep(1)}>← Quay lại</button>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn" onClick={onClose}>Lưu nháp & đóng</button>
                                <button className="btn btn-primary" onClick={confirmBatch} disabled={saving || allocations.length === 0}>
                                    {saving ? 'Đang xác nhận...' : '✓ Xác nhận phân bổ'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function BatchDetailModal({ batchId, onClose, toast, canManage }) {
    const [batch, setBatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allocations, setAllocations] = useState([]);
    const [recalculating, setRecalculating] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const loadBatch = useCallback(async () => {
        try {
            const b = await apiFetch(`/api/overhead/batches/${batchId}`);
            setBatch(b);
            setAllocations(b.allocations || []);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, [batchId]);

    useEffect(() => { loadBatch(); }, [loadBatch]);

    const recalculate = async () => {
        setRecalculating(true);
        try {
            const calc = await apiFetch(`/api/overhead/batches/${batchId}/calculate`, { method: 'POST' });
            setAllocations(calc.suggestions || []);
        } catch (e) { toast.error(e.message); }
        setRecalculating(false);
    };

    const updateAllocation = (pid, ratio) => {
        const newRatio = parseFloat(ratio) || 0;
        const totalAmount = batch?.totalAmount || 0;
        setAllocations(prev => prev.map(a => {
            const projectId = a.projectId || a.project?.id;
            return projectId === pid
                ? { ...a, ratio: newRatio, amount: parseFloat(((newRatio / 100) * totalAmount).toFixed(0)), isOverride: true }
                : a;
        }));
    };

    const confirmBatch = async () => {
        if (!confirm('Xác nhận đợt phân bổ? Sau khi xác nhận sẽ không sửa được nữa.')) return;
        setConfirming(true);
        try {
            const allocationData = allocations.map(a => ({
                projectId: a.projectId || a.project?.id,
                ratio: a.ratio,
                amount: a.amount,
                isOverride: a.isOverride || false,
                notes: a.notes || '',
            }));
            await apiFetch(`/api/overhead/batches/${batchId}/confirm`, {
                method: 'POST',
                body: JSON.stringify({ allocations: allocationData }),
            });
            toast.success('Đã xác nhận phân bổ');
            onClose();
        } catch (e) { toast.error(e.message); }
        setConfirming(false);
    };

    if (loading) return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={ev => ev.stopPropagation()} style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
        </div>
    );

    const isConfirmed = batch?.status === 'confirmed';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={ev => ev.stopPropagation()} style={{ maxWidth: 720 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h3 style={{ margin: 0 }}>{batch?.code} — {batch?.name}</h3>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Kỳ: {batch?.period || 'Thủ công'} | Tổng: {fmt(batch?.totalAmount)}đ
                            {isConfirmed && <span style={{ marginLeft: 8, color: '#3b82f6' }}>✓ Đã xác nhận</span>}
                        </div>
                    </div>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }} onClick={onClose}>✕</button>
                </div>

                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Chi phí trong đợt ({batch?.items?.length || 0}):</div>
                <div style={{ maxHeight: 140, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
                    <table className="data-table">
                        <thead><tr><th>Mã</th><th>Mô tả</th><th>Danh mục</th><th style={{ textAlign: 'right' }}>Số tiền</th></tr></thead>
                        <tbody>
                            {(batch?.items || []).map(item => (
                                <tr key={item.id}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.expense.code}</td>
                                    <td>{item.expense.description}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.expense.category?.name || '—'}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Phân bổ dự án ({allocations.length}):</div>
                    {!isConfirmed && canManage && (
                        <button className="btn btn-ghost btn-sm" onClick={recalculate} disabled={recalculating}>
                            {recalculating ? 'Đang tính...' : '↺ Tính lại tỷ lệ'}
                        </button>
                    )}
                </div>
                <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
                    <table className="data-table">
                        <thead><tr><th>Dự án</th><th style={{ textAlign: 'right', width: 90 }}>Tỷ lệ %</th><th style={{ textAlign: 'right' }}>Phân bổ (đ)</th><th style={{ width: 24 }}></th></tr></thead>
                        <tbody>
                            {allocations.map(a => {
                                const pid = a.projectId || a.project?.id;
                                const pname = a.projectName || (a.project ? `${a.project.code} — ${a.project.name}` : pid);
                                return (
                                    <tr key={pid}>
                                        <td>{pname}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            {!isConfirmed && canManage ? (
                                                <input
                                                    type="number" min="0" max="100" step="0.01"
                                                    value={a.ratio}
                                                    onChange={e => updateAllocation(pid, e.target.value)}
                                                    style={{ width: 70, textAlign: 'right', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13 }}
                                                />
                                            ) : `${a.ratio}%`}
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(a.amount)}</td>
                                        <td style={{ color: '#f59e0b', fontSize: 11 }}>{a.isOverride ? '✏️' : ''}</td>
                                    </tr>
                                );
                            })}
                            {allocations.length === 0 && (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)' }}>
                                    {isConfirmed ? 'Chưa có phân bổ' : 'Bấm "Tính lại tỷ lệ" để tạo phân bổ'}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn" onClick={onClose}>Đóng</button>
                    {!isConfirmed && canManage && allocations.length > 0 && (
                        <button className="btn btn-primary" onClick={confirmBatch} disabled={confirming}>
                            {confirming ? 'Đang xác nhận...' : '✓ Xác nhận phân bổ'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
