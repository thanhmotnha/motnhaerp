'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import { useRole } from '@/contexts/RoleContext';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_BADGE = { 'Chờ duyệt': 'warning', 'Đã duyệt': 'info', 'Đã chi': 'accent', 'Hoàn thành': 'success', 'Từ chối': 'danger' };

// Fallbacks used only if API returns no categories
const FALLBACK_PROJECT_CATS = ['Vật tư xây dựng', 'Nhân công', 'Vận chuyển', 'Thiết bị máy móc', 'Điện nước', 'Thuê ngoài', 'Sửa chữa', 'Bảo hiểm công trình', 'Khác'];
const FALLBACK_COMPANY_CATS = ['Thuê văn phòng', 'Lương & Phụ cấp', 'Điện nước VP', 'Marketing & QC', 'Phí ngân hàng', 'Tiếp khách', 'Thuế & Lệ phí', 'Khác'];

const emptyForm = (firstCat = 'Vật tư xây dựng') => ({
    expenseType: 'Dự án',
    description: '',
    amount: '',
    category: firstCat,
    submittedBy: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    projectId: null,
    recipientType: '',
    recipientId: '',
});

export default function ExpensesTab() {
    const toast = useToast();
    const [expenses, setExpenses] = useState([]);
    const [projects, setProjects] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [categoryList, setCategoryList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterProject, setFilterProject] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [isHistorical, setIsHistorical] = useState(false);
    const [allocations, setAllocations] = useState([]);

    const { role } = useRole();

    const [proofModal, setProofModal] = useState(null);
    const [lightbox, setLightbox] = useState(null); // { urls: [], idx: 0 }
    const [proofFile, setProofFile] = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const proofRef = useRef();

    const [formProofFiles, setFormProofFiles] = useState([]); // [{file, preview}]
    const formProofRef = useRef();

    const addFormProofFiles = (files) => {
        const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!imgs.length) return;
        setFormProofFiles(prev => [...prev, ...imgs.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
    };
    const removeFormProofFile = (i) => setFormProofFiles(prev => prev.filter((_, j) => j !== i));

    const parseProofUrls = (url) => {
        if (!url) return [];
        try { const p = JSON.parse(url); return Array.isArray(p) ? p : [url]; }
        catch { return [url]; }
    };

    // ── Data fetching ──────────────────────────────────────────────
    const fetchExpenses = async () => {
        setLoading(true);
        setError(null);
        try {
            const d = await apiFetch('/api/project-expenses?limit=1000');
            setExpenses(d.data || []);
        } catch (e) {
            setError(e.message || 'Không tải được dữ liệu chi phí');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
        Promise.all([
            apiFetch('/api/projects?limit=1000').then(d => d.data || []).catch(() => []),
            apiFetch('/api/suppliers?limit=1000').then(d => d.data || []).catch(() => []),
            apiFetch('/api/contractors?limit=1000').then(d => d.data || []).catch(() => []),
            apiFetch('/api/expense-categories').then(d => Array.isArray(d) ? d : []).catch(() => []),
        ]).then(([p, s, c, cats]) => { setProjects(p); setSuppliers(s); setContractors(c); setCategoryList(cats); });
    }, []);

    // ── Stats ──────────────────────────────────────────────────────
    const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalPaid = expenses.filter(e => ['Đã chi', 'Hoàn thành'].includes(e.status)).reduce((s, e) => s + (e.amount || 0), 0);
    const pending = expenses.filter(e => e.status === 'Chờ duyệt').length;
    const approved = expenses.filter(e => e.status === 'Đã duyệt').length;

    // ── Filtering ──────────────────────────────────────────────────
    const filtered = expenses.filter(e => {
        if (filterStatus && e.status !== filterStatus) return false;
        if (filterProject && e.projectId !== filterProject) return false;
        if (search) {
            const q = search.toLowerCase();
            if (!e.code?.toLowerCase().includes(q) && !e.description?.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    // ── Modal helpers ──────────────────────────────────────────────
    const openCreate = () => {
        setEditing(null);
        const firstCat = categoryList.find(c => c.isActive !== false)?.name || '';
        setForm(emptyForm(firstCat));
        setAllocations([]);
        setIsHistorical(false);
        setFormProofFiles([]);
        setShowModal(true);
    };

    const openEdit = (e) => {
        const canEdit = ['Chờ duyệt', 'Từ chối'].includes(e.status) || ['ke_toan', 'giam_doc', 'pho_gd'].includes(role);
        if (!canEdit) return;
        setEditing(e);
        setForm({
            expenseType: e.expenseType || 'Dự án',
            description: e.description || '',
            amount: e.amount || '',
            category: e.category || 'Vật tư xây dựng',
            submittedBy: e.submittedBy || '',
            date: e.date ? e.date.split('T')[0] : new Date().toISOString().split('T')[0],
            notes: e.notes || '',
            projectId: e.projectId || null,
            recipientType: e.recipientType || '',
            recipientId: e.recipientId || '',
        });
        setAllocations((e.allocations || []).map(a => ({ projectId: a.projectId, amount: a.amount })));
        setIsHistorical(false);
        setFormProofFiles([]);
        setShowModal(true);
    };

    const getCatsForType = (type) => {
        const linkType = type === 'Công ty' ? 'company' : 'project';
        const apiCats = categoryList.filter(c => c.linkType === linkType || c.linkType === '');
        if (apiCats.length > 0) return apiCats.map(c => c.name);
        return type === 'Công ty' ? FALLBACK_COMPANY_CATS : FALLBACK_PROJECT_CATS;
    };

    const setExpenseType = (type) => {
        const available = getCatsForType(type);
        setForm(f => ({
            ...f,
            expenseType: type,
            projectId: type === 'Công ty' ? null : f.projectId,
            recipientType: type === 'Công ty' ? '' : f.recipientType,
            recipientId: type === 'Công ty' ? '' : f.recipientId,
            category: available[0] || '',
        }));
    };

    // ── Submit ─────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!form.description.trim()) return toast.error('Nhập mô tả chi phí!');
        if (!form.amount || Number(form.amount) <= 0) return toast.error('Nhập số tiền hợp lệ!');

        setSaving(true);
        try {
            const recipientName = form.recipientType === 'NCC'
                ? suppliers.find(s => s.id === form.recipientId)?.name || ''
                : form.recipientType === 'Thầu phụ'
                ? contractors.find(c => c.id === form.recipientId)?.name || ''
                : '';

            const validAllocs = allocations
                .filter(a => a.projectId && Number(a.amount) > 0)
                .map(a => ({ projectId: a.projectId, amount: Number(a.amount), ratio: 0 }));

            const payload = {
                ...form,
                amount: Number(form.amount),
                projectId: form.projectId || null,
                recipientName,
                allocations: validAllocs,
            };

            if (!editing && isHistorical) {
                payload.status = 'Đã chi';
                payload.paidAmount = Number(form.amount);
            }

            if (formProofFiles.length > 0) {
                const urls = await Promise.all(formProofFiles.map(({ file }) => uploadProofFile(file)));
                payload.proofUrl = urls.length === 1 ? urls[0] : JSON.stringify(urls);
            }

            if (editing) {
                await apiFetch('/api/project-expenses', { method: 'PUT', body: { id: editing.id, ...payload } });
                toast.success('Đã cập nhật lệnh chi');
            } else {
                await apiFetch('/api/project-expenses', { method: 'POST', body: payload });
                toast.success('Đã tạo lệnh chi');
            }

            setShowModal(false);
            fetchExpenses();
        } catch (e) {
            toast.error('Lỗi: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa lệnh chi này?')) return;
        try {
            await apiFetch(`/api/project-expenses?id=${id}`, { method: 'DELETE' });
            toast.success('Đã xóa');
            fetchExpenses();
        } catch (e) {
            toast.error(e.message);
        }
    };

    const updateStatus = async (id, status, extra = {}) => {
        try {
            await apiFetch('/api/project-expenses', { method: 'PUT', body: { id, status, ...extra } });
            fetchExpenses();
        } catch (e) {
            toast.error(e.message);
        }
    };

    // ── Proof upload ───────────────────────────────────────────────
    const uploadProofFile = async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'proofs');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Upload chứng từ thất bại');
        }
        const data = await res.json();
        return data.url;
    };

    const confirmPayWithProof = async () => {
        if (!proofFile) return toast.error('Bắt buộc upload chứng từ!');
        setUploading(true);
        try {
            const url = await uploadProofFile(proofFile);
            await updateStatus(proofModal.id, 'Đã chi', { proofUrl: url, paidAmount: proofModal.amount });
            setProofModal(null);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setUploading(false);
        }
    };

    // ── Print ──────────────────────────────────────────────────────
    const printVoucher = (e) => {
        const today = new Date().toLocaleDateString('vi-VN');
        const w = window.open('', '_blank', 'width=800,height=700');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu chi - ${e.code}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:14px}.page{padding:24px 36px}
.header{display:flex;align-items:center;border-bottom:3px solid #1a3a5c;padding-bottom:14px;margin-bottom:10px;gap:16px}
.logo{font-size:22px;font-weight:900;color:#1a3a5c}.brand{flex:1;font-size:11px;font-weight:800;color:#1a3a5c;text-transform:uppercase}
.title{text-align:center;margin:16px 0 8px;font-size:22px;font-weight:bold;text-transform:uppercase;letter-spacing:3px;color:#1a3a5c}
.row{display:flex;padding:5px 0;border-bottom:1px dotted #ddd;font-size:13px}.label{width:150px;color:#555;flex-shrink:0}.value{flex:1;font-weight:600}
.amount{margin:18px 0;padding:16px;border:2px solid #c0392b;text-align:center;border-radius:4px}
.amount .val{font-size:24px;font-weight:bold;color:#c0392b}
.signs{display:flex;justify-content:space-between;margin-top:40px;text-align:center}
.signs div{width:30%}.signs .role{font-weight:bold;font-size:13px;margin-bottom:60px;color:#1a3a5c}
.no-print{position:fixed;top:10px;right:10px}
.no-print button{padding:10px 24px;background:#c0392b;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer}
@media print{.no-print{display:none!important}}</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ In phiếu chi</button></div>
<div class="page">
<div class="header"><div class="logo">MỘT NHÀ</div><div class="brand">CÔNG TY TNHH THIẾT KẾ & XÂY DỰNG MỘT NHÀ<br/><span style="font-size:9px;color:#666">motnha.vn | 0944 886 989</span></div></div>
<div class="title">Phiếu Chi Tiền</div>
<div style="text-align:center;font-size:12px;color:#888;margin-bottom:14px">Ngày ${today} — Mã: ${e.code}</div>
<div class="row"><span class="label">Người nhận:</span><span class="value">${e.recipientName || e.submittedBy || '...'}</span></div>
<div class="row"><span class="label">Dự án:</span><span class="value">${e.project?.code ? `${e.project.code} — ${e.project.name}` : '—'}</span></div>
<div class="row"><span class="label">Hạng mục:</span><span class="value">${e.category}</span></div>
<div class="row"><span class="label">Mô tả:</span><span class="value">${e.description}</span></div>
<div class="amount"><div style="font-size:12px;color:#555;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Số tiền chi</div><div class="val">${fmt(e.amount)}</div></div>
${e.proofUrl ? parseProofUrls(e.proofUrl).map(url => `<img src="${url}" style="max-width:200px;max-height:120px;border:1px solid #ddd;border-radius:4px;margin:4px"/>`).join('') : ''}
<div class="signs">
<div><div class="role">Người lập phiếu</div><div style="font-size:10px;color:#999">(Ký, ghi rõ họ tên)</div></div>
<div><div class="role">Người duyệt</div><div style="font-size:10px;color:#999">(Ký, ghi rõ họ tên)</div></div>
<div><div class="role">Người nhận tiền</div><div style="font-size:10px;color:#999">(Ký, ghi rõ họ tên)</div></div>
</div></div></body></html>`);
        w.document.close();
    };

    // ── Render ─────────────────────────────────────────────────────
    // Show all categories regardless of type since we removed the type toggle
    const allCatNames = categoryList.length > 0
        ? [...new Set(categoryList.filter(c => c.isActive !== false).map(c => c.name))]
        : [...FALLBACK_PROJECT_CATS, ...FALLBACK_COMPANY_CATS];
    // When editing, preserve existing category even if not in current list
    const cats = editing && form.category && !allCatNames.includes(form.category)
        ? [form.category, ...allCatNames]
        : allCatNames;

    return (
        <div>
            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: 20 }}>
                <div className="stat-card"><div className="stat-icon">📑</div><div><div className="stat-value">{expenses.length}</div><div className="stat-label">Tổng lệnh chi</div></div></div>
                <div className="stat-card"><div className="stat-icon">💵</div><div><div className="stat-value" style={{ fontSize: 15 }}>{fmt(totalAmount)}</div><div className="stat-label">Tổng giá trị</div></div></div>
                <div className="stat-card"><div className="stat-icon">💸</div><div><div className="stat-value" style={{ color: 'var(--status-success)', fontSize: 15 }}>{fmt(totalPaid)}</div><div className="stat-label">Đã chi</div></div></div>
                <div className="stat-card"><div className="stat-icon">⏳</div><div><div className="stat-value" style={{ color: 'var(--status-warning)' }}>{pending}</div><div className="stat-label">Chờ duyệt</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ color: 'var(--status-info)' }}>{approved}</div><div className="stat-label">Đã duyệt (chờ chi)</div></div></div>
            </div>

            {/* Workflow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, padding: '10px 16px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Quy trình:</strong>
                <span className="badge warning">Tạo lệnh chi</span> →
                <span className="badge info">Duyệt lệnh</span> →
                <span style={{ padding: '2px 8px', background: 'var(--accent-primary)', color: '#fff', borderRadius: 10, fontSize: 11 }}>KT upload chứng từ & chi</span> →
                <span className="badge success">Hoàn thành</span>
            </div>

            {/* Filters + toolbar */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                <input className="form-input" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 180, fontSize: 13 }} />
                <select className="form-select" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">Tất cả TT</option>
                    {['Chờ duyệt', 'Đã duyệt', 'Đã chi', 'Hoàn thành', 'Từ chối'].map(s => <option key={s}>{s}</option>)}
                </select>
                <select className="form-select" style={{ width: 180 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                    <option value="">Tất cả DA</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
                <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openCreate}>+ Tạo lệnh chi</button>
            </div>

            {/* Error state */}
            {error && (
                <div style={{ padding: '14px 18px', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, marginBottom: 14, color: 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    ⚠️ {error}
                    <button className="btn btn-sm btn-ghost" onClick={fetchExpenses} style={{ marginLeft: 'auto' }}>↺ Thử lại</button>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    {expenses.length === 0 ? 'Chưa có lệnh chi nào. Nhấn "+ Tạo lệnh chi" để bắt đầu.' : 'Không có kết quả phù hợp với bộ lọc.'}
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ margin: 0 }}>
                        <thead>
                            <tr>
                                <th>Mã</th><th>Mô tả</th><th>Dự án</th><th>Người nhận</th>
                                <th>Hạng mục</th><th style={{ textAlign: 'right' }}>Số tiền</th>
                                <th>Người nộp</th><th>Ngày</th><th>Trạng thái</th>
                                <th style={{ minWidth: 160 }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(e => (
                                <tr key={e.id} style={{ opacity: e.status === 'Hoàn thành' ? 0.65 : 1 }}>
                                    <td style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600 }}>{e.code}</td>
                                    <td style={{ cursor: (['Chờ duyệt', 'Từ chối'].includes(e.status) || ['ke_toan', 'giam_doc', 'pho_gd'].includes(role)) ? 'pointer' : 'default', fontWeight: 500 }} onClick={() => openEdit(e)}>
                                        {e.description}
                                    </td>
                                    <td>
                                        {e.project ? <><span className="badge info" style={{ fontSize: 10 }}>{e.project.code}</span> <span style={{ fontSize: 11 }}>{e.project.name}</span></> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                                    </td>
                                    <td style={{ fontSize: 12 }}>
                                        {e.recipientType && <span className="badge" style={{ fontSize: 9, background: e.recipientType === 'NCC' ? '#e8f5e9' : '#fff3e0', color: e.recipientType === 'NCC' ? '#2e7d32' : '#e65100', marginRight: 4 }}>{e.recipientType}</span>}
                                        {e.recipientName || '—'}
                                    </td>
                                    <td><span className="badge muted">{e.category}</span></td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{fmt(e.amount)}</td>
                                    <td style={{ fontSize: 12 }}>{e.submittedBy || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(e.date)}</td>
                                    <td>
                                        <span className={`badge ${STATUS_BADGE[e.status] || 'muted'}`}>{e.status}</span>
                                        {e.proofUrl && (() => {
                                            const urls = parseProofUrls(e.proofUrl);
                                            return urls.length > 0 && (
                                                <button onClick={() => setLightbox({ urls, idx: 0 })} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4, padding: 0, fontSize: 14 }} title={`${urls.length} chứng từ`}>
                                                    📎{urls.length > 1 ? <sup style={{ fontSize: 9, color: '#234093' }}>{urls.length}</sup> : null}
                                                </button>
                                            );
                                        })()}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {e.status === 'Chờ duyệt' && <>
                                                <button className="btn btn-sm" style={{ background: 'var(--status-success)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', padding: '3px 8px' }} onClick={() => updateStatus(e.id, 'Đã duyệt')}>✓ Duyệt</button>
                                                <button className="btn btn-sm" style={{ background: 'var(--status-danger)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', padding: '3px 8px' }} onClick={() => updateStatus(e.id, 'Từ chối')}>✗ Từ chối</button>
                                            </>}
                                            {e.status === 'Đã duyệt' && <button className="btn btn-sm" style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', padding: '3px 8px' }} onClick={() => { setProofModal(e); setProofFile(null); setProofPreview(null); }}>💸 Chi tiền</button>}
                                            {e.status === 'Đã chi' && <button className="btn btn-sm" style={{ background: 'var(--status-success)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', padding: '3px 8px' }} onClick={() => updateStatus(e.id, 'Hoàn thành')}>✅ Hoàn thành</button>}
                                            {e.status === 'Từ chối' && <button className="btn btn-sm" style={{ background: 'var(--status-warning)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', padding: '3px 8px' }} onClick={() => updateStatus(e.id, 'Chờ duyệt')}>↩ Mở lại</button>}
                                            {['Đã chi', 'Hoàn thành'].includes(e.status) && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => printVoucher(e)}>🧾 Phiếu chi</button>}
                                            {['ke_toan', 'giam_doc', 'pho_gd'].includes(role) && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => openEdit(e)}>✏️ Sửa</button>}
                                            {(['Chờ duyệt', 'Từ chối'].includes(e.status) || ['ke_toan', 'giam_doc', 'pho_gd'].includes(role)) && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)', fontSize: 11 }} onClick={() => handleDelete(e.id)}>🗑️</button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal tạo/sửa */}
            {showModal && (
                <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h3>{editing ? '✏️ Sửa lệnh chi' : '+ Tạo lệnh chi tiền'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                                        <div className="modal-body">
                            {/* Project selector */}
                            <div className="form-group">
                                <label className="form-label">Dự án</label>
                                <select className="form-select" value={form.projectId || ''} onChange={e => setForm(f => ({ ...f, projectId: e.target.value || null }))}>
                                    <option value="">— Không gắn dự án —</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Mô tả chi phí *</label>
                                <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="VD: Mua xi măng, thuê xe cẩu..." />
                            </div>

                            {/* Recipient */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Chi cho</label>
                                    <select className="form-select" value={form.recipientType} onChange={e => setForm(f => ({ ...f, recipientType: e.target.value, recipientId: '' }))}>
                                        <option value="">— Không chọn —</option>
                                        <option value="NCC">Nhà cung cấp</option>
                                        <option value="Thầu phụ">Thầu phụ</option>
                                    </select>
                                </div>
                                {(form.recipientType === 'NCC' || form.recipientType === 'Thầu phụ') && (
                                    <div className="form-group">
                                        <label className="form-label">Người nhận</label>
                                        <select className="form-select" value={form.recipientId} onChange={e => setForm(f => ({ ...f, recipientId: e.target.value }))}>
                                            <option value="">— Chọn —</option>
                                            {form.recipientType === 'NCC' && suppliers.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                                            {form.recipientType === 'Thầu phụ' && contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Số tiền *</label>
                                    <input className="form-input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hạng mục</label>
                                    <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                        {cats.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Người đề nghị</label>
                                    <input className="form-input" value={form.submittedBy} onChange={e => setForm(f => ({ ...f, submittedBy: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày</label>
                                    <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>

                            {/* Proof upload */}
                            <div className="form-group">
                                <label className="form-label">📎 Chứng từ <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>(tùy chọn — nhiều ảnh)</span></label>
                                <div
                                    onPaste={e => { const f = e.clipboardData?.items?.[0]?.getAsFile(); if (f) addFormProofFiles([f]); }}
                                    onDrop={e => { e.preventDefault(); addFormProofFiles(e.dataTransfer.files); }}
                                    onDragOver={e => e.preventDefault()}
                                    tabIndex={0}
                                    onClick={() => formProofRef.current?.click()}
                                    style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: 12, cursor: 'pointer', outline: 'none', minHeight: 60 }}>
                                    <input ref={formProofRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => addFormProofFiles(e.target.files)} />
                                    {formProofFiles.length > 0
                                        ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {formProofFiles.map((item, i) => (
                                                <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                                                    <img src={item.preview} alt="" style={{ height: 60, borderRadius: 4, border: '1px solid var(--border)', display: 'block' }} />
                                                    <button type="button" onClick={ev => { ev.stopPropagation(); removeFormProofFile(i); }}
                                                        style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, lineHeight: '18px', cursor: 'pointer', padding: 0 }}>×</button>
                                                </div>
                                            ))}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, border: '1px dashed var(--border)', borderRadius: 4, color: 'var(--text-muted)', fontSize: 20 }}>+</div>
                                          </div>
                                        : <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', paddingTop: 8 }}>📋 <strong>Ctrl+V</strong> paste &nbsp;|&nbsp; 📁 Click chọn nhiều &nbsp;|&nbsp; 🖱️ Kéo thả</div>
                                    }
                                </div>
                            </div>

                            {/* Phân bổ vào nhiều dự án */}
                            {(() => {
                                const total = Number(form.amount) || 0;
                                const allocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
                                const remaining = total - allocated;
                                return (
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <label className="form-label" style={{ margin: 0 }}>
                                            Phân bổ vào dự án <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>(tùy chọn)</span>
                                            {allocations.length > 0 && total > 0 && (
                                                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: remaining < 0 ? '#DC2626' : remaining === 0 ? '#16A34A' : '#D97706' }}>
                                                    Còn lại: {fmt(remaining)}
                                                </span>
                                            )}
                                        </label>
                                        <button type="button" className="btn btn-sm" onClick={() => setAllocations(a => [...a, { projectId: '', amount: remaining > 0 ? remaining : '' }])}>+ Thêm DA</button>
                                    </div>
                                    {allocations.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chưa phân bổ vào dự án nào</div>}
                                    {allocations.map((a, i) => (
                                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, marginBottom: 6, alignItems: 'end' }}>
                                            <select className="form-select" value={a.projectId} onChange={e => setAllocations(al => { const n = [...al]; n[i] = { ...n[i], projectId: e.target.value }; return n; })}>
                                                <option value="">— Chọn dự án —</option>
                                                {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                            </select>
                                            <input className="form-input" type="number" placeholder="Số tiền" value={a.amount} onChange={e => setAllocations(al => { const n = [...al]; n[i] = { ...n[i], amount: e.target.value }; return n; })} />
                                            <button type="button" className="btn" style={{ padding: '6px 8px', color: '#ef4444' }} onClick={() => setAllocations(al => al.filter((_, j) => j !== i))}>✕</button>
                                        </div>
                                    ))}
                                    {allocations.length > 0 && remaining < 0 && (
                                        <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>⚠️ Tổng phân bổ vượt quá số tiền chi ({fmtShort(-remaining)})</div>
                                    )}
                                </div>
                                );
                            })()}
                        </div>

                        {/* Historical checkbox */}
                        {!editing && (
                            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', background: isHistorical ? 'var(--bg-secondary)' : 'transparent' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="checkbox" checked={isHistorical} onChange={e => setIsHistorical(e.target.checked)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                                    <span style={{ fontWeight: 600 }}>📋 Nhập chứng từ lịch sử</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(đã chi, không cần duyệt)</span>
                                </label>
                            </div>
                        )}

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                                {saving ? 'Đang lưu...' : editing ? 'Cập nhật' : isHistorical ? '📋 Lưu lịch sử' : 'Tạo lệnh chi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal proof upload */}
            {proofModal && (
                <div className="modal-overlay" onClick={() => !uploading && setProofModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>💸 Chi tiền — Upload chứng từ</h3>
                            <button className="modal-close" onClick={() => !uploading && setProofModal(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                                <div><strong>Mã:</strong> {proofModal.code}</div>
                                <div><strong>Mô tả:</strong> {proofModal.description}</div>
                                {proofModal.project && <div><strong>Dự án:</strong> {proofModal.project.name}</div>}
                                <div><strong>Số tiền:</strong> <span style={{ fontWeight: 700, color: 'var(--status-danger)' }}>{fmt(proofModal.amount)}</span></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">📎 Chứng từ chi * <span style={{ color: 'var(--status-danger)', fontSize: 11 }}>(Bắt buộc)</span></label>
                                <div
                                    onPaste={e => { const f = e.clipboardData?.items?.[0]?.getAsFile(); if (f?.type.startsWith('image/')) { setProofFile(f); setProofPreview(URL.createObjectURL(f)); } }}
                                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f?.type.startsWith('image/')) { setProofFile(f); setProofPreview(URL.createObjectURL(f)); } }}
                                    onDragOver={e => e.preventDefault()}
                                    tabIndex={0}
                                    onClick={() => proofRef.current?.click()}
                                    style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer', outline: 'none' }}>
                                    <input ref={proofRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setProofFile(f); setProofPreview(URL.createObjectURL(f)); } }} />
                                    {proofPreview
                                        ? <div><img src={proofPreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, marginBottom: 8 }} /><div style={{ fontSize: 12, color: 'var(--status-success)' }}>✅ {proofFile?.name || 'Ảnh từ clipboard'}</div></div>
                                        : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>📋 <strong>Ctrl+V</strong> paste &nbsp;|&nbsp; 📁 Click chọn file &nbsp;|&nbsp; 🖱️ Kéo thả</div>
                                    }
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setProofModal(null)} disabled={uploading}>Hủy</button>
                            <button className="btn btn-primary" onClick={confirmPayWithProof} disabled={uploading || !proofFile}>
                                {uploading ? '⏳ Đang xử lý...' : '💸 Xác nhận chi tiền'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox xem chứng từ */}
            {lightbox && (
                <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                    <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '80vh' }}>
                        <img src={lightbox.urls[lightbox.idx]} alt="Chứng từ" style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8, display: 'block' }} />
                        <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: -12, right: -12, background: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 16, cursor: 'pointer', fontWeight: 700, lineHeight: '28px', textAlign: 'center' }}>×</button>
                    </div>
                    {lightbox.urls.length > 1 && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            {lightbox.urls.map((url, i) => (
                                <img key={i} src={url} alt="" onClick={e => { e.stopPropagation(); setLightbox(l => ({ ...l, idx: i })); }}
                                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: lightbox.idx === i ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)' }} />
                            ))}
                        </div>
                    )}
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Nhấn ra ngoài để đóng{lightbox.urls.length > 1 ? ` • ${lightbox.idx + 1}/${lightbox.urls.length}` : ''}</div>
                </div>
            )}
        </div>
    );
}
