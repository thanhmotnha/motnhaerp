'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserCircle2, ChevronDown, Eye, X } from 'lucide-react';
import { useRole, ROLES } from '@/contexts/RoleContext';

export default function RoleSwitcher() {
    const router = useRouter();
    const { role, realRole, realRoleInfo, roleInfo, isImpersonating, canImpersonate, setImpersonateRole } = useRole();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (!canImpersonate) return null;

    const selectRole = (key) => {
        if (key === realRole) {
            setImpersonateRole(null);
        } else {
            setImpersonateRole(key);
        }
        setOpen(false);
        // Force refresh to re-evaluate role-gated UI
        router.refresh();
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(o => !o)}
                className="header-btn"
                title="Chuyển vai trò xem"
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 10px', borderRadius: 8,
                    background: isImpersonating ? 'rgba(192, 57, 43, 0.12)' : 'transparent',
                    border: isImpersonating ? '1px solid var(--status-danger)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                }}
            >
                {isImpersonating ? <Eye size={16} color="var(--status-danger)" /> : <UserCircle2 size={16} />}
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {roleInfo.icon} {roleInfo.label}
                </span>
                <ChevronDown size={14} />
            </button>

            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: 10, boxShadow: 'var(--shadow-lg)',
                    minWidth: 240, padding: 6, zIndex: 100,
                }}>
                    <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5 }}>
                        XEM VỚI VAI TRÒ
                    </div>
                    {ROLES.map(r => {
                        const isActive = r.key === role;
                        const isReal = r.key === realRole;
                        return (
                            <button
                                key={r.key}
                                onClick={() => selectRole(r.key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    width: '100%', padding: '10px 12px',
                                    background: isActive ? r.color + '15' : 'transparent',
                                    border: 'none', borderRadius: 8, cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <span style={{ fontSize: 18 }}>{r.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {r.label}
                                        {isReal && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)' }}>(của tôi)</span>}
                                    </div>
                                </div>
                                {isActive && <span style={{ color: r.color, fontSize: 16 }}>✓</span>}
                            </button>
                        );
                    })}
                    {isImpersonating && (
                        <>
                            <div style={{ height: 1, background: 'var(--border-color)', margin: '6px 0' }} />
                            <button
                                onClick={() => selectRole(realRole)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    width: '100%', padding: '10px 12px',
                                    background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer',
                                    color: 'var(--status-danger)', fontWeight: 600, fontSize: 13,
                                }}
                            >
                                <X size={14} /> Quay về {realRoleInfo.icon} {realRoleInfo.label}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export function ImpersonateBanner() {
    const { isImpersonating, roleInfo, realRoleInfo, setImpersonateRole } = useRole();
    if (!isImpersonating) return null;
    return (
        <div style={{
            padding: '8px 16px',
            background: 'linear-gradient(90deg, #fee2e2 0%, #fef3c7 100%)',
            borderBottom: '1px solid #fca5a5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: 13,
        }}>
            <Eye size={14} color="#b91c1c" />
            <span style={{ color: '#7f1d1d', fontWeight: 600 }}>
                Bạn đang xem giao diện với vai trò <strong>{roleInfo.icon} {roleInfo.label}</strong>
                {' — '}
                <span style={{ color: '#991b1b' }}>quyền API vẫn là {realRoleInfo.icon} {realRoleInfo.label} gốc</span>
            </span>
            <button
                onClick={() => setImpersonateRole(null)}
                style={{
                    padding: '4px 10px', borderRadius: 6,
                    background: '#dc2626', color: '#fff', border: 'none',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
            >
                ✕ Quay về
            </button>
        </div>
    );
}
