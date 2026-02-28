'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/fetchClient';
import { QUOTATION_TYPES, QUOTATION_STATUSES, fmt, emptyCategory } from '@/lib/quotation-constants';
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
    const [uploadingCell, setUploadingCell] = useState(null); // {ci, ii}
    const imgInputRef = useRef(null);
    const imgUploadTarget = useRef(null);
    const [treeSidebarOpen, setTreeSidebarOpen] = useState(false);

    const {
        form, setForm, categories, setCategories,
        customers, filteredProjects, activeCategoryIdx, setActiveCategoryIdx,
        addCategory, recalc, buildPayload,
    } = hook;

    // Load quotation data
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
            });
            if (q.categories && q.categories.length > 0) {
                const cats = q.categories.map(cat => ({
                    _key: Date.now() + Math.random(),
                    name: cat.name, subtotal: cat.subtotal || 0,
                    items: (cat.items || []).map(item => ({
                        _key: Date.now() + Math.random(),
                        name: item.name || '',
                        unit: item.unit || 'm²',
                        quantity: item.quantity || 0,
                        unitPrice: item.unitPrice || 0,
                        amount: item.amount || 0,
                        description: item.description || '',
                        length: item.length || 0,
                        width: item.width || 0,
                        height: item.height || 0,
                        image: item.image || '',
                    })),
                }));
                setCategories(cats);
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
        data: { form, categories },
        enabled: !loading,
        onRestore: (draft) => {
            if (draft.form) setForm(draft.form);
            if (draft.categories) setCategories(draft.categories);
            toast.info('Đã khôi phục bản nháp chưa lưu');
        },
    });

    // Image upload
    const handleImageClick = (ci, ii) => {
        imgUploadTarget.current = { ci, ii };
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
            const c = [...categories];
            c[t.ci].items[t.ii] = { ...c[t.ci].items[t.ii], image: url };
            setCategories(c);
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
            await apiFetch(`/api/quotations/${params.id}`, {
                method: 'PUT', body: JSON.stringify(buildPayload()),
            });
            // Clear draft on success
            try { localStorage.removeItem(`quotation_draft_${params.id}`); } catch {}
            toast.success('Đã cập nhật báo giá thành công!');
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Đang tải...</div>;

    return (
        <div className="quotation-layout">
            {/* Mobile tree toggle */}
            <button className="btn btn-primary quotation-tree-toggle" onClick={() => setTreeSidebarOpen(true)}>
                🔧 Thư viện
            </button>

            {/* Tree overlay (mobile) */}
            {treeSidebarOpen && <div className="quotation-tree-overlay" onClick={() => setTreeSidebarOpen(false)} />}

            {/* LEFT: Tree sidebar */}
            <div className={`quotation-tree-wrapper ${treeSidebarOpen ? 'open' : ''}`}>
                <TreeSidebar hook={hook} onClose={() => setTreeSidebarOpen(false)} />
            </div>

            {/* RIGHT: Main */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div className="quotation-page-header">
                    <h2 style={{ margin: 0 }}>Sửa Báo Giá</h2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost" onClick={() => router.push('/quotations')}>← Quay lại</button>
                        <button className="btn btn-ghost" onClick={() => window.open(`/quotations/${params.id}/pdf`, '_blank')}>📄 PDF</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Cập nhật'}</button>
                    </div>
                </div>

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

                {/* Category tabs */}
                <div className="quotation-category-tabs">
                    {categories.map((cat, ci) => (
                        <button key={cat._key} className={`btn ${ci === activeCategoryIdx ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            onClick={() => setActiveCategoryIdx(ci)} style={{ fontSize: 12 }}>
                            {cat.name || `Hạng mục #${ci + 1}`}
                            <span style={{ opacity: 0.5, marginLeft: 4 }}>({fmt(cat.subtotal)}đ)</span>
                        </button>
                    ))}
                    <button className="btn btn-ghost btn-sm" onClick={addCategory} style={{ fontSize: 18, padding: '2px 10px' }}>+</button>
                </div>

                {/* Active category table */}
                {categories.map((cat, ci) => ci !== activeCategoryIdx ? null : (
                    <CategoryTable key={cat._key} cat={cat} ci={ci} hook={hook} onImageClick={handleImageClick} />
                ))}

                {/* Upload indicator */}
                {uploadingCell && (
                    <div style={{ position: 'fixed', bottom: 20, right: 20, background: 'var(--accent-primary)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, zIndex: 100, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Đang tải ảnh...
                    </div>
                )}

                {/* Summary */}
                <QuotationSummary hook={hook} />
            </div>

            <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImgChange} />
        </div>
    );
}
