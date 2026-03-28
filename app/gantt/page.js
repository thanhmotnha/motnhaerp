'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search, Filter, X } from 'lucide-react';

// ─── constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
    'Khảo sát':          { bg: '#60a5fa', text: '#1e3a8a' },
    'Thiết kế':          { bg: '#a78bfa', text: '#4c1d95' },
    'Chuẩn bị thi công': { bg: '#fb923c', text: '#7c2d12' },
    'Đang thi công':     { bg: '#34d399', text: '#064e3b' },
    'Hoàn thành':        { bg: '#9ca3af', text: '#1f2937' },
    'Bàn giao':          { bg: '#6ee7b7', text: '#065f46' },
    'Tạm dừng':          { bg: '#fbbf24', text: '#78350f' },
    'Hủy':               { bg: '#f87171', text: '#7f1d1d' },
};
const STATUS_LIST = Object.keys(STATUS_COLORS);
const TYPE_LIST   = ['Xây dựng', 'Nội thất', 'Xây dựng & Nội thất'];

const ROW_H     = 46;
const LABEL_W   = 240;
const COL_W_DAY = 30;   // px per day
const HEADER_H  = 64;
const PAD_DAYS  = 14;   // padding before first / after last project

// ─── helpers ──────────────────────────────────────────────────────────────────
function parseDate(s) { return s ? new Date(s) : null; }
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmtDate(d) { return d ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'; }
function fmtDateShort(d) { return d ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' }) : ''; }

// ─── Gantt timeline header ─────────────────────────────────────────────────────
function TimelineHeader({ originDate, totalDays, colW, todayOffsetPx }) {
    // build month blocks
    const months = [];
    let cursor = new Date(originDate);
    while (cursor < addDays(originDate, totalDays)) {
        const y = cursor.getFullYear(), m = cursor.getMonth();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const startOff = daysBetween(originDate, cursor);
        const endOff   = Math.min(startOff + daysInMonth - cursor.getDate(), totalDays);
        months.push({ label: cursor.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }), startPx: startOff * colW, widthPx: (endOff - startOff) * colW });
        cursor = new Date(y, m + 1, 1);
    }

    // week tick marks every 7 days
    const ticks = [];
    for (let d = 0; d < totalDays; d += 7) {
        const tickDate = addDays(originDate, d);
        ticks.push({ d, label: tickDate.getDate() });
    }

    return (
        <svg width={totalDays * colW} height={HEADER_H} style={{ display: 'block' }}>
            {/* today highlight column */}
            {todayOffsetPx >= 0 && todayOffsetPx < totalDays * colW && (
                <rect x={todayOffsetPx} y={0} width={colW} height={HEADER_H} fill="rgba(52,211,153,0.15)" />
            )}
            {/* month bands */}
            {months.map((mo, i) => (
                <g key={i}>
                    <rect x={mo.startPx} y={0} width={mo.widthPx} height={32}
                        fill={i % 2 === 0 ? '#1e3a6e' : '#162d55'}
                        stroke="#234093" strokeWidth={0.5} />
                    <text x={mo.startPx + 8} y={21} fill="#a0c4f8" fontSize={11} fontWeight={600}
                        clipPath={`url(#clip-${i})`}>
                        {mo.label}
                    </text>
                    <clipPath id={`clip-${i}`}>
                        <rect x={mo.startPx} y={0} width={mo.widthPx} height={32} />
                    </clipPath>
                </g>
            ))}
            {/* week ticks */}
            {ticks.map(({ d, label }) => (
                <g key={d}>
                    <line x1={d * colW} y1={32} x2={d * colW} y2={HEADER_H}
                        stroke="#234093" strokeWidth={0.5} />
                    <text x={d * colW + 3} y={HEADER_H - 6} fill="#7ea8d8" fontSize={9}>
                        {label}
                    </text>
                </g>
            ))}
            {/* today marker */}
            {todayOffsetPx >= 0 && (
                <line x1={todayOffsetPx + colW / 2} y1={0} x2={todayOffsetPx + colW / 2} y2={HEADER_H}
                    stroke="#34d399" strokeWidth={1.5} strokeDasharray="3,2" />
            )}
        </svg>
    );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function Tooltip({ project, x, y, colW }) {
    if (!project) return null;
    const sc = STATUS_COLORS[project.status] || { bg: '#60a5fa', text: '#1e3a8a' };
    return (
        <div style={{
            position: 'fixed', left: x + 12, top: y - 8,
            background: '#0f2040', border: '1px solid #234093',
            borderRadius: 10, padding: '10px 14px', zIndex: 9999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: 220, pointerEvents: 'none',
            fontSize: 12,
        }}>
            <div style={{ fontWeight: 700, color: '#e2efff', marginBottom: 6, fontSize: 13 }}>
                {project.name}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ background: sc.bg, color: sc.text, borderRadius: 4, padding: '1px 7px', fontWeight: 600, fontSize: 11 }}>
                    {project.status}
                </span>
                {project.type && <span style={{ color: '#7ea8d8', fontSize: 11 }}>{project.type}</span>}
            </div>
            {project.customer?.name && (
                <div style={{ color: '#7ea8d8', marginBottom: 3 }}>
                    👤 {project.customer.name}
                </div>
            )}
            <div style={{ color: '#7ea8d8', marginBottom: 3 }}>
                📅 {fmtDate(parseDate(project.startDate))} → {fmtDate(parseDate(project.endDate))}
            </div>
            <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: '#7ea8d8' }}>Tiến độ</span>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>{project.progress ?? 0}%</span>
                </div>
                <div style={{ background: '#234093', borderRadius: 4, height: 6, width: '100%' }}>
                    <div style={{
                        width: `${project.progress ?? 0}%`, height: '100%',
                        background: '#34d399', borderRadius: 4,
                    }} />
                </div>
            </div>
        </div>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function GanttPage() {
    const [projects, setProjects]     = useState([]);
    const [loading, setLoading]       = useState(true);
    const [tooltip, setTooltip]       = useState(null); // { project, x, y }
    const [filterStatus, setFStatus]  = useState('');
    const [filterType, setFType]      = useState('');
    const [search, setSearch]         = useState('');
    const [colW, setColW]             = useState(COL_W_DAY);
    const scrollRef                   = useRef(null);

    // fetch
    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/projects?limit=300&milestones=1');
            const data = await res.json();
            setProjects(Array.isArray(data.data) ? data.data : []);
        } catch {
            setProjects([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    // filter
    const filtered = projects.filter(p => {
        if (filterStatus && p.status !== filterStatus) return false;
        if (filterType   && p.type   !== filterType)   return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // compute timeline bounds
    const today = new Date(); today.setHours(0,0,0,0);
    const validDates = filtered.flatMap(p => [parseDate(p.startDate), parseDate(p.endDate)].filter(Boolean));
    const minDate = validDates.length > 0
        ? addDays(new Date(Math.min(...validDates)), -PAD_DAYS)
        : addDays(today, -PAD_DAYS);
    const maxDate = validDates.length > 0
        ? addDays(new Date(Math.max(...validDates)), PAD_DAYS)
        : addDays(today, PAD_DAYS * 2);
    minDate.setHours(0,0,0,0); maxDate.setHours(0,0,0,0);
    const totalDays      = Math.max(daysBetween(minDate, maxDate), 60);
    const todayOffsetPx  = daysBetween(minDate, today) * colW;
    const totalWidthPx   = totalDays * colW;

    // scroll to today on load
    useEffect(() => {
        if (loading || !scrollRef.current) return;
        const el = scrollRef.current;
        const targetScroll = Math.max(0, todayOffsetPx - el.clientWidth / 3);
        el.scrollLeft = targetScroll;
    }, [loading, todayOffsetPx]);

    // ── row bar ───────────────────────────────────────────────────────────────
    function renderBar(p, idx) {
        const sd = parseDate(p.startDate);
        const ed = parseDate(p.endDate);
        if (!sd || !ed || ed < sd) return null;

        const x    = daysBetween(minDate, sd) * colW;
        const w    = Math.max(daysBetween(sd, ed) * colW, colW);
        const pct  = Math.min(100, Math.max(0, p.progress ?? 0));
        const sc   = STATUS_COLORS[p.status] || { bg: '#60a5fa', text: '#1e3a8a' };
        const y    = idx * ROW_H + 9;
        const barH = 28;

        return (
            <g key={p.id}
                onMouseEnter={e => setTooltip({ project: p, x: e.clientX, y: e.clientY })}
                onMouseMove={e  => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: 'pointer' }}
                onClick={() => window.open(`/projects/${p.code}`, '_blank')}
            >
                {/* background bar */}
                <rect x={x} y={y} width={w} height={barH} rx={6}
                    fill={sc.bg + '33'} stroke={sc.bg + '88'} strokeWidth={1} />
                {/* progress fill */}
                <rect x={x} y={y} width={w * pct / 100} height={barH} rx={6}
                    fill={sc.bg} opacity={0.85} />
                {/* label inside bar */}
                {w > 60 && (
                    <text x={x + 8} y={y + 18} fill={sc.text} fontSize={10}
                        fontWeight={600} clipPath={`url(#bar-clip-${p.id})`}>
                        {pct}% · {p.name}
                    </text>
                )}
                <clipPath id={`bar-clip-${p.id}`}>
                    <rect x={x} y={y} width={w} height={barH} />
                </clipPath>
                {/* milestones */}
                {(p.milestones ?? []).filter(m => m.dueDate).map((m, mi) => {
                    const _md = new Date(m.dueDate); _md.setHours(0,0,0,0);
                    const mx = daysBetween(minDate, _md) * colW;
                    return (
                        <g key={mi}>
                            <polygon
                                points={`${mx},${y + 4} ${mx + 7},${y + barH / 2} ${mx},${y + barH - 4} ${mx - 7},${y + barH / 2}`}
                                fill={m.status === 'Hoàn thành' ? '#fbbf24' : '#f87171'}
                                opacity={0.9}
                            />
                        </g>
                    );
                })}
            </g>
        );
    }

    const gridH = Math.max(filtered.length * ROW_H, 100);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100vh - 120px)', minHeight: 400 }}>

            {/* ── Toolbar ── */}
            <div style={{
                display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
                padding: '12px 16px', background: '#0f2040',
                borderRadius: '12px 12px 0 0', borderBottom: '1px solid #234093',
            }}>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e2efff', flex: '0 0 auto' }}>
                    📅 Gantt Chart
                </h1>
                <div style={{ flex: 1 }} />

                {/* search */}
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#7ea8d8' }} />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Tìm tên dự án…"
                        style={{
                            paddingLeft: 28, paddingRight: 28, height: 32, border: '1px solid #234093',
                            borderRadius: 6, background: '#162d55', color: '#e2efff', fontSize: 12, width: 180,
                            outline: 'none',
                        }}
                    />
                    {search && (
                        <button onClick={() => setSearch('')}
                            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#7ea8d8', padding: 0 }}>
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* filter status */}
                <select value={filterStatus} onChange={e => setFStatus(e.target.value)}
                    style={{ height: 32, border: '1px solid #234093', borderRadius: 6, background: '#162d55', color: '#e2efff', fontSize: 12, padding: '0 8px' }}>
                    <option value="">Tất cả trạng thái</option>
                    {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                {/* filter type */}
                <select value={filterType} onChange={e => setFType(e.target.value)}
                    style={{ height: 32, border: '1px solid #234093', borderRadius: 6, background: '#162d55', color: '#e2efff', fontSize: 12, padding: '0 8px' }}>
                    <option value="">Tất cả loại</option>
                    {TYPE_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                {/* zoom */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => setColW(v => Math.max(14, v - 6))}
                        style={{ width: 28, height: 28, border: '1px solid #234093', borderRadius: 6, background: '#162d55', color: '#e2efff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ color: '#7ea8d8', fontSize: 11, minWidth: 40, textAlign: 'center' }}>{colW}px</span>
                    <button onClick={() => setColW(v => Math.min(80, v + 6))}
                        style={{ width: 28, height: 28, border: '1px solid #234093', borderRadius: 6, background: '#162d55', color: '#e2efff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>

                <button onClick={fetchProjects} title="Làm mới"
                    style={{ width: 32, height: 32, border: '1px solid #234093', borderRadius: 6, background: '#162d55', color: '#7ea8d8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw size={14} className={loading ? 'spin' : ''} />
                </button>
            </div>

            {/* ── Body ── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#0a1a35' }}>

                {/* Label column */}
                <div style={{
                    width: LABEL_W, flexShrink: 0,
                    borderRight: '1px solid #234093',
                    display: 'flex', flexDirection: 'column',
                }}>
                    {/* header spacer */}
                    <div style={{
                        height: HEADER_H, borderBottom: '1px solid #234093',
                        display: 'flex', alignItems: 'flex-end', padding: '0 12px 8px',
                        background: '#0f2040',
                    }}>
                        <span style={{ fontSize: 10, color: '#7ea8d8', textTransform: 'uppercase', letterSpacing: 1 }}>
                            Dự án ({filtered.length})
                        </span>
                    </div>
                    {/* rows */}
                    <div style={{ flex: 1, overflowY: 'hidden' }} id="label-scroll">
                        {loading ? (
                            <div style={{ padding: 20, color: '#7ea8d8', fontSize: 13, textAlign: 'center' }}>Đang tải…</div>
                        ) : filtered.length === 0 ? (
                            <div style={{ padding: 20, color: '#7ea8d8', fontSize: 13, textAlign: 'center' }}>Không có dự án</div>
                        ) : (
                            filtered.map((p, i) => {
                                const sc = STATUS_COLORS[p.status] || { bg: '#60a5fa', text: '#fff' };
                                return (
                                    <div key={p.id} style={{
                                        height: ROW_H, display: 'flex', flexDirection: 'column',
                                        justifyContent: 'center', padding: '0 8px 0 12px',
                                        background: i % 2 === 0 ? 'transparent' : 'rgba(35,64,147,0.12)',
                                        borderBottom: '1px solid rgba(35,64,147,0.3)',
                                        cursor: 'pointer',
                                    }}
                                        onClick={() => window.open(`/projects/${p.code}`, '_blank')}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: 12, color: '#e2efff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                                            <span style={{ fontSize: 9, background: sc.bg + '33', color: sc.bg, borderRadius: 3, padding: '0 5px', border: `1px solid ${sc.bg}55` }}>{p.status}</span>
                                            {p.customer?.name && <span style={{ fontSize: 9, color: '#5a80b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.customer.name}</span>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Timeline scroll area */}
                <div ref={scrollRef}
                    style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}
                    onScroll={e => {
                        const labelScroll = document.getElementById('label-scroll');
                        if (labelScroll) labelScroll.scrollTop = e.currentTarget.scrollTop;
                    }}
                >
                    <div style={{ width: totalWidthPx, minWidth: '100%' }}>
                        {/* sticky-ish header */}
                        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0f2040', borderBottom: '1px solid #234093' }}>
                            <TimelineHeader
                                originDate={minDate}
                                totalDays={totalDays}
                                colW={colW}
                                todayOffsetPx={todayOffsetPx}
                            />
                        </div>

                        {/* grid + bars */}
                        {!loading && filtered.length > 0 && (
                            <svg width={totalWidthPx} height={gridH} style={{ display: 'block' }}>
                                {/* alternating row bg */}
                                {filtered.map((_, i) => (
                                    <rect key={i} x={0} y={i * ROW_H} width={totalWidthPx} height={ROW_H}
                                        fill={i % 2 === 0 ? 'transparent' : 'rgba(35,64,147,0.12)'}
                                    />
                                ))}
                                {/* vertical week lines */}
                                {Array.from({ length: Math.ceil(totalDays / 7) }, (_, i) => (
                                    <line key={i} x1={i * 7 * colW} y1={0} x2={i * 7 * colW} y2={gridH}
                                        stroke="#234093" strokeWidth={0.5} />
                                ))}
                                {/* horizontal row separators */}
                                {filtered.map((_, i) => (
                                    <line key={i} x1={0} y1={(i + 1) * ROW_H} x2={totalWidthPx} y2={(i + 1) * ROW_H}
                                        stroke="rgba(35,64,147,0.3)" strokeWidth={0.5} />
                                ))}
                                {/* today line */}
                                <line x1={todayOffsetPx + colW / 2} y1={0} x2={todayOffsetPx + colW / 2} y2={gridH}
                                    stroke="#34d399" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.7} />
                                {/* bars */}
                                {filtered.map((p, i) => renderBar(p, i))}
                            </svg>
                        )}
                        {!loading && filtered.length === 0 && (
                            <div style={{ padding: 60, textAlign: 'center', color: '#5a80b8', fontSize: 14 }}>
                                Không tìm thấy dự án nào khớp bộ lọc
                            </div>
                        )}
                        {loading && (
                            <div style={{ padding: 60, textAlign: 'center', color: '#5a80b8', fontSize: 14 }}>
                                Đang tải dữ liệu…
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Legend ── */}
            <div style={{
                display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
                padding: '8px 16px', background: '#0f2040',
                borderRadius: '0 0 12px 12px', borderTop: '1px solid #234093',
                fontSize: 10, color: '#7ea8d8',
            }}>
                <span style={{ fontWeight: 600 }}>Trạng thái:</span>
                {STATUS_LIST.map(s => {
                    const c = STATUS_COLORS[s];
                    return (
                        <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: c.bg, display: 'inline-block' }} />
                            {s}
                        </span>
                    );
                })}
                <span style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, background: '#fbbf24', clipPath: 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)' }} />
                    Milestone hoàn thành
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, background: '#f87171', clipPath: 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)' }} />
                    Milestone chưa xong
                </span>
            </div>

            {/* Tooltip portal */}
            <Tooltip {...(tooltip ?? {})} colW={colW} />

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
