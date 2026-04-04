'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtVND } from '@/lib/financeUtils';

export default function CongNoBaoCaoPage() {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [month, setMonth] = useState(defaultMonth);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [activeTab, setActiveTab] = useState('ncc'); // 'ncc' | 'contractor'

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(false);
            try {
                const res = await apiFetch(`/api/debt/report?month=${month}`);
                setData(res);
            } catch (err) {
                console.error('Failed to load debt report:', err);
                setError(true);
            }
            setLoading(false);
        };
        load();
    }, [month]);

    const list = activeTab === 'ncc' ? data?.ncc : data?.contractors;

    const totalsRow = activeTab === 'ncc'
        ? data && {
            opening: data.totals.nccOpening,
            phatSinh: data.totals.nccPhatSinh,
            daTra: data.totals.nccDaTra,
            closing: data.totals.nccClosing,
        }
        : data && {
            opening: data.totals.contractorOpening,
            phatSinh: data.totals.contractorPhatSinh,
            daTra: data.totals.contractorDaTra,
            closing: data.totals.contractorClosing,
        };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ margin: 0 }}>Báo cáo công nợ theo kỳ</h2>
                <input
                    type="month"
                    className="form-input"
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                    style={{ width: 160 }}
                />
            </div>

            {/* KPI cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--status-danger)' }}>
                        {fmtVND(data?.totals.nccClosing ?? 0)}
                    </div>
                    <div className="stat-label">Tổng nợ NCC</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--status-danger)' }}>
                        {fmtVND(data?.totals.contractorClosing ?? 0)}
                    </div>
                    <div className="stat-label">Tổng nợ Thầu phụ</div>
                </div>
                <div className="stat-card">
                    <div
                        className="stat-value"
                        style={{ color: (data?.totals.grandTotal ?? 0) > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}
                    >
                        {fmtVND(data?.totals.grandTotal ?? 0)}
                    </div>
                    <div className="stat-label">Grand Total</div>
                </div>
            </div>

            {/* Report table */}
            <div className="card">
                <div className="card-header">
                    <div className="tabs">
                        <button
                            className={`tab ${activeTab === 'ncc' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ncc')}
                        >
                            Nhà cung cấp
                        </button>
                        <button
                            className={`tab ${activeTab === 'contractor' ? 'active' : ''}`}
                            onClick={() => setActiveTab('contractor')}
                        >
                            Nhà thầu phụ
                        </button>
                    </div>
                </div>
                <div className="card-body">
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                            Đang tải...
                        </div>
                    ) : error ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--status-danger)' }}>
                            Không thể tải báo cáo. Vui lòng thử lại.
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>{activeTab === 'ncc' ? 'Nhà cung cấp' : 'Nhà thầu phụ'}</th>
                                        <th style={{ textAlign: 'right' }}>Đầu kỳ</th>
                                        <th style={{ textAlign: 'right' }}>Phát sinh</th>
                                        <th style={{ textAlign: 'right' }}>Đã trả</th>
                                        <th style={{ textAlign: 'right' }}>Cuối kỳ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(list || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                                                Không có dữ liệu trong kỳ này
                                            </td>
                                        </tr>
                                    ) : (
                                        (list || []).map(item => (
                                            <tr key={item.id}>
                                                <td>
                                                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.code}</div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>{fmtVND(item.openingBalance)}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--status-danger)', fontWeight: 600 }}>
                                                    {fmtVND(item.phatSinh)}
                                                </td>
                                                <td style={{ textAlign: 'right', color: 'var(--status-success)', fontWeight: 600 }}>
                                                    {fmtVND(item.daTra)}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: item.closingBalance > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                                                    {fmtVND(item.closingBalance)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {/* Footer totals row */}
                                    {totalsRow && (list || []).length > 0 && (
                                        <tr style={{ fontWeight: 700, background: 'var(--bg-secondary)', borderTop: '2px solid var(--border)' }}>
                                            <td>Tổng cộng</td>
                                            <td style={{ textAlign: 'right' }}>{fmtVND(totalsRow.opening)}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>
                                                {fmtVND(totalsRow.phatSinh)}
                                            </td>
                                            <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>
                                                {fmtVND(totalsRow.daTra)}
                                            </td>
                                            <td style={{ textAlign: 'right', color: totalsRow.closing > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                                                {fmtVND(totalsRow.closing)}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
