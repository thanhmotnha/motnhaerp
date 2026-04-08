'use client';
import { useState } from 'react';
import { X, Edit3, Trash2, Package, Tag, DollarSign, Warehouse, Truck, Shield, Copy, Check, Plus, Minus, BarChart3, Files } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));

const SUPPLY_ICON = { 'Mua ngoài': '🛒', 'Tự sản xuất': '🏭', 'Gia công ngoài': '🔧', 'Vật tư đặt hàng': '📦' };
const SUPPLY_COLOR = { 'Mua ngoài': '#3b82f6', 'Tự sản xuất': '#22c55e', 'Gia công ngoài': '#f59e0b', 'Vật tư đặt hàng': '#8b5cf6' };

function stockBadge(p) {
    if (p.stock === 0) return { label: 'Hết hàng', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    if (p.stock <= (p.minStock || 5)) return { label: `Sắp hết: ${p.stock}`, bg: '#fefce8', color: '#ca8a04', border: '#fef08a' };
    return { label: `Còn hàng: ${p.stock}`, bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
}

export default function ProductDrawer({ product, onClose, onEdit, onDelete, onDuplicate, onStockUpdate, role }) {
    const [copied, setCopied] = useState(false);
    const [stockMode, setStockMode] = useState(null); // 'in' | 'out'
    const [stockQty, setStockQty] = useState(1);

    if (!product) return null;
    const p = product;
    const badge = stockBadge(p);
    const canSeeFinance = !role || ['giam_doc', 'ke_toan'].includes(role);

    const copyCode = () => {
        navigator.clipboard.writeText(p.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 998,
                animation: 'pdFadeIn 0.2s ease', backdropFilter: 'blur(2px)',
            }} />
            {/* Drawer */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, maxWidth: '92vw',
                background: 'var(--bg, #fff)', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
                zIndex: 999, display: 'flex', flexDirection: 'column',
                animation: 'pdSlideIn 0.25s cubic-bezier(.4,0,.2,1)',
                borderLeft: '1px solid var(--border-color)',
            }}>
                {/* ===== STICKY HEADER ===== */}
                <div style={{
                    padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    background: 'var(--bg, #fff)', position: 'sticky', top: 0, zIndex: 2,
                }}>
                    {/* Thumbnail */}
                    <div style={{
                        width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                        border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--surface-alt, #f8f9fa)', cursor: p.image ? 'zoom-in' : 'default',
                    }} onClick={() => p.image && window.open(p.image, '_blank')}>
                        {p.image
                            ? <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                            : <Package size={24} style={{ opacity: 0.15 }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#234093', lineHeight: 1.3, wordBreak: 'break-word' }}>{p.name}</div>
                        {/* Stock badge */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                        }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: badge.color }} />
                            {badge.label}
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        border: 'none', background: 'var(--surface-alt, #f0f0f0)', cursor: 'pointer',
                        padding: 6, borderRadius: 8, color: 'var(--text-muted)', flexShrink: 0,
                    }}>
                        <X size={18} />
                    </button>
                </div>

                {/* ===== BODY ===== */}
                <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>

                    {/* --- Cụm 1: Thông tin chung --- */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                        <SectionTitle>Thông tin chung</SectionTitle>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <InfoRow label="Mã SP" value={
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'monospace' }}>
                                    {p.code}
                                    <button onClick={copyCode} title="Copy mã SP" style={{
                                        border: 'none', background: 'none', cursor: 'pointer', padding: 2,
                                        color: copied ? '#22c55e' : 'var(--text-muted)', fontSize: 11,
                                    }}>
                                        {copied ? <Check size={12} /> : <Copy size={12} />}
                                    </button>
                                </span>
                            } />
                            <InfoRow label="ĐVT" value={p.unit || '—'} />
                            <InfoRow label="Danh mục" value={
                                <span style={{ fontSize: 12, color: '#234093' }}>
                                    {p.categoryRef?.name || p.category || '—'}
                                </span>
                            } full />
                            <InfoRow label="Thương hiệu" value={p.brand || '—'} />
                            {p.coreBoard && <InfoRow label="Lõi" value={p.coreBoard} />}
                            {p.surfaceCode && <InfoRow label="Mã bề mặt" value={p.surfaceCode} />}
                        </div>
                    </div>

                    {/* --- Cụm 2: Tài chính & Nguồn --- */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                        <SectionTitle>Giá & Nguồn cung</SectionTitle>
                        <div style={{
                            padding: '14px 16px', borderRadius: 10, marginBottom: 12,
                            background: 'linear-gradient(135deg, #1e3a5f 0%, #234093 50%, #3b5998 100%)',
                            color: '#fff',
                        }}>
                            <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2 }}>Giá bán</div>
                            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2, letterSpacing: -0.5 }}>{fmt(p.salePrice)} đ</div>
                            {canSeeFinance && (
                                <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
                                    Nhập: <b>{fmt(p.importPrice)} đ</b>
                                    {p.salePrice > 0 && p.importPrice > 0 && (
                                        <span style={{ marginLeft: 8, opacity: 0.6, fontSize: 11 }}>
                                            (Lãi: {Math.round((p.salePrice - p.importPrice) / p.importPrice * 100)}%)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <InfoRow label="Nguồn cung" value={
                                <span style={{ color: SUPPLY_COLOR[p.supplyType] || '#666', fontWeight: 600, fontSize: 12 }}>
                                    {SUPPLY_ICON[p.supplyType] || ''} {p.supplyType || '—'}
                                </span>
                            } />
                            <InfoRow label="Nhà cung cấp" value={p.supplier || '—'} />
                        </div>
                    </div>

                    {/* --- Cụm 3: Kho --- */}
                    <div style={{ padding: '16px 20px' }}>
                        <SectionTitle>Quản lý kho</SectionTitle>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                            <StockCard label="Tồn hiện tại" value={p.stock ?? 0}
                                color={p.stock === 0 ? '#dc2626' : p.stock <= (p.minStock || 5) ? '#ca8a04' : '#16a34a'} />
                            <StockCard label="Tồn tối thiểu" value={p.minStock ?? 0} color="#6b7280" />
                            <StockCard label="Biến thể" value={p.variants?.length || 0} color="#8b5cf6" />
                        </div>

                        {/* Quick stock update */}
                        {stockMode && (
                            <div style={{
                                marginTop: 12, padding: '12px 14px', borderRadius: 8,
                                border: `2px solid ${stockMode === 'in' ? '#22c55e' : '#ef4444'}`,
                                background: stockMode === 'in' ? '#f0fdf4' : '#fef2f2',
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: stockMode === 'in' ? '#16a34a' : '#dc2626' }}>
                                    {stockMode === 'in' ? '📥 Nhập' : '📤 Xuất'}
                                </span>
                                <input type="number" min={1} value={stockQty} onChange={e => setStockQty(Math.max(1, Number(e.target.value)))}
                                    style={{ width: 70, fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', textAlign: 'center' }} />
                                <button className="btn btn-sm btn-primary" style={{ fontSize: 11 }}
                                    onClick={() => { onStockUpdate?.(p.id, stockMode, stockQty); setStockMode(null); }}>
                                    Xác nhận
                                </button>
                                <button className="btn btn-sm btn-ghost" onClick={() => setStockMode(null)} style={{ fontSize: 11 }}>✕</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== STICKY FOOTER ===== */}
                <div style={{
                    padding: '12px 20px', borderTop: '1px solid var(--border-color)',
                    display: 'flex', gap: 8, alignItems: 'center',
                    background: 'var(--bg, #fff)', position: 'sticky', bottom: 0, zIndex: 2,
                }}>
                    <button className="btn btn-primary" style={{
                        flex: 1, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '10px 0',
                    }} onClick={() => { onEdit(p); onClose(); }}>
                        <Edit3 size={14} /> Chỉnh sửa
                    </button>
                    <button className="btn" style={{
                        fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                        padding: '10px 14px', background: 'var(--surface-alt, #f0f0f0)',
                        border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer',
                    }} onClick={() => setStockMode(stockMode ? null : 'in')}>
                        <BarChart3 size={14} /> Nhập/Xuất kho
                    </button>
                    <button onClick={() => { onDuplicate?.(p.id); onClose(); }}
                        style={{
                            border: 'none', background: 'none', cursor: 'pointer', padding: 8,
                            color: '#234093', opacity: 0.7, borderRadius: 6,
                        }} title="Nhân bản sản phẩm">
                        <Files size={16} />
                    </button>
                    <button onClick={() => { if (confirm(`Xóa "${p.name}"?`)) { onDelete(p.id); onClose(); } }}
                        style={{
                            border: 'none', background: 'none', cursor: 'pointer', padding: 8,
                            color: '#dc2626', opacity: 0.6, borderRadius: 6,
                        }} title="Xóa sản phẩm">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes pdFadeIn { from { opacity: 0 } to { opacity: 1 } }
                @keyframes pdSlideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
            `}</style>
        </>
    );
}

function SectionTitle({ children }) {
    return (
        <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 6,
        }}>
            <div style={{ width: 3, height: 12, borderRadius: 2, background: '#234093' }} />
            {children}
        </div>
    );
}

function InfoRow({ label, value, full }) {
    return (
        <div style={{ gridColumn: full ? '1 / -1' : undefined, marginBottom: 2 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</div>
        </div>
    );
}

function StockCard({ label, value, color }) {
    return (
        <div style={{
            padding: '10px 12px', borderRadius: 8, textAlign: 'center',
            border: '1px solid var(--border-color)', background: 'var(--surface-alt, #f8f9fa)',
        }}>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        </div>
    );
}
