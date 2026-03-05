'use client';
import { useState, useEffect, useCallback } from 'react';

export default function NotificationBell({ style = {} }) {
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        fetch('/api/notifications')
            .then(r => r.ok ? r.json() : { data: [] })
            .then(d => { setNotifications(d.data || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 60000); // refresh mỗi phút
        return () => clearInterval(interval);
    }, [load]);

    const count = notifications.length;

    return (
        <div style={{ position: 'relative', ...style }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 20, padding: 6, borderRadius: 8,
                    transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.target.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.target.style.background = 'none'}
                title="Thông báo"
            >
                🔔
                {count > 0 && (
                    <span style={{
                        position: 'absolute', top: 2, right: 2,
                        background: '#DC2626', color: '#fff',
                        fontSize: 10, fontWeight: 700,
                        minWidth: 16, height: 16,
                        borderRadius: 8, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '0 4px',
                    }}>
                        {count > 9 ? '9+' : count}
                    </span>
                )}
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />

                    {/* Dropdown */}
                    <div style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: 8,
                        width: 320, maxHeight: 400, overflowY: 'auto',
                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                        zIndex: 999,
                    }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: 14 }}>
                            Cần chú ý ({count})
                        </div>
                        {loading ? (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Đang tải...</div>
                        ) : count === 0 ? (
                            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                ✅ Không có gì cần xử lý
                            </div>
                        ) : (
                            <div>
                                {notifications.map((n, i) => {
                                    const typeColor = { warning: '#D97706', danger: '#DC2626', info: '#234093' };
                                    return (
                                        <a
                                            key={i} href={n.link || '#'}
                                            onClick={() => setOpen(false)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                padding: '10px 16px', textDecoration: 'none', color: 'inherit',
                                                borderBottom: '1px solid var(--border-color)',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <span style={{ fontSize: 20 }}>{n.icon}</span>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: typeColor[n.type] || 'var(--text-primary)' }}>
                                                    {n.title}
                                                </div>
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
