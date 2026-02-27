'use client';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title = 'Xác nhận', message, confirmText = 'Xác nhận', cancelText = 'Hủy', variant = 'danger' }) {
    const colors = {
        danger: { bg: '#FEF2F2', border: '#FECACA', btn: '#DC2626' },
        warning: { bg: '#FFFBEB', border: '#FDE68A', btn: '#D97706' },
        info: { bg: '#EFF6FF', border: '#BFDBFE', btn: '#2563EB' },
    };
    const c = colors[variant] || colors.danger;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={440}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <AlertTriangle size={20} color={c.btn} />
                </div>
                <p style={{ margin: 0, color: 'var(--text-primary, #333)', lineHeight: 1.5 }}>{message}</p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                    onClick={onClose}
                    style={{
                        padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border, #d1d5db)',
                        background: 'transparent', cursor: 'pointer', fontWeight: 500, fontSize: 14,
                    }}
                >
                    {cancelText}
                </button>
                <button
                    onClick={() => { onConfirm(); onClose(); }}
                    style={{
                        padding: '8px 20px', borderRadius: 8, border: 'none',
                        background: c.btn, color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: 14,
                    }}
                >
                    {confirmText}
                </button>
            </div>
        </Modal>
    );
}
