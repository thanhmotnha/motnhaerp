'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const TYPES = ['Xây thô', 'Nội thất', 'Sửa chữa', 'Khác'];

export default function ScheduleTemplateTab({ toast }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null); // which template is expanded for editing
    const [editData, setEditData] = useState(null); // { ...template, items: [...] }
    const [saving, setSaving] = useState(false);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await apiFetch('/api/schedule-templates');
            setTemplates(data || []);
        } catch { }
        setLoading(false);
    };

    useEffect(() => { loadTemplates(); }, []);

    // Expand a template and load its items for editing
    const expandTemplate = async (tpl) => {
        if (expandedId === tpl.id) { setExpandedId(null); setEditData(null); return; }
        try {
            const full = await apiFetch(`/api/schedule-templates/${tpl.id}`);
            // Convert items to editable format with _parentIdx and _predIdx
            const items = (full.items || []).map((item, idx, arr) => ({
                name: item.name,
                level: item.level || 0,
                wbs: item.wbs || '',
                duration: item.duration || 0,
                weight: item.weight || 1,
                color: item.color || '',
                _parentIdx: item.parentId ? arr.findIndex(a => a.id === item.parentId) : null,
                _predIdx: item.predecessorId ? arr.findIndex(a => a.id === item.predecessorId) : null,
                _key: Date.now() + idx,
            }));
            setEditData({ id: full.id, name: full.name, type: full.type, description: full.description, items });
            setExpandedId(full.id);
        } catch (e) { toast?.error('Lỗi tải chi tiết: ' + e.message); }
    };

    // Save edited template
    const saveTemplate = async () => {
        if (!editData) return;
        setSaving(true);
        try {
            // Clean _parentIdx: if level=0, no parent. If level=1, find nearest level=0 above
            const items = editData.items.map((item, idx, arr) => {
                let _parentIdx = null;
                if (item.level > 0) {
                    // Find nearest level=0 item above this one
                    for (let j = idx - 1; j >= 0; j--) {
                        if (arr[j].level === 0) { _parentIdx = j; break; }
                    }
                }
                return { ...item, _parentIdx };
            });

            await apiFetch(`/api/schedule-templates/${editData.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: editData.name, type: editData.type, description: editData.description, items }),
            });
            toast?.success('Đã lưu mẫu tiến độ');
            loadTemplates();
        } catch (e) { toast?.error('Lỗi lưu: ' + e.message); }
        setSaving(false);
    };

    // Delete template
    const deleteTemplate = async (id) => {
        if (!confirm('Xoá mẫu tiến độ này?')) return;
        try {
            await apiFetch(`/api/schedule-templates/${id}`, { method: 'DELETE' });
            if (expandedId === id) { setExpandedId(null); setEditData(null); }
            loadTemplates();
            toast?.success('Đã xoá');
        } catch (e) { toast?.error('Lỗi xoá: ' + e.message); }
    };

    // Duplicate template
    const duplicateTemplate = async (tpl) => {
        try {
            const full = await apiFetch(`/api/schedule-templates/${tpl.id}`);
            const items = (full.items || []).map((item, idx, arr) => ({
                name: item.name,
                level: item.level || 0,
                wbs: item.wbs || '',
                duration: item.duration || 0,
                weight: item.weight || 1,
                color: item.color || '',
                _parentIdx: item.parentId ? arr.findIndex(a => a.id === item.parentId) : null,
                _predIdx: item.predecessorId ? arr.findIndex(a => a.id === item.predecessorId) : null,
            }));
            await apiFetch('/api/schedule-templates', {
                method: 'POST',
                body: JSON.stringify({ name: `${full.name} (copy)`, type: full.type, description: full.description, items }),
            });
            toast?.success('Đã copy mẫu');
            loadTemplates();
        } catch (e) { toast?.error('Lỗi copy: ' + e.message); }
    };

    // Create blank template
    const createTemplate = async () => {
        const name = prompt('Tên mẫu tiến độ mới:');
        if (!name) return;
        try {
            await apiFetch('/api/schedule-templates', {
                method: 'POST',
                body: JSON.stringify({ name, type: 'Xây thô', description: '', items: [] }),
            });
            loadTemplates();
        } catch (e) { toast?.error('Lỗi: ' + e.message); }
    };

    // === Item editing helpers ===
    const updateItem = (idx, field, value) => {
        setEditData(prev => ({
            ...prev,
            items: prev.items.map((it, i) => i === idx ? { ...it, [field]: value } : it),
        }));
    };

    const addGroupItem = () => {
        const items = editData.items;
        const nextWbs = String((items.filter(i => i.level === 0).length) + 1);
        setEditData(prev => ({
            ...prev,
            items: [...prev.items, { name: 'Giai đoạn mới', level: 0, wbs: nextWbs, duration: 0, weight: 1, color: '', _parentIdx: null, _predIdx: null, _key: Date.now() }],
        }));
    };

    const addTaskItem = (afterIdx) => {
        // Find parent group (nearest level=0 at or before afterIdx)
        let parentGroupIdx = null;
        for (let j = afterIdx; j >= 0; j--) {
            if (editData.items[j].level === 0) { parentGroupIdx = j; break; }
        }
        const parentWbs = parentGroupIdx != null ? editData.items[parentGroupIdx].wbs : '1';
        const siblingCount = editData.items.filter((it, i) => i > (parentGroupIdx ?? -1) && it.level === 1 && (i <= afterIdx + 1 || afterIdx === editData.items.length - 1)).length;
        const newItem = {
            name: '', level: 1, wbs: `${parentWbs}.${siblingCount + 1}`, duration: 1, weight: 1, color: '',
            _parentIdx: parentGroupIdx, _predIdx: afterIdx > 0 ? afterIdx : null, _key: Date.now(),
        };
        const newItems = [...editData.items];
        newItems.splice(afterIdx + 1, 0, newItem);
        setEditData(prev => ({ ...prev, items: newItems }));
    };

    const removeItem = (idx) => {
        setEditData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== idx),
        }));
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, paddingBottom: 8, borderBottom: '2px solid var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        📅 Mẫu tiến độ thi công
                    </h4>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '-8px 0 0 0' }}>Bấm vào mẫu để xem/sửa công việc. Dùng nút Copy để nhân bản mẫu.</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={createTemplate}>➕ Thêm mẫu</button>
            </div>

            {/* Template list */}
            {templates.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có mẫu tiến độ nào</div>
            ) : templates.map(tpl => (
                <div key={tpl.id} style={{ border: expandedId === tpl.id ? '2px solid var(--accent-primary)' : '1px solid var(--border)', borderRadius: 10, marginBottom: 12, overflow: 'hidden', background: 'var(--bg-card)' }}>
                    {/* Template header */}
                    <div onClick={() => expandTemplate(tpl)} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer',
                        background: expandedId === tpl.id ? 'rgba(59,130,246,0.05)' : 'transparent',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 18 }}>{expandedId === tpl.id ? '📂' : '📅'}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{tpl.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tpl.description || 'Không có mô tả'}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                            <span className="badge info" style={{ fontSize: 10 }}>{tpl._count?.items || 0} công việc</span>
                            {tpl.type && <span className="badge muted" style={{ fontSize: 10 }}>{tpl.type}</span>}
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => duplicateTemplate(tpl)} title="Copy mẫu">📋</button>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--status-danger)' }} onClick={() => deleteTemplate(tpl.id)} title="Xoá">🗑️</button>
                        </div>
                    </div>

                    {/* Expanded editor */}
                    {expandedId === tpl.id && editData && (
                        <div style={{ borderTop: '1px solid var(--border)', padding: 16 }}>
                            {/* Template metadata */}
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 12, marginBottom: 16 }}>
                                <div>
                                    <label className="form-label" style={{ fontSize: 11 }}>Tên mẫu</label>
                                    <input className="form-input" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} style={{ fontSize: 13 }} />
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontSize: 11 }}>Loại</label>
                                    <select className="form-select" value={editData.type || ''} onChange={e => setEditData({ ...editData, type: e.target.value })} style={{ fontSize: 13 }}>
                                        {TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontSize: 11 }}>Mô tả</label>
                                    <input className="form-input" value={editData.description || ''} onChange={e => setEditData({ ...editData, description: e.target.value })} style={{ fontSize: 13 }} />
                                </div>
                            </div>

                            {/* Items table */}
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ fontSize: 12, margin: 0, width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 30 }}>#</th>
                                            <th style={{ width: 60 }}>WBS</th>
                                            <th>Tên công việc</th>
                                            <th style={{ width: 70, textAlign: 'center' }}>Ngày</th>
                                            <th style={{ width: 50, textAlign: 'center' }}>TL</th>
                                            <th style={{ width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {editData.items.map((item, idx) => (
                                            <tr key={item._key || idx} style={{ background: item.level === 0 ? 'var(--bg-secondary)' : 'transparent' }}>
                                                <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 10 }}>{idx + 1}</td>
                                                <td>
                                                    <input className="form-input" value={item.wbs} onChange={e => updateItem(idx, 'wbs', e.target.value)}
                                                        style={{ fontSize: 11, width: 50, textAlign: 'center', fontWeight: item.level === 0 ? 700 : 400 }} />
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        {item.level > 0 && <span style={{ width: 16, display: 'inline-block' }}></span>}
                                                        {item.level === 0 && item.color && (
                                                            <input type="color" value={item.color || '#3b82f6'} onChange={e => updateItem(idx, 'color', e.target.value)}
                                                                style={{ width: 18, height: 18, border: 'none', padding: 0, cursor: 'pointer' }} />
                                                        )}
                                                        {item.level === 0 && !item.color && (
                                                            <button onClick={() => updateItem(idx, 'color', '#3b82f6')} style={{ width: 18, height: 18, borderRadius: '50%', border: '1px dashed var(--text-muted)', background: 'none', cursor: 'pointer', fontSize: 8, padding: 0 }}>🎨</button>
                                                        )}
                                                        <input className="form-input" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)}
                                                            style={{ fontSize: 12, flex: 1, fontWeight: item.level === 0 ? 700 : 400 }}
                                                            placeholder={item.level === 0 ? 'Tên giai đoạn' : 'Tên công việc'} />
                                                    </div>
                                                </td>
                                                <td>
                                                    <input className="form-input" type="number" value={item.duration || ''} onChange={e => updateItem(idx, 'duration', Number(e.target.value))}
                                                        style={{ fontSize: 11, width: 50, textAlign: 'center' }} />
                                                </td>
                                                <td>
                                                    <input className="form-input" type="number" value={item.weight || ''} onChange={e => updateItem(idx, 'weight', Number(e.target.value))}
                                                        style={{ fontSize: 11, width: 40, textAlign: 'center' }} />
                                                </td>
                                                <td style={{ display: 'flex', gap: 2 }}>
                                                    {item.level === 0 && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => addTaskItem(idx)} title="Thêm công việc con" style={{ fontSize: 10, padding: '1px 4px', color: 'var(--accent-primary)' }}>+</button>
                                                    )}
                                                    {item.level === 1 && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => addTaskItem(idx)} title="Thêm CV sau" style={{ fontSize: 10, padding: '1px 4px', color: 'var(--accent-primary)' }}>+</button>
                                                    )}
                                                    <button className="btn btn-ghost btn-sm" onClick={() => removeItem(idx)} style={{ fontSize: 10, padding: '1px 4px', color: 'var(--status-danger)' }}>✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 6 }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={addGroupItem}>➕ Thêm giai đoạn</button>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => { setExpandedId(null); setEditData(null); }}>Huỷ</button>
                                    <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={saveTemplate} disabled={saving}>
                                        {saving ? '⏳ Đang lưu...' : '💾 Lưu mẫu'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
