'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

const SEARCH_CATEGORIES = [
    { key: 'projects', label: 'Dự án', icon: '🏗️', endpoint: '/api/projects?limit=5&search=' },
    { key: 'customers', label: 'Khách hàng', icon: '👥', endpoint: '/api/customers?limit=5&search=' },
    { key: 'products', label: 'Sản phẩm', icon: '📦', endpoint: '/api/products?limit=5&search=' },
    { key: 'contracts', label: 'Hợp đồng', icon: '📄', endpoint: '/api/contracts?limit=5&search=' },
];

export default function GlobalSearch({ isOpen, onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setQuery('');
            setResults({});
        }
    }, [isOpen]);

    const search = useCallback(async (q) => {
        if (q.length < 2) { setResults({}); return; }
        setLoading(true);

        const allResults = {};
        await Promise.all(SEARCH_CATEGORIES.map(async (cat) => {
            try {
                const res = await fetch(cat.endpoint + encodeURIComponent(q));
                if (res.ok) {
                    const data = await res.json();
                    const items = data.data || data || [];
                    if (items.length > 0) {
                        allResults[cat.key] = { ...cat, items: items.slice(0, 5) };
                    }
                }
            } catch { }
        }));

        setResults(allResults);
        setLoading(false);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => search(query), 300);
        return () => clearTimeout(timer);
    }, [query, search]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const totalResults = Object.values(results).reduce((s, c) => s + c.items.length, 0);
    const hrefMap = { projects: '/projects/', customers: '/customers/', products: '/products/', contracts: '/contracts/' };

    return (
        <>
            {/* Overlay */}
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998, backdropFilter: 'blur(2px)' }} />

            {/* Modal */}
            <div style={{
                position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)',
                width: '90%', maxWidth: 580, zIndex: 9999,
                background: 'var(--bg-primary)', borderRadius: 16,
                border: '1px solid var(--border-color)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                overflow: 'hidden',
            }}>
                {/* Search input */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--border-color)' }}>
                    <Search size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Tìm dự án, khách hàng, sản phẩm, hợp đồng..."
                        style={{
                            flex: 1, border: 'none', outline: 'none', background: 'none',
                            fontSize: 15, padding: '6px 12px', color: 'var(--text-primary)',
                        }}
                    />
                    {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={16} /></button>}
                    <kbd style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 4,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                        color: 'var(--text-muted)', marginLeft: 8,
                    }}>ESC</kbd>
                </div>

                {/* Results */}
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Đang tìm...</div>}

                    {!loading && query.length >= 2 && totalResults === 0 && (
                        <div style={{ padding: 30, textAlign: 'center' }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Không tìm thấy kết quả cho "{query}"</div>
                        </div>
                    )}

                    {Object.values(results).map(cat => (
                        <div key={cat.key}>
                            <div style={{ padding: '8px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg-secondary)' }}>
                                {cat.icon} {cat.label} ({cat.items.length})
                            </div>
                            {cat.items.map(item => (
                                <a
                                    key={item.id}
                                    href={`${hrefMap[cat.key] || '/'}${item.id}`}
                                    onClick={(e) => { e.preventDefault(); onClose(); router.push(`${hrefMap[cat.key] || '/'}${item.id}`); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '10px 18px', textDecoration: 'none', color: 'inherit',
                                        borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                                        transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name || item.code}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {item.code && item.name && item.code !== item.name ? `${item.code} · ` : ''}
                                            {item.customer?.name || item.status || item.category || ''}
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                {query.length < 2 && (
                    <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-muted)' }}>
                        Nhập ít nhất 2 ký tự để tìm kiếm
                    </div>
                )}
            </div>
        </>
    );
}
