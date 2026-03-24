'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';

/**
 * ColorMaterialPicker — Modal chọn màu/vật liệu từ danh mục sản phẩm.
 * Hiển thị sản phẩm dạng lưới swatch (ảnh + mã + tên), lọc theo danh mục, tìm kiếm.
 *
 * Props:
 *   open       — boolean hiển thị modal
 *   onClose    — callback đóng modal
 *   onSelect   — callback(product) khi chọn: { code, name, image, color, id }
 *   title      — tiêu đề modal (mặc định "Chọn màu / vật liệu")
 */
export default function ColorMaterialPicker({ open, onClose, onSelect, title }) {
    const [categories, setCategories] = useState([]);
    const [activeCatId, setActiveCatId] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const searchTimer = useRef(null);
    const modalRef = useRef(null);

    // Reset state when opening, load categories
    useEffect(() => {
        if (!open) return;
        setSearch('');
        setDebouncedSearch('');
        apiFetch('/api/product-categories')
            .then(data => {
                const flat = flattenCategories(data || []);
                setCategories(flat);
                if (flat.length > 0) setActiveCatId(flat[0].id);
            })
            .catch(() => setCategories([]));
    }, [open]);

    // Debounce search
    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(searchTimer.current);
    }, [search]);

    // Load products when category or search changes
    useEffect(() => {
        if (!open) return;
        setLoading(true);
        const params = new URLSearchParams({ limit: '100' });
        if (activeCatId) params.set('categoryId', activeCatId);
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

        apiFetch(`/api/products?${params}`)
            .then(res => {
                setProducts(res.data || res || []);
                setLoading(false);
            })
            .catch(() => { setProducts([]); setLoading(false); });
    }, [open, activeCatId, debouncedSearch]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handle = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handle);
        return () => document.removeEventListener('keydown', handle);
    }, [open, onClose]);

    const handleSelect = useCallback((product) => {
        onSelect({
            id: product.id,
            code: product.code || '',
            name: product.name || '',
            image: product.image || '',
            color: product.color || '',
            surfaceCode: product.surfaceCode || '',
        });
        onClose();
    }, [onSelect, onClose]);

    if (!open) return null;

    return (
        <div className="cmp-overlay" onClick={onClose}>
            <div className="cmp-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="cmp-header">
                    <h3 className="cmp-title">{title || 'Chọn màu / vật liệu'}</h3>
                    <button className="cmp-close" onClick={onClose}>×</button>
                </div>

                {/* Search bar */}
                <div className="cmp-search-bar">
                    <input
                        className="cmp-search-input"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Tìm theo mã, tên, màu..."
                        autoFocus
                    />
                    {search && (
                        <button className="cmp-search-clear" onClick={() => setSearch('')}>×</button>
                    )}
                </div>

                <div className="cmp-body">
                    {/* Category sidebar */}
                    <div className="cmp-categories">
                        <button
                            className={`cmp-cat-btn ${!activeCatId ? 'cmp-cat-active' : ''}`}
                            onClick={() => setActiveCatId(null)}
                        >
                            Tất cả
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                className={`cmp-cat-btn ${activeCatId === cat.id ? 'cmp-cat-active' : ''}`}
                                onClick={() => setActiveCatId(cat.id)}
                                title={cat.fullPath}
                            >
                                {cat.depth > 0 && <span style={{ marginLeft: cat.depth * 10, opacity: 0.3 }}>└</span>}
                                {' '}{cat.name}
                                {cat.count > 0 && <span className="cmp-cat-count">{cat.count}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Product grid */}
                    <div className="cmp-grid-container">
                        {loading ? (
                            <div className="cmp-loading">Đang tải...</div>
                        ) : products.length === 0 ? (
                            <div className="cmp-empty">
                                {debouncedSearch ? `Không tìm thấy "${debouncedSearch}"` : 'Danh mục chưa có sản phẩm'}
                            </div>
                        ) : (
                            <div className="cmp-grid">
                                {products.map(p => (
                                    <div key={p.id} className="cmp-swatch" onClick={() => handleSelect(p)}>
                                        <div className="cmp-swatch-img-wrap">
                                            {p.image ? (
                                                <img src={p.image} alt={p.name} className="cmp-swatch-img" />
                                            ) : (
                                                <div className="cmp-swatch-placeholder">
                                                    {p.color || '?'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="cmp-swatch-info">
                                            <div className="cmp-swatch-code">{p.code || p.surfaceCode || '—'}</div>
                                            <div className="cmp-swatch-name">{p.name}</div>
                                            {p.color && <div className="cmp-swatch-color">{p.color}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Flatten nested category tree into flat array with depth + fullPath */
function flattenCategories(cats, depth = 0, parentPath = '') {
    const result = [];
    for (const cat of cats) {
        const fullPath = parentPath ? `${parentPath} > ${cat.name}` : cat.name;
        result.push({
            id: cat.id,
            name: cat.name,
            depth,
            fullPath,
            count: cat._count?.products || 0,
        });
        if (cat.children && cat.children.length > 0) {
            result.push(...flattenCategories(cat.children, depth + 1, fullPath));
        }
    }
    return result;
}
