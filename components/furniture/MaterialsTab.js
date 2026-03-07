'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtDate } from './constants';

const CABINET_AREAS = ['Thùng tủ', 'Cánh tủ', 'Phụ kiện', 'Khác'];

function ProductSearch({ value, onSelect, onTextChange, placeholder = 'Tìm sản phẩm...', toast }) {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (!query.trim() || query.length < 2) { setResults([]); return; }
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await apiFetch(`/api/products?search=${encodeURIComponent(query)}&limit=8`);
                setResults(res.data || []);
                setOpen(true);
            } catch { setResults([]); }
            setSearching(false);
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    return (
        <div style={{ position: 'relative' }}>
            <input className="form-input" placeholder={placeholder} value={query}
                onChange={e => {
                    setQuery(e.target.value);
                    if (onTextChange) onTextChange(e.target.value);
                    if (!e.target.value) onSelect(null);
                }}
                onFocus={() => results.length && setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                style={{ fontSize: 12 }}
            />
            {searching && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-muted)' }}>...</span>}
            {open && results.length > 0 && (
                <div style={{ position: 'absolute', zIndex: 100, top: '100%', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: 200, overflowY: 'auto' }}>
                    {results.map(p => (
                        <div key={p.id} style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border-color)' }}
                            onMouseDown={() => { onSelect(p); setQuery(p.name); setOpen(false); }}>
                            <span style={{ fontWeight: 500 }}>{p.name}</span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{p.code}</span>
                            {p.unit && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>· {p.unit}</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function MaterialsTab({ order, onRefresh, toast }) {
    const selections = order.materialSelections || [];
    const MSTATUS = { pending: 'Chờ xác nhận', reviewing: 'Đang xem xét', confirmed: 'Đã chốt', changed: 'Đã thay đổi' };
    const MCOLOR = { pending: 'muted', reviewing: 'warning', confirmed: 'success', changed: 'info' };

    const [showCreate, setShowCreate] = useState(false);
    const [createTitle, setCreateTitle] = useState('');
    const [createNotes, setCreateNotes] = useState('');
    const emptyItem = () => ({ _key: Date.now() + Math.random(), applicationArea: 'Thùng tủ', materialName: '', productId: null, colorCode: '', quantity: 1, unit: 'cái', notes: '' });
    const [matItems, setMatItems] = useState([emptyItem()]);
    const [creating, setCreating] = useState(false);
    const [confirmForm, setConfirmForm] = useState({ selId: null, confirmedByName: '' });

    const updateItem = (key, field, val) => setMatItems(items => items.map(it => it._key === key ? { ...it, [field]: val } : it));
    const removeItem = (key) => setMatItems(items => items.filter(it => it._key !== key));
    const addItem = (area) => setMatItems(items => [...items, { ...emptyItem(), applicationArea: area }]);

    const createSelection = async () => {
        const validItems = matItems.filter(it => it.materialName.trim());
        if (!validItems.length) { toast.error('Thêm ít nhất 1 vật liệu có tên'); return; }
        setCreating(true);
        try {
            await apiFetch(`/api/furniture-orders/${order.id}/materials`, {
                method: 'POST',
                body: JSON.stringify({ title: createTitle, notes: createNotes, items: validItems }),
            });
            toast.success('Đã tạo đợt chọn vật liệu');
            setShowCreate(false);
            setMatItems([emptyItem()]);
            setCreateTitle('');
            setCreateNotes('');
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setCreating(false);
    };

    const confirmSelection = async (selId) => {
        if (!confirmForm.confirmedByName.trim()) { toast.error('Nhập tên người xác nhận'); return; }
        try {
            await apiFetch(`/api/furniture-orders/${order.id}/materials?selectionId=${selId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'confirmed', confirmedByName: confirmForm.confirmedByName }),
            });
            toast.success('Đã chốt vật liệu');
            setConfirmForm({ selId: null, confirmedByName: '' });
            onRefresh();
        } catch (e) { toast.error(e.message); }
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>Chọn vật liệu ({selections.length} đợt)</div>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setShowCreate(!showCreate)}>+ Tạo đợt chọn VL</button>
            </div>

            {showCreate && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Đợt chọn vật liệu mới</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        <div><label className="form-label">Tiêu đề (tùy chọn)</label><input className="form-input" value={createTitle} onChange={e => setCreateTitle(e.target.value)} placeholder="VD: Đợt 1 - màu chính" /></div>
                        <div><label className="form-label">Ghi chú</label><input className="form-input" value={createNotes} onChange={e => setCreateNotes(e.target.value)} /></div>
                    </div>

                    {CABINET_AREAS.map(area => {
                        const areaItems = matItems.filter(it => it.applicationArea === area);
                        return (
                            <div key={area} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent-primary)' }}>{area}</div>
                                    <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => addItem(area)}>+ Thêm</button>
                                </div>
                                {areaItems.length === 0 && (
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0' }}>Chưa có — nhấn + Thêm</div>
                                )}
                                {areaItems.map(it => (
                                    <div key={it._key} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 80px 1fr auto', gap: 6, marginBottom: 6, alignItems: 'end' }}>
                                        <div>
                                            <label className="form-label" style={{ fontSize: 10 }}>Sản phẩm / Vật liệu *</label>
                                            <ProductSearch toast={toast} value={it.materialName}
                                                onSelect={p => { if (p) updateItem(it._key, 'productId', p.id); updateItem(it._key, 'materialName', p ? p.name : ''); if (p?.unit) updateItem(it._key, 'unit', p.unit); }}
                                                onTextChange={text => { updateItem(it._key, 'materialName', text); updateItem(it._key, 'productId', null); }}
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label" style={{ fontSize: 10 }}>Mã màu</label>
                                            <input className="form-input" style={{ fontSize: 12 }} value={it.colorCode} onChange={e => updateItem(it._key, 'colorCode', e.target.value)} placeholder="VD: W101" />
                                        </div>
                                        <div>
                                            <label className="form-label" style={{ fontSize: 10 }}>SL</label>
                                            <input type="number" className="form-input" style={{ fontSize: 12 }} min={0} value={it.quantity} onChange={e => updateItem(it._key, 'quantity', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="form-label" style={{ fontSize: 10 }}>ĐVT</label>
                                            <input className="form-input" style={{ fontSize: 12 }} value={it.unit} onChange={e => updateItem(it._key, 'unit', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="form-label" style={{ fontSize: 10 }}>Ghi chú</label>
                                            <input className="form-input" style={{ fontSize: 12 }} value={it.notes} onChange={e => updateItem(it._key, 'notes', e.target.value)} />
                                        </div>
                                        <button type="button" style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: 16, paddingBottom: 4 }} onClick={() => removeItem(it._key)}>×</button>
                                    </div>
                                ))}
                            </div>
                        );
                    })}

                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={createSelection} disabled={creating}>{creating ? 'Đang lưu...' : 'Lưu đợt chọn VL'}</button>
                        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setShowCreate(false)}>Hủy</button>
                    </div>
                </div>
            )}

            {selections.length === 0 && !showCreate
                ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có đợt chọn vật liệu</div>
                : selections.map(sel => (
                    <div key={sel.id} style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ fontWeight: 600 }}>Đợt {sel.selectionRound}{sel.title && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>— {sel.title}</span>}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className={`badge ${MCOLOR[sel.status]}`} style={{ fontSize: 10 }}>{MSTATUS[sel.status]}</span>
                                {sel.status === 'pending' && (
                                    confirmForm.selId === sel.id ? (
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <input className="form-input" style={{ fontSize: 11, width: 140, padding: '3px 8px' }}
                                                placeholder="Tên người xác nhận"
                                                value={confirmForm.confirmedByName}
                                                onChange={e => setConfirmForm(f => ({ ...f, confirmedByName: e.target.value }))} />
                                            <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => confirmSelection(sel.id)}>Chốt VL</button>
                                            <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setConfirmForm({ selId: null, confirmedByName: '' })}>Hủy</button>
                                        </div>
                                    ) : (
                                        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => setConfirmForm({ selId: sel.id, confirmedByName: '' })}>Xác nhận chốt</button>
                                    )
                                )}
                            </div>
                        </div>
                        {sel.status === 'confirmed' && sel.confirmedByName && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Xác nhận bởi: {sel.confirmedByName} · {fmtDate(sel.confirmedAt)}</div>
                        )}
                        {(sel.items || []).length > 0 && (
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>Loại tủ</th><th>Vật liệu</th><th>Mã màu</th><th>SL</th><th>ĐVT</th><th>Ghi chú</th></tr></thead>
                                <tbody>
                                    {sel.items.map(mi => (
                                        <tr key={mi.id}>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{mi.applicationArea || '—'}</td>
                                            <td>{mi.materialName}{mi.product && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({mi.product.code})</span>}</td>
                                            <td>{mi.colorCode || '—'}</td>
                                            <td>{mi.quantity || '—'}</td>
                                            <td>{mi.unit || '—'}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{mi.notes || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ))
            }
        </div>
    );
}
