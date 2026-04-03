'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import { Plus, Pencil, X, Check, ToggleLeft, ToggleRight } from 'lucide-react';

const emptyForm = () => ({ name: '', code: '', description: '', linkType: '', sortOrder: 0 });

export default function ExpenseCategoriesTab() {
    const toast = useToast();
    const [cats, setCats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await apiFetch('/api/expense-categories?active=0');
            setCats(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error(e.message || 'Lỗi tải hạng mục');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openAdd = () => { setForm(emptyForm()); setEditId(null); setShowForm(true); };
    const openEdit = (cat) => {
        setForm({ name: cat.name, code: cat.code, description: cat.description || '', linkType: cat.linkType || '', sortOrder: cat.sortOrder || 0 });
        setEditId(cat.id);
        setShowForm(true);
    };
    const cancel = () => { setShowForm(false); setEditId(null); };

    const save = async () => {
        if (!form.name.trim() || !form.code.trim()) {
            toast.error('Tên và mã hạng mục bắt buộc'); return;
        }
        setSaving(true);
        try {
            if (editId) {
                await apiFetch(`/api/expense-categories/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
                toast.success('Đã cập nhật hạng mục');
            } else {
                await apiFetch('/api/expense-categories', { method: 'POST', body: JSON.stringify(form) });
                toast.success('Đã thêm hạng mục');
            }
            cancel();
            load();
        } catch (e) {
            toast.error(e.message || 'Lỗi lưu hạng mục');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (cat) => {
        try {
            await apiFetch(`/api/expense-categories/${cat.id}`, {
                method: 'PUT',
                body: JSON.stringify({ isActive: !cat.isActive }),
            });
            setCats(prev => prev.map(c => c.id === cat.id ? { ...c, isActive: !c.isActive } : c));
        } catch (e) {
            toast.error(e.message || 'Lỗi cập nhật');
        }
    };

    const autoCode = (name) => {
        if (!name) return '';
        return name.toUpperCase().replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A')
            .replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E').replace(/[ÌÍỊỈĨ]/g, 'I')
            .replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O').replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, 'U')
            .replace(/[ÝỲỴỶỸ]/g, 'Y').replace(/Đ/g, 'D')
            .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'A').replace(/[èéẹẻẽêềếệểễ]/g, 'E')
            .replace(/[ìíịỉĩ]/g, 'I').replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'O')
            .replace(/[ùúụủũưừứựửữ]/g, 'U').replace(/[ýỳỵỷỹ]/g, 'Y').replace(/đ/g, 'D')
            .replace(/[^A-Z0-9\s]/g, '').trim().split(/\s+/).map(w => w[0]).join('');
    };

    const filtered = cats;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="btn btn-primary btn-sm" onClick={openAdd}>
                    <Plus size={14} /> Thêm hạng mục
                </button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: 16, padding: 16, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 12 }}>{editId ? 'Sửa hạng mục' : 'Thêm hạng mục mới'}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                        <div>
                            <label className="form-label">Tên hạng mục *</label>
                            <input className="form-input" value={form.name}
                                onChange={e => {
                                    const name = e.target.value;
                                    setForm(f => ({ ...f, name, code: f.code || autoCode(name) }));
                                }} placeholder="VD: Vật tư xây dựng" />
                        </div>
                        <div>
                            <label className="form-label">Mã *</label>
                            <input className="form-input" value={form.code}
                                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                placeholder="VD: VTXD" />
                        </div>
                        <div>
                            <label className="form-label">Thứ tự</label>
                            <input className="form-input" type="number" value={form.sortOrder}
                                onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Mô tả</label>
                            <input className="form-input" value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Tùy chọn" />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                            <Check size={14} /> {saving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={cancel}>
                            <X size={14} /> Hủy
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>Đang tải...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
                    Chưa có hạng mục nào. Nhấn "Thêm hạng mục" để bắt đầu.
                </div>
            ) : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Tên hạng mục</th>
                            <th>Mã</th>
                            <th>Mô tả</th>
                            <th style={{ textAlign: 'center' }}>Thứ tự</th>
                            <th style={{ textAlign: 'center' }}>Trạng thái</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(cat => (
                            <tr key={cat.id} style={{ opacity: cat.isActive ? 1 : 0.5 }}>
                                <td style={{ fontWeight: 500 }}>{cat.name}</td>
                                <td><code style={{ fontSize: 11, background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>{cat.code}</code></td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{cat.description || '—'}</td>
                                <td style={{ textAlign: 'center' }}>{cat.sortOrder}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <button onClick={() => toggleActive(cat)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: cat.isActive ? 'var(--success)' : 'var(--text-tertiary)' }}
                                        title={cat.isActive ? 'Đang dùng — nhấn để tắt' : 'Đang tắt — nhấn để bật'}>
                                        {cat.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                    </button>
                                </td>
                                <td>
                                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(cat)} title="Sửa">
                                        <Pencil size={13} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                {cats.filter(c => c.isActive).length}/{cats.length} hạng mục đang hoạt động
            </div>
        </div>
    );
}
