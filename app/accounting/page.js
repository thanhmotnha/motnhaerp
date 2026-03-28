'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtVND, fmtDate } from '@/lib/financeUtils';

export default function AccountingPage() {
    const [filters, setFilters] = useState({ month: '', type: '', projectId: '' });
    const [data, setData] = useState({ entries: [], summary: { totalThu: 0, totalChi: 0, net: 0 } });
    const [allMonths, setAllMonths] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch filtered entries + summary
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const p = new URLSearchParams();
                if (filters.month) p.set('month', filters.month);
                if (filters.type) p.set('type', filters.type);
                if (filters.projectId) p.set('projectId', filters.projectId);
                const res = await apiFetch(`/api/accounting/ledger?${p}`);
                setData({
                    entries: res.entries || [],
                    summary: res.summary || { totalThu: 0, totalChi: 0, net: 0 },
                });
            } catch (err) {
                console.error('Failed to load ledger:', err);
            }
            setLoading(false);
        };
        fetchData();
    }, [filters]);

    // Fetch all months separately (no month filter) for complete monthly summary table
    useEffect(() => {
        const fetchMonths = async () => {
            try {
                const res = await apiFetch('/api/accounting/ledger');
                setAllMonths(res.months || []);
            } catch (err) {
                console.error('Failed to load months:', err);
            }
        };
        fetchMonths();
    }, []);

    const { entries, summary } = data;

    // Derive unique projects from entries for project filter
    const projectOptions = entries.reduce((acc, e) => {
        if (e.projectId && !acc.find(p => p.id === e.projectId)) {
            acc.push({ id: e.projectId, name: e.projectName || e.projectId });
        }
        return acc;
    }, []);

    const monthOptions = allMonths.map(m => ({ key: m.key, label: m.label }));

    const getSourceBadge = (source) => {
        if (source === 'contract') return <span className="badge badge-success">HĐ</span>;
        if (source === 'expense') return <span className="badge badge-danger">Chi DA</span>;
        return <span className="badge" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>Thủ công</span>;
    };

    return (
        <div>
            {/* Section 1: Stat cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
                <div className="stat-card">
                    <div>
                        <div className="stat-value" style={{ color: 'var(--text-success)' }}>
                            {fmtVND(summary.totalThu)}
                        </div>
                        <div className="stat-label">Tổng thu</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div>
                        <div className="stat-value" style={{ color: 'var(--text-danger)' }}>
                            {fmtVND(summary.totalChi)}
                        </div>
                        <div className="stat-label">Tổng chi</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div>
                        <div
                            className="stat-value"
                            style={{ color: summary.net >= 0 ? 'var(--text-success)' : 'var(--text-danger)' }}
                        >
                            {fmtVND(summary.net)}
                        </div>
                        <div className="stat-label">Số dư ròng</div>
                    </div>
                </div>
            </div>

            {/* Section 2: Filters + Transaction table */}
            <div className="card" style={{ marginBottom: 20 }}>
                {/* Filters */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                    <select
                        className="form-select"
                        value={filters.month}
                        onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}
                        style={{ maxWidth: 180 }}
                    >
                        <option value="">Tất cả tháng</option>
                        {monthOptions.map(m => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                        ))}
                    </select>

                    <select
                        className="form-select"
                        value={filters.type}
                        onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                        style={{ maxWidth: 150 }}
                    >
                        <option value="">Tất cả</option>
                        <option value="Thu">Thu</option>
                        <option value="Chi">Chi</option>
                    </select>

                    <select
                        className="form-select"
                        value={filters.projectId}
                        onChange={e => setFilters(f => ({ ...f, projectId: e.target.value }))}
                        style={{ maxWidth: 220 }}
                    >
                        <option value="">Tất cả dự án</option>
                        {projectOptions.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {/* Transaction table */}
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Ngày</th>
                                    <th>Nguồn</th>
                                    <th>Mô tả</th>
                                    <th>Dự án</th>
                                    <th style={{ textAlign: 'right' }}>Số tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                                            Chưa có giao dịch trong kỳ này
                                        </td>
                                    </tr>
                                ) : (
                                    entries.map(e => (
                                        <tr key={e.id}>
                                            <td style={{ fontSize: 13 }}>{fmtDate(e.date)}</td>
                                            <td>{getSourceBadge(e.source)}</td>
                                            <td style={{ fontSize: 13 }}>{e.description || '—'}</td>
                                            <td style={{ fontSize: 13 }}>{e.projectName || '—'}</td>
                                            <td
                                                style={{
                                                    textAlign: 'right',
                                                    fontWeight: 600,
                                                    color: e.type === 'Thu' ? 'var(--text-success)' : 'var(--text-danger)',
                                                }}
                                            >
                                                {e.type === 'Thu' ? '+' : '-'}{fmtVND(e.amount)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Section 3: Monthly summary table */}
            <div className="card">
                <h3 style={{ marginBottom: 16 }}>Tổng hợp theo tháng</h3>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Tháng</th>
                                <th style={{ textAlign: 'right' }}>Tổng thu</th>
                                <th style={{ textAlign: 'right' }}>Tổng chi</th>
                                <th style={{ textAlign: 'right' }}>Ròng</th>
                                <th style={{ textAlign: 'right' }}>Luỹ kế</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allMonths.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                                        Chưa có dữ liệu
                                    </td>
                                </tr>
                            ) : (
                                allMonths.map(m => (
                                    <tr key={m.key}>
                                        <td>{m.label}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-success)', fontWeight: 600 }}>
                                            {fmtVND(m.totalThu)}
                                        </td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-danger)', fontWeight: 600 }}>
                                            {fmtVND(m.totalChi)}
                                        </td>
                                        <td
                                            style={{
                                                textAlign: 'right',
                                                fontWeight: 600,
                                                color: m.net >= 0 ? 'var(--text-success)' : 'var(--text-danger)',
                                            }}
                                        >
                                            {fmtVND(m.net)}
                                        </td>
                                        <td
                                            style={{
                                                textAlign: 'right',
                                                fontWeight: 600,
                                                color: m.runningBalance >= 0 ? 'var(--text-success)' : 'var(--text-danger)',
                                            }}
                                        >
                                            {fmtVND(m.runningBalance)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
