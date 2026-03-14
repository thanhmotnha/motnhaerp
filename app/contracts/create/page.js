'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PAYMENT_TEMPLATES, CONTRACT_TYPES } from '@/lib/contractTemplates';
import { apiFetch } from '@/lib/fetchClient';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export default function CreateContractPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const autoFilledRef = useRef(false);
    const [customers, setCustomers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [saving, setSaving] = useState(false);
    const [paymentPhases, setPaymentPhases] = useState([]);
    const [dbPaymentTemplates, setDbPaymentTemplates] = useState(null);
    const [contractFile, setContractFile] = useState(null);
    const [fileUploading, setFileUploading] = useState(false);
    const [fileUrl, setFileUrl] = useState('');
    const [quotationDetail, setQuotationDetail] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);

    const [form, setForm] = useState({
        name: '', type: 'Thi công thô', contractValue: 0, signDate: '', startDate: '', endDate: '',
        paymentTerms: '', notes: '', customerId: '', projectId: '', quotationId: '',
    });

    useEffect(() => {
        fetch('/api/customers?limit=1000').then(r => r.json()).then(d => setCustomers(d.data || []));
        fetch('/api/projects?limit=1000').then(r => r.json()).then(d => setProjects(d.data || []));
        fetch('/api/quotations?limit=1000').then(r => r.json()).then(d => setQuotations(d.data || []));
        // Load payment templates from DB settings (synced with Settings page)
        fetch('/api/admin/settings').then(r => r.json()).then(data => {
            if (data?.payment_templates) {
                try { setDbPaymentTemplates(JSON.parse(data.payment_templates)); } catch { }
            }
        }).catch(() => { });
    }, []);

    // Auto-fill from URL params
    useEffect(() => {
        if (autoFilledRef.current || quotations.length === 0) return;
        const qId = searchParams.get('quotationId');
        const customerId = searchParams.get('customerId');
        const projectId = searchParams.get('projectId');
        const type = searchParams.get('type');
        const value = searchParams.get('value');
        if (!qId && !customerId) return;
        autoFilledRef.current = true;
        if (qId) {
            const q = quotations.find(x => x.id === qId);
            if (q) {
                setForm(f => ({
                    ...f, quotationId: qId,
                    customerId: q.customerId || customerId || f.customerId,
                    projectId: q.projectId || projectId || f.projectId,
                    type: q.type || type || f.type,
                    contractValue: q.grandTotal || q.total || Number(value) || f.contractValue,
                    name: `HĐ ${q.type} - ${q.customer?.name || ''}`.trim(),
                }));
                return;
            }
        }
        setForm(f => ({ ...f, customerId: customerId || f.customerId, projectId: projectId || f.projectId, type: type || f.type, contractValue: Number(value) || f.contractValue }));
    }, [quotations, searchParams]);

    // Derive contract types from DB templates (synced with Settings) + hardcoded fallback
    const contractTypes = dbPaymentTemplates
        ? [...new Set([...Object.keys(dbPaymentTemplates), ...CONTRACT_TYPES])]
        : CONTRACT_TYPES;

    // Auto-load template when type changes — use DB templates first, fallback to hardcoded
    useEffect(() => {
        const templates = dbPaymentTemplates || PAYMENT_TEMPLATES;
        const tmpl = templates[form.type] || PAYMENT_TEMPLATES[form.type] || [];
        setPaymentPhases(tmpl.map(t => ({
            phase: t.phase, pct: t.pct, category: t.category || '',
            amount: Math.round((form.contractValue || 0) * t.pct / 100),
        })));
    }, [form.type, dbPaymentTemplates]);

    // Recalc amounts when contractValue changes
    useEffect(() => {
        setPaymentPhases(prev => prev.map(p => ({ ...p, amount: Math.round((form.contractValue || 0) * p.pct / 100) })));
    }, [form.contractValue]);

    const availableQuotations = quotations.filter(q => q.status === 'Hợp đồng' && (q._count?.contracts || 0) === 0);
    const filteredProjects = form.customerId ? projects.filter(p => p.customerId === form.customerId) : projects;

    const totalPhasePct = paymentPhases.reduce((s, p) => s + (p.pct || 0), 0);
    const totalPhaseAmount = paymentPhases.reduce((s, p) => s + (p.amount || 0), 0);

    const selectQuotation = async (qId) => {
        const q = quotations.find(x => x.id === qId);
        if (q) {
            setForm(f => ({
                ...f, quotationId: qId,
                customerId: q.customerId || f.customerId,
                projectId: q.projectId || f.projectId,
                type: q.type || f.type,
                contractValue: q.grandTotal || q.total || f.contractValue,
                name: f.name || `HĐ ${q.type} - ${q.customer?.name || ''}`.trim(),
            }));
            // Load quotation detail for item selection
            try {
                const detail = await fetch(`/api/quotations/${qId}`).then(r => r.json());
                setQuotationDetail(detail);
                // Select all items by default
                const allIds = (detail.categories || []).flatMap(c => (c.items || []).map(i => i.id));
                setSelectedItems(allIds);
            } catch { setQuotationDetail(null); }
        } else {
            setForm(f => ({ ...f, quotationId: '' }));
            setQuotationDetail(null);
            setSelectedItems([]);
        }
    };

    const updatePhase = (idx, field, value) => {
        setPaymentPhases(prev => prev.map((p, i) => {
            if (i !== idx) return p;
            const updated = { ...p, [field]: value };
            if (field === 'pct') updated.amount = Math.round((form.contractValue || 0) * (Number(value) || 0) / 100);
            if (field === 'amount') updated.pct = form.contractValue ? Math.round((Number(value) || 0) / form.contractValue * 100) : 0;
            return updated;
        }));
    };

    const addPhase = () => setPaymentPhases(prev => [...prev, { phase: '', pct: 0, amount: 0, category: '' }]);
    const removePhase = (idx) => setPaymentPhases(prev => prev.filter((_, i) => i !== idx));

    const handleUploadFile = async (file) => {
        setContractFile(file);
        setFileUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', 'contracts');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Upload thất bại');
            const { url } = await res.json();
            setFileUrl(url);
        } catch (e) {
            alert('Lỗi upload: ' + e.message);
            setContractFile(null);
        }
        setFileUploading(false);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return alert('Nhập tên hợp đồng!');
        if (!form.customerId) return alert('Chọn khách hàng!');
        setSaving(true);
        try {
            const saved = await apiFetch('/api/contracts', {
                method: 'POST',
                body: JSON.stringify({ ...form, fileUrl, projectId: form.projectId || null, paymentPhases, selectedItems: JSON.stringify(selectedItems) }),
            });
            alert('Đã tạo hợp đồng thành công!');
            router.push(`/contracts/${saved.id}`);
        } catch (e) { alert('Lỗi: ' + e.message); }
        setSaving(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0 }}>📝 Tạo hợp đồng mới</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => router.back()}>← Quay lại</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? '⏳ Đang lưu...' : '💾 Tạo hợp đồng'}</button>
                </div>
            </div>

            {/* Chọn từ báo giá */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3>📄 Tạo từ báo giá (tùy chọn)</h3></div>
                <div className="card-body">
                    {availableQuotations.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Chưa có báo giá nào ở trạng thái "Hợp đồng". Bạn vẫn có thể tạo hợp đồng thủ công bên dưới.</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                            {availableQuotations.map(q => (
                                <div key={q.id} onClick={() => selectQuotation(q.id)}
                                    style={{ border: form.quotationId === q.id ? '2px solid var(--primary)' : '1px solid var(--border-color)', borderRadius: 10, padding: 14, cursor: 'pointer', background: form.quotationId === q.id ? 'var(--primary-alpha)' : 'var(--bg-card)', transition: 'all 0.2s' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="badge info" style={{ fontSize: 11 }}>{q.code}</span>
                                        <span className="badge success">{q.status}</span>
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{q.customer?.name || 'N/A'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{q.type}</div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', marginTop: 6 }}>{fmt(q.grandTotal || q.total || 0)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Tick chọn hạng mục từ BG */}
            {quotationDetail?.categories?.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <h3>✅ Chọn hạng mục đưa vào hợp đồng</h3>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {selectedItems.length}/{quotationDetail.categories.flatMap(c => c.items || []).length} hạng mục
                        </span>
                    </div>
                    <div className="card-body" style={{ padding: 0, maxHeight: 400, overflow: 'auto' }}>
                        {/* Select all */}
                        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                                <input type="checkbox"
                                    checked={selectedItems.length === quotationDetail.categories.flatMap(c => c.items || []).length}
                                    onChange={() => {
                                        const allIds = quotationDetail.categories.flatMap(c => (c.items || []).map(i => i.id));
                                        setSelectedItems(prev => prev.length === allIds.length ? [] : allIds);
                                    }} />
                                Chọn tất cả
                            </label>
                        </div>
                        {quotationDetail.categories.map(cat => {
                            const catItems = cat.items || [];
                            const catIds = catItems.map(i => i.id);
                            const allCatSel = catIds.every(id => selectedItems.includes(id));
                            return (
                                <div key={cat.id}>
                                    <div style={{ padding: '6px 16px', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                            <input type="checkbox" checked={allCatSel} onChange={() => {
                                                setSelectedItems(prev => allCatSel ? prev.filter(id => !catIds.includes(id)) : [...new Set([...prev, ...catIds])]);
                                            }} />
                                            📁 {cat.name}
                                            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({catItems.length})</span>
                                        </label>
                                    </div>
                                    {catItems.map(item => (
                                        <div key={item.id} style={{ padding: '4px 16px 4px 36px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                <input type="checkbox" checked={selectedItems.includes(item.id)}
                                                    onChange={() => setSelectedItems(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])} />
                                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                                                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmt(item.amount || 0)}</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Form thông tin hợp đồng */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3>Thông tin hợp đồng</h3></div>
                <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                        <div>
                            <label className="form-label">Tên hợp đồng *</label>
                            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: HĐ Thi công thô - Biệt thự ABC" />
                        </div>
                        <div>
                            <label className="form-label">Khách hàng *</label>
                            <select className="form-select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value, projectId: '' })}>
                                <option value="">-- Chọn khách hàng --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Dự án <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(tùy chọn)</span></label>
                            <select className="form-select" value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                                <option value="">-- Chưa gán dự án --</option>
                                {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Loại hợp đồng</label>
                            <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {contractTypes.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Giá trị hợp đồng</label>
                            <input className="form-input" type="number" value={form.contractValue || ''} onChange={e => setForm({ ...form, contractValue: parseFloat(e.target.value) || 0 })} />
                            {form.contractValue > 0 && <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>{fmt(form.contractValue)}</div>}
                        </div>
                        <div>
                            <label className="form-label">Ngày ký</label>
                            <input className="form-input" type="date" value={form.signDate} onChange={e => setForm({ ...form, signDate: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Ngày bắt đầu</label>
                            <input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Ngày kết thúc</label>
                            <input className="form-input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                        <label className="form-label">Ghi chú</label>
                        <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ghi chú thêm..." />
                    </div>
                </div>
            </div>

            {/* Upload file hợp đồng */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3>📎 File hợp đồng</h3></div>
                <div className="card-body">
                    {fileUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(34,197,94,0.06)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.2)' }}>
                            <span style={{ fontSize: 24 }}>✅</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{contractFile?.name || 'File đã upload'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{contractFile ? `${(contractFile.size / 1024 / 1024).toFixed(2)} MB` : ''}</div>
                            </div>
                            <a href={fileUrl} target="_blank" rel="noopener" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>👁️ Xem</a>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--status-danger)' }} onClick={() => { setFileUrl(''); setContractFile(null); }}>✕ Bỏ</button>
                        </div>
                    ) : (
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 16px', border: '2px dashed var(--border)', borderRadius: 10, cursor: fileUploading ? 'wait' : 'pointer', background: 'var(--bg-secondary)', transition: 'all 0.15s' }}>
                            <span style={{ fontSize: 32 }}>{fileUploading ? '⏳' : '📄'}</span>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{fileUploading ? 'Đang upload...' : 'Kéo thả hoặc bấm để chọn file'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PDF, DOC, DOCX — Tối đa 200MB</div>
                            <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} disabled={fileUploading}
                                onChange={e => { if (e.target.files[0]) handleUploadFile(e.target.files[0]); }} />
                        </label>
                    )}
                </div>
            </div>

            {/* Tiến độ thanh toán */}
            <div className="card">
                <div className="card-header">
                    <h3>💰 Tiến độ thanh toán</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: totalPhasePct === 100 ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: 600 }}>
                            Tổng: {totalPhasePct}%
                        </span>
                        {form.contractValue > 0 && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>= {fmt(totalPhaseAmount)}</span>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={addPhase}>➕ Thêm đợt</button>
                    </div>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {paymentPhases.length === 0 ? (
                        <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                            Chọn loại hợp đồng để tự động tạo tiến độ thanh toán
                        </div>
                    ) : (
                        <table className="data-table" style={{ margin: 0 }}>
                            <thead><tr><th style={{ width: 40 }}>#</th><th>Giai đoạn thanh toán</th><th style={{ width: 100, textAlign: 'center' }}>%</th><th style={{ width: 180, textAlign: 'right' }}>Số tiền</th><th style={{ width: 50 }}></th></tr></thead>
                            <tbody>
                                {paymentPhases.map((p, idx) => (
                                    <tr key={idx}>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{idx + 1}</td>
                                        <td><input className="form-input form-input-compact" value={p.phase} onChange={e => updatePhase(idx, 'phase', e.target.value)} placeholder="Tên đợt thanh toán" style={{ width: '100%' }} /></td>
                                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><input className="form-input form-input-compact" type="number" value={p.pct || ''} onChange={e => updatePhase(idx, 'pct', parseFloat(e.target.value) || 0)} style={{ width: 60, textAlign: 'center' }} /><span style={{ fontSize: 12 }}>%</span></div></td>
                                        <td style={{ textAlign: 'right' }}><input className="form-input form-input-compact" type="number" value={p.amount || ''} onChange={e => updatePhase(idx, 'amount', parseFloat(e.target.value) || 0)} style={{ width: '100%', textAlign: 'right' }} /></td>
                                        <td><button className="btn btn-ghost" onClick={() => removePhase(idx)} style={{ padding: '2px 6px', fontSize: 11, color: 'var(--status-danger)' }}>✕</button></td>
                                    </tr>
                                ))}
                                <tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                                    <td></td><td>Tổng cộng</td>
                                    <td style={{ textAlign: 'center', color: totalPhasePct === 100 ? 'var(--status-success)' : 'var(--status-danger)' }}>{totalPhasePct}%</td>
                                    <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{fmt(totalPhaseAmount)}</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
