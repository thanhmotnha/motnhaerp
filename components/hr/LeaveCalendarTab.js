'use client';
import { useState, useEffect } from 'react';

const LEAVE_COLORS = {
    'Nghỉ phép': '#3B82F6', 'Nghỉ không lương': '#8B5CF6', 'Vắng': '#DC2626',
    'Chờ duyệt': '#D97706', 'Đã duyệt': '#16A34A', 'Xác nhận': '#234093',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '';

export default function LeaveCalendarTab() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState(null);

    const load = () => {
        setLoading(true);
        const from = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        fetch(`/api/hr/leave-calendar?from=${from}&to=${to}`)
            .then(r => r.json()).then(d => { setEvents(d.data || []); setLoading(false); });
    };
    useEffect(load, [year, month]);

    // Build calendar grid
    const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate();
    const weeks = [];
    let week = Array(7).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
        const dow = (firstDow + d - 1) % 7;
        if (dow === 0 && d > 1) { weeks.push(week); week = Array(7).fill(null); }
        week[dow] = d;
    }
    weeks.push(week);

    // Map events to days
    const dayEvents = {};
    events.forEach(ev => {
        const start = new Date(ev.startDate);
        const end = new Date(ev.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (d.getMonth() + 1 === month && d.getFullYear() === year) {
                const day = d.getDate();
                if (!dayEvents[day]) dayEvents[day] = [];
                dayEvents[day].push(ev);
            }
        }
    });

    // Pending count
    const pendingCount = events.filter(e => e.status === 'Chờ duyệt').length;
    const todayOnLeave = events.filter(e => {
        const today = new Date();
        const start = new Date(e.startDate);
        const end = new Date(e.endDate);
        return today >= start && today <= end && e.status !== 'Chờ duyệt';
    });

    const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
    const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

    const isToday = (d) => d === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();

    // Selected day events
    const selectedEvents = selectedDay ? (dayEvents[selectedDay] || []) : [];
    // Unique by employee
    const uniqueSelected = selectedEvents.reduce((acc, ev) => {
        if (!acc.find(e => e.employeeId === ev.employeeId && e.type === ev.type)) acc.push(ev);
        return acc;
    }, []);

    return (
        <div>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
                <div style={{ padding: '10px 14px', background: '#3B82F610', borderRadius: 10, border: '1px solid #3B82F620' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📋 Đơn nghỉ tháng</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#3B82F6' }}>{events.length}</div>
                </div>
                <div style={{ padding: '10px 14px', background: '#D9770610', borderRadius: 10, border: '1px solid #D9770620' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>⏳ Chờ duyệt</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#D97706' }}>{pendingCount}</div>
                </div>
                <div style={{ padding: '10px 14px', background: '#DC262610', borderRadius: 10, border: '1px solid #DC262620' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>🏖️ Đang nghỉ hôm nay</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626' }}>{todayOnLeave.length}</div>
                </div>
            </div>

            {/* Calendar navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <button onClick={prevMonth} className="btn btn-ghost" style={{ fontSize: 14, padding: '4px 12px' }}>◀</button>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {monthNames[month - 1]} {year}
                </h3>
                <button onClick={nextMonth} className="btn btn-ghost" style={{ fontSize: 14, padding: '4px 12px' }}>▶</button>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--border-color)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    {/* Day headers */}
                    {dayNames.map(d => (
                        <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: d === 'CN' ? '#DC2626' : 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                            {d}
                        </div>
                    ))}
                    {/* Calendar cells */}
                    {weeks.map((week, wi) => week.map((day, di) => {
                        const evts = day ? (dayEvents[day] || []) : [];
                        const hasEvents = evts.length > 0;
                        const isSun = di === 0;
                        return (
                            <div key={`${wi}-${di}`}
                                onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                                style={{
                                    minHeight: 64, padding: '4px 6px', background: isToday(day) ? '#23409310' : 'var(--bg-primary)',
                                    cursor: day ? 'pointer' : 'default', transition: 'background 0.15s',
                                    borderLeft: day === selectedDay ? '3px solid #234093' : '3px solid transparent',
                                }}>
                                {day && (
                                    <>
                                        <div style={{ fontSize: 12, fontWeight: isToday(day) ? 800 : 500, color: isSun ? '#DC2626' : isToday(day) ? '#234093' : 'var(--text-primary)', marginBottom: 2 }}>
                                            {day}
                                        </div>
                                        {hasEvents && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {evts.slice(0, 3).map((ev, i) => (
                                                    <div key={i} style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: (LEAVE_COLORS[ev.type] || '#999') + '20', color: LEAVE_COLORS[ev.type] || '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {ev.employeeName?.split(' ').pop()}
                                                    </div>
                                                ))}
                                                {evts.length > 3 && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{evts.length - 3}</div>}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    }))}
                </div>
            )}

            {/* Selected day detail */}
            {selectedDay && uniqueSelected.length > 0 && (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>
                        📅 Ngày {selectedDay}/{month} — {uniqueSelected.length} người nghỉ
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {uniqueSelected.map(ev => (
                            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: 6, fontSize: 12 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: LEAVE_COLORS[ev.type] || LEAVE_COLORS[ev.status] || '#999', flexShrink: 0 }} />
                                <div style={{ fontWeight: 600, flex: 1 }}>{ev.employeeName}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{ev.department}</div>
                                <div style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: (LEAVE_COLORS[ev.status] || '#999') + '15', color: LEAVE_COLORS[ev.status] || '#999', fontWeight: 600 }}>
                                    {ev.status}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ev.type}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                {Object.entries(LEAVE_COLORS).map(([label, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
