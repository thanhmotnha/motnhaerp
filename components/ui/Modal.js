'use client';
import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 600 }) {
    const overlayRef = useRef(null);
    const contentRef = useRef(null);

    const handleEscape = useCallback((e) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
            // Focus trap: focus first focusable element
            setTimeout(() => {
                const focusable = contentRef.current?.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
                focusable?.focus();
            }, 50);
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            className="modal-overlay"
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.5)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
        >
            <div
                ref={contentRef}
                style={{
                    background: 'var(--bg-primary, white)', borderRadius: 16,
                    width: '100%', maxWidth, maxHeight: '90vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}
            >
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 24px', borderBottom: '1px solid var(--border, #e5e7eb)',
                }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h3>
                    <button
                        onClick={onClose}
                        aria-label="Đóng"
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: 4, borderRadius: 8, color: 'var(--text-muted, #666)',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div style={{ padding: 24, overflow: 'auto', flex: 1 }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
