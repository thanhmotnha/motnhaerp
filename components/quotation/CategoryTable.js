'use client';
import { fmt, UNIT_OPTIONS } from '@/lib/quotation-constants';

export default function CategoryTable({ cat, ci, hook, onImageClick }) {
    const { updateCategoryName, removeCategory, updateItem, removeItem, addItem } = hook;

    return (
        <div className="card quotation-category-card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-alt, #f0f4ff)' }}>
                <span style={{ fontWeight: 700, fontSize: 14, opacity: 0.5 }}>#{ci + 1}</span>
                <input className="form-input" placeholder="Tên khu vực (VD: Sảnh, Phòng khách...)" value={cat.name}
                    onChange={e => updateCategoryName(ci, e.target.value)} style={{ flex: 1, fontWeight: 600, fontSize: 15 }} />
                <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 14 }}>{fmt(cat.subtotal)} đ</span>
                <button className="btn btn-ghost btn-sm" onClick={() => removeCategory(ci)}>🗑️</button>
            </div>
            <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="data-table quotation-detail-table">
                    <thead>
                        <tr>
                            <th style={{ width: 30 }}>#</th>
                            <th style={{ width: 36 }}></th>
                            <th style={{ minWidth: 160 }}>Hạng mục / Sản phẩm</th>
                            <th style={{ width: 65 }}>Dài (m)</th>
                            <th style={{ width: 65 }}>Rộng (m)</th>
                            <th style={{ width: 65 }}>Cao (m)</th>
                            <th style={{ width: 65 }}>SL</th>
                            <th style={{ width: 55 }}>ĐVT</th>
                            <th style={{ width: 90 }}>Đơn giá</th>
                            <th style={{ width: 100 }}>Thành tiền</th>
                            <th style={{ minWidth: 120 }}>Mô tả</th>
                            <th style={{ width: 30 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {cat.items.map((item, ii) => {
                            const isAutoQty = !!(item.length && item.width);
                            return (
                                <tr key={item._key}>
                                    <td style={{ textAlign: 'center', opacity: 0.4, fontSize: 11 }}>{ii + 1}</td>
                                    <td style={{ textAlign: 'center', padding: 2, cursor: onImageClick ? 'pointer' : 'default' }}
                                        title={onImageClick ? 'Click để tải ảnh' : ''}
                                        onClick={() => onImageClick && onImageClick(ci, ii)}>
                                        {item.image ? (
                                            <img src={item.image} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-color)' }} />
                                        ) : (
                                            <div style={{ width: 28, height: 28, borderRadius: 4, border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, opacity: 0.25 }}>
                                                {onImageClick ? '📷' : '🖼️'}
                                            </div>
                                        )}
                                    </td>
                                    <td><input className="form-input form-input-compact" value={item.name} onChange={e => updateItem(ci, ii, 'name', e.target.value)} placeholder="Tên" /></td>
                                    <td><input className="form-input form-input-compact" type="number" value={item.length || ''} onChange={e => updateItem(ci, ii, 'length', e.target.value)} placeholder="0" /></td>
                                    <td><input className="form-input form-input-compact" type="number" value={item.width || ''} onChange={e => updateItem(ci, ii, 'width', e.target.value)} placeholder="0" /></td>
                                    <td><input className="form-input form-input-compact" type="number" value={item.height || ''} onChange={e => updateItem(ci, ii, 'height', e.target.value)} placeholder="0" /></td>
                                    <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 500 }}>
                                        {isAutoQty ? (
                                            <span title="Tự động tính từ Dài × Rộng × Cao" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                                {fmt(item.quantity)}
                                                <span style={{ fontSize: 9, background: 'var(--accent-primary)', color: '#fff', padding: '1px 4px', borderRadius: 3, lineHeight: 1 }}>auto</span>
                                            </span>
                                        ) : (
                                            <input className="form-input form-input-compact" type="number" value={item.quantity || ''} onChange={e => updateItem(ci, ii, 'quantity', e.target.value)} />
                                        )}
                                    </td>
                                    <td>
                                        <select className="form-select form-input-compact" value={item.unit} onChange={e => updateItem(ci, ii, 'unit', e.target.value)}>
                                            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </td>
                                    <td><input className="form-input form-input-compact" type="number" value={item.unitPrice || ''} onChange={e => updateItem(ci, ii, 'unitPrice', e.target.value)} /></td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 12 }}>{fmt(item.amount)}</td>
                                    <td><input className="form-input form-input-compact" value={item.description} onChange={e => updateItem(ci, ii, 'description', e.target.value)} /></td>
                                    <td><button className="btn btn-ghost" onClick={() => removeItem(ci, ii)} style={{ padding: '2px 4px', fontSize: 11 }}>✕</button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div style={{ padding: '8px 12px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => addItem(ci)}>+ Thêm dòng trống</button>
                </div>
            </div>
        </div>
    );
}
