'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { apiFetch } from '@/lib/fetchClient';
import { fmtVND } from '@/lib/financeUtils';

const OverviewTab = dynamic(() => import('./tabs/OverviewTab'), { ssr: false });
const CashflowTab = dynamic(() => import('./tabs/CashflowTab'), { ssr: false });
const DebtTab = dynamic(() => import('./tabs/DebtTab'), { ssr: false });
const ReportTab = dynamic(() => import('./tabs/ReportTab'), { ssr: false });
const ReceivablesTab = dynamic(() => import('@/components/finance/ReceivablesTab'), { ssr: false });
const ExpensesTab = dynamic(() => import('@/components/finance/ExpensesTab'), { ssr: false });

const TABS = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'thu_tien', label: 'Thu tiền' },
    { key: 'chi_phi', label: 'Chi phí' },
    { key: 'dong_tien', label: 'Dòng tiền' },
    { key: 'cong_no', label: 'Công nợ' },
    { key: 'bao_cao', label: 'Báo cáo tháng' },
];

const QUICK_ENTRY_TYPES = ['Thu tiền', 'Chi phí', 'Giao dịch khác'];

export default function FinancePage() {
    return <Suspense><FinanceContent /></Suspense>;
}

function FinanceContent() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
    const [data, setData] = useState({ summary: {}, transactions: { data: [] }, upcomingPayments: [], supplierDebt: [] });
    const [loading, setLoading] = useState(true);
    const [cashflow, setCashflow] = useState(null);
    const [retentions, setRetentions] = useState([]);
    const [quickType, setQuickType] = useState(null); // null | 'Thu tiền' | 'Chi phí' | 'Giao dịch khác'
    const [qForm, setQForm] = useState({ type: 'Thu', description: '', amount: '', category: '', date: new Date().toISOString().slice(0, 10) });
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        apiFetch('/api/finance')
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    };

    const loadCashflow = () => {
        if (cashflow) return;
        apiFetch('/api/finance/cashflow').then(setCashflow);
    };

    const loadRetentions = () => {
        if (retentions.length) return;
        apiFetch('/api/contractor-payments?retentionOnly=1&limit=500')
            .then(d => setRetentions((d.data || []).filter(p => (p.retentionAmount || 0) > 0 && !p.retentionReleased)));
    };

    useEffect(load, []);

    const handleTabChange = (key) => {
        setActiveTab(key);
        setQuickType(null);
        if (key === 'dong_tien' || key === 'bao_cao') loadCashflow();
        if (key === 'cong_no') { loadRetentions(); }
    };

    const saveQuickEntry = async () => {
        if (!qForm.amount || !qForm.description) return alert('Nhập đủ mô tả và số tiền!');
        setSaving(true);
        const type = quickType === 'Thu tiền' ? 'Thu' : quickType === 'Chi phí' ? 'Chi' : qForm.type;
        await apiFetch('/api/finance', {
            method: 'POST',
            body: { ...qForm, type, amount: Number(qForm.amount), date: new Date(qForm.date) },
        });
        setSaving(false);
        setQuickType(null);
        setQForm({ type: 'Thu', description: '', amount: '', category: '', date: new Date().toISOString().slice(0, 10) });
        load();
    };

    const { summary, transactions, upcomingPayments, supplierDebt } = data;

    return (
        <div>
            {/* KPI Cards */}
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon">📈</div><div><div className="stat-value" style={{ color: 'var(--status-success)' }}>{fmtVND(summary.totalReceived)}</div><div className="stat-label">Đã thu từ HĐ</div></div></div>
                <div className="stat-card"><div className="stat-icon">🔴</div><div><div className="stat-value" style={{ color: 'var(--status-danger)' }}>{fmtVND(summary.receivableOutstanding)}</div><div className="stat-label">Công nợ phải thu</div></div></div>
                <div className="stat-card"><div className="stat-icon">💸</div><div><div className="stat-value" style={{ color: 'var(--status-warning)' }}>{fmtVND(summary.totalExpensePaid)}</div><div className="stat-label">Đã chi (DA+CT)</div></div></div>
                <div className="stat-card"><div className="stat-icon">📉</div><div><div className="stat-value" style={{ color: 'var(--status-warning)' }}>{fmtVND(summary.payableOutstanding)}</div><div className="stat-label">Công nợ nhà thầu</div></div></div>
                <div className="stat-card"><div className="stat-icon">💵</div><div><div className="stat-value" style={{ color: (summary.netCashflow || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmtVND(summary.netCashflow)}</div><div className="stat-label">Dòng tiền ròng</div></div></div>
            </div>

            {/* Quick Entry Bar */}
            <div style={{ display: 'flex', gap: 8, margin: '16px 0', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {QUICK_ENTRY_TYPES.map(t => (
                    <button key={t} className={`btn ${quickType === t ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                        onClick={() => setQuickType(quickType === t ? null : t)}>
                        {t === 'Thu tiền' ? '+ Thu tiền' : t === 'Chi phí' ? '+ Chi phí' : '+ Giao dịch khác'}
                    </button>
                ))}
            </div>
            {quickType && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                        {quickType === 'Giao dịch khác' && (
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loại</label>
                                <select className="form-input" value={qForm.type} onChange={e => setQForm({ ...qForm, type: e.target.value })}>
                                    <option>Thu</option><option>Chi</option>
                                </select>
                            </div>
                        )}
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mô tả *</label>
                            <input className="form-input" placeholder="Nội dung giao dịch" value={qForm.description} onChange={e => setQForm({ ...qForm, description: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Số tiền *</label>
                            <input className="form-input" type="number" placeholder="0" value={qForm.amount} onChange={e => setQForm({ ...qForm, amount: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Danh mục</label>
                            <input className="form-input" placeholder="VD: Vật tư, Lương..." value={qForm.category} onChange={e => setQForm({ ...qForm, category: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ngày</label>
                            <input className="form-input" type="date" value={qForm.date} onChange={e => setQForm({ ...qForm, date: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setQuickType(null)}>Hủy</button>
                        <button className="btn btn-primary btn-sm" onClick={saveQuickEntry} disabled={saving}>
                            {saving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </div>
            )}

            {/* Tab Bar */}
            <div className="card">
                <div className="card-header">
                    <div className="tabs">
                        {TABS.map(t => (
                            <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`}
                                onClick={() => handleTabChange(t.key)}>{t.label}</button>
                        ))}
                    </div>
                </div>
                <div className="card-body" style={{ padding: activeTab === 'thu_tien' || activeTab === 'chi_phi' ? 0 : undefined }}>
                    {loading && activeTab === 'overview' ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                    ) : (
                        <>
                            {activeTab === 'overview' && <OverviewTab summary={summary} upcomingPayments={upcomingPayments} transactions={transactions?.data || []} />}
                            {activeTab === 'thu_tien' && <div style={{ padding: 20 }}><ReceivablesTab /></div>}
                            {activeTab === 'chi_phi' && <div style={{ padding: 20 }}><ExpensesTab /></div>}
                            {activeTab === 'dong_tien' && <CashflowTab cashflow={cashflow} transactions={transactions?.data || []} onAddTx={() => setQuickType('Giao dịch khác')} />}
                            {activeTab === 'cong_no' && <DebtTab summary={summary} retentions={retentions} supplierDebt={supplierDebt} />}
                            {activeTab === 'bao_cao' && <ReportTab cashflow={cashflow} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
