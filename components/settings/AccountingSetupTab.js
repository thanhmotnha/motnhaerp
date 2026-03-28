'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtVND } from '@/lib/financeUtils';

const Indicator = ({ stateVal }) => {
    if (!stateVal) return null;
    if (stateVal === 'saving') return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>⏳</span>;
    if (stateVal === 'saved')  return <span style={{ color: 'var(--status-success)', fontSize: 14 }}>✓</span>;
    if (stateVal === 'error')  return <span style={{ color: 'var(--status-danger)', fontSize: 14 }}>✗</span>;
    return null;
};

export default function AccountingSetupTab() {
    const [activeTab, setActiveTab] = useState('ncc');
    const [suppliers, setSuppliers] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState({}); // { [id]: 'saving' | 'saved' | 'error' }
    const [values, setValues] = useState({});  // { [id]: string }
    const timers = useRef({});

    useEffect(() => {
        loadAll();
        return () => {
            Object.values(timers.current).forEach(clearTimeout);
        };
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [suppRes, contRes, conRes] = await Promise.all([
                apiFetch('/api/suppliers?limit=500'),
                apiFetch('/api/contractors?limit=500'),
                apiFetch('/api/contracts?limit=500'),
            ]);
            const supps = suppRes.data || [];
            const conts = contRes.data || [];
            const cons  = conRes.data  || [];
            setSuppliers(supps);
            setContractors(conts);
            setContracts(cons);

            const init = {};
            supps.forEach(s => { init[`s_${s.id}`] = String(s.openingBalance ?? 0); });
            conts.forEach(c => { init[`c_${c.id}`] = String(c.openingBalance ?? 0); });
            cons.forEach(c  => { init[`ar_${c.id}`] = String(c.arOpeningPaid ?? 0); });
            setValues(init);
        } catch (e) {
            console.error('AccountingSetupTab loadAll error:', e);
        }
        setLoading(false);
    };

    const handleChange = (prefix, id, val) => {
        const key = `${prefix}_${id}`;
        setValues(prev => ({ ...prev, [key]: val }));
        clearTimeout(timers.current[key]);
        timers.current[key] = setTimeout(() => doSave(prefix, id, val), 600);
    };

    const doSave = async (prefix, id, val) => {
        const key = `${prefix}_${id}`;
        const num = Number(val);
        if (isNaN(num) || num < 0) {
            setSaving(prev => ({ ...prev, [key]: 'error' }));
            return;
        }
        setSaving(prev => ({ ...prev, [key]: 'saving' }));
        try {
            if (prefix === 's') {
                await apiFetch('/api/debt/ncc', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ supplierId: id, openingBalance: num }),
                });
            } else if (prefix === 'c') {
                await apiFetch('/api/debt/contractors', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contractorId: id, openingBalance: num }),
                });
            } else if (prefix === 'ar') {
                await apiFetch(`/api/contracts/${id}/ar-opening`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ arOpeningPaid: num }),
                });
            }
            setSaving(prev => ({ ...prev, [key]: 'saved' }));
            timers.current[`${key}_clear`] = setTimeout(() => setSaving(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            }), 2000);
        } catch {
            setSaving(prev => ({ ...prev, [key]: 'error' }));
        }
    };

    const SUB_TABS = [
        { key: 'ncc', label: 'Nhà cung cấp' },
        { key: 'contractor', label: 'Nhà thầu phụ' },
        { key: 'ar', label: 'Hợp đồng AR' },
    ];

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 13 }}>
                Nhập số dư đầu kỳ trước khi có giao dịch. Thay đổi được lưu tự động.
            </p>

            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                {SUB_TABS.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        style={{
                            padding: '8px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                            border: 'none', background: 'transparent',
                            color: activeTab === t.key ? 'var(--text-accent)' : 'var(--text-muted)',
                            borderBottom: activeTab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'ncc' && (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Mã</th>
                            <th>Tên nhà cung cấp</th>
                            <th style={{ textAlign: 'right' }}>Số dư đầu kỳ (VNĐ)</th>
                            <th style={{ width: 32 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {suppliers.length === 0 && (
                            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Chưa có nhà cung cấp</td></tr>
                        )}
                        {suppliers.map(s => {
                            const key = `s_${s.id}`;
                            return (
                                <tr key={s.id}>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>{s.code}</td>
                                    <td>{s.name}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <input
                                            type="number" min="0"
                                            className="form-input"
                                            style={{ width: 160, textAlign: 'right', display: 'inline-block' }}
                                            value={values[key] ?? '0'}
                                            onChange={e => handleChange('s', s.id, e.target.value)}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <Indicator stateVal={saving[key]} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {activeTab === 'contractor' && (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Mã</th>
                            <th>Tên nhà thầu phụ</th>
                            <th style={{ textAlign: 'right' }}>Số dư đầu kỳ (VNĐ)</th>
                            <th style={{ width: 32 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {contractors.length === 0 && (
                            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Chưa có nhà thầu phụ</td></tr>
                        )}
                        {contractors.map(c => {
                            const key = `c_${c.id}`;
                            return (
                                <tr key={c.id}>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>{c.code}</td>
                                    <td>{c.name}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <input
                                            type="number" min="0"
                                            className="form-input"
                                            style={{ width: 160, textAlign: 'right', display: 'inline-block' }}
                                            value={values[key] ?? '0'}
                                            onChange={e => handleChange('c', c.id, e.target.value)}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <Indicator stateVal={saving[key]} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {activeTab === 'ar' && (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Mã HĐ</th>
                            <th>Khách hàng</th>
                            <th style={{ textAlign: 'right' }}>Giá trị HĐ</th>
                            <th style={{ textAlign: 'right' }}>Đã thu trước kỳ (VNĐ)</th>
                            <th style={{ width: 32 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.length === 0 && (
                            <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Chưa có hợp đồng</td></tr>
                        )}
                        {contracts.map(c => {
                            const key = `ar_${c.id}`;
                            return (
                                <tr key={c.id}>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>{c.code}</td>
                                    <td>{c.customer?.name || '—'}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmtVND(c.contractValue)}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <input
                                            type="number" min="0"
                                            className="form-input"
                                            style={{ width: 160, textAlign: 'right', display: 'inline-block' }}
                                            value={values[key] ?? '0'}
                                            onChange={e => handleChange('ar', c.id, e.target.value)}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <Indicator stateVal={saving[key]} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
