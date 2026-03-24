'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import ColorMaterialPicker from '@/components/quotation/ColorMaterialPicker';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Upload, X, Palette, Wrench, Image as ImageIcon, FileText, Send } from 'lucide-react';

const FLOW_STEPS = [
    { key: 'quotation', label: 'Báo giá' },
    { key: 'furniture', label: 'Chốt nội thất' },
    { key: 'contract', label: 'Hợp đồng' },
    { key: 'order', label: 'Đặt hàng ván' },
    { key: 'construction', label: 'Thi công' },
    { key: 'warranty', label: 'Bảo hành' },
];

function FlowProgress({ currentStep }) {
    const currentIdx = FLOW_STEPS.findIndex(s => s.key === currentStep);
    return (
        <div className="fs-flow">
            {FLOW_STEPS.map((step, i) => (
                <div key={step.key} className={`fs-flow-step ${i < currentIdx ? 'done' : i === currentIdx ? 'active' : ''}`}>
                    <div className="fs-flow-dot">
                        {i < currentIdx ? <Check size={12} /> : <span>{i + 1}</span>}
                    </div>
                    <span className="fs-flow-label">{step.label}</span>
                    {i < FLOW_STEPS.length - 1 && <div className="fs-flow-line" />}
                </div>
            ))}
        </div>
    );
}

function ColorSection({ label, icon, colorCode, colorName, colorImage, onPick, onClear }) {
    const hasColor = colorCode || colorName;
    return (
        <div className="fs-color-slot">
            <div className="fs-color-label">{icon} {label}</div>
            {hasColor ? (
                <div className="fs-color-selected">
                    {colorImage && <img src={colorImage} alt="" className="fs-color-thumb" />}
                    <div className="fs-color-info">
                        <div className="fs-color-code">{colorCode || '—'}</div>
                        <div className="fs-color-name">{colorName || '—'}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={onPick}>Đổi</button>
                    <button className="btn btn-ghost btn-sm" onClick={onClear} style={{ color: '#ef4444' }}><X size={14} /></button>
                </div>
            ) : (
                <button className="btn btn-secondary btn-sm fs-color-pick-btn" onClick={onPick}>
                    <Palette size={14} /> Chọn màu
                </button>
            )}
        </div>
    );
}

function FurnitureCard({ item, onChange, onPickColor }) {
    const [expanded, setExpanded] = useState(true);

    const set = (field, value) => onChange(item.id, field, value);

    const uploadImages = async (files, field) => {
        const current = item[field] || [];
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'quotation-details');
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) current.push(data.url);
            } catch { }
        }
        set(field, [...current]);
    };

    const removeImage = (field, idx) => {
        const arr = [...(item[field] || [])];
        arr.splice(idx, 1);
        set(field, arr);
    };

    const uploadAttachment = async (files) => {
        const current = item.attachments || [];
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'quotation-details');
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) current.push({ name: file.name, url: data.url, type: file.type });
            } catch { }
        }
        set('attachments', [...current]);
    };

    const hasSpecs = item.bodyColorCode || item.doorColorCode || item.functionality || item.hardware;

    return (
        <div className={`card fs-card ${hasSpecs ? 'fs-card-filled' : ''}`}>
            <div className="fs-card-header" onClick={() => setExpanded(!expanded)}>
                <div className="fs-card-title-row">
                    {item.image && <img src={item.image} alt="" className="fs-card-img" />}
                    <div className="fs-card-info">
                        <div className="fs-card-name">{item.name}</div>
                        <div className="fs-card-meta">
                            {item.quantity > 0 && <span>SL: {item.quantity}</span>}
                            {item.unit && <span>{item.unit}</span>}
                            {(item.length > 0 || item.width > 0 || item.height > 0) && (
                                <span>{item.length || 0} × {item.width || 0} × {item.height || 0} mm</span>
                            )}
                        </div>
                    </div>
                    {hasSpecs && <span className="badge badge-success fs-card-badge">Đã chốt</span>}
                </div>
                <button className="btn btn-ghost btn-sm">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {expanded && (
                <div className="fs-card-body">
                    <div className="fs-card-grid">
                        {/* Left: Colors */}
                        <div className="fs-card-section">
                            <h4 className="fs-section-title"><Palette size={16} /> Màu sắc</h4>
                            <ColorSection
                                label="Màu thùng" icon="🟫"
                                colorCode={item.bodyColorCode} colorName={item.bodyColorName} colorImage={item.bodyColorImage}
                                onPick={() => onPickColor(item.id, 'body')}
                                onClear={() => { set('bodyColorCode', ''); set('bodyColorName', ''); set('bodyColorImage', ''); }}
                            />
                            <ColorSection
                                label="Màu cánh" icon="🚪"
                                colorCode={item.doorColorCode} colorName={item.doorColorName} colorImage={item.doorColorImage}
                                onPick={() => onPickColor(item.id, 'door')}
                                onClear={() => { set('doorColorCode', ''); set('doorColorName', ''); set('doorColorImage', ''); }}
                            />
                        </div>

                        {/* Right: Functionality + Hardware */}
                        <div className="fs-card-section">
                            <h4 className="fs-section-title"><FileText size={16} /> Công năng</h4>
                            <textarea
                                className="form-input"
                                value={item.functionality || ''}
                                onChange={e => set('functionality', e.target.value)}
                                rows={3}
                                placeholder="Mô tả công năng: ngăn kéo, kệ, treo đồ, hộc tài liệu..."
                            />
                            <div className="fs-images-row">
                                {(item.functionalImages || []).map((url, idx) => (
                                    <div key={idx} className="fs-img-thumb">
                                        <img src={url} alt="" />
                                        <button className="fs-img-remove" onClick={() => removeImage('functionalImages', idx)}>×</button>
                                    </div>
                                ))}
                                <label className="fs-img-add">
                                    <Upload size={16} />
                                    <span>Ảnh</span>
                                    <input type="file" accept="image/*" multiple hidden onChange={e => uploadImages(e.target.files, 'functionalImages')} />
                                </label>
                            </div>

                            <h4 className="fs-section-title" style={{ marginTop: 12 }}><Wrench size={16} /> Phụ kiện</h4>
                            <textarea
                                className="form-input"
                                value={item.hardware || ''}
                                onChange={e => set('hardware', e.target.value)}
                                rows={2}
                                placeholder="Bản lề Blum, ray Tandembox, tay nắm nhôm 128mm..."
                            />
                        </div>
                    </div>

                    {/* 3D Render + Attachments */}
                    <div className="fs-card-footer-row">
                        <div className="fs-render-section">
                            <h4 className="fs-section-title"><ImageIcon size={16} /> Ảnh 3D</h4>
                            <div className="fs-images-row">
                                {item.renderImage ? (
                                    <div className="fs-img-thumb fs-img-render">
                                        <img src={item.renderImage} alt="" />
                                        <button className="fs-img-remove" onClick={() => set('renderImage', '')}>×</button>
                                    </div>
                                ) : (
                                    <label className="fs-img-add">
                                        <Upload size={16} />
                                        <span>Upload 3D</span>
                                        <input type="file" accept="image/*" hidden onChange={e => {
                                            if (!e.target.files[0]) return;
                                            const formData = new FormData();
                                            formData.append('file', e.target.files[0]);
                                            formData.append('folder', 'quotation-details');
                                            fetch('/api/upload', { method: 'POST', body: formData })
                                                .then(r => r.json()).then(d => d.url && set('renderImage', d.url)).catch(() => { });
                                        }} />
                                    </label>
                                )}
                            </div>
                        </div>
                        <div className="fs-attach-section">
                            <h4 className="fs-section-title">📎 File đính kèm</h4>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                {(item.attachments || []).map((f, idx) => (
                                    <div key={idx} className="fs-attach-item">
                                        <a href={f.url} target="_blank" rel="noopener noreferrer">{f.name}</a>
                                        <button onClick={() => { const arr = [...(item.attachments || [])]; arr.splice(idx, 1); set('attachments', arr); }}>×</button>
                                    </div>
                                ))}
                                <label className="fs-img-add" style={{ padding: '4px 10px' }}>
                                    <Upload size={14} /> <span>Tải file</span>
                                    <input type="file" multiple hidden onChange={e => uploadAttachment(e.target.files)} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function FurnitureSpecPage() {
    const { id } = useParams();
    const router = useRouter();
    const toast = useToast();

    const [quotation, setQuotation] = useState(null);
    const [items, setItems] = useState({}); // { itemId: { ...furnitureFields } }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(null); // { itemId, type: 'body'|'door' }

    useEffect(() => {
        apiFetch(`/api/quotations/${id}/furniture`)
            .then(data => {
                setQuotation(data);
                // Flatten all items into a map
                const map = {};
                (data.categories || []).forEach(cat => {
                    (cat.items || []).forEach(item => {
                        map[item.id] = { ...item, _categoryName: cat.name, _categoryGroup: cat.group };
                    });
                });
                setItems(map);
            })
            .catch(e => toast.error(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    const updateItemField = useCallback((itemId, field, value) => {
        setItems(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], [field]: value },
        }));
    }, []);

    const handleColorSelect = (product) => {
        if (!pickerOpen) return;
        const { itemId, type } = pickerOpen;
        const prefix = type === 'body' ? 'bodyColor' : 'doorColor';
        updateItemField(itemId, `${prefix}Code`, product.code || product.surfaceCode || '');
        updateItemField(itemId, `${prefix}Name`, product.name || '');
        updateItemField(itemId, `${prefix}Image`, product.image || '');
        setPickerOpen(null);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = Object.entries(items).map(([itemId, item]) => ({
                id: itemId,
                functionality: item.functionality || '',
                functionalImages: item.functionalImages || [],
                attachments: item.attachments || [],
                bodyColorCode: item.bodyColorCode || '',
                bodyColorName: item.bodyColorName || '',
                bodyColorImage: item.bodyColorImage || '',
                doorColorCode: item.doorColorCode || '',
                doorColorName: item.doorColorName || '',
                doorColorImage: item.doorColorImage || '',
                hardware: item.hardware || '',
                renderImage: item.renderImage || '',
            }));
            await apiFetch(`/api/quotations/${id}/furniture`, {
                method: 'PUT',
                body: JSON.stringify({ items: payload }),
            });
            toast.success('Đã lưu thông tin nội thất!');
        } catch (e) {
            toast.error(e.message);
        }
        setSaving(false);
    };

    // Group items by category group + category name
    const grouped = {};
    Object.values(items).forEach(item => {
        const group = item._categoryGroup || 'Chung';
        const cat = item._categoryName || 'Khác';
        const key = `${group}|||${cat}`;
        if (!grouped[key]) grouped[key] = { group, cat, items: [] };
        grouped[key].items.push(item);
    });

    const totalItems = Object.keys(items).length;
    const filledItems = Object.values(items).filter(i =>
        i.bodyColorCode || i.doorColorCode || i.functionality || i.hardware
    ).length;

    if (loading) return <div className="page-loading">Đang tải...</div>;
    if (!quotation) return <div className="page-loading">Không tìm thấy báo giá</div>;

    return (
        <div className="fs-page">
            {/* Header */}
            <div className="fs-header">
                <div className="fs-header-left">
                    <button className="btn btn-ghost" onClick={() => router.push('/quotations')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="fs-title">Chốt nội thất — {quotation.code}</h1>
                        <div className="fs-subtitle">
                            {quotation.customer?.name} {quotation.project ? `· ${quotation.project.name}` : ''}
                        </div>
                    </div>
                </div>
                <div className="fs-header-right">
                    <div className="fs-progress-text">
                        <span className="fs-progress-count">{filledItems}/{totalItems}</span> hạng mục đã chốt
                    </div>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>

            {/* Flow Progress */}
            <FlowProgress currentStep="furniture" />

            {/* Progress bar */}
            <div className="fs-progress-bar">
                <div className="fs-progress-fill" style={{ width: `${totalItems > 0 ? (filledItems / totalItems) * 100 : 0}%` }} />
            </div>

            {/* Items grouped by category */}
            <div className="fs-content">
                {Object.values(grouped).map(({ group, cat, items: catItems }) => (
                    <div key={`${group}-${cat}`} className="fs-category-group">
                        <div className="fs-category-header">
                            <span className="fs-category-group-name">{group}</span>
                            <span className="fs-category-name">{cat}</span>
                            <span className="fs-category-count">{catItems.length} hạng mục</span>
                        </div>
                        {catItems.map(item => (
                            <FurnitureCard
                                key={item.id}
                                item={item}
                                onChange={updateItemField}
                                onPickColor={(itemId, type) => setPickerOpen({ itemId, type })}
                            />
                        ))}
                    </div>
                ))}

                {totalItems === 0 && (
                    <div className="fs-empty">
                        Báo giá này chưa có hạng mục nào.
                    </div>
                )}
            </div>

            {/* Sticky save bar */}
            <div className="fs-sticky-bar">
                <div className="fs-sticky-info">
                    Tiến độ: <strong>{filledItems}/{totalItems}</strong> hạng mục
                </div>
                <div className="fs-sticky-actions">
                    <button className="btn btn-secondary" onClick={() => router.back()}>Quay lại</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Đang lưu...' : 'Lưu tất cả'}
                    </button>
                </div>
            </div>

            {/* Color Picker Modal */}
            <ColorMaterialPicker
                open={!!pickerOpen}
                onClose={() => setPickerOpen(null)}
                onSelect={handleColorSelect}
                title={pickerOpen?.type === 'body' ? 'Chọn màu thùng' : 'Chọn màu cánh'}
            />
        </div>
    );
}
