'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const icons = {
    success: <CheckCircle size={18} color="#16A34A" />,
    error: <XCircle size={18} color="#DC2626" />,
    warning: <AlertTriangle size={18} color="#D97706" />,
    info: <Info size={18} color="#2563EB" />,
};

const bgColors = {
    success: '#F0FDF4',
    error: '#FEF2F2',
    warning: '#FFFBEB',
    info: '#EFF6FF',
};

const borderColors = {
    success: '#BBF7D0',
    error: '#FECACA',
    warning: '#FDE68A',
    info: '#BFDBFE',
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const MAX_TOASTS = 3;
    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => {
            const next = [...prev, { id, message, type }];
            return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
        });
        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error', 6000),
        warning: (msg) => addToast(msg, 'warning'),
        info: (msg) => addToast(msg, 'info'),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div
                aria-live="polite"
                style={{
                    position: 'fixed', top: 16, right: 16, zIndex: 2000,
                    display: 'flex', flexDirection: 'column', gap: 8,
                    pointerEvents: 'none',
                }}
            >
                {toasts.map(t => (
                    <div
                        key={t.id}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '12px 16px', borderRadius: 10, minWidth: 300,
                            background: bgColors[t.type], border: `1px solid ${borderColors[t.type]}`,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', pointerEvents: 'auto',
                            animation: 'slideInRight 0.3s ease',
                        }}
                        role="alert"
                    >
                        {icons[t.type]}
                        <span style={{ flex: 1, fontSize: 14 }}>{t.message}</span>
                        <button
                            onClick={() => removeToast(t.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: 4, color: '#9CA3AF', display: 'flex', alignItems: 'center', transition: 'color 0.15s, background 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.color = '#374151'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9CA3AF'; }}
                            aria-label="Đóng thông báo"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) return { success: console.log, error: console.error, warning: console.warn, info: console.log };
    return ctx;
}
