'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const CATEGORIES = ['Tủ bếp', 'Tủ áo', 'Bàn', 'Giường', 'Kệ TV', 'Phòng tắm', 'Khác'];

export default function FurnitureTemplatesPage() {
    const toast = useToast();
    const router = useRouter();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editId, setEditId] = useState(null);

    const fetchTemplates = useCallback(async () => {
        try {
            const data = await apiFetch('/api/furniture-templates');
            setTemplates(Array.isArray(data) ? data : []);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const deleteTemplate = async (id, name) => {
        if (!confirm(`Xóa mẫu "${name}"?`)) return;
        try {
            await apiFetch(`/api/furniture-templates/${id}`, { method: 'DELETE' });
            toast.success('Đã xóa mẫu');
            fetchTemplates();
        } catch (e) { toast.error(e.message); }
    };

    const toggleActive = async (id, current) => {
        try {
            await apiFetch(`/api/furniture-templates/${id}`, { method: 'PUT', body: JSON.stringify({ isActive: !current }) });
            toast.success(current ? 'Đã ẩn mẫu' : 'Đã kích hoạt mẫu');
            fetchTemplates();
        } catch (e) { toast.error(e.message); }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: 0 }}>Mẫu Nội Thất</h2>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Quản lý bộ mẫu tủ bếp, tủ áo, bàn... để tạo đơn nhanh</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => router.push('/furniture')} style={{ fontSize: 12 }}>← Đơn hàng</button>
                    <button className="btn btn-primary" onClick={() => { setEditId(null); setShowCreate(true); }}>+ Tạo mẫu mới</button>
                </div>
            </div>

            {(showCreate || editId) && (
                <TemplateForm
                    editId={editId}
                    onClose={() => { setShowCreate(false); setEditId(null); }}
                    onSaved={() => { setShowCreate(false); setEditId(null); fetchTemplates(); }}
                />
            )}

            <div className="card">
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : templates.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có mẫu nào. Nhấn "+ Tạo mẫu mới" để bắt đầu.</div>
                ) : (
                    <table className="data-table">
                        <thead><tr>
                            <th>Mã</th><th>Tên mẫu</th><th>Danh mục</th><th>Items</th><th>VL</th><th>Trạng thái</th><th></th>
                        </tr></thead>
                        <tbody>
                            {templates.map(t => (
                                <tr key={t.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: 13 }}>{t.code}</td>
                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                                        {t.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.description.substring(0, 60)}</div>}
                                    </td>
                                    <td><span className="badge info" style={{ fontSize: 10 }}>{t.category || '—'}</span></td>
                                    <td style={{ fontSize: 13, fontWeight: 600 }}>{t.items?.length || 0}</td>
                                    <td style={{ fontSize: 13 }}>{t.materials?.length || 0}</td>
                                    <td>
                                        <span className={`badge ${t.isActive ? 'success' : 'muted'}`} style={{ fontSize: 10, cursor: 'pointer' }}
                                            onClick={() => toggleActive(t.id, t.isActive)}>
                                            {t.isActive ? 'Hoạt động' : 'Ẩn'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setEditId(t.id)}>Sửa</button>
                                            <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--status-danger)' }} onClick={() => deleteTemplate(t.id, t.name)}>Xóa</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function TemplateForm({ editId, onClose, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState({ name: '', description: '', category: '', roomType: '', styleNote: '' });
    const [items, setItems] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(!!editId);

    useEffect(() => {
        if (!editId) return;
        apiFetch(`/api/furniture-templates/${editId}`).then(t => {
            setForm({ name: t.name, description: t.description, category: t.category, roomType: t.roomType, styleNote: t.styleNote });
            setItems(t.items || []);
            setMaterials(t.materials || []);
            setLoading(false);
        }).catch(e => { toast.error(e.message); onClose(); });
    }, [editId]);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const addItem = () => setItems(i => [...i, { name: '', unit: 'bộ', qty: 1, unitPrice: 0, notes: '' }]);
    const updateItem = (idx, key, val) => setItems(i => i.map((it, ii) => ii === idx ? { ...it, [key]: val } : it));
    const removeItem = (idx) => setItems(i => i.filter((_, ii) => ii !== idx));

    const addMaterial = () => setMaterials(m => [...m, { area: 'Thùng tủ', materialName: '', colorCode: '', unit: 'tấm', qty: 1 }]);
    const updateMat = (idx, key, val) => setMaterials(m => m.map((it, ii) => ii === idx ? { ...it, [key]: val } : it));
    const removeMat = (idx) => setMaterials(m => m.filter((_, ii) => ii !== idx));

    const save = async () => {
        if (!form.name.trim()) { toast.error('Nhập tên mẫu'); return; }
        setSaving(true);
        try {
            const body = { ...form, items: items.filter(i => i.name.trim()), materials: materials.filter(m => m.materialName.trim()) };
            if (editId) {
                await apiFetch(`/api/furniture-templates/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
                toast.success('Đã cập nhật mẫu');
            } else {
                await apiFetch('/api/furniture-templates', { method: 'POST', body: JSON.stringify(body) });
                toast.success('Đã tạo mẫu mới');
            }
            onSaved();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    if (loading) return <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', marginBottom: 16 }}>Đang tải...</div>;

    return (
        <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{editId ? 'Sửa mẫu' : 'Tạo mẫu mới'}</div>
                <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={onClose}>✕ Đóng</button>
            </div>

            {/* Basic info */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div><label className="form-label">Tên mẫu *</label><input className="form-input" value={form.name} onChange={set('name')} placeholder="VD: Bộ tủ bếp Acrylic" /></div>
                <div><label className="form-label">Danh mục</label>
                    <select className="form-select" value={form.category} onChange={set('category')}>
                        <option value="">— Chọn —</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div><label className="form-label">Phòng</label><input className="form-input" value={form.roomType} onChange={set('roomType')} placeholder="Bếp" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div><label className="form-label">Phong cách</label><input className="form-input" value={form.styleNote} onChange={set('styleNote')} placeholder="Hiện đại" /></div>
                <div><label className="form-label">Mô tả</label><input className="form-input" value={form.description} onChange={set('description')} /></div>
            </div>

            {/* Items */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Hạng mục ({items.length})</div>
                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={addItem}>+ Thêm</button>
                </div>
                {items.map((it, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 1fr 1fr auto', gap: 6, marginBottom: 6, alignItems: 'end' }}>
                        <input className="form-input" style={{ fontSize: 12 }} value={it.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Tên hạng mục *" />
                        <input className="form-input" style={{ fontSize: 12 }} value={it.unit} onChange={e => updateItem(i, 'unit', e.target.value)} placeholder="ĐVT" />
                        <input type="number" className="form-input" style={{ fontSize: 12 }} value={it.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} min={0} />
                        <input type="number" className="form-input" style={{ fontSize: 12 }} value={it.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} placeholder="Đơn giá" min={0} />
                        <input className="form-input" style={{ fontSize: 12 }} value={it.notes || ''} onChange={e => updateItem(i, 'notes', e.target.value)} placeholder="Ghi chú" />
                        <button style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: 16 }} onClick={() => removeItem(i)}>×</button>
                    </div>
                ))}
            </div>

            {/* Materials */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Vật liệu mặc định ({materials.length})</div>
                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={addMaterial}>+ Thêm</button>
                </div>
                {materials.map((m, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 80px 80px auto', gap: 6, marginBottom: 6, alignItems: 'end' }}>
                        <select className="form-select" style={{ fontSize: 12 }} value={m.area} onChange={e => updateMat(i, 'area', e.target.value)}>
                            <option value="Thùng tủ">Thùng tủ</option>
                            <option value="Cánh tủ">Cánh tủ</option>
                            <option value="Phụ kiện">Phụ kiện</option>
                            <option value="Khác">Khác</option>
                        </select>
                        <input className="form-input" style={{ fontSize: 12 }} value={m.materialName} onChange={e => updateMat(i, 'materialName', e.target.value)} placeholder="Tên vật liệu *" />
                        <input className="form-input" style={{ fontSize: 12 }} value={m.colorCode} onChange={e => updateMat(i, 'colorCode', e.target.value)} placeholder="Mã màu" />
                        <input className="form-input" style={{ fontSize: 12 }} value={m.unit} onChange={e => updateMat(i, 'unit', e.target.value)} placeholder="ĐVT" />
                        <input type="number" className="form-input" style={{ fontSize: 12 }} value={m.qty} onChange={e => updateMat(i, 'qty', Number(e.target.value))} min={0} />
                        <button style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: 16 }} onClick={() => removeMat(i)}>×</button>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : editId ? 'Cập nhật mẫu' : 'Tạo mẫu'}</button>
                <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
            </div>
        </div>
    );
}
