'use client';
import { useState, useEffect, useCallback } from 'react';

const STATUS_OPTIONS = ['Đi làm', 'Trễ', 'Nghỉ phép', 'Nghỉ không lương', 'Vắng', 'Nửa ngày'];
// Cycle order when clicking a cell: empty → Đi làm → Nghỉ phép → Nghỉ không lương → Vắng → empty
const CYCLE = [null, 'Đi làm', 'Nghỉ phép', 'Nghỉ không lương', 'Vắng'];
const STATUS_COLORS = {
    'Đi làm': '#16A34A', 'Trễ': '#D97706', 'Nghỉ phép': '#3B82F6',
    'Nghỉ không lương': '#8B5CF6', 'Vắng': '#DC2626', 'Nửa ngày': '#F59E0B',
};
const STATUS_ABBR = { 'Đi làm': 'ĐL', 'Trễ': 'T', 'Nghỉ phép': 'NP', 'Nghỉ không lương': 'KL', 'Vắng': 'V', 'Nửa ngày': 'ND' };
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';

export default function DailyAttendanceTab() {
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [viewMode, setViewMode] = useState('day');
    const [records, setRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState({});
    // month grid: local state map { empId_day: status } for optimistic UI
    const [localGrid, setLocalGrid] = useState({});
    const [filterDept, setFilterDept] = useState('');
    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        fetch('/api/employees?status=Đang+làm&limit=500')
            .then(r => r.json()).then(d => {
                const emps = d.data || d || [];
                setEmployees(emps);
                const depts = [...new Set(emps.map(e => e.department?.name).filter(Boolean))].sort();
                setDepartments(depts);
            });
    }, []);

    const load = useCallback(() => {
        setLoading(true);
        let url;
        if (viewMode === 'day') {
            url = `/api/hr/daily-attendance?date=${date}`;
        } else {
            const [y, m] = date.split('-');
            url = `/api/hr/daily-attendance?month=${y}-${m}`;
        }
        fetch(url).then(r => r.json()).then(d => {
            setRecords(d.data || []);
            setLocalGrid({});
            setLoading(false);
        });
    }, [date, viewMode]);

    useEffect(load, [load]);

    // Day view: check-in
    const handleCheckIn = async (empId) => {
        setSaving(p => ({ ...p, [empId]: true }));
        await fetch('/api/hr/daily-attendance', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: empId, date, checkIn: new Date().toISOString(), status: 'Đi làm' }),
        });
        load();
        setSaving(p => ({ ...p, [empId]: false }));
    };

    // Day view: check-out
    const handleCheckOut = async (empId) => {
        setSaving(p => ({ ...p, [empId]: true }));
        await fetch('/api/hr/daily-attendance', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: empId, date, checkOut: new Date().toISOString() }),
        });
        load();
        setSaving(p => ({ ...p, [empId]: false }));
    };

    // Day view: change status
    const handleStatus = async (empId, status) => {
        setSaving(p => ({ ...p, [empId]: true }));
        await fetch('/api/hr/daily-attendance', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: empId, date, status }),
        });
        load();
        setSaving(p => ({ ...p, [empId]: false }));
    };

    // Month grid: click a cell → cycle status
    const handleCellClick = async (empId, day) => {
        const [y, m] = date.split('-').map(Number);
        const cellDate = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const key = `${empId}_${day}`;

        // Find current status (local override first, then from records)
        const currentLocal = localGrid[key];
        let currentStatus;
        if (currentLocal !== undefined) {
            currentStatus = currentLocal;
        } else {
            const rec = records.find(r => r.employeeId === empId && new Date(r.date).getDate() === day);
            currentStatus = rec?.status || null;
        }

        const idx = CYCLE.indexOf(currentStatus);
        const next = CYCLE[(idx + 1) % CYCLE.length];

        // Optimistic update
        setLocalGrid(prev => ({ ...prev, [key]: next }));

        try {
            await fetch('/api/hr/daily-attendance', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId: empId, date: cellDate, status: next || 'Đi làm' }),
            });
            if (!next) {
                // If cycling back to empty, reload to reflect deletion (or just keep as Đi làm minimum)
                // API upserts so it will set status to 'Đi làm' — reload
                load();
            }
        } catch {
            // Revert on error
            setLocalGrid(prev => { const n = { ...prev }; delete n[key]; return n; });
        }
    };

    // Month grid: "Điền đầy đủ" — mark all employees as Đi làm for all weekdays
    const handleFillAll = async () => {
        const [y, m] = date.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        const filtered = filterDept ? employees.filter(e => e.department?.name === filterDept) : employees;

        if (!confirm(`Điền "Đi làm" cho ${filtered.length} nhân viên × ${daysInMonth} ngày (kể cả cuối tuần)? Có thể mất vài giây.`)) return;

        setSaving({ _bulk: true });
        const promises = [];
        for (const emp of filtered) {
            for (let d = 1; d <= daysInMonth; d++) {
                const cellDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                promises.push(fetch('/api/hr/daily-attendance', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ employeeId: emp.id, date: cellDate, status: 'Đi làm' }),
                }));
            }
        }
        // batch in chunks of 20
        for (let i = 0; i < promises.length; i += 20) {
            await Promise.all(promises.slice(i, i + 20));
        }
        setSaving({});
        load();
    };

    const filteredEmployees = filterDept ? employees.filter(e => e.department?.name === filterDept) : employees;

    // Stats for day view
    const merged = filteredEmployees.map(emp => {
        const rec = records.find(r => r.employeeId === emp.id);
        return { ...emp, attendance: rec };
    });
    const present = merged.filter(e => ['Đi làm', 'Trễ'].includes(e.attendance?.status)).length;
    const absent = merged.filter(e => ['Vắng', 'Nghỉ phép', 'Nghỉ không lương'].includes(e.attendance?.status)).length;
    const notMarked = merged.filter(e => !e.attendance).length;

    const renderMonthCalendar = () => {
        const [y, m] = date.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();

        // Build status map from records
        const recMap = {};
        records.forEach(r => {
            const day = new Date(r.date).getDate();
            recMap[`${r.employeeId}_${day}`] = r.status;
        });

        const isWeekend = (day) => {
            const dow = new Date(y, m - 1, day).getDay();
            return dow === 0 || dow === 6;
        };

        return (
            <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={handleFillAll}
                        disabled={!!saving._bulk}
                    >
                        {saving._bulk ? 'Đang điền...' : '✅ Điền đầy đủ (Đi làm tất cả)'}
                    </button>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click ô để chuyển trạng thái: trống → ĐL → NP → KL → V → trống</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '8px 10px', textAlign: 'left', background: 'var(--bg-secondary)', position: 'sticky', left: 0, zIndex: 3, border: '1px solid var(--border)', minWidth: 140 }}>Nhân viên</th>
                                {Array.from({ length: daysInMonth }, (_, i) => {
                                    const d = i + 1;
                                    const weekend = isWeekend(d);
                                    return (
                                        <th key={d} style={{ width: 28, textAlign: 'center', padding: '6px 2px', background: weekend ? '#f1f5f9' : 'var(--bg-secondary)', border: '1px solid var(--border)', color: weekend ? '#94a3b8' : 'var(--text-primary)' }}>
                                            {d}
                                        </th>
                                    );
                                })}
                                <th style={{ textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', minWidth: 36, color: '#234093' }}>ĐL</th>
                                <th style={{ textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', minWidth: 36, color: '#ef4444' }}>V/NP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.map((emp, ri) => {
                                let workDays = 0, leaveDays = 0;
                                for (let d = 1; d <= daysInMonth; d++) {
                                    const key = `${emp.id}_${d}`;
                                    const status = localGrid[key] !== undefined ? localGrid[key] : recMap[key];
                                    if (['Đi làm', 'Trễ'].includes(status)) workDays++;
                                    else if (status === 'Nửa ngày') { workDays += 0.5; }
                                    else if (['Nghỉ phép', 'Nghỉ không lương', 'Vắng'].includes(status)) leaveDays++;
                                }
                                return (
                                    <tr key={emp.id} style={{ background: ri % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)' }}>
                                        <td style={{ padding: '6px 10px', position: 'sticky', left: 0, background: ri % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)', zIndex: 1, border: '1px solid var(--border)', fontWeight: 500 }}>
                                            {emp.name}
                                            {emp.department?.name && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{emp.department.name}</div>}
                                        </td>
                                        {Array.from({ length: daysInMonth }, (_, i) => {
                                            const d = i + 1;
                                            const key = `${emp.id}_${d}`;
                                            const status = localGrid[key] !== undefined ? localGrid[key] : recMap[key];
                                            const color = status ? STATUS_COLORS[status] : null;
                                            const weekend = isWeekend(d);
                                            return (
                                                <td
                                                    key={d}
                                                    onClick={() => handleCellClick(emp.id, d)}
                                                    title={status || 'Chưa chấm'}
                                                    style={{
                                                        textAlign: 'center', padding: '4px 1px', cursor: 'pointer',
                                                        background: color ? color + '25' : (weekend ? '#f8fafc' : 'transparent'),
                                                        border: '1px solid var(--border)',
                                                        userSelect: 'none',
                                                        transition: 'background 0.1s',
                                                    }}
                                                >
                                                    {status ? (
                                                        <span style={{ fontSize: 9, fontWeight: 700, color, display: 'block', lineHeight: 1.6 }}>{STATUS_ABBR[status] || status[0]}</span>
                                                    ) : (
                                                        <span style={{ fontSize: 9, color: weekend ? '#cbd5e1' : '#e2e8f0' }}>·</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#234093', border: '1px solid var(--border)' }}>{workDays || '—'}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#ef4444', border: '1px solid var(--border)' }}>{leaveDays || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div>
            {/* Header + Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <button onClick={() => setViewMode('day')} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, background: viewMode === 'day' ? '#234093' : 'transparent', color: viewMode === 'day' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>Theo ngày</button>
                    <button onClick={() => setViewMode('month')} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, background: viewMode === 'month' ? '#234093' : 'transparent', color: viewMode === 'month' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>Theo tháng</button>
                </div>
                <input
                    type={viewMode === 'day' ? 'date' : 'month'}
                    value={viewMode === 'month' ? date.slice(0, 7) : date}
                    onChange={e => setDate(viewMode === 'month' ? e.target.value + '-01' : e.target.value)}
                    className="form-input" style={{ width: 160 }}
                />
                {viewMode === 'day' && (
                    <button onClick={() => setDate(today)} className="btn btn-ghost btn-sm">Hôm nay</button>
                )}
                {departments.length > 0 && (
                    <select className="form-select" value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ width: 180, fontSize: 12 }}>
                        <option value="">Tất cả phòng ban</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                )}
            </div>

            {/* Quick stats — day view only */}
            {viewMode === 'day' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 14 }}>
                    {[
                        { label: 'Có mặt', value: present, color: '#16A34A', icon: '✅' },
                        { label: 'Vắng/Nghỉ', value: absent, color: '#DC2626', icon: '❌' },
                        { label: 'Chưa chấm', value: notMarked, color: '#D97706', icon: '⏳' },
                        { label: 'Tổng NV', value: filteredEmployees.length, color: '#234093', icon: '👥' },
                    ].map(s => (
                        <div key={s.label} style={{ padding: '10px 14px', background: s.color + '08', borderRadius: 10, border: `1px solid ${s.color}20` }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.icon} {s.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : viewMode === 'month' ? renderMonthCalendar() : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã NV</th><th>Họ tên</th><th>Phòng ban</th>
                                <th style={{ textAlign: 'center' }}>Check-in</th>
                                <th style={{ textAlign: 'center' }}>Check-out</th>
                                <th style={{ textAlign: 'center' }}>Trạng thái</th>
                                <th style={{ textAlign: 'center' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {merged.map(emp => {
                                const att = emp.attendance;
                                const statusColor = STATUS_COLORS[att?.status] || '#999';
                                return (
                                    <tr key={emp.id}>
                                        <td style={{ fontWeight: 600, color: '#234093', fontSize: 13 }}>{emp.code}</td>
                                        <td style={{ fontWeight: 500 }}>{emp.name}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.department?.name || '—'}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: att?.checkIn ? '#16A34A' : 'var(--text-muted)' }}>{fmtTime(att?.checkIn)}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: att?.checkOut ? '#234093' : 'var(--text-muted)' }}>{fmtTime(att?.checkOut)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {att ? (
                                                <select value={att.status} onChange={e => handleStatus(emp.id, e.target.value)}
                                                    style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: `1px solid ${statusColor}40`, background: statusColor + '10', color: statusColor, fontWeight: 600, cursor: 'pointer' }}>
                                                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                                                </select>
                                            ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                {!att?.checkIn && (
                                                    <button onClick={() => handleCheckIn(emp.id)} disabled={saving[emp.id]} className="btn btn-primary" style={{ fontSize: 10, padding: '3px 10px', minWidth: 0 }}>
                                                        {saving[emp.id] ? '...' : 'Vào'}
                                                    </button>
                                                )}
                                                {att?.checkIn && !att?.checkOut && (
                                                    <button onClick={() => handleCheckOut(emp.id)} disabled={saving[emp.id]} className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 10px', minWidth: 0 }}>
                                                        {saving[emp.id] ? '...' : 'Ra'}
                                                    </button>
                                                )}
                                                {!att && (
                                                    <select onChange={e => { if (e.target.value) handleStatus(emp.id, e.target.value); e.target.value = ''; }}
                                                        style={{ fontSize: 10, padding: '3px 6px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                                        <option value="">Ghi nhận...</option>
                                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 11 }}>
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontWeight: 700, color }}>{STATUS_ABBR[status]}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
