'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/fetchClient';
import { QUOTATION_TYPES, QUOTATION_STATUSES, PRESET_CATEGORIES, fmt, emptyMainCategory } from '@/lib/quotation-constants';
import useQuotationForm from '@/hooks/useQuotationForm';
import useAutoSaveDraft from '@/hooks/useAutoSaveDraft';
import TreeSidebar from '@/components/quotation/TreeSidebar';
import QuotationSummary from '@/components/quotation/QuotationSummary';
import CategoryTable from '@/components/quotation/CategoryTable';

export default function EditQuotationPage() {
    const router = useRouter();
    const params = useParams();
    const toast = useToast();
    const hook = useQuotationForm({ toast });
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploadingCell, setUploadingCell] = useState(null);
    const imgInputRef = useRef(null);
    const imgUploadTarget = useRef(null);
    const [treeSidebarOpen, setTreeSidebarOpen] = useState(false);
    const [qMeta, setQMeta] = useState({ status: 'Nháp', revision: 1, code: '', parentId: null, children: [] });
    const [shareModal, setShareModal] = useState(false);
    const [exportDropdown, setExportDropdown] = useState(false);
    const [shareToken, setShareToken] = useState('');
    const [trackingData, setTrackingData] = useState({ viewCount: 0, lastViewedAt: null });
    const [copied, setCopied] = useState(false);

    const {
        form, setForm, mainCategories, setMainCategories,
        customers, filteredProjects, activeMainIdx, setActiveMainIdx,
        addMainCategory, removeMainCategory, updateMainCategoryName, applyPresetCategory, recalc, buildPayload,
    } = hook;

    // Load quotation data → convert flat categories (with group) into 3-level mainCategories
    useEffect(() => {
        apiFetch(`/api/quotations/${params.id}`).then(q => {
            setForm({
                customerId: q.customerId || '',
                projectId: q.projectId || '',
                type: q.type || 'Thi công thô',
                notes: q.notes || '',
                vat: q.vat ?? 10,
                discount: q.discount ?? 0,
                managementFeeRate: q.managementFeeRate ?? 5,
                designFee: q.designFee ?? 0,
                otherFee: q.otherFee ?? 0,
                adjustment: q.adjustment ?? 0,
                adjustmentType: q.adjustmentType || 'amount',
                status: q.status || 'Nháp',
                quotationTerms: q.quotationTerms || [],
            });
            setQMeta({
                status: q.status || 'Nháp', revision: q.revision || 1, code: q.code || '',
                parentId: q.parentId || null, children: q.children || [],
                lockedAt: q.lockedAt, createdAt: q.createdAt,
            });
            if (q.shareToken) setShareToken(q.shareToken);
            setTrackingData({ viewCount: q.viewCount || 0, lastViewedAt: q.lastViewedAt });
            if (q.categories && q.categories.length > 0) {
                // Group categories by `group` field → build mainCategories
                const grouped = {};
                const groupOrder = [];
                q.categories.forEach(cat => {
                    const g = cat.group || cat.name || 'Hạng mục';
                    if (!grouped[g]) {
                        grouped[g] = [];
                        groupOrder.push(g);
                    }
                    grouped[g].push(cat);
                });

                const mcs = groupOrder.map(g => ({
                    _key: Date.now() + Math.random(),
                    name: g,
                    subtotal: 0,
                    subcategories: grouped[g].map(cat => ({
                        _key: Date.now() + Math.random(),
                        name: cat.name || '',
                        image: cat.image || '',
                        subtotal: cat.subtotal || 0,
                        items: (cat.items || []).map(item => ({
                            _key: Date.now() + Math.random(),
                            name: item.name || '',
                            unit: item.unit || 'm²',
                            quantity: item.quantity || 0,
                            volume: item.volume || 0,
                            mainMaterial: item.mainMaterial || 0,
                            auxMaterial: item.auxMaterial || 0,
                            labor: item.labor || 0,
                            unitPrice: item.unitPrice || 0,
                            amount: item.amount || 0,
                            description: item.description || '',
                            length: item.length || 0,
                            width: item.width || 0,
                            height: item.height || 0,
                            image: item.image || '',
                            productId: item.productId || null,
                            subItems: (item.subItems || []).map(si => ({
                                _key: Date.now() + Math.random(),
                                name: si.name || '', unit: si.unit || 'cái',
                                quantity: si.quantity || 0, volume: si.volume || 0,
                                unitPrice: si.unitPrice || 0, amount: si.amount || 0,
                                description: si.description || '',
                                length: si.length || 0, width: si.width || 0, height: si.height || 0,
                                image: si.image || '',
                            })),
                        })),
                    })),
                }));
                setMainCategories(recalc(mcs));
                if (q.deductions) hook.setDeductions((q.deductions || []).map(d => ({ ...d, _key: Date.now() + Math.random() })));
            }
            setLoading(false);
        }).catch(e => {
            toast.error(e.message);
            setLoading(false);
        });
    }, [params.id]);

    // Auto-save draft
    useAutoSaveDraft({
        key: `quotation_draft_${params.id}`,
        data: { form, mainCategories },
        enabled: !loading,
        onRestore: (draft) => {
            if (draft.form) setForm(draft.form);
            if (draft.mainCategories) setMainCategories(draft.mainCategories);
            toast.info('Đã khôi phục bản nháp chưa lưu');
        },
    });

    // Image upload (items + subcategories)
    const handleImageClick = (mi, si, ii) => {
        imgUploadTarget.current = { mi, si, ii };
        imgInputRef.current?.click();
    };

    const handleSubcategoryImageClick = (mi, si) => {
        imgUploadTarget.current = { mi, si, ii: null, isSubcategory: true };
        imgInputRef.current?.click();
    };



    const handleImgChange = async (e) => {
        const file = e.target.files?.[0];
        const t = imgUploadTarget.current;
        if (!file || !t) { e.target.value = ''; return; }

        setUploadingCell(t);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', 'products');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Upload failed');
            const { url } = await res.json();

            if (t.isSubcategory) {
                hook.updateSubcategoryImage(t.mi, t.si, url);
            } else {
                const mcs = [...mainCategories];
                const sub = mcs[t.mi].subcategories[t.si];
                sub.items[t.ii] = { ...sub.items[t.ii], image: url };
                mcs[t.mi] = { ...mcs[t.mi], subcategories: [...mcs[t.mi].subcategories] };
                setMainCategories(mcs);
            }
            toast.success('Đã tải ảnh lên');
        } catch (err) {
            toast.error('Lỗi tải ảnh: ' + err.message);
        }
        setUploadingCell(null);
        imgUploadTarget.current = null;
        e.target.value = '';
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await apiFetch(`/api/quotations/${params.id}`, {
                method: 'PUT', body: JSON.stringify(buildPayload()),
            });
            try { localStorage.removeItem(`quotation_draft_${params.id}`); } catch { }
            // Update meta in case revision/status changed
            if (res.revision) setQMeta(m => ({ ...m, revision: res.revision, status: res.status || m.status }));
            if (res.status) setForm(f => ({ ...f, status: res.status }));
            toast.success('Đã cập nhật báo giá!');
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    const handleClone = async (type) => {
        try {
            const res = await apiFetch(`/api/quotations/${params.id}`, {
                method: 'POST', body: JSON.stringify({ type }),
            });
            toast.success(type === 'supplemental' ? 'Đã tạo BG bổ sung!' : 'Đã tạo bản copy!');
            router.push(`/quotations/${res.id}/edit`);
        } catch (e) { toast.error(e.message); }
    };

    const isLocked = ['Hợp đồng', 'Từ chối'].includes(qMeta.status);
    const isWarning = qMeta.status === 'Gửi KH';
    const isConfirmed = qMeta.status === 'Xác nhận';
    const isVariation = form.type === 'Phát sinh';
    const canCreateAddendum = isVariation && (isConfirmed || qMeta.status === 'Hợp đồng') && form.projectId;

    // Create contract addendum from variation quotation
    const handleCreateAddendum = async () => {
        if (!form.projectId) return toast.error('BG phát sinh cần liên kết dự án!');
        try {
            // Find original contract for this project
            const contracts = await apiFetch(`/api/contracts?projectId=${form.projectId}&limit=10`);
            const parentContract = contracts?.data?.find(c => !c.deletedAt);
            if (!parentContract) { toast.error('Không tìm thấy hợp đồng gốc của dự án này!'); return; }

            // Calculate variation total from quotation
            const total = hook.mainCategories.reduce((s, mc) => s + (mc.subtotal || 0), 0);

            const addendum = await apiFetch(`/api/contracts/${parentContract.id}/addenda`, {
                method: 'POST',
                body: JSON.stringify({
                    title: `Phát sinh - ${qMeta.code || 'BG'}`,
                    description: `Từ BG phát sinh ${qMeta.code}. ${form.notes || ''}`.trim(),
                    amount: total,
                    status: 'Nháp',
                }),
            });
            toast.success(`Đã tạo HĐ phụ lục ${addendum.code}!`);
            router.push(`/contracts/${parentContract.id}`);
        } catch (e) { toast.error('Lỗi tạo phụ lục: ' + e.message); }
    };

    if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Đang tải...</div>;

    return (
        <div className="quotation-layout">
            <button className="btn btn-primary quotation-tree-toggle" onClick={() => setTreeSidebarOpen(true)}>
                🔧 Thư viện
            </button>
            {treeSidebarOpen && <div className="quotation-tree-overlay" onClick={() => setTreeSidebarOpen(false)} />}
            <div className={`quotation-tree-wrapper ${treeSidebarOpen ? 'open' : ''}`}>
                <TreeSidebar hook={hook} onClose={() => setTreeSidebarOpen(false)} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div className="quotation-page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h2 style={{ margin: 0 }}>Sửa Báo Giá</h2>
                        {qMeta.code && <span style={{ fontSize: 12, fontFamily: 'monospace', opacity: 0.5 }}>{qMeta.code}</span>}
                        {qMeta.revision > 1 && <span className="badge info" style={{ fontSize: 11 }}>v{qMeta.revision}</span>}
                        {isVariation && <span className="badge warning" style={{ fontSize: 11 }}>Phát sinh</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button className="btn btn-ghost" onClick={() => router.push('/quotations')}>← Quay lại</button>
                        {/* Gửi Báo Giá — primary */}
                        <button className="btn btn-primary" onClick={() => setShareModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            📨 Gửi Báo Giá
                        </button>
                        {/* Xuất File — dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button className="btn btn-secondary" onClick={() => setExportDropdown(!exportDropdown)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                📁 Xuất File ▾
                            </button>
                            {exportDropdown && (
                                <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setExportDropdown(false)} />
                                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 99, minWidth: 180, padding: 4 }}>
                                        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 13 }} onClick={() => { window.open(`/quotations/${params.id}/pdf`, '_blank'); setExportDropdown(false); }}>📄 Tải bản PDF</button>
                                        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 13 }} onClick={() => { setExportDropdown(false); /* TODO: export image */ toast.info('Tính năng xuất ảnh đang phát triển'); }}>🖼️ Tải bản Hình ảnh</button>
                                    </div>
                                </>
                            )}
                        </div>
                        {/* In ấn */}
                        <button className="btn btn-ghost" onClick={() => { const w = window.open(`/quotations/${params.id}/pdf`, '_blank'); w && w.addEventListener('load', () => w.print()); }} title="In báo giá">🖨️</button>
                        {/* Lưu mẫu */}
                        <button className="btn btn-ghost" onClick={async () => {
                            try {
                                await apiFetch('/api/quotation-templates', { method: 'POST', body: JSON.stringify({ name: mainCategories[activeMainIdx]?.name || 'Mẫu báo giá', categories: buildPayload().categories }) });
                                toast.success('Đã lưu thành mẫu!');
                            } catch (e) { toast.error('Lỗi lưu mẫu: ' + e.message); }
                        }}>💾 Lưu mẫu</button>
                        {canCreateAddendum && (
                            <button className="btn btn-success btn-sm" onClick={handleCreateAddendum} style={{ fontSize: 12 }}>📑 Tạo HĐ phụ lục</button>
                        )}
                        {isLocked ? (
                            <>
                                <button className="btn btn-secondary" onClick={() => handleClone('supplemental')}>📋 BG bổ sung</button>
                                <button className="btn btn-ghost" onClick={() => handleClone('copy')}>📋 Copy</button>
                            </>
                        ) : (
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Cập nhật'}</button>
                        )}
                    </div>
                </div>

                {/* Lock / Warning banners */}
                {isLocked && (
                    <div style={{ padding: '10px 16px', background: qMeta.status === 'Hợp đồng' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${qMeta.status === 'Hợp đồng' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`, borderRadius: 8, marginBottom: 12, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🔒 Báo giá đã <strong>{qMeta.status}</strong> — không thể chỉnh sửa.</span>
                        <button className="btn btn-primary btn-sm" onClick={() => handleClone('supplemental')} style={{ fontSize: 12 }}>📋 Tạo BG bổ sung</button>
                    </div>
                )}
                {isWarning && (
                    <div style={{ padding: '10px 16px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                        ⚠️ BG đã gửi khách hàng. Sửa sẽ ghi nhận thay đổi.
                    </div>
                )}
                {isConfirmed && (
                    <div style={{ padding: '10px 16px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, marginBottom: 12, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>⚠️ BG đã được KH xác nhận. {isVariation ? '' : `Sửa sẽ tự động chuyển về "Gửi KH" và tăng phiên bản (v${qMeta.revision} → v${qMeta.revision + 1}).`}</span>
                        {canCreateAddendum && (
                            <button className="btn btn-success btn-sm" onClick={handleCreateAddendum} style={{ fontSize: 12 }}>📑 Tạo HĐ phụ lục</button>
                        )}
                    </div>
                )}
                {qMeta.parentId && (
                    <div style={{ padding: '8px 16px', background: 'rgba(35,64,147,0.06)', borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
                        📎 BG bổ sung cho: <a href={`/quotations/${qMeta.parentId}/edit`} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>BG gốc</a>
                    </div>
                )}
                {qMeta.children?.length > 0 && (
                    <div style={{ padding: '8px 16px', background: 'rgba(35,64,147,0.06)', borderRadius: 8, marginBottom: 12, fontSize: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>📎 BG bổ sung:</span>
                        {qMeta.children.map(c => (
                            <a key={c.id} href={`/quotations/${c.id}/edit`} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>{c.code}</a>
                        ))}
                    </div>
                )}

                {/* Thông tin chung */}
                <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header"><h3>Thông tin chung</h3></div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                            <div>
                                <label className="form-label">Khách hàng *</label>
                                <select className="form-select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value, projectId: '' })}>
                                    <option value="">-- Chọn KH --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Dự án</label>
                                <select className="form-select" value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value || null })}>
                                    <option value="">-- Chọn DA --</option>
                                    {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Loại</label>
                                <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    {QUOTATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Trạng thái</label>
                                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    {QUOTATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main category tabs (Level 1) — sticky */}
                <div className="quotation-sticky-bar">
                    <div className="quotation-category-tabs">
                        {mainCategories.map((mc, mi) => (
                            <button key={mc._key} className={`btn ${mi === activeMainIdx ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                onClick={() => { setActiveMainIdx(mi); hook.setActiveSubIdx(0); }} style={{ fontSize: 12 }}>
                                {mc.name || `Hạng mục #${mi + 1}`}
                                <span style={{ opacity: 0.5, marginLeft: 4 }}>({fmt(mc.subtotal)}đ)</span>
                                {mainCategories.length > 1 && mi === activeMainIdx && (
                                    <span onClick={(e) => { e.stopPropagation(); removeMainCategory(mi); }}
                                        style={{ marginLeft: 6, opacity: 0.5, cursor: 'pointer' }}>✕</span>
                                )}
                            </button>
                        ))}
                        <button className="btn btn-ghost btn-sm" onClick={addMainCategory} style={{ fontSize: 18, padding: '2px 10px' }}>+</button>
                    </div>

                    {/* Main category name — preset selector + free input */}
                    <div style={{ marginBottom: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select className="form-select" style={{ width: 220, fontSize: 13, flexShrink: 0 }}
                            value={PRESET_CATEGORIES.some(p => p.name === mainCategories[activeMainIdx]?.name) ? mainCategories[activeMainIdx]?.name : ''}
                            onChange={e => { if (e.target.value) applyPresetCategory(activeMainIdx, e.target.value); }}>
                            <option value="">— Chọn nhóm mẫu —</option>
                            {PRESET_CATEGORIES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                        </select>
                        <input className="form-input" placeholder="Hoặc nhập tên hạng mục tùy chỉnh..."
                            value={mainCategories[activeMainIdx]?.name || ''}
                            onChange={e => updateMainCategoryName(activeMainIdx, e.target.value)}
                            style={{ fontWeight: 600, fontSize: 15, flex: 1 }} />
                    </div>
                </div>

                {/* Subcategory sections (Level 2 + Level 3) */}
                <CategoryTable mi={activeMainIdx} hook={hook} onImageClick={handleImageClick} onSubcategoryImageClick={handleSubcategoryImageClick} />

                {/* Upload indicator */}
                {uploadingCell && (
                    <div style={{ position: 'fixed', bottom: 20, right: 20, background: 'var(--accent-primary)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, zIndex: 100, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Đang tải ảnh...
                    </div>
                )}

                <QuotationSummary hook={hook} />
            </div>

            <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImgChange} />

            {/* Share Modal */}
            {shareModal && (
                <>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} onClick={() => setShareModal(false)} />
                    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-card)', borderRadius: 12, padding: 24, zIndex: 201, width: 480, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16 }}>📨 Gửi Báo Giá</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShareModal(false)}>✕</button>
                        </div>

                        {/* Copy Link */}
                        <div style={{ marginBottom: 16 }}>
                            <label className="form-label">🔗 Link chia sẻ</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input className="form-input" readOnly value={shareToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/public/baogia/${shareToken}` : 'Đang tạo...'} style={{ flex: 1, fontSize: 12 }} />
                                <button className="btn btn-primary btn-sm" onClick={() => {
                                    const url = `${window.location.origin}/public/baogia/${shareToken}`;
                                    navigator.clipboard.writeText(url);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                    toast.success('Đã copy link!');
                                }}>{copied ? '✅ Đã copy!' : '📋 Copy'}</button>
                            </div>
                        </div>

                        {/* Zalo */}
                        <div style={{ marginBottom: 16 }}>
                            <label className="form-label">💬 Gửi qua Zalo</label>
                            <button className="btn btn-secondary" style={{ width: '100%', background: '#0068FF', color: '#fff', border: 'none' }} onClick={() => {
                                const customer = customers.find(c => c.id === form.customerId);
                                const project = filteredProjects.find(p => p.id === form.projectId);
                                const total = hook.mainCategories.reduce((s, mc) => s + (mc.subtotal || 0), 0);
                                const fmtTotal = new Intl.NumberFormat('vi-VN').format(Math.round(total));
                                const url = `${window.location.origin}/public/baogia/${shareToken}`;
                                const msg = `[Một Nhà] Gửi Anh/Chị ${customer?.name || ''} báo giá ${project?.name || form.type || ''}. Tổng giá trị: ${fmtTotal} VNĐ. Anh/Chị xem chi tiết tại đây: ${url}`;
                                const zaloUrl = `https://zalo.me/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(msg)}`;
                                window.open(zaloUrl, '_blank', 'width=600,height=500');
                            }}>💬 Mở Zalo gửi ngay</button>
                        </div>

                        {/* Tracking info */}
                        <div style={{ padding: 12, background: 'var(--bg-hover)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>👀 Lượt xem:</span>
                                <strong style={{ color: 'var(--text-primary)' }}>{trackingData.viewCount}</strong>
                            </div>
                            {trackingData.lastViewedAt && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>🕐 Xem gần nhất:</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{new Date(trackingData.lastViewedAt).toLocaleString('vi-VN')}</strong>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

        </div>
    );
}
