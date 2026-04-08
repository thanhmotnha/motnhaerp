'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtVND, fmtDate } from '@/lib/financeUtils';

export default function CongNoPage() {
    const [activeTab, setActiveTab] = useState('ncc'); // 'ncc' | 'contractor'
    const [nccList, setNccList] = useState([]);
    const [contractorList, setContractorList] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('con_no'); // 'con_no' | 'tat_ca'

    const [selectedId, setSelectedId] = useState(null);
    const [selectedType, setSelectedType] = useState(null); // 'ncc' | 'contractor'
    const [ledger, setLedger] = useState(null);
    const [ledgerError, setLedgerError] = useState(false);
    const [loadingLedger, setLoadingLedger] = useState(false);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showOpeningModal, setShowOpeningModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: '', date: new Date().toISOString().slice(0, 10), notes: '', projectId: '',
    });
    const [openingForm, setOpeningForm] = useState({ openingBalance: '' });
    const [saving, setSaving] = useState(false);
    const [projects, setProjects] = useState([]);

    // Debt view state
    const [debtView, setDebtView] = useState('debts'); // 'ledger' | 'debts'
    const [debts, setDebts] = useState([]);
    const [debtsLoading, setDebtsLoading] = useState(false);
    const [expandedDebtId, setExpandedDebtId] = useState(null);
    const [showDebtForm, setShowDebtForm] = useState(false);
    const [showPayForm, setShowPayForm] = useState(null); // debt object
    const [debtForm, setDebtForm] = useState({ description: '', invoiceNo: '', totalAmount: '', projectId: '', date: new Date().toISOString().slice(0, 10), notes: '', proofUrl: '' });
    const [payForm, setPayForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '', proofUrl: '' });
    const [debtFilterStatus, setDebtFilterStatus] = useState('open');
    const [selectedProject, setSelectedProject] = useState('');
    const [projectDebts, setProjectDebts] = useState({ supplier: [], contractor: [] });
    const [projectDebtsLoading, setProjectDebtsLoading] = useState(false);

    const loadLists = useCallback(async () => {
        setLoadingList(true);
        try {
            const [nccRes, contractorRes] = await Promise.all([
                apiFetch('/api/debt/ncc'),
                apiFetch('/api/debt/contractors'),
            ]);
            setNccList(nccRes.suppliers || []);
            setContractorList(contractorRes.contractors || []);
        } catch (err) {
            console.error('Failed to load debt lists:', err);
        }
        setLoadingList(false);
    }, []);

    useEffect(() => { loadLists(); }, [loadLists]);

    const loadLedger = useCallback(async (id, type) => {
        setLoadingLedger(true);
        setLedger(null);
        setLedgerError(false);
        try {
            const endpoint = type === 'ncc'
                ? `/api/debt/ncc/${id}/ledger`
                : `/api/debt/contractors/${id}/ledger`;
            const res = await apiFetch(endpoint);
            setLedger(res);
        } catch (err) {
            console.error('Failed to load ledger:', err);
            setLedgerError(true);
        }
        setLoadingLedger(false);
    }, []);

    const loadDebts = useCallback(async (id, type) => {
        if (!id) return;
        setDebtsLoading(true);
        try {
            const endpoint = type === 'ncc'
                ? `/api/debts/supplier?supplierId=${id}`
                : `/api/debts/contractor?contractorId=${id}`;
            const res = await apiFetch(endpoint);
            setDebts(res || []);
        } catch (err) {
            console.error(err);
        }
        setDebtsLoading(false);
    }, []);

    const loadProjectDebts = useCallback(async (projectId) => {
        if (!projectId) return;
        setProjectDebtsLoading(true);
        try {
            const [ncc, contractor] = await Promise.all([
                apiFetch(`/api/debts/supplier?projectId=${projectId}`),
                apiFetch(`/api/debts/contractor?projectId=${projectId}`),
            ]);
            setProjectDebts({ supplier: ncc || [], contractor: contractor || [] });
        } catch (err) { console.error(err); }
        setProjectDebtsLoading(false);
    }, []);

    const handleSelect = (id, type) => {
        setSelectedId(id);
        setSelectedType(type);
        setExpandedDebtId(null);
        loadLedger(id, type);
        loadDebts(id, type);
    };

    const handleCreateDebt = async () => {
        if (!debtForm.description || !debtForm.totalAmount) return alert('Nhập mô tả và số tiền');
        try {
            const isNcc = selectedType === 'ncc';
            const body = isNcc
                ? { supplierId: selectedId, ...debtForm, totalAmount: Number(debtForm.totalAmount), projectId: debtForm.projectId || null }
                : { contractorId: selectedId, ...debtForm, totalAmount: Number(debtForm.totalAmount) };
            const endpoint = isNcc ? '/api/debts/supplier' : '/api/debts/contractor';
            await apiFetch(endpoint, { method: 'POST', body });
            setShowDebtForm(false);
            setDebtForm({ description: '', invoiceNo: '', totalAmount: '', projectId: '', date: new Date().toISOString().slice(0, 10), notes: '', proofUrl: '' });
            loadDebts(selectedId, selectedType);
            loadLists();
        } catch (err) { alert(err.message); }
    };

    const handleDeleteDebt = async (debt) => {
        if (!confirm(`Xóa công nợ "${debt.code}"?`)) return;
        try {
            const endpoint = selectedType === 'ncc' ? `/api/debts/supplier/${debt.id}` : `/api/debts/contractor/${debt.id}`;
            await apiFetch(endpoint, { method: 'DELETE' });
            loadDebts(selectedId, selectedType);
            loadLists();
        } catch (err) { alert(err.message); }
    };

    const handlePay = async () => {
        if (!payForm.amount || Number(payForm.amount) <= 0) return alert('Nhập số tiền hợp lệ');
        try {
            const debt = showPayForm;
            const endpoint = selectedType === 'ncc'
                ? `/api/debts/supplier/${debt.id}/pay`
                : `/api/debts/contractor/${debt.id}/pay`;
            await apiFetch(endpoint, { method: 'POST', body: { ...payForm, amount: Number(payForm.amount) } });
            setShowPayForm(null);
            setPayForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '', proofUrl: '' });
            loadDebts(selectedId, selectedType);
            loadLists();
        } catch (err) { alert(err.message); }
    };

    // Load projects when contractor tab active (for payment modal)
    useEffect(() => {
        if (projects.length === 0) {
            apiFetch('/api/projects?limit=200')
                .then(res => setProjects(res.data || []))
                .catch(() => {});
        }
    }, [activeTab, projects.length]);

    const visibleNcc = nccList.filter(s => {
        const matchSearch = !search
            || s.name.toLowerCase().includes(search.toLowerCase())
            || (s.code || '').toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'tat_ca' || s.soDu > 0;
        return matchSearch && matchFilter;
    });

    const visibleContractors = contractorList.filter(c => {
        const matchSearch = !search
            || c.name.toLowerCase().includes(search.toLowerCase())
            || (c.code || '').toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'tat_ca' || c.soDu > 0;
        return matchSearch && matchFilter;
    });

    const selectedEntity = selectedType === 'ncc'
        ? nccList.find(s => s.id === selectedId)
        : contractorList.find(c => c.id === selectedId);

    const savePayment = async () => {
        if (!paymentForm.amount || !paymentForm.date) {
            alert('Nhập đủ số tiền và ngày!');
            return;
        }
        setSaving(true);
        try {
            const endpoint = selectedType === 'ncc' ? '/api/debt/ncc' : '/api/debt/contractors';
            const body = selectedType === 'ncc'
                ? { supplierId: selectedId, amount: Number(paymentForm.amount), date: paymentForm.date, notes: paymentForm.notes }
                : { contractorId: selectedId, amount: Number(paymentForm.amount), date: paymentForm.date, notes: paymentForm.notes, projectId: paymentForm.projectId || undefined };
            await apiFetch(endpoint, { method: 'POST', body });
            setShowPaymentModal(false);
            setPaymentForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '', projectId: '' });
            await Promise.all([loadLedger(selectedId, selectedType), loadLists()]);
        } catch (err) {
            console.error('Failed to save payment:', err);
            alert('Lưu thất bại. Vui lòng thử lại.');
        }
        setSaving(false);
    };

    const saveOpening = async () => {
        setSaving(true);
        try {
            const endpoint = selectedType === 'ncc' ? '/api/debt/ncc' : '/api/debt/contractors';
            const body = selectedType === 'ncc'
                ? { supplierId: selectedId, openingBalance: Number(openingForm.openingBalance) }
                : { contractorId: selectedId, openingBalance: Number(openingForm.openingBalance) };
            await apiFetch(endpoint, { method: 'PATCH', body });
            setShowOpeningModal(false);
            await Promise.all([loadLedger(selectedId, selectedType), loadLists()]);
        } catch (err) {
            console.error('Failed to save opening balance:', err);
            alert('Lưu thất bại. Vui lòng thử lại.');
        }
        setSaving(false);
    };

    const statCols = selectedType === 'contractor' ? 5 : 4;

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>

            {/* ── Left panel ─────────────────────────────────────── */}
            <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>

                {/* Tab bar */}
                <div className="tabs" style={{ padding: '8px 12px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    <button
                        className={`tab ${activeTab === 'ncc' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('ncc'); setSearch(''); setSelectedId(null); setSelectedType(null); setLedger(null); setLedgerError(false); }}
                    >
                        Nhà cung cấp
                    </button>
                    <button
                        className={`tab ${activeTab === 'contractor' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('contractor'); setSearch(''); setSelectedId(null); setSelectedType(null); setLedger(null); setLedgerError(false); }}
                    >
                        Nhà thầu phụ
                    </button>
                    <button
                        style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'project' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'project' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'project' ? 600 : 400, marginBottom: -2 }}
                        onClick={() => setActiveTab('project')}
                    >🏗️ Theo công trình</button>
                </div>

                {/* Search + filter */}
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <input
                        className="form-input"
                        placeholder="Tìm tên / mã..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ fontSize: 13 }}
                    />
                    <select
                        className="form-input"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        style={{ fontSize: 13 }}
                    >
                        <option value="con_no">Còn nợ</option>
                        <option value="tat_ca">Tất cả</option>
                    </select>
                </div>

                {/* Entity list */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loadingList ? (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            Đang tải...
                        </div>
                    ) : (
                        (activeTab === 'ncc' ? visibleNcc : visibleContractors).map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleSelect(item.id, activeTab)}
                                style={{
                                    width: '100%', display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', padding: '10px 14px', border: 'none',
                                    background: selectedId === item.id ? 'var(--bg-primary)' : 'transparent',
                                    borderLeft: selectedId === item.id ? '3px solid var(--primary)' : '3px solid transparent',
                                    cursor: 'pointer', textAlign: 'left',
                                }}
                            >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.code}</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                                    <div style={{ fontWeight: 700, fontSize: 12, color: item.soDu > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                                        {item.soDu > 0 ? '🔴' : '✅'} {fmtVND(item.soDu)}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                    {!loadingList && (activeTab === 'ncc' ? visibleNcc : visibleContractors).length === 0 && (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            Không có kết quả
                        </div>
                    )}
                </div>
            </div>

            {/* ── Right panel ────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)' }}>
                {/* View toggle */}
                {selectedId && (
                    <div style={{ display: 'flex', gap: 6, padding: '16px 24px 0' }}>
                        {[['debts', '📋 Công nợ theo phiếu'], ['ledger', '📊 Sổ cái']].map(([v, label]) => (
                            <button key={v} className={`btn btn-sm${debtView === v ? ' btn-primary' : ''}`}
                                onClick={() => setDebtView(v)}>{label}</button>
                        ))}
                    </div>
                )}
                {!selectedId ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
                        Chọn một nhà cung cấp hoặc nhà thầu để xem sổ cái
                    </div>
                ) : loadingLedger && debtView === 'ledger' ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
                        Đang tải sổ cái...
                    </div>
                ) : ledgerError && debtView === 'ledger' ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--status-danger)', fontSize: 14 }}>
                        Không thể tải sổ cái. Vui lòng thử lại.
                    </div>
                ) : debtView === 'debts' ? (
                    <div style={{ padding: 24 }}>
                        {/* Toolbar */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                            <select className="form-select" value={debtFilterStatus}
                                onChange={e => setDebtFilterStatus(e.target.value)} style={{ width: 130 }}>
                                {[['open', 'Còn nợ'], ['partial', 'Trả 1 phần'], ['paid', 'Đã trả hết'], ['all', 'Tất cả']].map(([v, l]) => (
                                    <option key={v} value={v}>{l}</option>
                                ))}
                            </select>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowDebtForm(true)}>+ Tạo công nợ</button>
                        </div>

                        {debtsLoading ? (
                            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : (
                            <div className="card" style={{ overflow: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Mã</th>
                                            <th>Mô tả / Hóa đơn</th>
                                            <th>Dự án</th>
                                            <th>Ngày</th>
                                            <th style={{ textAlign: 'right' }}>Tổng</th>
                                            <th style={{ textAlign: 'right' }}>Đã trả</th>
                                            <th style={{ textAlign: 'right' }}>Còn nợ</th>
                                            <th>TT</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {debts.filter(d => debtFilterStatus === 'all' || d.status === debtFilterStatus).map(d => {
                                            const statusColor = { open: '#ef4444', partial: '#f59e0b', paid: '#22c55e' }[d.status] || '#888';
                                            const statusLabel = { open: 'Còn nợ', partial: 'Trả 1 phần', paid: 'Đã trả' }[d.status] || d.status;
                                            const isExpanded = expandedDebtId === d.id;
                                            return (
                                                <>
                                                    <tr key={d.id} onClick={() => setExpandedDebtId(isExpanded ? null : d.id)} style={{ cursor: 'pointer' }}>
                                                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{d.code}</td>
                                                        <td>
                                                            <div>{d.description}</div>
                                                            {d.invoiceNo && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>HD: {d.invoiceNo}</div>}
                                                        </td>
                                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.project?.code || '—'}</td>
                                                        <td style={{ fontSize: 12 }}>{d.date ? new Date(d.date).toLocaleDateString('vi-VN') : '—'}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtVND(d.totalAmount)}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#22c55e' }}>{fmtVND(d.paidAmount)}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: statusColor }}>{fmtVND(d.remaining)}</td>
                                                        <td><span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 8, background: statusColor + '18', color: statusColor }}>{statusLabel}</span></td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 4 }}>
                                                                {d.status !== 'paid' && (
                                                                    <button className="btn btn-sm btn-primary" style={{ fontSize: 11 }}
                                                                        onClick={e => { e.stopPropagation(); setShowPayForm(d); setPayForm({ amount: d.remaining, date: new Date().toISOString().slice(0, 10), notes: '', proofUrl: '' }); }}>
                                                                        + Trả
                                                                    </button>
                                                                )}
                                                                {d.paidAmount === 0 && (
                                                                    <button className="btn btn-sm" style={{ fontSize: 11, color: '#ef4444' }}
                                                                        onClick={e => { e.stopPropagation(); handleDeleteDebt(d); }}>
                                                                        Xóa
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && d.payments.length > 0 && (
                                                        <tr key={`${d.id}-payments`}>
                                                            <td colSpan={9} style={{ padding: '4px 16px 12px', background: 'var(--bg-secondary)' }}>
                                                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Lịch sử thanh toán:</div>
                                                                {d.payments.map(p => (
                                                                    <div key={p.id} style={{ display: 'flex', gap: 12, padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                                                                        <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>{new Date(p.date).toLocaleDateString('vi-VN')}</span>
                                                                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#22c55e' }}>{fmtVND(p.amount)}</span>
                                                                        <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>{p.code}</span>
                                                                        {p.notes && <span style={{ color: 'var(--text-muted)' }}>{p.notes}</span>}
                                                                        {p.proofUrl && <a href={p.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>📎</a>}
                                                                    </div>
                                                                ))}
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {isExpanded && d.payments.length === 0 && (
                                                        <tr key={`${d.id}-empty`}>
                                                            <td colSpan={9} style={{ padding: '8px 16px', background: 'var(--bg-secondary)', fontSize: 12, color: 'var(--text-muted)' }}>
                                                                Chưa có thanh toán nào
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            );
                                        })}
                                        {debts.filter(d => debtFilterStatus === 'all' || d.status === debtFilterStatus).length === 0 && (
                                            <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Không có công nợ</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : ledger ? (
                    <div style={{ padding: 24 }}>

                        {/* Header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 18 }}>{selectedEntity?.name}</h2>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{selectedEntity?.code}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                        setOpeningForm({ openingBalance: selectedEntity?.openingBalance ?? 0 });
                                        setShowOpeningModal(true);
                                    }}
                                >
                                    ✎ Sửa đầu kỳ
                                </button>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowPaymentModal(true)}>
                                    💸 Ghi nhận thanh toán
                                </button>
                            </div>
                        </div>

                        {/* Stat cards */}
                        <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${statCols}, 1fr)`, marginBottom: 20 }}>
                            <div className="stat-card">
                                <div className="stat-value">{fmtVND(ledger.summary.openingBalance)}</div>
                                <div className="stat-label">Đầu kỳ</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" style={{ color: 'var(--status-danger)' }}>
                                    {fmtVND(ledger.summary.totalDebit)}
                                </div>
                                <div className="stat-label">Phát sinh</div>
                            </div>
                            {selectedType === 'contractor' && (
                                <div className="stat-card">
                                    <div className="stat-value" style={{ color: 'var(--status-warning)' }}>
                                        {fmtVND(ledger.summary.giuLai)}
                                    </div>
                                    <div className="stat-label">Giữ lại BH</div>
                                </div>
                            )}
                            <div className="stat-card">
                                <div className="stat-value" style={{ color: 'var(--status-success)' }}>
                                    {fmtVND(ledger.summary.totalCredit)}
                                </div>
                                <div className="stat-label">Đã trả</div>
                            </div>
                            <div className="stat-card">
                                <div
                                    className="stat-value"
                                    style={{ color: ledger.summary.closingBalance > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}
                                >
                                    {fmtVND(ledger.summary.closingBalance)}
                                </div>
                                <div className="stat-label">Số dư</div>
                            </div>
                        </div>

                        {/* Ledger table */}
                        <div className="card">
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Ngày</th>
                                            <th>Loại</th>
                                            <th>Chứng từ</th>
                                            <th>Dự án</th>
                                            <th style={{ textAlign: 'right' }}>Phát sinh</th>
                                            <th style={{ textAlign: 'right' }}>Thanh toán</th>
                                            <th style={{ textAlign: 'right' }}>Số dư</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledger.entries.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                                                    Chưa có giao dịch
                                                </td>
                                            </tr>
                                        ) : (
                                            ledger.entries.map(entry => (
                                                <tr key={entry.id}>
                                                    <td style={{ fontSize: 13 }}>{fmtDate(entry.date)}</td>
                                                    <td>
                                                        {entry.type === 'debt' && (
                                                            <span className="badge badge-warning">
                                                                {selectedType === 'ncc' ? 'Nhận hàng' : 'Quyết toán'}
                                                            </span>
                                                        )}
                                                        {entry.type === 'payment' && (
                                                            <span className="badge badge-success">Thanh toán</span>
                                                        )}
                                                        {entry.type === 'retention' && (
                                                            <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                                                                Giải phóng BH
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ fontSize: 13 }}>{entry.ref}</td>
                                                    <td style={{ fontSize: 13 }}>{entry.projectName}</td>
                                                    <td style={{ textAlign: 'right', color: 'var(--status-danger)', fontWeight: 600 }}>
                                                        {entry.debit > 0 ? fmtVND(entry.debit) : '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', color: 'var(--status-success)', fontWeight: 600 }}>
                                                        {entry.credit > 0 ? fmtVND(entry.credit) : '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: entry.balance > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                                                        {fmtVND(entry.balance)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {activeTab === 'project' && (
                <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                        <select className="form-select" value={selectedProject}
                            onChange={e => { setSelectedProject(e.target.value); if (e.target.value) loadProjectDebts(e.target.value); }}
                            style={{ maxWidth: 320 }}>
                            <option value="">— Chọn dự án —</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                        </select>
                    </div>

                    {!selectedProject ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Chọn dự án để xem công nợ</div>
                    ) : projectDebtsLoading ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Đang tải...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div>
                                <h4 style={{ marginBottom: 8 }}>Công nợ Nhà cung cấp</h4>
                                <div className="card" style={{ overflow: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr><th>Mã</th><th>NCC</th><th>Mô tả</th><th style={{ textAlign: 'right' }}>Tổng</th><th style={{ textAlign: 'right' }}>Đã trả</th><th style={{ textAlign: 'right' }}>Còn nợ</th><th>TT</th></tr>
                                        </thead>
                                        <tbody>
                                            {projectDebts.supplier.length === 0 ? (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Không có công nợ NCC</td></tr>
                                            ) : projectDebts.supplier.map(d => {
                                                const statusColor = { open: '#ef4444', partial: '#f59e0b', paid: '#22c55e' }[d.status] || '#888';
                                                const statusLabel = { open: 'Còn nợ', partial: 'Trả 1 phần', paid: 'Đã trả' }[d.status] || d.status;
                                                return (
                                                    <tr key={d.id}>
                                                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.code}</td>
                                                        <td style={{ fontWeight: 600 }}>{d.supplier?.name}</td>
                                                        <td>{d.description}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtVND(d.totalAmount)}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#22c55e' }}>{fmtVND(d.paidAmount)}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: statusColor }}>{fmtVND(d.remaining)}</td>
                                                        <td><span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 8, background: statusColor + '18', color: statusColor }}>{statusLabel}</span></td>
                                                    </tr>
                                                );
                                            })}
                                            {projectDebts.supplier.length > 0 && (
                                                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                                                    <td colSpan={5} style={{ textAlign: 'right' }}>Tổng còn nợ NCC:</td>
                                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#ef4444' }}>
                                                        {fmtVND(projectDebts.supplier.reduce((s, d) => s + d.remaining, 0))}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ marginBottom: 8 }}>Công nợ Thầu phụ</h4>
                                <div className="card" style={{ overflow: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr><th>Mã</th><th>Thầu phụ</th><th>Mô tả</th><th style={{ textAlign: 'right' }}>Tổng</th><th style={{ textAlign: 'right' }}>Đã trả</th><th style={{ textAlign: 'right' }}>Còn nợ</th><th>TT</th></tr>
                                        </thead>
                                        <tbody>
                                            {projectDebts.contractor.length === 0 ? (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Không có công nợ thầu phụ</td></tr>
                                            ) : projectDebts.contractor.map(d => {
                                                const statusColor = { open: '#ef4444', partial: '#f59e0b', paid: '#22c55e' }[d.status] || '#888';
                                                const statusLabel = { open: 'Còn nợ', partial: 'Trả 1 phần', paid: 'Đã trả' }[d.status] || d.status;
                                                return (
                                                    <tr key={d.id}>
                                                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.code}</td>
                                                        <td style={{ fontWeight: 600 }}>{d.contractor?.name}</td>
                                                        <td>{d.description}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtVND(d.totalAmount)}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#22c55e' }}>{fmtVND(d.paidAmount)}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: statusColor }}>{fmtVND(d.remaining)}</td>
                                                        <td><span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 8, background: statusColor + '18', color: statusColor }}>{statusLabel}</span></td>
                                                    </tr>
                                                );
                                            })}
                                            {projectDebts.contractor.length > 0 && (
                                                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                                                    <td colSpan={5} style={{ textAlign: 'right' }}>Tổng còn nợ thầu phụ:</td>
                                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#ef4444' }}>
                                                        {fmtVND(projectDebts.contractor.reduce((s, d) => s + d.remaining, 0))}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Modal: Ghi nhận thanh toán ──────────────────────── */}
            {showPaymentModal && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Ghi nhận thanh toán</h3>
                            <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Số tiền *</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        placeholder="0"
                                        value={paymentForm.amount}
                                        onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ngày *</label>
                                    <input
                                        className="form-input"
                                        type="date"
                                        value={paymentForm.date}
                                        onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))}
                                    />
                                </div>
                                {selectedType === 'contractor' && (
                                    <div>
                                        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Dự án</label>
                                        <select
                                            className="form-input"
                                            value={paymentForm.projectId}
                                            onChange={e => setPaymentForm(f => ({ ...f, projectId: e.target.value }))}
                                        >
                                            <option value="">— Không chọn —</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ghi chú</label>
                                    <input
                                        className="form-input"
                                        placeholder="Nội dung thanh toán..."
                                        value={paymentForm.notes}
                                        onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowPaymentModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={savePayment} disabled={saving}>
                                {saving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Sửa đầu kỳ ──────────────────────────────── */}
            {showOpeningModal && (
                <div className="modal-overlay" onClick={() => setShowOpeningModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Sửa số dư đầu kỳ</h3>
                            <button className="modal-close" onClick={() => setShowOpeningModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Số dư đầu kỳ</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    placeholder="0"
                                    value={openingForm.openingBalance}
                                    onChange={e => setOpeningForm({ openingBalance: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowOpeningModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveOpening} disabled={saving}>
                                {saving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal tạo công nợ */}
            {showDebtForm && (
                <div className="modal-overlay" onClick={() => setShowDebtForm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <h3 style={{ marginTop: 0 }}>+ Tạo công nợ {selectedType === 'ncc' ? 'NCC' : 'Thầu phụ'}</h3>
                        <div className="form-group">
                            <label className="form-label">Mô tả *</label>
                            <input className="form-input" value={debtForm.description} onChange={e => setDebtForm({ ...debtForm, description: e.target.value })} placeholder="VD: Xi măng tháng 3..." />
                        </div>
                        {selectedType === 'ncc' && (
                            <div className="form-group">
                                <label className="form-label">Số hóa đơn</label>
                                <input className="form-input" value={debtForm.invoiceNo} onChange={e => setDebtForm({ ...debtForm, invoiceNo: e.target.value })} placeholder="INV-001" />
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Số tiền *</label>
                                <input className="form-input" type="number" min="0" value={debtForm.totalAmount} onChange={e => setDebtForm({ ...debtForm, totalAmount: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ngày</label>
                                <input className="form-input" type="date" value={debtForm.date} onChange={e => setDebtForm({ ...debtForm, date: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Dự án</label>
                            <select className="form-select" value={debtForm.projectId} onChange={e => setDebtForm({ ...debtForm, projectId: e.target.value })}>
                                <option value="">— Không gắn —</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ghi chú</label>
                            <input className="form-input" value={debtForm.notes} onChange={e => setDebtForm({ ...debtForm, notes: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                            <button className="btn" onClick={() => setShowDebtForm(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleCreateDebt}>Tạo công nợ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal trả tiền */}
            {showPayForm && (
                <div className="modal-overlay" onClick={() => setShowPayForm(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <h3 style={{ marginTop: 0 }}>+ Trả tiền — {showPayForm.code}</h3>
                        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 13 }}>
                            Còn nợ: <strong style={{ color: '#ef4444' }}>{fmtVND(showPayForm.remaining)}</strong>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Số tiền *</label>
                            <input className="form-input" type="number" min="1" max={showPayForm.remaining} value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ngày</label>
                            <input className="form-input" type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ghi chú</label>
                            <input className="form-input" value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Link chứng từ</label>
                            <input className="form-input" placeholder="https://..." value={payForm.proofUrl} onChange={e => setPayForm({ ...payForm, proofUrl: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                            <button className="btn" onClick={() => setShowPayForm(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handlePay}>Xác nhận trả</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
