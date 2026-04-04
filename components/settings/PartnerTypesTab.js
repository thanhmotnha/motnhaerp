'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const DEFAULT_SUPPLIER_TYPES = ['Vật tư xây dựng', 'Thiết bị vệ sinh', 'Thiết bị điện', 'Nội thất', 'Sắt thép', 'Gạch ốp lát', 'Sơn', 'Nhôm kính', 'Cơ khí', 'Khác'];
const DEFAULT_CONTRACTOR_TYPES = ['Thầu xây dựng', 'CTV thiết kế kiến trúc', 'CTV Kết cấu', 'CTV 3D', 'Thầu mộc', 'Thầu điện', 'Thầu nước', 'Thầu sơn', 'Thầu đá', 'Thầu cơ khí', 'Thầu nhôm kính', 'Thầu trần thạch cao', 'Khác'];

function TypeList({ title, types, onChange }) {
    const [newItem, setNewItem] = useState('');

    const add = () => {
        const val = newItem.trim();
        if (!val || types.includes(val)) return;
        onChange([...types, val]);
        setNewItem('');
    };

    const remove = (item) => onChange(types.filter(t => t !== item));

    const moveUp = (i) => {
        if (i === 0) return;
        const arr = [...types];
        [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
        onChange(arr);
    };

    const moveDown = (i) => {
        if (i === types.length - 1) return;
        const arr = [...types];
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        onChange(arr);
    };

    return (
        <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {types.map((t, i) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', borderRadius: 8, padding: '6px 10px', border: '1px solid var(--border-light)' }}>
                        <span style={{ flex: 1, fontSize: 13 }}>{t}</span>
                        <button onClick={() => moveUp(i)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'var(--text-muted)' : 'var(--text-primary)', padding: '0 2px', fontSize: 12 }}>▲</button>
                        <button onClick={() => moveDown(i)} disabled={i === types.length - 1} style={{ background: 'none', border: 'none', cursor: i === types.length - 1 ? 'default' : 'pointer', color: i === types.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)', padding: '0 2px', fontSize: 12 }}>▼</button>
                        <button onClick={() => remove(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 4px', fontSize: 14, lineHeight: 1 }} title="Xóa">✕</button>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <input
                    className="form-input"
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && add()}
                    placeholder="Thêm loại mới..."
                    style={{ fontSize: 13 }}
                />
                <button className="btn btn-primary btn-sm" onClick={add} disabled={!newItem.trim()}>+ Thêm</button>
            </div>
        </div>
    );
}

export default function PartnerTypesTab() {
    const [supplierTypes, setSupplierTypes] = useState(DEFAULT_SUPPLIER_TYPES);
    const [contractorTypes, setContractorTypes] = useState(DEFAULT_CONTRACTOR_TYPES);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    useEffect(() => {
        apiFetch('/api/admin/settings').then(d => {
            if (d.supplier_types) {
                try { setSupplierTypes(JSON.parse(d.supplier_types)); } catch { /* use default */ }
            }
            if (d.contractor_types) {
                try { setContractorTypes(JSON.parse(d.contractor_types)); } catch { /* use default */ }
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiFetch('/api/admin/settings', {
                method: 'PUT',
                body: {
                    supplier_types: JSON.stringify(supplierTypes),
                    contractor_types: JSON.stringify(contractorTypes),
                },
            });
            toast.success('Đã lưu danh mục loại');
        } catch (e) {
            toast.error(e.message || 'Lỗi lưu');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = (which) => {
        if (!confirm('Khôi phục danh sách mặc định?')) return;
        if (which === 'supplier') setSupplierTypes(DEFAULT_SUPPLIER_TYPES);
        else setContractorTypes(DEFAULT_CONTRACTOR_TYPES);
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Danh mục loại NCC & Thầu phụ</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Quản lý các loại hiển thị trong dropdown khi tạo/sửa nhà cung cấp và thầu phụ</div>
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                </button>
            </div>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>🏭 Loại nhà cung cấp ({supplierTypes.length})</span>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => handleReset('supplier')}>↺ Mặc định</button>
                    </div>
                    <TypeList types={supplierTypes} onChange={setSupplierTypes} />
                </div>
                <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>👷 Loại nhà thầu ({contractorTypes.length})</span>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => handleReset('contractor')}>↺ Mặc định</button>
                    </div>
                    <TypeList types={contractorTypes} onChange={setContractorTypes} />
                </div>
            </div>
        </div>
    );
}
