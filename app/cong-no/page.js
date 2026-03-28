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

    const handleSelect = (id, type) => {
        setSelectedId(id);
        setSelectedType(type);
        loadLedger(id, type);
    };

    // Load projects when contractor tab active (for payment modal)
    useEffect(() => {
        if (activeTab === 'contractor' && projects.length === 0) {
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
                {!selectedId ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
                        Chọn một nhà cung cấp hoặc nhà thầu để xem sổ cái
                    </div>
                ) : loadingLedger ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
                        Đang tải sổ cái...
                    </div>
                ) : ledgerError ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--status-danger)', fontSize: 14 }}>
                        Không thể tải sổ cái. Vui lòng thử lại.
                    </div>
                ) : ledger ? (
                    <div style={{ padding: 24 }}>

                        {/* Header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
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
        </div>
    );
}
