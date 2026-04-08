'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

export default function ExpenseCategoriesPage() {
    const { role } = useRole();
    const toast = useToast();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editItem, setEditItem] = useState(null);
    const canManage = ['giam_doc', 'ke_toan'].includes(role);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/expense-categories?active=0');
            setCategories(res || []);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSave = async (data) => {
        try {
            if (data.id) {
                await apiFetch(`/api/expense-categories/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
                toast.success('Đã cập nhật');
            } else {
                await apiFetch('/api/expense-categories', { method: 'POST', body: JSON.stringify(data) });
                toast.success('Đã tạo hạng mục');
            }
            setEditItem(null);
            fetchData();
        } catch (e) { toast.error(e.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Ẩn hạng mục này?')) return;
        try {
            await apiFetch(`/api/expense-categories/${id}`, { method: 'DELETE' });
            toast.success('Đã ẩn');
            fetchData();
        } catch (e) { toast.error(e.message); }
    };

    const linkLabels = { contractor: 'Thầu phụ', supplier: 'NCC', employee: 'Nhân viên', '': '—' };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0 }}>Hạng mục Chi phí</h2>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Quản lý danh mục chi phí dự án</div>
                </div>
                {canManage && <button className="btn btn-primary" onClick={() => setEditItem({})}>+ Thêm hạng mục</button>}
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div className="card" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr><th>Mã</th><th>Tên</th><th>Mô tả</th><th>Link</th><th>Thứ tự</th><th>Trạng thái</th>{canManage && <th />}</tr>
                        </thead>
                        <tbody>
                            {categories.map(c => (
                                <tr key={c.id} style={{ opacity: c.isActive ? 1 : 0.5 }}>
                                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{c.code}</td>
                                    <td>{c.name}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.description || '—'}</td>
                                    <td><span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, background: 'var(--bg-tertiary)' }}>{linkLabels[c.linkType] || c.linkType || '—'}</span></td>
                                    <td style={{ textAlign: 'center' }}>{c.sortOrder}</td>
                                    <td>{c.isActive ? <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 12 }}>Hoạt động</span> : <span style={{ color: '#ef4444', fontSize: 12 }}>Đã ẩn</span>}</td>
                                    {canManage && (
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <button className="btn" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => setEditItem(c)}>Sửa</button>
                                            {c.isActive && <button className="btn" style={{ fontSize: 12, padding: '4px 8px', color: '#ef4444', marginLeft: 4 }} onClick={() => handleDelete(c.id)}>Ẩn</button>}
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {categories.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Chưa có hạng mục nào</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {editItem && <CategoryForm item={editItem} onClose={() => setEditItem(null)} onSave={handleSave} />}
        </div>
    );
}

function CategoryForm({ item, onClose, onSave }) {
    const [form, setForm] = useState({
        name: item.name || '', code: item.code || '', description: item.description || '',
        linkType: item.linkType || '', sortOrder: item.sortOrder || 0, isActive: item.isActive !== false,
    });
    const isEdit = !!item.id;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <h3 style={{ marginTop: 0 }}>{isEdit ? 'Sửa hạng mục' : 'Thêm hạng mục'}</h3>
                <form onSubmit={e => { e.preventDefault(); onSave({ ...form, ...(isEdit ? { id: item.id } : {}) }); }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group"><label className="form-label">Tên *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                        <div className="form-group"><label className="form-label">Mã *</label><input className="form-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Mô tả</label><input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Liên kết đối tượng</label>
                            <select className="form-input" value={form.linkType} onChange={e => setForm({ ...form, linkType: e.target.value })}>
                                <option value="">Không</option>
                                <option value="contractor">Thầu phụ</option>
                                <option value="supplier">Nhà cung cấp</option>
                                <option value="employee">Nhân viên</option>
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label">Thứ tự</label><input className="form-input" type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} /></div>
                    </div>
                    {isEdit && (
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                                Đang hoạt động
                            </label>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                        <button type="button" className="btn" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary">Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
