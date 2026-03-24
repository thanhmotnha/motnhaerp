'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import ColorMaterialPicker from '@/components/quotation/ColorMaterialPicker';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Upload, X, Palette, Wrench, Image as ImageIcon, FileText, FolderOpen, Search } from 'lucide-react';

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

// ============================================================
// Modal chọn tài liệu từ dự án
// ============================================================
function ProjectDocPicker({ open, onClose, documents, onSelect, title }) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all | image | pdf | other

    const filtered = useMemo(() => {
        if (!documents) return [];
        let docs = documents;
        if (filter === 'image') docs = docs.filter(d => d.mimeType?.startsWith('image/'));
        else if (filter === 'pdf') docs = docs.filter(d => d.mimeType === 'application/pdf');
        else if (filter === 'other') docs = docs.filter(d => !d.mimeType?.startsWith('image/') && d.mimeType !== 'application/pdf');
        if (search.trim()) {
            const q = search.toLowerCase();
            docs = docs.filter(d => d.name?.toLowerCase().includes(q) || d.fileName?.toLowerCase().includes(q) || d.category?.toLowerCase().includes(q));
        }
        return docs;
    }, [documents, search, filter]);

    if (!open) return null;

    const isImage = (d) => d.mimeType?.startsWith('image/');
    const getThumb = (d) => d.thumbnailUrl || (isImage(d) ? d.fileUrl : null);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, width: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h3 className="modal-title"><FolderOpen size={18} /> {title || 'Chọn tài liệu dự án'}</h3>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Search + Filter */}
                <div style={{ padding: '8px 16px', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                        <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm tài liệu..." style={{ paddingLeft: 30, fontSize: 13 }} />
                    </div>
                    {['all', 'image', 'pdf', 'other'].map(f => (
                        <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setFilter(f)} style={{ fontSize: 11 }}>
                            {f === 'all' ? 'Tất cả' : f === 'image' ? 'Ảnh' : f === 'pdf' ? 'PDF' : 'Khác'}
                        </button>
                    ))}
                </div>

                {/* Document grid */}
                <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                            {documents?.length === 0 ? 'Dự án chưa có tài liệu nào' : 'Không tìm thấy'}
                        </div>
                    ) : (
                        <div className="fs-doc-grid">
                            {filtered.map(doc => {
                                const thumb = getThumb(doc);
                                return (
                                    <div key={doc.id} className="fs-doc-item" onClick={() => { onSelect(doc); onClose(); }}>
                                        <div className="fs-doc-thumb">
                                            {thumb ? (
                                                <img src={thumb} alt="" />
                                            ) : (
                                                <div className="fs-doc-icon">
                                                    {doc.mimeType === 'application/pdf' ? '📄' : '📁'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="fs-doc-name">{doc.name || doc.fileName}</div>
                                        <div className="fs-doc-meta">
                                            {doc.category && <span>{doc.category}</span>}
                                            {doc.folder?.name && <span>{doc.folder.name}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
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

function FurnitureCard({ item, onChange, onPickColor, onPickDoc }) {
    const [expanded, setExpanded] = useState(true);

    const set = (field, value) => onChange(item.id, field, value);

    const removeImage = (field, idx) => {
        const arr = [...(item[field] || [])];
        arr.splice(idx, 1);
        set(field, arr);
    };

    const hasSpecs = item.bodyColorCode || item.doorColorCode || (item.functionalImages?.length > 0) || item.renderImage || item.hardware;

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

                        {/* Right: Functionality (pick from project docs) + Hardware */}
                        <div className="fs-card-section">
                            <h4 className="fs-section-title"><ImageIcon size={16} /> Ảnh công năng / 3D</h4>
                            <div className="fs-images-row">
                                {(item.functionalImages || []).map((url, idx) => (
                                    <div key={idx} className="fs-img-thumb">
                                        <img src={url} alt="" />
                                        <button className="fs-img-remove" onClick={() => removeImage('functionalImages', idx)}>×</button>
                                    </div>
                                ))}
                                {item.renderImage && (
                                    <div className="fs-img-thumb fs-img-render">
                                        <img src={item.renderImage} alt="" />
                                        <button className="fs-img-remove" onClick={() => set('renderImage', '')}>×</button>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', gap: 6 }}
                                    onClick={() => onPickDoc(item.id)}>
                                    <FolderOpen size={14} /> Chọn từ dự án
                                </button>
                            </div>

                            <h4 className="fs-section-title" style={{ marginTop: 12 }}><FileText size={16} /> Ghi chú công năng</h4>
                            <textarea
                                className="form-input"
                                value={item.functionality || ''}
                                onChange={e => set('functionality', e.target.value)}
                                rows={2}
                                placeholder="Ghi chú thêm: ngăn kéo, kệ, treo đồ..."
                                style={{ fontSize: 12 }}
                            />

                            <h4 className="fs-section-title" style={{ marginTop: 8 }}><Wrench size={16} /> Phụ kiện</h4>
                            <textarea
                                className="form-input"
                                value={item.hardware || ''}
                                onChange={e => set('hardware', e.target.value)}
                                rows={2}
                                placeholder="Bản lề Blum, ray Tandembox, tay nắm nhôm 128mm..."
                                style={{ fontSize: 12 }}
                            />
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
    const [items, setItems] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(null); // { itemId, type: 'body'|'door' }
    const [docPickerOpen, setDocPickerOpen] = useState(null); // itemId | null
    const [projectDocs, setProjectDocs] = useState([]);

    useEffect(() => {
        apiFetch(`/api/quotations/${id}/furniture`)
            .then(data => {
                setQuotation(data);
                const map = {};
                (data.categories || []).forEach(cat => {
                    (cat.items || []).forEach(item => {
                        map[item.id] = { ...item, _categoryName: cat.name, _categoryGroup: cat.group };
                    });
                });
                setItems(map);

                // Load project documents (lightweight API)
                if (data.projectId) {
                    apiFetch(`/api/projects/${data.projectId}/documents`)
                        .then(docs => setProjectDocs(docs || []))
                        .catch(() => {});
                }
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

    const handleDocSelect = (doc) => {
        if (!docPickerOpen) return;
        const itemId = docPickerOpen;
        const isImage = doc.mimeType?.startsWith('image/');
        const url = doc.fileUrl;

        if (isImage) {
            // Add to functionalImages or set as renderImage
            const item = items[itemId];
            const current = item?.functionalImages || [];
            updateItemField(itemId, 'functionalImages', [...current, url]);
        } else {
            // Non-image: add to attachments
            const item = items[itemId];
            const current = item?.attachments || [];
            updateItemField(itemId, 'attachments', [...current, { name: doc.name || doc.fileName, url, type: doc.mimeType }]);
        }
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

    // Group items by category
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
        i.bodyColorCode || i.doorColorCode || (i.functionalImages?.length > 0) || i.renderImage || i.hardware
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

            <FlowProgress currentStep="furniture" />

            <div className="fs-progress-bar">
                <div className="fs-progress-fill" style={{ width: `${totalItems > 0 ? (filledItems / totalItems) * 100 : 0}%` }} />
            </div>

            {/* No project warning */}
            {!quotation.projectId && (
                <div className="card" style={{ padding: '12px 16px', background: '#fef3c7', borderColor: '#f59e0b', marginBottom: 16, fontSize: 13 }}>
                    Báo giá chưa gắn dự án — không thể chọn tài liệu từ dự án. Hãy gắn dự án trong trang sửa báo giá.
                </div>
            )}

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
                                onPickDoc={(itemId) => setDocPickerOpen(itemId)}
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

            {/* Project Document Picker Modal */}
            <ProjectDocPicker
                open={!!docPickerOpen}
                onClose={() => setDocPickerOpen(null)}
                documents={projectDocs}
                onSelect={handleDocSelect}
                title="Chọn ảnh công năng / 3D từ dự án"
            />
        </div>
    );
}
