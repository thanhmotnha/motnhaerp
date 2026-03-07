'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PAYMENT_TEMPLATES, CONTRACT_TYPES, CONTRACT_STATUSES } from '@/lib/contractTemplates';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
const fmtDateVN = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function ContractDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingPayments, setEditingPayments] = useState(false);
    const [paymentPhases, setPaymentPhases] = useState([]);
    const [savingPayments, setSavingPayments] = useState(false);
    const [projects, setProjects] = useState([]);
    const fileRef = useRef();

    const reload = () => {
        fetch(`/api/contracts/${id}`)
            .then(r => r.json())
            .then(d => {
                setData(d);
                setForm({
                    name: d.name || '', type: d.type || 'Thi công thô', status: d.status || 'Nháp',
                    contractValue: d.contractValue || 0, variationAmount: d.variationAmount || 0,
                    signDate: fmtDate(d.signDate), startDate: fmtDate(d.startDate), endDate: fmtDate(d.endDate),
                    paymentTerms: d.paymentTerms || '', notes: d.notes || '', fileUrl: d.fileUrl || '',
                    projectId: d.projectId || '',
                });
            });
    };

    useEffect(() => { reload(); }, [id]);
    useEffect(() => { fetch('/api/projects?limit=200').then(r => r.json()).then(d => setProjects(d.data || [])); }, []);

    const save = async () => {
        setSaving(true);
        const res = await fetch(`/api/contracts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: form.name, type: form.type, status: form.status,
                contractValue: parseFloat(form.contractValue) || 0,
                variationAmount: parseFloat(form.variationAmount) || 0,
                signDate: form.signDate || null, startDate: form.startDate || null,
                endDate: form.endDate || null, paymentTerms: form.paymentTerms,
                notes: form.notes, fileUrl: form.fileUrl,
                projectId: form.projectId || null,
            }),
        });
        if (res.ok) {
            setSaved(true); setTimeout(() => setSaved(false), 2500);
            const updated = await res.json();
            setData(prev => ({ ...prev, ...updated }));
        } else {
            const err = await res.json().catch(() => ({}));
            alert('Lỗi lưu: ' + (err.error || err.message || 'Không rõ'));
        }
        setSaving(false);
    };

    const deleteContract = async () => {
        if (!confirm('Bạn chắc chắn muốn xóa hợp đồng này?')) return;
        const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' });
        if (res.ok) router.push('/contracts');
    };

    const uploadFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'contracts');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.url) {
            setForm(f => ({ ...f, fileUrl: json.url }));
            // Auto-save after upload
            const saveRes = await fetch(`/api/contracts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileUrl: json.url }),
            });
            if (saveRes.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
        }
        setUploading(false);
    };

    // === Payment editing ===
    const startEditPayments = () => {
        const cv = parseFloat(form.contractValue) || 0;
        setPaymentPhases((data.payments || []).map(p => ({
            phase: p.phase, amount: p.amount || 0, paidAmount: p.paidAmount || 0,
            pct: cv > 0 ? Math.round((p.amount || 0) / cv * 100) : 0,
            status: p.status || 'Chưa thu', notes: p.notes || '', category: p.category || '',
        })));
        setEditingPayments(true);
    };

    const loadTemplate = () => {
        const tmpl = PAYMENT_TEMPLATES[form.type] || [];
        const cv = parseFloat(form.contractValue) || 0;
        setPaymentPhases(tmpl.map(t => ({
            phase: t.phase, pct: t.pct, category: t.category || '',
            amount: Math.round(cv * t.pct / 100), paidAmount: 0, status: 'Chưa thu', notes: '',
        })));
    };

    const updatePhase = (idx, field, value) => {
        const cv = parseFloat(form.contractValue) || 0;
        setPaymentPhases(prev => prev.map((p, i) => {
            if (i !== idx) return p;
            const updated = { ...p, [field]: value };
            if (field === 'pct') updated.amount = Math.round(cv * (Number(value) || 0) / 100);
            if (field === 'amount') updated.pct = cv ? Math.round((Number(value) || 0) / cv * 100) : 0;
            return updated;
        }));
    };

    const addPhase = () => setPaymentPhases(prev => [...prev, { phase: '', pct: 0, amount: 0, paidAmount: 0, status: 'Chưa thu', notes: '', category: '' }]);
    const removePhase = (idx) => setPaymentPhases(prev => prev.filter((_, i) => i !== idx));

    const savePayments = async () => {
        if (paymentPhases.length > 0) {
            const total = paymentPhases.reduce((s, p) => s + (p.pct || 0), 0);
            if (total !== 100) return alert(`Tổng tỷ lệ các đợt đang là ${total}% — phải bằng 100% mới lưu được.`);
        }
        setSavingPayments(true);
        const res = await fetch(`/api/contracts/${id}/payments`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phases: paymentPhases }),
        });
        if (res.ok) {
            const payments = await res.json();
            setData(prev => ({ ...prev, payments }));
            setEditingPayments(false);
        }
        setSavingPayments(false);
    };

    const totalPhasePct = paymentPhases.reduce((s, p) => s + (p.pct || 0), 0);
    const totalPhaseAmount = paymentPhases.reduce((s, p) => s + (p.amount || 0), 0);

    const [linkProjectId, setLinkProjectId] = useState('');
    const [linkingProject, setLinkingProject] = useState(false);

    const linkExistingProject = async () => {
        if (!linkProjectId) return alert('Vui lòng chọn dự án');
        if (!confirm('Link hợp đồng này với dự án đã chọn?')) return;
        setLinkingProject(true);
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch(`/api/contracts/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Đã ký', signDate: form.signDate || today, projectId: linkProjectId }),
        });
        if (res.ok) { alert('Đã link thành công!'); reload(); }
        else { alert('Lỗi khi link dự án'); }
        setLinkingProject(false);
    };

    const [creatingProject, setCreatingProject] = useState(false);
    const signAndCreateProject = async () => {
        if (!confirm('Ký hợp đồng và tự động tạo Dự án thi công từ HĐ này?')) return;
        setCreatingProject(true);
        try {
            const typeMap = { 'Thiết kế kiến trúc': 'Thiết kế', 'Thiết kế nội thất': 'Thiết kế', 'Thi công thô': 'Thi công', 'Thi công hoàn thiện': 'Thi công', 'Thi công nội thất': 'Thi công' };
            const projName = data.name.replace(/^HĐ\s*/i, '').trim() || data.name;
            const projRes = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: projName, type: typeMap[form.type] || 'Thi công',
                    customerId: data.customerId, budget: parseFloat(form.contractValue) || 0,
                    startDate: form.startDate ? new Date(form.startDate) : null,
                    endDate: form.endDate ? new Date(form.endDate) : null,
                    status: 'Đang thi công', notes: `Tạo tự động từ hợp đồng ${data.code}`,
                }),
            });
            if (!projRes.ok) { const e = await projRes.json(); return alert('Lỗi tạo dự án: ' + (e.error || 'Unknown')); }
            const newProject = await projRes.json();
            const today = new Date().toISOString().slice(0, 10);
            const contractRes = await fetch(`/api/contracts/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Đã ký', signDate: form.signDate || today, projectId: newProject.id }),
            });
            if (contractRes.ok) {
                alert(`Đã ký hợp đồng và tạo dự án "${newProject.name}" (${newProject.code}) thành công!`);
                reload();
            }
        } finally { setCreatingProject(false); }
    };

    if (!data || !form) return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Đang tải...</div>;

    const fileExt = form.fileUrl ? form.fileUrl.split('.').pop().toUpperCase() : null;
    const fileName = form.fileUrl ? form.fileUrl.split('/').pop() : null;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => router.push('/contracts')}>← Hợp đồng</button>
                <span style={{ color: 'var(--text-muted)' }}>/</span>
                <span className="accent" style={{ fontWeight: 700 }}>{data.code}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    {saved && <span style={{ color: 'var(--status-success)', fontWeight: 600, alignSelf: 'center' }}>✅ Đã lưu!</span>}
                    <button className="btn btn-danger" onClick={deleteContract}>🗑 Xóa HĐ</button>
                    <button className="btn btn-primary" onClick={save} disabled={saving}>
                        {saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
                    </button>
                </span>
            </div>

            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                {/* LEFT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Thông tin chung */}
                    <div className="card">
                        <div className="card-header"><h3>📋 Thông tin hợp đồng</h3></div>
                        <div className="card-body">
                            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Tên hợp đồng</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Dự án liên kết</label>
                                    <select className="form-select" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                                        <option value="">— Chưa gán dự án —</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Loại hợp đồng</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                        {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                        {CONTRACT_STATUSES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Giá trị HĐ (₫)</label>
                                    <input className="form-input" type="number" value={form.contractValue} onChange={e => setForm(f => ({ ...f, contractValue: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phát sinh (₫)</label>
                                    <input className="form-input" type="number" value={form.variationAmount} onChange={e => setForm(f => ({ ...f, variationAmount: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày ký</label>
                                    <input className="form-input" type="date" value={form.signDate} onChange={e => setForm(f => ({ ...f, signDate: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày bắt đầu</label>
                                    <input className="form-input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày kết thúc</label>
                                    <input className="form-input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Điều khoản thanh toán</label>
                                    <textarea className="form-input" rows={3} value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} style={{ resize: 'vertical' }} />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Ghi chú</label>
                                    <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Upload file */}
                    <div className="card">
                        <div className="card-header"><h3>📎 File hợp đồng</h3></div>
                        <div className="card-body">
                            {form.fileUrl ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: 32 }}>{['DOC', 'DOCX'].includes(fileExt) ? '📝' : fileExt === 'PDF' ? '📄' : '📁'}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fileExt} file</div>
                                    </div>
                                    <a href={form.fileUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: 12 }}>⬇️ Tải về</a>
                                    <button className="btn btn-danger" style={{ fontSize: 12 }} onClick={() => { setForm(f => ({ ...f, fileUrl: '' })); }}>🗑 Xóa</button>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '28px 20px', border: '2px dashed var(--border)', borderRadius: 8, color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: 36, marginBottom: 8 }}>📎</div>
                                    <div style={{ fontSize: 13, marginBottom: 12 }}>Chưa có file hợp đồng</div>
                                    <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                                        {uploading ? '⏳ Đang upload...' : '📤 Upload file (DOC, DOCX, PDF)'}
                                    </button>
                                </div>
                            )}
                            {form.fileUrl && (
                                <button className="btn btn-secondary" style={{ marginTop: 10, fontSize: 12 }} onClick={() => fileRef.current?.click()} disabled={uploading}>
                                    {uploading ? '⏳...' : '🔄 Thay file khác'}
                                </button>
                            )}
                            <input ref={fileRef} type="file" accept=".doc,.docx,.pdf,.xls,.xlsx" style={{ display: 'none' }} onChange={uploadFile} />
                        </div>
                    </div>

                    {/* Lịch thanh toán */}
                    <div className="card">
                        <div className="card-header">
                            <h3>💰 Lịch thanh toán</h3>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {!editingPayments ? (
                                    <button className="btn btn-secondary btn-sm" onClick={startEditPayments}>✏️ Chỉnh sửa đợt TT</button>
                                ) : (
                                    <>
                                        <button className="btn btn-ghost btn-sm" onClick={loadTemplate} title="Load mẫu theo loại HĐ">📋 Template "{form.type}"</button>
                                        <button className="btn btn-ghost btn-sm" onClick={addPhase}>➕ Thêm đợt</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingPayments(false)}>✕ Hủy</button>
                                        <button className="btn btn-primary btn-sm" onClick={savePayments} disabled={savingPayments}>
                                            {savingPayments ? '⏳...' : '💾 Lưu'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            {editingPayments ? (
                                paymentPhases.length === 0 ? (
                                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Chưa có đợt nào. Bấm <strong>"📋 Template"</strong> để load mẫu hoặc <strong>"➕ Thêm đợt"</strong>.
                                    </div>
                                ) : (
                                    <table className="data-table" style={{ margin: 0 }}>
                                        <thead><tr>
                                            <th style={{ width: 35 }}>#</th><th>Giai đoạn</th>
                                            <th style={{ width: 80, textAlign: 'center' }}>%</th>
                                            <th style={{ width: 160, textAlign: 'right' }}>Số tiền</th>
                                            <th style={{ width: 40 }}></th>
                                        </tr></thead>
                                        <tbody>
                                            {paymentPhases.map((p, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{idx + 1}</td>
                                                    <td><input className="form-input form-input-compact" value={p.phase} onChange={e => updatePhase(idx, 'phase', e.target.value)} style={{ width: '100%' }} /></td>
                                                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 2 }}><input className="form-input form-input-compact" type="number" value={p.pct || ''} onChange={e => updatePhase(idx, 'pct', parseFloat(e.target.value) || 0)} style={{ width: 55, textAlign: 'center' }} /><span style={{ fontSize: 11 }}>%</span></div></td>
                                                    <td><input className="form-input form-input-compact" type="number" value={p.amount || ''} onChange={e => updatePhase(idx, 'amount', parseFloat(e.target.value) || 0)} style={{ width: '100%', textAlign: 'right' }} /></td>
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
                                )
                            ) : (
                                data.payments?.length > 0 ? (
                                    <>
                                        <table className="data-table" style={{ margin: 0 }}>
                                            <thead><tr>
                                                <th>Đợt thanh toán</th><th>%</th><th>Giá trị</th>
                                                <th>Đã thu</th><th>Còn lại</th><th>Tiến độ</th>
                                                <th>Ngày thu</th><th>Trạng thái</th>
                                            </tr></thead>
                                            <tbody>
                                                {data.payments.map(p => {
                                                    const cv = parseFloat(form.contractValue) || 0;
                                                    const phasePct = cv > 0 ? Math.round((p.amount || 0) / cv * 100) : 0;
                                                    const paidPct = p.amount > 0 ? Math.round((p.paidAmount || 0) / p.amount * 100) : 0;
                                                    const remaining = (p.amount || 0) - (p.paidAmount || 0);
                                                    return (
                                                        <tr key={p.id}>
                                                            <td style={{ fontWeight: 600 }}>{p.phase}</td>
                                                            <td style={{ textAlign: 'center' }}>{phasePct}%</td>
                                                            <td className="amount">{fmt(p.amount)}</td>
                                                            <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(p.paidAmount)}</td>
                                                            <td style={{ color: remaining > 0 ? 'var(--status-danger)' : 'var(--text-muted)', fontWeight: 600 }}>{fmt(remaining)}</td>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <div className="progress-bar" style={{ flex: 1, minWidth: 50 }}><div className="progress-fill" style={{ width: `${paidPct}%` }}></div></div>
                                                                    <span style={{ fontSize: 11 }}>{paidPct}%</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ fontSize: 12 }}>{p.paidDate ? fmtDateVN(p.paidDate) : '—'}</td>
                                                            <td>
                                                                <span className={`badge ${p.status === 'Đã thu' ? 'success' : p.status === 'Thu một phần' ? 'warning' : 'muted'}`}>{p.status}</span>
                                                                {p.proofUrl && <a href={p.proofUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 4 }}>📸</a>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        <div style={{ padding: '10px 16px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                                            <a href="/payments" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                                                💰 Thu tiền & In phiếu thu → Trang Thu tiền
                                            </a>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Chưa có lịch thanh toán. Bấm <strong>"✏️ Chỉnh sửa đợt TT"</strong> để tạo.
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Tóm tắt */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card">
                        <div className="card-header"><h3>📊 Tóm tắt</h3></div>
                        <div className="card-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {[
                                    ['Khách hàng', data.customer?.name],
                                    ['Loại HĐ', form.type],
                                    ['Báo giá liên kết', data.quotation?.code || '—'],
                                ].map(([label, val]) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                                        <span style={{ fontWeight: 600, textAlign: 'right' }}>{val}</span>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Dự án</span>
                                    {data.project ? (
                                        <a href={`/projects/${data.project.id}`} style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                                            {data.project.name} ↗
                                        </a>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)' }}>— Chưa gán</span>
                                    )}
                                </div>
                                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Giá trị HĐ</span>
                                    <span style={{ fontWeight: 700 }}>{fmt(form.contractValue)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Phát sinh</span>
                                    <span style={{ fontWeight: 600, color: 'var(--status-warning)' }}>+{fmt(form.variationAmount)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: 'var(--accent-primary)', borderTop: '2px solid var(--accent-primary)', paddingTop: 8 }}>
                                    <span>Tổng giá trị</span>
                                    <span>{fmt((parseFloat(form.contractValue) || 0) + (parseFloat(form.variationAmount) || 0))}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Đã thu</span>
                                    <span style={{ fontWeight: 600, color: 'var(--status-success)' }}>{fmt(data.paidAmount)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Còn lại</span>
                                    <span style={{ fontWeight: 700, color: 'var(--status-danger)' }}>
                                        {fmt(((parseFloat(form.contractValue) || 0) + (parseFloat(form.variationAmount) || 0)) - (data.paidAmount || 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ký HĐ & tạo dự án */}
                    {data.status === 'Nháp' && (
                        <div className="card" style={{ border: '1px solid var(--status-warning)', background: 'var(--bg-warning, #fffbeb)' }}>
                            <div className="card-body" style={{ textAlign: 'center', padding: 20 }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>🏗️</div>
                                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Ký & Khởi động Dự án</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                                    Ký hợp đồng và tự động tạo dự án thi công từ thông tin HĐ này
                                </div>
                                <button className="btn btn-primary" style={{ width: '100%' }} onClick={signAndCreateProject} disabled={creatingProject}>
                                    {creatingProject ? '⏳ Đang xử lý...' : '✅ Ký HĐ & Tạo Dự án'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Progress thu tiền */}
                    <div className="card">
                        <div className="card-header"><h3>📈 Tiến độ thu tiền</h3></div>
                        <div className="card-body">
                            {(() => {
                                const total = (parseFloat(form.contractValue) || 0) + (parseFloat(form.variationAmount) || 0);
                                const paid = data.paidAmount || 0;
                                const pctVal = total > 0 ? Math.round((paid / total) * 100) : 0;
                                return (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                                            <span>Đã thu</span><span style={{ fontWeight: 700 }}>{pctVal}%</span>
                                        </div>
                                        <div className="progress-bar" style={{ height: 10 }}><div className="progress-fill" style={{ width: `${pctVal}%` }}></div></div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                                            {data.payments?.filter(p => p.status === 'Đã thu').length || 0} / {data.payments?.length || 0} đợt đã thanh toán
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
