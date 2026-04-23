'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const SERVICE_CATEGORIES = [
    { key: 'Thiết kế công năng', icon: '📐' },
    { key: 'Thiết kế KT-KC', icon: '🏛️' },
    { key: 'Thiết kế 3D', icon: '🎨' },
    { key: 'Tư vấn thuê ngoài', icon: '💼' },
];
const CATEGORY_KEYS = SERVICE_CATEGORIES.map(c => c.key);

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + 'đ';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

function statusOf(total, paid) {
    if (paid >= total - 0.01) return { label: 'Đã trả', color: '#22c55e', bg: '#dcfce7' };
    if (paid > 0) return { label: 'Trả 1 phần', color: '#d97706', bg: '#fef3c7' };
    return { label: 'Chưa trả', color: '#dc2626', bg: '#fee2e2' };
}

export default function ServiceExpensesPage() {
    const toast = useToast();
    const [tab, setTab] = useState('debts'); // 'debts' | 'expenses'
    const [debts, setDebts] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [projects, setProjects] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [payModal, setPayModal] = useState(null);
    const [payAmount, setPayAmount] = useState('');

    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [paying, setPaying] = useState(false);
    const [importing, setImporting] = useState(false);

    // Search + filter state
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all | open | partial | paid

    function emptyForm() {
        return {
            category: CATEGORY_KEYS[0],
            recipientType: 'NCC', // 'NCC' | 'Thầu phụ'
            recipientId: '',
            recipientName: '',
            amount: '',
            invoiceNo: '',
            date: new Date().toISOString().slice(0, 10),
            notes: '',
            allocations: [{ projectId: '', ratioPct: 100 }], // {projectId, ratioPct: 0-100}
        };
    }

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [debtRes, projRes, supRes, conRes] = await Promise.all([
                apiFetch('/api/service-debts'),
                apiFetch('/api/projects?limit=500'),
                apiFetch('/api/suppliers?limit=500'),
                apiFetch('/api/contractors?limit=500'),
            ]);
            setDebts(debtRes?.debts || []);
            setExpenses(debtRes?.expenses || []);
            setProjects(projRes?.data || projRes || []);
            setSuppliers(supRes?.data || supRes || []);
            setContractors(conRes?.data || conRes || []);
        } catch (e) {
            toast.error(e.message || 'Lỗi tải dữ liệu');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const addAllocation = () => {
        setForm(f => ({ ...f, allocations: [...f.allocations, { projectId: '', ratioPct: 0 }] }));
    };
    const removeAllocation = (idx) => {
        setForm(f => ({ ...f, allocations: f.allocations.filter((_, i) => i !== idx) }));
    };
    const updateAllocation = (idx, key, value) => {
        setForm(f => ({ ...f, allocations: f.allocations.map((a, i) => i === idx ? { ...a, [key]: value } : a) }));
    };
    const balanceAllocations = () => {
        // chia đều 100% cho các allocation
        const n = form.allocations.length;
        if (n === 0) return;
        const base = Math.floor(100 / n);
        const rem = 100 - base * n;
        const newAllocs = form.allocations.map((a, i) => ({ ...a, ratioPct: base + (i < rem ? 1 : 0) }));
        setForm(f => ({ ...f, allocations: newAllocs }));
    };

    const totalRatio = form.allocations.reduce((s, a) => s + (Number(a.ratioPct) || 0), 0);

    const submit = async () => {
        const amount = parseFloat(form.amount);
        if (!amount || amount <= 0) return toast.error('Nhập số tiền');
        if (!form.recipientId) return toast.error('Chọn nhà cung cấp/thầu phụ');
        if (form.allocations.length === 0) return toast.error('Cần ít nhất 1 dự án');
        if (form.allocations.some(a => !a.projectId)) return toast.error('Chọn dự án cho mọi dòng phân bổ');
        if (Math.abs(totalRatio - 100) > 0.1) return toast.error(`Tổng phân bổ phải = 100% (hiện ${totalRatio}%)`);
        const ids = form.allocations.map(a => a.projectId);
        if (new Set(ids).size !== ids.length) return toast.error('Mỗi dự án chỉ chọn 1 lần');

        const payload = {
            recipientType: form.recipientType,
            recipientId: form.recipientId,
            recipientName: form.recipientName,
            category: form.category,
            amount,
            invoiceNo: form.invoiceNo || '',
            date: form.date ? new Date(form.date).toISOString() : undefined,
            notes: form.notes || '',
            allocations: form.allocations.map(a => ({
                projectId: a.projectId,
                ratio: Number(a.ratioPct) / 100,
            })),
        };
        setSaving(true);
        try {
            await apiFetch('/api/service-debts', { method: 'POST', body: JSON.stringify(payload) });
            toast.success('Đã ghi nhận công nợ dịch vụ');
            setShowModal(false);
            setForm(emptyForm());
            load();
        } catch (e) {
            toast.error(e.message || 'Lỗi lưu');
        } finally { setSaving(false); }
    };

    const pay = async () => {
        if (!payModal) return;
        const n = parseFloat(payAmount);
        if (!n || n <= 0) return toast.error('Nhập số tiền');
        const remaining = payModal.totalAmount - payModal.paidAmount;
        if (n > remaining + 0.01) return toast.error(`Vượt số còn nợ (${fmt(remaining)})`);
        setPaying(true);
        try {
            const isNCC = payModal.recipientType === 'NCC';
            const url = isNCC
                ? `/api/debts/supplier/${payModal.id}/pay`
                : `/api/debts/contractor/${payModal.id}/pay`;
            await apiFetch(url, { method: 'POST', body: JSON.stringify({ amount: n, date: new Date().toISOString() }) });
            toast.success(`Đã trả ${fmt(n)} — chi phí đã phân bổ vào dự án`);
            setPayModal(null);
            setPayAmount('');
            load();
        } catch (e) {
            toast.error(e.message || 'Lỗi thanh toán');
        } finally { setPaying(false); }
    };

    const projectName = (id) => projects.find(p => p.id === id)?.name || id;

    // Totals
    const pendingDebts = debts.filter(d => d.status !== 'paid');
    const totalDebt = pendingDebts.reduce((s, d) => s + (d.totalAmount - d.paidAmount), 0);
    const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    // Derive status key for a debt
    const debtStatusKey = (d) => {
        if (d.paidAmount >= d.totalAmount - 0.01) return 'paid';
        if (d.paidAmount > 0) return 'partial';
        return 'open';
    };

    // Apply search + status filter to debts
    const q = search.trim().toLowerCase();
    const filteredDebts = debts.filter(d => {
        if (statusFilter !== 'all' && debtStatusKey(d) !== statusFilter) return false;
        if (!q) return true;
        const hay = `${d.recipientName || ''} ${d.description || ''}`.toLowerCase();
        return hay.includes(q);
    });

    // Apply search to expenses (by description/recipient in case present)
    const filteredExpenses = expenses.filter(e => {
        if (!q) return true;
        const hay = `${e.description || ''} ${e.recipientName || ''} ${e.category || ''}`.toLowerCase();
        return hay.includes(q);
    });

    const handleImportExcel = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // cho phép chọn lại cùng file
        if (!file) return;
        setImporting(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/service-debts/import-excel', {
                method: 'POST',
                body: fd,
                credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.error || data?.message || 'Lỗi import');
            }
            const imported = data.imported ?? 0;
            const total = data.total ?? 0;
            const errs = Array.isArray(data.errors) ? data.errors : [];
            if (errs.length > 0) {
                toast.warning(`Đã import ${imported}/${total} dòng · ${errs.length} lỗi`);
                console.warn('Import errors:', errs);
            } else {
                toast.success(`Đã import ${imported}/${total} dòng`);
            }
            load();
        } catch (err) {
            toast.error(err.message || 'Lỗi import Excel');
        } finally {
            setImporting(false);
        }
    };

    const handleDeleteExpense = async (e) => {
        const msg = [
            `Xóa chứng từ ${e.code} (${fmt(e.amount)})?`,
            '',
            'Hệ thống sẽ tự động:',
            '  • Giảm "Đã trả" của công nợ tương ứng',
            '  • Cập nhật trạng thái công nợ (open/partial)',
            '  • Xóa dòng chi phí ở các dự án được phân bổ',
            '',
            'Thao tác KHÔNG thể undo. Tiếp tục?',
        ].join('\n');
        if (!window.confirm(msg)) return;
        try {
            const res = await apiFetch(`/api/project-expenses?id=${e.id}`, { method: 'DELETE' });
            const reverted = res?.revertedPayments || 0;
            toast.success(
    reverted > 0
                    ? `Đã xóa chứng từ — revert ${reverted} khoản thanh toán, công nợ đã cập nhật`
                    : 'Đã xóa chứng từ',
);
            load();
        } catch (err) {
            toast.error(err.message || 'Lỗi xóa chứng từ');
        }
    };

    const handleDeleteDebt = async (d) => {
        const hasPaid = (d.paidAmount || 0) > 0;
        const msg = [
            `Xóa công nợ ${d.code || ''}?`,
            `Bên: ${d.recipientName}`,
            `Số tiền: ${fmt(d.totalAmount)}`,
            hasPaid ? `Đã trả: ${fmt(d.paidAmount)} (sẽ revert)` : '',
            '',
            'Hệ thống sẽ tự động:',
            '  • Xóa tất cả chứng từ chi phí đã sinh ra',
            '  • Xóa tất cả allocations vào dự án',
            '  • Xóa ghi chép thanh toán + sổ cái ledger',
            '  • Xóa công nợ',
            '',
            'Thao tác KHÔNG thể undo. Tiếp tục?',
        ].filter(Boolean).join('\n');
        if (!window.confirm(msg)) return;
        try {
            const res = await apiFetch(`/api/service-debts/${d.id}`, { method: 'DELETE' });
            const msg2 = res?.deletedExpenses || res?.deletedPayments
                ? `Đã xóa công nợ — revert ${res.deletedPayments || 0} thanh toán + ${res.deletedExpenses || 0} chứng từ`
                : 'Đã xóa công nợ';
            toast.success(msg2);
            load();
        } catch (e) {
            toast.error(e.message || 'Lỗi xóa');
        }
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>💼 Chi phí dịch vụ (cash-basis)</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
                        Nhập hóa đơn → <b>Công nợ</b>. Khi thanh toán → tự sinh <b>Chi phí dự án</b> phân bổ theo %.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-ghost"
                        onClick={() => window.open('/api/service-debts/import-excel/template', '_blank')}
                        title="Tải file Excel mẫu để nhập công nợ dịch vụ"
                    >
                        📥 File mẫu
                    </button>
                    <label
                        className="btn btn-ghost"
                        style={{ cursor: importing ? 'wait' : 'pointer', opacity: importing ? 0.6 : 1 }}
                        title="Import công nợ từ file Excel"
                    >
                        {importing ? '⏳ Đang import...' : '📂 Import Excel'}
                        <input
                            type="file"
                            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                            style={{ display: 'none' }}
                            onChange={handleImportExcel}
                            disabled={importing}
                        />
                    </label>
                    <button
                        className="btn btn-ghost"
                        onClick={() => window.open('/api/service-debts/export', '_blank')}
                        title="Xuất báo cáo Excel"
                    >
                        📊 Export Excel
                    </button>
                    <button className="btn btn-primary" onClick={() => { setForm(emptyForm()); setShowModal(true); }}>
                        + Ghi nhận công nợ dịch vụ
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                <StatCard label="Còn nợ" value={fmt(totalDebt)} color="#dc2626" hint={`${pendingDebts.length} khoản`} />
                <StatCard label="Đã chi (thực tế)" value={fmt(totalExpense)} color="#22c55e" hint={`${expenses.length} chi phí`} />
                <StatCard label="Tổng công nợ" value={fmt(debts.reduce((s, d) => s + d.totalAmount, 0))} color="#234093" hint={`${debts.length} khoản`} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
                <TabBtn label={`📋 Công nợ (${debts.length})`} active={tab === 'debts'} onClick={() => setTab('debts')} />
                <TabBtn label={`💰 Đã chi (${expenses.length})`} active={tab === 'expenses'} onClick={() => setTab('expenses')} />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                <input
                    type="search"
                    className="form-input"
                    placeholder="🔍 Tìm theo bên cung cấp / mô tả..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ flex: '1 1 260px', maxWidth: 380 }}
                />
                {tab === 'debts' && (
                    <select
                        className="form-select"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{ maxWidth: 180 }}
                        title="Lọc theo trạng thái"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="open">Chưa trả</option>
                        <option value="partial">Trả 1 phần</option>
                        <option value="paid">Đã trả</option>
                    </select>
                )}
                {(search || statusFilter !== 'all') && (
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setSearch(''); setStatusFilter('all'); }}
                        style={{ fontSize: 12 }}
                    >
                        ✕ Xóa lọc
                    </button>
                )}
                <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                    {tab === 'debts'
                        ? `${filteredDebts.length}/${debts.length} công nợ`
                        : `${filteredExpenses.length}/${expenses.length} chi phí`}
                </div>
            </div>

            {tab === 'debts' && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                    🗑️ Xóa công nợ lập sai — kể cả đã thanh toán 1 phần. Hệ thống tự revert ghi chép thanh toán, chứng từ + allocations.
                </div>
            )}

            {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> : (
                tab === 'debts' ? (
                    <DebtsTable
                        debts={filteredDebts}
                        projectName={projectName}
                        onPay={d => { setPayModal(d); setPayAmount(''); }}
                        onDelete={handleDeleteDebt}
                    />
                ) : (
                    <ExpensesTable expenses={filteredExpenses} onDelete={handleDeleteExpense} />
                )
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 720, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Ghi nhận công nợ dịch vụ</h3>
                            <button className="modal-close" onClick={() => !saving && setShowModal(false)}>×</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div className="form-group">
                                    <label className="form-label">Loại dịch vụ *</label>
                                    <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        {SERVICE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.key}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày hóa đơn</label>
                                    <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Bên cung cấp *</label>
                                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                                    <button type="button" className={`btn btn-sm ${form.recipientType === 'NCC' ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => setForm({ ...form, recipientType: 'NCC', recipientId: '', recipientName: '' })}>Nhà cung cấp</button>
                                    <button type="button" className={`btn btn-sm ${form.recipientType === 'Thầu phụ' ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => setForm({ ...form, recipientType: 'Thầu phụ', recipientId: '', recipientName: '' })}>Thầu phụ</button>
                                </div>
                                <select className="form-select" value={form.recipientId}
                                    onChange={e => {
                                        const list = form.recipientType === 'NCC' ? suppliers : contractors;
                                        const item = list.find(x => x.id === e.target.value);
                                        setForm({ ...form, recipientId: e.target.value, recipientName: item?.name || '' });
                                    }}>
                                    <option value="">— Chọn —</option>
                                    {(form.recipientType === 'NCC' ? suppliers : contractors).map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div className="form-group">
                                    <label className="form-label">Số tiền hóa đơn (VND) *</label>
                                    <input type="number" className="form-input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Số hóa đơn</label>
                                    <input className="form-input" value={form.invoiceNo} onChange={e => setForm({ ...form, invoiceNo: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Phân bổ vào dự án * <span style={{ fontSize: 11, color: totalRatio === 100 ? 'var(--status-success)' : 'var(--status-warning)' }}>({totalRatio}%)</span></span>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={balanceAllocations} style={{ fontSize: 11 }}>⚖️ Chia đều</button>
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {form.allocations.map((a, idx) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 40px', gap: 6, alignItems: 'center' }}>
                                            <select className="form-select" value={a.projectId} onChange={e => updateAllocation(idx, 'projectId', e.target.value)}>
                                                <option value="">— Chọn dự án —</option>
                                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            <div style={{ position: 'relative' }}>
                                                <input type="number" className="form-input" value={a.ratioPct}
                                                    onChange={e => updateAllocation(idx, 'ratioPct', Number(e.target.value) || 0)}
                                                    style={{ paddingRight: 24 }} />
                                                <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                                                {fmt((Number(form.amount) || 0) * (Number(a.ratioPct) || 0) / 100)}
                                            </div>
                                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeAllocation(idx)} disabled={form.allocations.length === 1}>×</button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={addAllocation} style={{ marginTop: 6 }}>+ Thêm dự án</button>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            </div>

                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Hủy</button>
                                <button className="btn btn-primary" onClick={submit} disabled={saving}>
                                    {saving ? 'Đang lưu...' : 'Lưu công nợ'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {payModal && (
                <div className="modal-overlay" onClick={() => !paying && setPayModal(null)}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Thanh toán công nợ</h3>
                            <button className="modal-close" onClick={() => !paying && setPayModal(null)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                                <div><b>{payModal.description}</b></div>
                                <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                                    Tổng: {fmt(payModal.totalAmount)} · Đã trả: {fmt(payModal.paidAmount)} · Còn nợ: <b style={{ color: 'var(--status-danger)' }}>{fmt(payModal.totalAmount - payModal.paidAmount)}</b>
                                </div>
                                {Array.isArray(payModal.allocationPlan) && (
                                    <div style={{ marginTop: 6, fontSize: 11 }}>
                                        Phân bổ: {payModal.allocationPlan.map(a => `${projectName(a.projectId)} (${Math.round(a.ratio * 100)}%)`).join(' · ')}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Số tiền trả lần này (VND) *</label>
                                <input type="number" className="form-input" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    ⚡ Sau khi trả, chi phí sẽ tự phân bổ vào dự án theo %.
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setPayModal(null)} disabled={paying}>Hủy</button>
                                <button className="btn btn-primary" onClick={pay} disabled={paying}>
                                    {paying ? 'Đang trả...' : 'Xác nhận trả'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DebtsTable({ debts, projectName, onPay, onDelete }) {
    if (debts.length === 0) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có công nợ phù hợp</div>;
    }
    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Mã</th>
                        <th>Ngày</th>
                        <th>Loại</th>
                        <th>Bên cung cấp</th>
                        <th>Phân bổ</th>
                        <th style={{ textAlign: 'right' }}>Tổng</th>
                        <th style={{ textAlign: 'right' }}>Đã trả</th>
                        <th style={{ textAlign: 'right' }}>Còn nợ</th>
                        <th>Trạng thái</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {debts.map(d => {
                        const remaining = d.totalAmount - d.paidAmount;
                        const s = statusOf(d.totalAmount, d.paidAmount);
                        return (
                            <tr key={d.id}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{d.code}</td>
                                <td style={{ fontSize: 12 }}>{fmtDate(d.date)}</td>
                                <td style={{ fontSize: 12 }}>{d.serviceCategory || '—'}</td>
                                <td>
                                    <div style={{ fontSize: 13 }}>{d.recipientName}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.recipientType}</div>
                                </td>
                                <td style={{ fontSize: 11 }}>
                                    {Array.isArray(d.allocationPlan) && d.allocationPlan.map((a, i) => (
                                        <div key={i}>• {projectName(a.projectId)} ({Math.round(a.ratio * 100)}%)</div>
                                    ))}
                                </td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(d.totalAmount)}</td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--status-success)' }}>{fmt(d.paidAmount)}</td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--status-danger)', fontWeight: 600 }}>{fmt(remaining)}</td>
                                <td><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: s.bg, color: s.color }}>{s.label}</span></td>
                                <td>
                                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                        {remaining > 0 && (
                                            <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => onPay(d)}>💸 Trả</button>
                                        )}
                                        {onDelete && (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ fontSize: 12, color: 'var(--status-danger)', padding: '2px 6px' }}
                                                onClick={() => onDelete(d)}
                                                title={d.paidAmount > 0 ? 'Xóa công nợ lập sai (sẽ revert đã trả)' : 'Xóa công nợ'}
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function ExpensesTable({ expenses, onDelete }) {
    if (expenses.length === 0) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có chi phí phù hợp</div>;
    }
    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Mã</th>
                        <th>Ngày</th>
                        <th>Loại</th>
                        <th>Mô tả</th>
                        <th>Phân bổ</th>
                        <th style={{ textAlign: 'right' }}>Số tiền</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {expenses.map(e => (
                        <tr key={e.id}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{e.code}</td>
                            <td style={{ fontSize: 12 }}>{fmtDate(e.date)}</td>
                            <td style={{ fontSize: 12 }}>{e.category}</td>
                            <td style={{ fontSize: 13 }}>{e.description}</td>
                            <td style={{ fontSize: 11 }}>
                                {(e.allocations || []).map((a, i) => (
                                    <div key={i}>• {a.project?.name || a.projectId} ({fmt(a.amount)})</div>
                                ))}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(e.amount)}</td>
                            <td>
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)', fontSize: 11 }}
                                    onClick={() => onDelete?.(e)}
                                    title="Xóa chứng từ lập sai — công nợ + số đã trả sẽ được revert tự động">
                                    🗑️ Xóa
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function StatCard({ label, value, color, hint }) {
    return (
        <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
            {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
        </div>
    );
}

function TabBtn({ label, active, onClick }) {
    return (
        <button onClick={onClick} style={{
            padding: '10px 16px', fontSize: 13, fontWeight: 600,
            background: 'transparent', border: 'none', borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
            color: active ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer',
        }}>{label}</button>
    );
}
