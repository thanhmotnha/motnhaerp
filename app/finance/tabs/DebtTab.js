'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtVND, fmtDate } from '@/lib/financeUtils';

export default function DebtTab({ summary, retentions, supplierDebt, onGhiNhanTT }) {
    const [nccData, setNccData] = useState({ suppliers: [], totalSoDu: 0 });
    const [contractorData, setContractorData] = useState({ contractors: [], totalSoDu: 0, totalGiuLai: 0 });
    const [loadingDebt, setLoadingDebt] = useState(true);
    const [payModal, setPayModal] = useState(null); // { type: 'ncc'|'contractor', entity: {...} }
    const [editBalanceModal, setEditBalanceModal] = useState(null); // { type, entity }
    const [payForm, setPayForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], notes: '', projectId: '' });
    const [balanceForm, setBalanceForm] = useState('');
    const [saving, setSaving] = useState(false);
    const [expandedNcc, setExpandedNcc] = useState(null);
    const [expandedContractor, setExpandedContractor] = useState(null);

    // Feature A — Sổ cái modal per NCC
    const [ledgerModal, setLedgerModal] = useState(null); // { supplier } or null
    const [ledgerData, setLedgerData] = useState(null);
    const [ledgerLoading, setLedgerLoading] = useState(false);

    // Feature B — Search + filter NCC
    const [nccSearch, setNccSearch] = useState('');
    const [nccFilter, setNccFilter] = useState('debt'); // 'all' | 'debt'

    // Feature C — Monthly report
    const [reportMonth, setReportMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [reportData, setReportData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportTab, setReportTab] = useState('ncc'); // 'ncc' | 'contractor'

    const fetchDebt = async () => {
        setLoadingDebt(true);
        try {
            const [ncc, contractors] = await Promise.all([
                apiFetch('/api/debt/ncc'),
                apiFetch('/api/debt/contractors'),
            ]);
            setNccData(ncc);
            setContractorData(contractors);
        } catch (e) { console.error(e); }
        setLoadingDebt(false);
    };

    useEffect(() => { fetchDebt(); }, []);

    // Feature C — fetch report
    const fetchReport = async (month) => {
        setReportLoading(true);
        try {
            const data = await apiFetch(`/api/debt/report?month=${month}`);
            setReportData(data);
        } catch (e) { console.error(e); }
        setReportLoading(false);
    };
    useEffect(() => { fetchReport(reportMonth); }, [reportMonth]);

    const openPayModal = (type, entity) => {
        setPayForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '', projectId: '' });
        setPayModal({ type, entity });
    };

    const openEditBalanceModal = (type, entity) => {
        setBalanceForm(String(entity.openingBalance || ''));
        setEditBalanceModal({ type, entity });
    };

    // Feature A — open ledger
    const openLedger = async (supplier) => {
        setLedgerModal(supplier);
        setLedgerLoading(true);
        setLedgerData(null);
        try {
            const data = await apiFetch(`/api/debt/ncc/${supplier.id}/ledger`);
            setLedgerData(data);
        } catch (e) { console.error(e); }
        setLedgerLoading(false);
    };

    const handlePaySubmit = async () => {
        if (!payForm.amount || isNaN(Number(payForm.amount))) return;
        setSaving(true);
        try {
            const body = payModal.type === 'ncc'
                ? { supplierId: payModal.entity.id, amount: Number(payForm.amount), date: payForm.date, notes: payForm.notes }
                : { contractorId: payModal.entity.id, amount: Number(payForm.amount), date: payForm.date, notes: payForm.notes, projectId: payForm.projectId || undefined };
            await apiFetch(payModal.type === 'ncc' ? '/api/debt/ncc' : '/api/debt/contractors', { method: 'POST', body: JSON.stringify(body) });
            setPayModal(null);
            fetchDebt();
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    const handleBalanceSubmit = async () => {
        setSaving(true);
        try {
            const body = editBalanceModal.type === 'ncc'
                ? { supplierId: editBalanceModal.entity.id, openingBalance: Number(balanceForm) }
                : { contractorId: editBalanceModal.entity.id, openingBalance: Number(balanceForm) };
            await apiFetch(editBalanceModal.type === 'ncc' ? '/api/debt/ncc' : '/api/debt/contractors', { method: 'PATCH', body: JSON.stringify(body) });
            setEditBalanceModal(null);
            fetchDebt();
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    const suppliers = nccData.suppliers || [];
    const contractors = contractorData.contractors || [];

    // Feature B — filtered NCC list
    const filteredNcc = (nccData.suppliers || []).filter(s => {
        if (nccFilter === 'debt' && s.soDu <= 0) return false;
        if (nccSearch && !s.name.toLowerCase().includes(nccSearch.toLowerCase()) && !s.code.toLowerCase().includes(nccSearch.toLowerCase())) return false;
        return true;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Section 1: KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div className="stat-card">
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phải thu KH</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-danger)' }}>{fmtVND(summary?.receivableOutstanding)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nợ NCC</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-warning)' }}>{fmtVND(nccData.totalSoDu)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nợ Thầu phụ</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-warning)' }}>{fmtVND(contractorData.totalSoDu)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Giữ lại BH</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-muted)' }}>{fmtVND(contractorData.totalGiuLai)}</div>
                    </div>
                </div>
            </div>

            {/* Section 2: Công nợ NCC */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>🏪 Công nợ Nhà cung cấp</h3>
                    <span style={{ fontWeight: 700, color: 'var(--status-warning)' }}>{fmtVND(nccData.totalSoDu)}</span>
                </div>

                {/* Feature B — Search & filter bar */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
                    <input
                        className="form-input"
                        placeholder="Tìm nhà cung cấp..."
                        value={nccSearch}
                        onChange={e => setNccSearch(e.target.value)}
                        style={{ maxWidth: 240 }}
                    />
                    <select className="form-input" value={nccFilter} onChange={e => setNccFilter(e.target.value)} style={{ maxWidth: 160 }}>
                        <option value="debt">Còn nợ</option>
                        <option value="all">Tất cả</option>
                    </select>
                </div>

                {loadingDebt ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : filteredNcc.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có công nợ NCC</div>
                ) : (
                    <table className="data-table" style={{ margin: 0 }}>
                        <thead>
                            <tr>
                                <th>NCC</th>
                                <th style={{ textAlign: 'right' }}>Đầu kỳ</th>
                                <th style={{ textAlign: 'right' }}>Phát sinh</th>
                                <th style={{ textAlign: 'right' }}>Đã trả</th>
                                <th style={{ textAlign: 'right' }}>Số dư</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredNcc.map(s => (
                                <>
                                    <tr key={s.id}>
                                        <td>
                                            {/* Feature A — clicking name opens ledger */}
                                            <button
                                                style={{ background: 'none', border: 'none', padding: 0, fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)', textDecoration: 'underline dotted', fontSize: 'inherit' }}
                                                onClick={() => openLedger(s)}
                                            >
                                                {s.name}
                                            </button>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span style={{ marginRight: 4 }}>{fmtVND(s.openingBalance)}</span>
                                            <button
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px', fontSize: 13 }}
                                                title="Cập nhật số dư đầu kỳ"
                                                onClick={() => openEditBalanceModal('ncc', s)}
                                            >✎</button>
                                        </td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{fmtVND(s.phatSinh)}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmtVND(s.daTra)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: s.soDu > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                                            {fmtVND(s.soDu)}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-primary"
                                                style={{ padding: '3px 10px', fontSize: 12 }}
                                                onClick={() => onGhiNhanTT
                                                    ? onGhiNhanTT({ partnerType: 'NCC', id: s.id, name: s.name, amount: s.soDu })
                                                    : openPayModal('ncc', s)}
                                            >
                                                Ghi nhận TT
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedNcc === s.id && (
                                        <tr key={`${s.id}-expand`}>
                                            <td colSpan={6} style={{ background: 'var(--bg-secondary)', padding: '12px 16px' }}>
                                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Lịch sử thanh toán</div>
                                                {(!s.payments || s.payments.length === 0) ? (
                                                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có thanh toán nào</div>
                                                ) : (
                                                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Ngày</th>
                                                                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Mã</th>
                                                                <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Số tiền</th>
                                                                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Ghi chú</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {s.payments.map((p, i) => (
                                                                <tr key={p.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                                    <td style={{ padding: '4px 8px' }}>{fmtDate(p.date)}</td>
                                                                    <td style={{ padding: '4px 8px' }}>{p.code || '—'}</td>
                                                                    <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--status-success)', fontWeight: 600 }}>{fmtVND(p.amount)}</td>
                                                                    <td style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>{p.notes || '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                <td colSpan={4}>Tổng nợ NCC</td>
                                <td style={{ color: 'var(--status-warning)', textAlign: 'right' }}>{fmtVND(nccData.totalSoDu)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>

            {/* Section 3: Công nợ Thầu phụ */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>👷 Công nợ Nhà thầu phụ</h3>
                    <span style={{ fontWeight: 700, color: 'var(--status-warning)' }}>{fmtVND(contractorData.totalSoDu)}</span>
                </div>
                {loadingDebt ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : contractors.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có công nợ nhà thầu phụ</div>
                ) : (
                    <table className="data-table" style={{ margin: 0 }}>
                        <thead>
                            <tr>
                                <th>Nhà thầu</th>
                                <th style={{ textAlign: 'right' }}>Đầu kỳ</th>
                                <th style={{ textAlign: 'right' }}>Phát sinh HĐ</th>
                                <th style={{ textAlign: 'right' }}>Giữ lại BH</th>
                                <th style={{ textAlign: 'right' }}>Đã trả</th>
                                <th style={{ textAlign: 'right' }}>Số dư</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contractors.map(c => (
                                <>
                                    <tr key={c.id}>
                                        <td>
                                            <span
                                                style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)', textDecoration: 'underline dotted' }}
                                                onClick={() => setExpandedContractor(expandedContractor === c.id ? null : c.id)}
                                            >
                                                {c.name}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span style={{ marginRight: 4 }}>{fmtVND(c.openingBalance)}</span>
                                            <button
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px', fontSize: 13 }}
                                                title="Cập nhật số dư đầu kỳ"
                                                onClick={() => openEditBalanceModal('contractor', c)}
                                            >✎</button>
                                        </td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{fmtVND(c.phatSinh)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span className="badge" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtVND(c.giuLai)}</span>
                                        </td>
                                        <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmtVND(c.daTra)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: c.soDu > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                                            {fmtVND(c.soDu)}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-primary"
                                                style={{ padding: '3px 10px', fontSize: 12 }}
                                                onClick={() => onGhiNhanTT
                                                    ? onGhiNhanTT({ partnerType: 'Thầu phụ', id: c.id, name: c.name, amount: c.soDu })
                                                    : openPayModal('contractor', c)}
                                            >
                                                Ghi nhận TT
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedContractor === c.id && (
                                        <tr key={`${c.id}-expand`}>
                                            <td colSpan={7} style={{ background: 'var(--bg-secondary)', padding: '12px 16px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                    {/* By Project */}
                                                    <div>
                                                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Theo dự án</div>
                                                        {(!c.byProject || c.byProject.length === 0) ? (
                                                            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Không có dự án</div>
                                                        ) : (
                                                            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                                                                <thead>
                                                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                                        <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Dự án</th>
                                                                        <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>HĐ thầu</th>
                                                                        <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Giữ lại</th>
                                                                        <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Số đợt</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {c.byProject.map((bp, i) => (
                                                                        <tr key={bp.projectId || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                                            <td style={{ padding: '4px 8px' }}>{bp.projectName || bp.projectId || '—'}</td>
                                                                            <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmtVND(bp.contractAmount)}</td>
                                                                            <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>{fmtVND(bp.giuLai)}</td>
                                                                            <td style={{ padding: '4px 8px', textAlign: 'right' }}>{bp.paymentCount ?? '—'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                    {/* Recent Payments */}
                                                    <div>
                                                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Thanh toán gần đây</div>
                                                        {(!c.payments || c.payments.length === 0) ? (
                                                            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có thanh toán nào</div>
                                                        ) : (
                                                            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                                                                <thead>
                                                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                                        <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Ngày</th>
                                                                        <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Số tiền</th>
                                                                        <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Ghi chú</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {c.payments.map((p, i) => (
                                                                        <tr key={p.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                                            <td style={{ padding: '4px 8px' }}>{fmtDate(p.date)}</td>
                                                                            <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--status-success)', fontWeight: 600 }}>{fmtVND(p.amount)}</td>
                                                                            <td style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>{p.notes || '—'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                <td colSpan={5}>Tổng nợ Thầu phụ</td>
                                <td style={{ color: 'var(--status-warning)', textAlign: 'right' }}>{fmtVND(contractorData.totalSoDu)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>

            {/* Section 4: Công nợ Khách hàng (AR) */}
            <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📈 Công nợ Khách hàng</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div className="card" style={{ border: '1px solid var(--border)', padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Tổng phải thu</span><span style={{ fontWeight: 700 }}>{fmtVND(summary?.totalReceivable)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Đã thu</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmtVND(summary?.totalReceived)}</span></div>
                        <div className="progress-bar" style={{ height: 6 }}>
                            <div className="progress-fill" style={{ width: `${summary?.totalReceivable > 0 ? Math.round((summary?.totalReceived || 0) / summary?.totalReceivable * 100) : 0}%` }}></div>
                        </div>
                        <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--status-danger)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Còn phải thu</span><span>{fmtVND(summary?.receivableOutstanding)}</span>
                        </div>
                    </div>
                    <div className="card" style={{ border: '1px solid var(--border)', padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Tổng phải trả NT</span><span style={{ fontWeight: 700 }}>{fmtVND(summary?.totalPayable)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Đã trả</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmtVND(summary?.totalPaid)}</span></div>
                        <div className="progress-bar" style={{ height: 6 }}>
                            <div className="progress-fill" style={{ width: `${summary?.totalPayable > 0 ? Math.round((summary?.totalPaid || 0) / summary?.totalPayable * 100) : 0}%`, background: 'var(--status-warning)' }}></div>
                        </div>
                        <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--status-warning)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Còn phải trả</span><span>{fmtVND(summary?.payableOutstanding)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 5: Báo cáo công nợ theo kỳ (Feature C) */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📊 Báo cáo công nợ theo kỳ</h3>
                    <input
                        type="month"
                        className="form-input"
                        value={reportMonth}
                        onChange={e => setReportMonth(e.target.value)}
                        style={{ maxWidth: 180 }}
                    />
                </div>

                <div className="tabs" style={{ marginBottom: 16 }}>
                    <button
                        className={`tab${reportTab === 'ncc' ? ' active' : ''}`}
                        onClick={() => setReportTab('ncc')}
                    >
                        Nhà cung cấp
                    </button>
                    <button
                        className={`tab${reportTab === 'contractor' ? ' active' : ''}`}
                        onClick={() => setReportTab('contractor')}
                    >
                        Nhà thầu phụ
                    </button>
                </div>

                {reportLoading ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải báo cáo...</div>
                ) : !reportData ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu trong kỳ này</div>
                ) : (
                    <>
                        {reportTab === 'ncc' && (
                            <>
                                {(!reportData.suppliers || reportData.suppliers.length === 0) ? (
                                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu trong kỳ này</div>
                                ) : (
                                    <table className="data-table" style={{ margin: 0 }}>
                                        <thead>
                                            <tr>
                                                <th>NCC</th>
                                                <th style={{ textAlign: 'right' }}>Đầu kỳ</th>
                                                <th style={{ textAlign: 'right' }}>Phát sinh</th>
                                                <th style={{ textAlign: 'right' }}>Đã trả</th>
                                                <th style={{ textAlign: 'right' }}>Cuối kỳ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.suppliers.map(s => (
                                                <tr key={s.id || s.name}>
                                                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                                                    <td style={{ textAlign: 'right' }}>{fmtVND(s.dauKy)}</td>
                                                    <td style={{ textAlign: 'right' }}>{fmtVND(s.phatSinh)}</td>
                                                    <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmtVND(s.daTra)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: s.cuoiKy > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                                                        {fmtVND(s.cuoiKy)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                                <td>Tổng cộng</td>
                                                <td style={{ textAlign: 'right' }}>{fmtVND(reportData.suppliers.reduce((acc, s) => acc + (s.dauKy || 0), 0))}</td>
                                                <td style={{ textAlign: 'right' }}>{fmtVND(reportData.suppliers.reduce((acc, s) => acc + (s.phatSinh || 0), 0))}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmtVND(reportData.suppliers.reduce((acc, s) => acc + (s.daTra || 0), 0))}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--status-warning)' }}>{fmtVND(reportData.suppliers.reduce((acc, s) => acc + (s.cuoiKy || 0), 0))}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </>
                        )}

                        {reportTab === 'contractor' && (
                            <>
                                {(!reportData.contractors || reportData.contractors.length === 0) ? (
                                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu trong kỳ này</div>
                                ) : (
                                    <table className="data-table" style={{ margin: 0 }}>
                                        <thead>
                                            <tr>
                                                <th>Nhà thầu</th>
                                                <th style={{ textAlign: 'right' }}>Đầu kỳ</th>
                                                <th style={{ textAlign: 'right' }}>Phát sinh</th>
                                                <th style={{ textAlign: 'right' }}>Đã trả</th>
                                                <th style={{ textAlign: 'right' }}>Cuối kỳ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.contractors.map(c => (
                                                <tr key={c.id || c.name}>
                                                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                                                    <td style={{ textAlign: 'right' }}>{fmtVND(c.dauKy)}</td>
                                                    <td style={{ textAlign: 'right' }}>{fmtVND(c.phatSinh)}</td>
                                                    <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmtVND(c.daTra)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: c.cuoiKy > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                                                        {fmtVND(c.cuoiKy)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                                <td>Tổng cộng</td>
                                                <td style={{ textAlign: 'right' }}>{fmtVND(reportData.contractors.reduce((acc, c) => acc + (c.dauKy || 0), 0))}</td>
                                                <td style={{ textAlign: 'right' }}>{fmtVND(reportData.contractors.reduce((acc, c) => acc + (c.phatSinh || 0), 0))}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmtVND(reportData.contractors.reduce((acc, c) => acc + (c.daTra || 0), 0))}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--status-warning)' }}>{fmtVND(reportData.contractors.reduce((acc, c) => acc + (c.cuoiKy || 0), 0))}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </>
                        )}

                        {/* Summary cards */}
                        {reportData.totals && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
                                <div className="stat-card">
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng nợ NCC cuối kỳ</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--status-danger)' }}>{fmtVND(reportData.totals.nccCuoiKy)}</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng nợ Thầu phụ cuối kỳ</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--status-danger)' }}>{fmtVND(reportData.totals.contractorCuoiKy)}</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng phải trả</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--status-warning)' }}>{fmtVND(reportData.totals.tongPhaiTra)}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Section 6: Giữ lại bảo hành */}
            <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🔒 Giữ lại bảo hành (nhà thầu)</h3>
                {(retentions || []).length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Không có khoản giữ lại bảo hành</div>
                ) : (
                    <table className="data-table" style={{ margin: 0 }}>
                        <thead>
                            <tr>
                                <th>Nhà thầu</th>
                                <th>Dự án</th>
                                <th>Giai đoạn</th>
                                <th style={{ textAlign: 'right' }}>HĐ NT</th>
                                <th style={{ textAlign: 'center' }}>% Giữ lại</th>
                                <th style={{ textAlign: 'right' }}>Số tiền GLL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {retentions.map(p => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600 }}>{p.contractor?.name || '—'}</td>
                                    <td>{p.project?.name || '—'}</td>
                                    <td>{p.phase || '—'}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtVND(p.contractAmount)}</td>
                                    <td style={{ textAlign: 'center' }}>{p.retentionRate}%</td>
                                    <td style={{ fontWeight: 700, color: 'var(--status-warning)', textAlign: 'right' }}>{fmtVND(p.retentionAmount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                <td colSpan={5}>Tổng giữ lại</td>
                                <td style={{ color: 'var(--status-warning)', textAlign: 'right' }}>{fmtVND(retentions.reduce((s, p) => s + (p.retentionAmount || 0), 0))}</td>
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>

            {/* Payment Modal */}
            {payModal && (
                <div className="modal-overlay" onClick={() => setPayModal(null)}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span style={{ fontWeight: 700 }}>
                                Ghi nhận thanh toán — {payModal.entity.name}
                            </span>
                            <button className="modal-close" onClick={() => setPayModal(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Số tiền *</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    placeholder="0"
                                    value={payForm.amount}
                                    onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ngày</label>
                                <input
                                    className="form-input"
                                    type="date"
                                    value={payForm.date}
                                    onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea
                                    className="form-input"
                                    rows={2}
                                    value={payForm.notes}
                                    onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                                />
                            </div>
                            {payModal.type === 'contractor' && payModal.entity.byProject?.length > 0 && (
                                <div className="form-group">
                                    <label className="form-label">Dự án (tùy chọn)</label>
                                    <select
                                        className="form-input"
                                        value={payForm.projectId}
                                        onChange={e => setPayForm(f => ({ ...f, projectId: e.target.value }))}
                                    >
                                        <option value="">— Tất cả dự án —</option>
                                        {payModal.entity.byProject.map(bp => (
                                            <option key={bp.projectId} value={bp.projectId}>{bp.projectName || bp.projectId}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setPayModal(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handlePaySubmit} disabled={saving || !payForm.amount}>
                                {saving ? 'Đang lưu...' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Opening Balance Modal */}
            {editBalanceModal && (
                <div className="modal-overlay" onClick={() => setEditBalanceModal(null)}>
                    <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span style={{ fontWeight: 700 }}>
                                Cập nhật số dư đầu kỳ — {editBalanceModal.entity.name}
                            </span>
                            <button className="modal-close" onClick={() => setEditBalanceModal(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Số dư đầu kỳ</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    placeholder="0"
                                    value={balanceForm}
                                    onChange={e => setBalanceForm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setEditBalanceModal(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleBalanceSubmit} disabled={saving}>
                                {saving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Feature A — Ledger Modal */}
            {ledgerModal && (
                <div className="modal-overlay" onClick={() => setLedgerModal(null)}>
                    <div className="modal" style={{ maxWidth: 800 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span style={{ fontWeight: 700 }}>Sổ cái công nợ — {ledgerModal.name}</span>
                            <button className="modal-close" onClick={() => setLedgerModal(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {ledgerLoading ? (
                                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                            ) : !ledgerData ? (
                                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Không thể tải dữ liệu</div>
                            ) : (
                                <>
                                    {/* Summary bar */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Đầu kỳ</div>
                                            <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtVND(ledgerData.dauKy)}</div>
                                        </div>
                                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Phát sinh</div>
                                            <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtVND(ledgerData.phatSinh)}</div>
                                        </div>
                                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Đã trả</div>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-success)' }}>{fmtVND(ledgerData.daTra)}</div>
                                        </div>
                                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Số dư cuối</div>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: (ledgerData.soDu || 0) > 0 ? 'var(--text-danger)' : 'var(--text-success)' }}>
                                                {fmtVND(ledgerData.soDu)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ledger table */}
                                    {(!ledgerData.entries || ledgerData.entries.length === 0) ? (
                                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có giao dịch</div>
                                    ) : (
                                        <table className="data-table" style={{ margin: 0 }}>
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
                                                {ledgerData.entries.map((entry, i) => (
                                                    <tr key={entry.id || i}>
                                                        <td>{fmtDate(entry.date)}</td>
                                                        <td>
                                                            {entry.type === 'debt' ? (
                                                                <span className="badge" style={{ background: 'var(--status-warning)', color: '#fff', fontSize: 11, padding: '2px 7px', borderRadius: 4 }}>Nhận hàng</span>
                                                            ) : (
                                                                <span className="badge" style={{ background: 'var(--status-success)', color: '#fff', fontSize: 11, padding: '2px 7px', borderRadius: 4 }}>Thanh toán</span>
                                                            )}
                                                        </td>
                                                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{entry.code || '—'}</td>
                                                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{entry.projectName || '—'}</td>
                                                        <td style={{ textAlign: 'right', color: 'var(--text-danger)', fontWeight: entry.debit ? 600 : 400 }}>
                                                            {entry.debit ? fmtVND(entry.debit) : '—'}
                                                        </td>
                                                        <td style={{ textAlign: 'right', color: 'var(--text-success)', fontWeight: entry.credit ? 600 : 400 }}>
                                                            {entry.credit ? fmtVND(entry.credit) : '—'}
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 700, color: (entry.balance || 0) > 0 ? 'var(--text-danger)' : 'var(--text-success)' }}>
                                                            {fmtVND(entry.balance)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={() => setLedgerModal(null)}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
