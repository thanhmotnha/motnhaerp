'use client';
import { useState, useEffect, useCallback } from 'react';

const DEFAULT_WIDGETS = [
    { id: 'stats', label: 'Tổng quan', icon: '📊', visible: true, order: 0 },
    { id: 'revenue', label: 'Doanh thu', icon: '💰', visible: true, order: 1 },
    { id: 'projects', label: 'Dự án gần đây', icon: '🏗️', visible: true, order: 2 },
    { id: 'pipeline', label: 'Pipeline', icon: '📈', visible: true, order: 3 },
    { id: 'tasks', label: 'Việc cần làm', icon: '📋', visible: true, order: 4 },
    { id: 'payments', label: 'Thu tiền sắp đến', icon: '💳', visible: false, order: 5 },
    { id: 'expenses', label: 'Chi phí tháng này', icon: '🧾', visible: false, order: 6 },
    { id: 'inventory', label: 'Tồn kho thấp', icon: '📦', visible: false, order: 7 },
];

const STORAGE_KEY = 'dashboard_widgets_config';

export function useDashboardWidgets() {
    const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);
    const [showConfig, setShowConfig] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults (in case new widgets added)
                const merged = DEFAULT_WIDGETS.map(dw => {
                    const savedW = parsed.find(sw => sw.id === dw.id);
                    return savedW ? { ...dw, visible: savedW.visible, order: savedW.order } : dw;
                }).sort((a, b) => a.order - b.order);
                setWidgets(merged);
            }
        } catch { }
    }, []);

    const saveConfig = useCallback((newWidgets) => {
        setWidgets(newWidgets);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets.map(w => ({ id: w.id, visible: w.visible, order: w.order }))));
    }, []);

    const toggleWidget = useCallback((id) => {
        const updated = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
        saveConfig(updated);
    }, [widgets, saveConfig]);

    const moveWidget = useCallback((id, direction) => {
        const idx = widgets.findIndex(w => w.id === id);
        if (idx < 0) return;
        const newIdx = direction === 'up' ? Math.max(0, idx - 1) : Math.min(widgets.length - 1, idx + 1);
        if (idx === newIdx) return;
        const updated = [...widgets];
        [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
        saveConfig(updated.map((w, i) => ({ ...w, order: i })));
    }, [widgets, saveConfig]);

    const resetConfig = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setWidgets(DEFAULT_WIDGETS);
    }, []);

    return { widgets, showConfig, setShowConfig, toggleWidget, moveWidget, resetConfig };
}

export function WidgetConfigurator({ widgets, onToggle, onMove, onReset, onClose }) {
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 998 }} />
            <div style={{
                position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)',
                width: 400, background: 'var(--bg-primary)', borderRadius: 16,
                border: '1px solid var(--border-color)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                zIndex: 999, overflow: 'hidden',
            }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 15 }}>⚙️ Tùy chỉnh Dashboard</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm btn-secondary" onClick={onReset}>Đặt lại</button>
                        <button className="btn btn-sm btn-primary" onClick={onClose}>Xong</button>
                    </div>
                </div>
                <div style={{ padding: 16, maxHeight: 400, overflowY: 'auto' }}>
                    {widgets.map((w, i) => (
                        <div key={w.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px', marginBottom: 6,
                            background: w.visible ? 'var(--bg-card)' : 'transparent',
                            border: '1px solid var(--border-color)', borderRadius: 8,
                            opacity: w.visible ? 1 : 0.5,
                        }}>
                            <span style={{ fontSize: 18 }}>{w.icon}</span>
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{w.label}</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => onMove(w.id, 'up')} disabled={i === 0}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                                <button onClick={() => onMove(w.id, 'down')} disabled={i === widgets.length - 1}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: i === widgets.length - 1 ? 0.3 : 1 }}>↓</button>
                            </div>
                            <label style={{ cursor: 'pointer' }}>
                                <input type="checkbox" checked={w.visible} onChange={() => onToggle(w.id)}
                                    style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }} />
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
