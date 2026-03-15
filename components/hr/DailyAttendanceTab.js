'use client';
import { useState, useEffect } from 'react';

const STATUS_OPTIONS = ['Đi làm', 'Trễ', 'Nghỉ phép', 'Nghỉ không lương', 'Vắng', 'Nửa ngày'];
const STATUS_COLORS = {
    'Đi làm': '#16A34A', 'Trễ': '#D97706', 'Nghỉ phép': '#3B82F6',
    'Nghỉ không lương': '#8B5CF6', 'Vắng': '#DC2626', 'Nửa ngày': '#F59E0B',
};

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';

export default function DailyAttendanceTab() {
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [viewMode, setViewMode] = useState('day'); // 'day' | 'month'
    const [records, setRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState({});

    // Load employees list
    useEffect(() => {
        fetch('/api/employees?status=Đang làm&limit=500')
            .then(r => r.json()).then(d => setEmployees(d.data || d || []));
    }, []);

    // Load attendance records
    const load = () => {
        setLoading(true);
        let url;
        if (viewMode === 'day') {
            url = `/api/hr/daily-attendance?date=${date}`;
        } else {
            const [y, m] = date.split('-');
            url = `/api/hr/daily-attendance?month=${y}-${m}`;
        }
        fetch(url).then(r => r.json()).then(d => { setRecords(d.data || []); setLoading(false); });
    };
    useEffect(load, [date, viewMode]);

    // Quick check-in
    const handleCheckIn = async (empId) => {
        setSaving(p => ({ ...p, [empId]: true }));
        await fetch('/api/hr/daily-attendance', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: empId, date, checkIn: new Date().toISOString(), status: 'Đi làm' }),
        });
        load();
        setSaving(p => ({ ...p, [empId]: false }));
    };

    // Quick check-out
    const handleCheckOut = async (empId) => {
        setSaving(p => ({ ...p, [empId]: true }));
        await fetch('/api/hr/daily-attendance', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: empId, date, checkOut: new Date().toISOString() }),
        });
        load();
        setSaving(p => ({ ...p, [empId]: false }));
    };

    // Update status
    const handleStatus = async (empId, status) => {
        setSaving(p => ({ ...p, [empId]: true }));
        await fetch('/api/hr/daily-attendance', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: empId, date, status }),
        });
        load();
        setSaving(p => ({ ...p, [empId]: false }));
    };

    // Build merged list: employees with their attendance record for selected date
    const merged = employees.map(emp => {
        const rec = records.find(r => r.employeeId === emp.id);
        return { ...emp, attendance: rec };
    });

    // Stats
    const present = merged.filter(e => e.attendance?.status === 'Đi làm' || e.attendance?.status === 'Trễ').length;
    const absent = merged.filter(e => ['Vắng', 'Nghỉ phép', 'Nghỉ không lương'].includes(e.attendance?.status)).length;
    const notMarked = merged.filter(e => !e.attendance).length;

    // Month calendar view
    const renderMonthCalendar = () => {
        const [y, m] = date.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        const empMap = {};
        records.forEach(r => {
            if (!empMap[r.employeeId]) empMap[r.employeeId] = { name: r.employee?.name || '', dept: r.employee?.department?.name || '', days: {} };
            const day = new Date(r.date).getDate();
            empMap[r.employeeId].days[day] = r.status;
        });
        const empList = Object.entries(empMap);

        return (
            <div className="table-container">
                <table className="data-table" style={{ fontSize: 11 }}>
                    <thead>
                        <tr>
                            <th style={{ minWidth: 120, position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 2 }}>Nhân viên</th>
                            {Array.from({ length: daysInMonth }, (_, i) => (
                                <th key={i} style={{ textAlign: 'center', minWidth: 28, padding: '6px 2px' }}>{i + 1}</th>
                            ))}
                            <th style={{ textAlign: 'center', minWidth: 40 }}>Tổng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empList.map(([empId, info]) => {
                            const workDays = Object.values(info.days).filter(s => s === 'Đi làm' || s === 'Trễ' || s === 'Nửa ngày').length;
                            return (
                                <tr key={empId}>
                                    <td style={{ position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 1, fontWeight: 600, fontSize: 12 }}>
                                        {info.name}
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{info.dept}</div>
                                    </td>
                                    {Array.from({ length: daysInMonth }, (_, i) => {
                                        const status = info.days[i + 1];
                                        const bgColor = status ? (STATUS_COLORS[status] || '#999') + '20' : 'transparent';
                                        const dotColor = status ? STATUS_COLORS[status] || '#999' : 'transparent';
                                        return (
                                            <td key={i} style={{ textAlign: 'center', padding: '4px 2px', background: bgColor }}>
                                                {status && <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, margin: '0 auto' }} title={status} />}
                                            </td>
                                        );
                                    })}
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#234093' }}>{workDays}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div>
            {/* Header + Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <button onClick={() => setViewMode('day')} style={{ padding: '6px 16px', fontSize: 12, fontWeight: 600, background: viewMode === 'day' ? '#234093' : 'transparent', color: viewMode === 'day' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>Theo ngày</button>
                    <button onClick={() => setViewMode('month')} style={{ padding: '6px 16px', fontSize: 12, fontWeight: 600, background: viewMode === 'month' ? '#234093' : 'transparent', color: viewMode === 'month' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>Theo tháng</button>
                </div>
                <input type={viewMode === 'day' ? 'date' : 'month'} value={viewMode === 'month' ? date.slice(0, 7) : date}
                    onChange={e => setDate(viewMode === 'month' ? e.target.value + '-01' : e.target.value)}
                    className="form-input" style={{ width: 180 }} />
                {viewMode === 'day' && (
                    <button onClick={() => setDate(today)} className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}>Hôm nay</button>
                )}
            </div>

            {/* Quick stats */}
            {viewMode === 'day' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
                    {[
                        { label: 'Có mặt', value: present, color: '#16A34A', icon: '✅' },
                        { label: 'Vắng/Nghỉ', value: absent, color: '#DC2626', icon: '❌' },
                        { label: 'Chưa chấm', value: notMarked, color: '#D97706', icon: '⏳' },
                        { label: 'Tổng NV', value: employees.length, color: '#234093', icon: '👥' },
                    ].map(s => (
                        <div key={s.label} style={{ padding: '10px 14px', background: s.color + '08', borderRadius: 10, border: `1px solid ${s.color}20` }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{s.icon} {s.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : viewMode === 'month' ? renderMonthCalendar() : (
                /* Day view — table */
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
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: att?.checkIn ? '#16A34A' : 'var(--text-muted)' }}>
                                            {fmtTime(att?.checkIn)}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: att?.checkOut ? '#234093' : 'var(--text-muted)' }}>
                                            {fmtTime(att?.checkOut)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {att ? (
                                                <select value={att.status} onChange={e => handleStatus(emp.id, e.target.value)}
                                                    style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: `1px solid ${statusColor}40`, background: statusColor + '10', color: statusColor, fontWeight: 600, cursor: 'pointer' }}>
                                                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                                                </select>
                                            ) : (
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                {!att?.checkIn && (
                                                    <button onClick={() => handleCheckIn(emp.id)} disabled={saving[emp.id]}
                                                        className="btn btn-primary" style={{ fontSize: 10, padding: '3px 10px', minWidth: 0 }}>
                                                        {saving[emp.id] ? '...' : 'Vào'}
                                                    </button>
                                                )}
                                                {att?.checkIn && !att?.checkOut && (
                                                    <button onClick={() => handleCheckOut(emp.id)} disabled={saving[emp.id]}
                                                        className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 10px', minWidth: 0 }}>
                                                        {saving[emp.id] ? '...' : 'Ra'}
                                                    </button>
                                                )}
                                                {!att && (
                                                    <select onChange={e => { if (e.target.value) handleStatus(emp.id, e.target.value); e.target.value = ''; }}
                                                        style={{ fontSize: 10, padding: '3px 6px', borderRadius: 4, border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer' }}>
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
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                        <span style={{ color: 'var(--text-muted)' }}>{status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
