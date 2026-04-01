'use client';
import { useState, useEffect, useRef } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const PROJECT_CATEGORIES = ['Vật tư xây dựng', 'Nhân công', 'Vận chuyển', 'Thiết bị máy móc', 'Điện nước', 'Thuê ngoài', 'Sửa chữa', 'Bảo hiểm công trình', 'Khác'];
const COMPANY_CATEGORIES = ['Thuê văn phòng', 'Lương & Phú cấp', 'Điện nước VP', 'Văn phòng phẩm', 'Marketing & QC', 'Phí ngân hàng', 'Bảo hiểm xã hội', 'Tiếp khách', 'Công tác phí', 'Phần mềm & CNTT', 'Bảo trì & Sửa chữa', 'Thuế & Lệ phí', 'Khấu hao TSCD', 'Khác'];

const emptyForm = { expenseType: 'Dự án', description: '', amount: 0, category: 'Vật tư xây dựng', submittedBy: '', date: new Date().toISOString().split('T')[0], notes: '', projectId: '', recipientType: '', recipientId: '' };

export default function ExpensesTab() {
    const [expenses, setExpenses] = useState([]);
    const [projects, setProjects] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [isHistorical, setIsHistorical] = useState(false);
    const [allocations, setAllocations] = useState([]);
    const [proofModal, setProofModal] = useState(null);
    const [proofFile, setProofFile] = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const proofRef = useRef();

    const fetchData = async () => {
        setLoading(true);
        const [eRes, pRes, sRes, cRes] = await Promise.all([
            fetch('/api/project-expenses?limit=1000').then(r => r.json()).then(d => d.data || []).catch(() => []),
            fetch('/api/projects?limit=1000').then(r => r.json()).then(d => d.data || []).catch(() => []),
            fetch('/api/suppliers?limit=1000').then(r => r.json()).then(d => d.data || []).catch(() => []),
            fetch('/api/contractors?limit=1000').then(r => r.json()).then(d => d.data || []).catch(() => []),
        ]);
        setExpenses(eRes); setProjects(pRes); setSuppliers(sRes); setContractors(cRes);
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, []);

    // Stats
    const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalPaid = expenses.filter(e => e.status === 'Đã chi' || e.status === 'Hoàn thành').reduce((s, e) => s + (e.amount || 0), 0);
    const pending = expenses.filter(e => e.status === 'Chờ duyệt').length;
    const approved = expenses.filter(e => e.status === 'Đã duyệt').length;
    const cats = [...new Set(expenses.map(e => e.category))].filter(Boolean);
    const expProjects = [...new Set(expenses.map(e => e.project?.name).filter(Boolean))];

    const filtered = expenses.filter(e => {
        if (filterStatus && e.status !== filterStatus) return false;
        if (filterCategory && e.category !== filterCategory) return false;
        if (filterProject && e.project?.name !== filterProject) return false;
        if (search && !e.code?.toLowerCase().includes(search.toLowerCase()) && !e.description?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // CRUD
    const addAllocation = () => setAllocations(prev => [...prev, { projectId: '', amount: '' }]);
    const removeAllocation = (i) => setAllocations(prev => prev.filter((_, j) => j !== i));
    const updateAllocation = (i, field, value) => setAllocations(prev => { const next = [...prev]; next[i] = { ...next[i], [field]: value }; return next; });

    const openCreate = () => { setEditing(null); setForm(emptyForm); setAllocations([]); setIsHistorical(false); setShowModal(true); };
    const openEdit = (e) => {
        if (e.status !== 'Chờ duyệt' && e.status !== 'Từ chối') return;
        setEditing(e);
        setForm({ expenseType: e.expenseType || 'Dự án', description: e.description, amount: e.amount, category: e.category, submittedBy: e.submittedBy, date: e.date?.split('T')[0] || '', notes: e.notes, projectId: e.projectId || '', recipientType: e.recipientType || '', recipientId: e.recipientId || '' });
        setAllocations((e.allocations || []).map(a => ({ projectId: a.projectId, amount: a.amount })));
        setShowModal(true);
    };
    const handleSubmit = async () => {
        if (!form.description.trim()) return alert('Nhập mô tả chi phí!');
        if (form.expenseType === 'Dự án' && !form.projectId) return alert('Chọn dự án!');
        if (!form.amount || form.amount <= 0) return alert('Nhập số tiền!');
        const recipientName = form.recipientType === 'NCC' ? suppliers.find(s => s.id === form.recipientId)?.name : form.recipientType === 'Thầu phụ' ? contractors.find(c => c.id === form.recipientId)?.name : '';
        form.recipientName = recipientName || '';
        const validAllocs = allocations.filter(a => a.projectId && Number(a.amount) > 0).map(a => ({ projectId: a.projectId, amount: Number(a.amount), ratio: 0 }));
        if (editing) {
            await fetch('/api/project-expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...form, amount: Number(form.amount) }) });
        } else {
            const payload = { ...form, amount: Number(form.amount), allocations: validAllocs };
            if (isHistorical) { payload.status = 'Đã chi'; payload.paidAmount = Number(form.amount); }
            await fetch('/api/project-expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        }
        setShowModal(false); fetchData();
    };
    const handleDelete = async (id) => { if (!confirm('Xóa lệnh chi này?')) return; await fetch(`/api/project-expenses?id=${id}`, { method: 'DELETE' }); fetchData(); };

    const updateStatus = async (id, status, extraData = {}) => {
        await fetch('/api/project-expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, ...extraData }) });
        fetchData();
    };

    // Proof upload
    const openProofModal = (expense) => { setProofModal(expense); setProofFile(null); setProofPreview(null); };
    const handleProofFileChange = (e) => { const file = e.target.files?.[0]; if (file) { setProofFile(file); setProofPreview(URL.createObjectURL(file)); } };
    const handleExpPaste = (e) => { const items = e.clipboardData?.items; if (!items) return; for (const item of items) { if (item.type.startsWith('image/')) { const file = item.getAsFile(); if (file) { setProofFile(file); setProofPreview(URL.createObjectURL(file)); } break; } } };
    const handleExpDrop = (e) => { e.preventDefault(); const file = e.dataTransfer?.files?.[0]; if (file && file.type.startsWith('image/')) { setProofFile(file); setProofPreview(URL.createObjectURL(file)); } };
    const confirmPayWithProof = async () => {
        if (!proofFile) return alert('Bắt buộc upload chứng từ chi!');
        setUploading(true);
        const reader = new FileReader();
        reader.onload = async () => {
            await updateStatus(proofModal.id, 'Đã chi', { proofUrl: reader.result, paidAmount: proofModal.amount });
            setUploading(false); setProofModal(null);
        };
        reader.readAsDataURL(proofFile);
    };

    // Print
    const printExpenseVoucher = (e) => {
        const today = new Date().toLocaleDateString('vi-VN');
        const w = window.open('', '_blank', 'width=800,height=700');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu chi - ${e.code}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:14px;color:#000;background:#fff}
.page{padding:24px 36px}
.mn-header{display:flex;align-items:center;border-bottom:3px solid #1a3a5c;padding-bottom:14px;margin-bottom:10px;gap:16px}
.mn-logo{display:flex;flex-direction:column;align-items:center;min-width:120px}
.mn-logo-icon{font-size:28px;font-weight:900;color:#1a3a5c;line-height:1;letter-spacing:-1px}
.mn-logo-sub{font-size:7px;text-transform:uppercase;color:#c8a555;letter-spacing:3px;font-weight:600;margin-top:2px}
.mn-brand{flex:1}.mn-brand-name{font-size:11px;font-weight:800;color:#1a3a5c;text-transform:uppercase;letter-spacing:1px}
.mn-brand-web{font-size:9px;color:#666;margin-top:1px}
.mn-info{text-align:right;font-size:9px;line-height:1.6;color:#555}.mn-info b{color:#1a3a5c}
.title{text-align:center;margin:16px 0 8px}.title h1{font-size:22px;font-weight:bold;text-transform:uppercase;letter-spacing:3px;color:#1a3a5c}
.title .date{font-size:12px;color:#888;margin-top:4px}
.info{margin:14px 0}.info .row{display:flex;padding:5px 0;border-bottom:1px dotted #ddd;font-size:13px}
.info .row .label{width:150px;color:#555;flex-shrink:0}.info .row .value{flex:1;font-weight:600}
.amount-box{margin:18px 0;padding:16px;border:2px solid #c0392b;text-align:center;background:linear-gradient(135deg,#fdf2f0,#fff);border-radius:4px}
.amount-box .lbl{font-size:12px;color:#555;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}
.amount-box .val{font-size:24px;font-weight:bold;color:#c0392b;letter-spacing:1px}
.sign-area{display:flex;justify-content:space-between;margin-top:40px;text-align:center}
.sign-area div{width:30%}.sign-area .role{font-weight:bold;font-size:13px;margin-bottom:60px;color:#1a3a5c}
.sign-area .hint{font-size:10px;font-style:italic;color:#999}
.proof-img{max-width:200px;max-height:120px;margin-top:8px;border:1px solid #ddd;border-radius:4px}
.footer-note{text-align:center;font-size:9px;color:#aaa;margin-top:16px;font-style:italic}
.no-print{position:fixed;top:10px;right:10px;z-index:9999}
.no-print button{padding:10px 24px;font-size:14px;cursor:pointer;background:#c0392b;color:#fff;border:none;border-radius:6px;font-weight:600}
@media print{.no-print{display:none!important}}
</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ In phiếu chi</button></div>
<div class="page">
    <div class="mn-header">
        <div class="mn-logo"><div class="mn-logo-icon">MỘT NHÀ</div><div class="mn-logo-sub">Design & Build</div></div>
        <div class="mn-brand"><div class="mn-brand-name">CÔNG TY TNHH THIẾT KẾ & XÂY DỰNG MỘT NHÀ</div><div class="mn-brand-web">🌐 motnha.vn &nbsp;|&nbsp; 📞 0944 886 989</div></div>
        <div class="mn-info"><div><b>Trụ sở:</b> R6 Royal City, Thanh Xuân, HN</div><div><b>Showroom HN:</b> 10 Chương Dương Độ, Hoàn Kiếm</div><div><b>Showroom SL:</b> 105C Tô Hiệu, Sơn La</div><div><b>Nhà máy SX:</b> KĐT Picenza, Chiềng An, Sơn La</div></div>
    </div>
    <div class="title"><h1>Phiếu Chi Tiền</h1><div class="date">Ngày ${today} — Mã: ${e.code}</div></div>
    <div class="info">
        <div class="row"><span class="label">Người nhận tiền:</span><span class="value" contenteditable="true">${e.recipientName || e.submittedBy || '...'}</span></div>
        <div class="row"><span class="label">Loại:</span><span class="value">${e.recipientType || '—'}</span></div>
        <div class="row"><span class="label">Dự án:</span><span class="value">${e.project?.code || ''} — ${e.project?.name || ''}</span></div>
        <div class="row"><span class="label">Hạng mục:</span><span class="value">${e.category}</span></div>
        <div class="row"><span class="label">Mô tả:</span><span class="value">${e.description}</span></div>
        <div class="row"><span class="label">Lý do chi:</span><span class="value" contenteditable="true">${e.description} — DA ${e.project?.name || ''}</span></div>
    </div>
    <div class="amount-box"><div class="lbl">SỐ TIỀN CHI</div><div class="val">${fmt(e.amount)}</div></div>
    ${e.proofUrl ? `<div style="text-align:center;margin:10px 0"><div style="font-size:10px;color:#888;margin-bottom:4px">Chứng từ chi:</div><img class="proof-img" src="${e.proofUrl}" /></div>` : ''}
    <div class="sign-area">
        <div><div class="role">Người lập phiếu</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
        <div><div class="role">Người duyệt</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
        <div><div class="role">Người nhận tiền</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
    </div>
    <div class="footer-note">MỘT NHÀ DESIGN & BUILD — motnha.vn — 0944 886 989</div>
</div>
</body></html>`);
        w.document.close();
    };

    const statusBadge = (s) => ({ 'Chờ duyệt': 'warning', 'Đã duyệt': 'info', 'Đã chi': 'accent', 'Hoàn thành': 'success', 'Từ chối': 'danger' }[s] || 'muted');

    return (
        <div>
            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 20 }}>
                <div className="stat-card"><div className="stat-icon">📑</div><div><div className="stat-value">{expenses.length}</div><div className="stat-label">Tổng lệnh chi</div></div></div>
                <div className="stat-card"><div className="stat-icon">💵</div><div><div className="stat-value">{fmt(totalAmount)}</div><div className="stat-label">Tổng giá trị</div></div></div>
                <div className="stat-card"><div className="stat-icon">💸</div><div><div className="stat-value" style={{ color: 'var(--status-success)' }}>{fmt(totalPaid)}</div><div className="stat-label">Đã chi</div></div></div>
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

            {/* Table */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                <input className="form-input" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 180, fontSize: 13 }} />
                <select className="form-select" style={{ width: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">Tất cả TT</option><option>Chờ duyệt</option><option>Đã duyệt</option><option>Đã chi</option><option>Hoàn thành</option><option>Từ chối</option>
                </select>
                <select className="form-select" style={{ width: 140 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                    <option value="">Tất cả HM</option>{cats.map(c => <option key={c}>{c}</option>)}
                </select>
                <select className="form-select" style={{ width: 160 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                    <option value="">Tất cả DA</option>{expProjects.map(p => <option key={p}>{p}</option>)}
                </select>
                <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openCreate}>+ Tạo lệnh chi</button>
            </div>

            {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ margin: 0 }}>
                        <thead><tr><th>Mã</th><th>Mô tả</th><th>Dự án</th><th>Người nhận</th><th>Hạng mục</th><th>Số tiền</th><th>Người nộp</th><th>Ngày</th><th>Trạng thái</th><th style={{ minWidth: 160 }}>Thao tác</th></tr></thead>
                        <tbody>{filtered.map(e => (
                            <tr key={e.id} style={{ opacity: e.status === 'Hoàn thành' ? 0.6 : 1 }}>
                                <td className="accent">{e.code}</td>
                                <td className="primary" style={{ cursor: (e.status === 'Chờ duyệt' || e.status === 'Từ chối') ? 'pointer' : 'default' }} onClick={() => openEdit(e)}>{e.description}</td>
                                <td><span className="badge info" style={{ fontSize: 10 }}>{e.project?.code}</span> <span style={{ fontSize: 11 }}>{e.project?.name}</span></td>
                                <td style={{ fontSize: 12 }}>{e.recipientType && <span className="badge" style={{ fontSize: 9, background: e.recipientType === 'NCC' ? '#e8f5e9' : '#fff3e0', color: e.recipientType === 'NCC' ? '#2e7d32' : '#e65100', marginRight: 4 }}>{e.recipientType}</span>}{e.recipientName || '—'}</td>
                                <td><span className="badge muted">{e.category}</span></td>
                                <td className="amount">{fmt(e.amount)}</td>
                                <td style={{ fontSize: 12 }}>{e.submittedBy || '—'}</td>
                                <td style={{ fontSize: 12 }}>{fmtDate(e.date)}</td>
                                <td>
                                    <span className={`badge ${statusBadge(e.status)}`}>{e.status}</span>
                                    {e.proofUrl && <a href={e.proofUrl} target="_blank" rel="noreferrer" title="Xem chứng từ" style={{ marginLeft: 4 }}>📎</a>}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        {e.status === 'Chờ duyệt' && (<>
                                            <button className="btn btn-sm" style={{ background: 'var(--status-success)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Đã duyệt')}>✓ Duyệt</button>
                                            <button className="btn btn-sm" style={{ background: 'var(--status-danger)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Từ chối')}>✗ Từ chối</button>
                                        </>)}
                                        {e.status === 'Đã duyệt' && <button className="btn btn-sm" style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => openProofModal(e)}>💸 Chi tiền</button>}
                                        {e.status === 'Đã chi' && <button className="btn btn-sm" style={{ background: 'var(--status-success)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Hoàn thành')}>✅ Hoàn thành</button>}
                                        {e.status === 'Từ chối' && <button className="btn btn-sm" style={{ background: 'var(--status-warning)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Chờ duyệt')}>↩ Mở lại</button>}
                                        {(e.status === 'Đã chi' || e.status === 'Hoàn thành') && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => printExpenseVoucher(e)}>🧾 Phiếu chi</button>}
                                        {(e.status === 'Chờ duyệt' || e.status === 'Từ chối') && <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e.id)} style={{ color: 'var(--status-danger)', fontSize: 11 }}>🗑️</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
            {!loading && filtered.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Không có dữ liệu</div>}

            {/* Modal tạo/sửa */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header"><h3>{editing ? '✏️ Sửa lệnh chi' : '+ Tạo lệnh chi tiền'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                {['Dự án', 'Công ty'].map(t => (
                                    <button key={t} onClick={() => setForm({ ...form, expenseType: t, projectId: t === 'Công ty' ? '' : form.projectId, recipientType: t === 'Công ty' ? '' : form.recipientType, recipientId: t === 'Công ty' ? '' : form.recipientId, category: t === 'Công ty' ? 'Thuê văn phòng' : 'Vật tư xây dựng' })}
                                        style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: form.expenseType === t ? '2px solid var(--accent-primary)' : '1px solid var(--border)', background: form.expenseType === t ? 'var(--accent-primary)' : 'transparent', color: form.expenseType === t ? '#fff' : 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                                        {t === 'Dự án' ? '🏗️ Chi phí dự án' : '🏢 Chi phí chung'}
                                    </button>
                                ))}
                            </div>
                            {form.expenseType === 'Dự án' && (
                                <div className="form-group"><label className="form-label">Dự án *</label>
                                    <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                                        <option value="">— Chọn dự án —</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="form-group"><label className="form-label">Mô tả chi phí *</label>
                                <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="VD: Mua xi măng, thuê xe cẩu..." />
                            </div>
                            {form.expenseType === 'Dự án' && (
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Chi cho</label>
                                        <select className="form-select" value={form.recipientType} onChange={e => setForm({ ...form, recipientType: e.target.value, recipientId: '' })}>
                                            <option value="">— Không chọn —</option><option value="NCC">Nhà cung cấp</option><option value="Thầu phụ">Thầu phụ</option>
                                        </select>
                                    </div>
                                    {form.recipientType && (
                                        <div className="form-group"><label className="form-label">Người nhận</label>
                                            <select className="form-select" value={form.recipientId} onChange={e => setForm({ ...form, recipientId: e.target.value })}>
                                                <option value="">— Chọn {form.recipientType} —</option>
                                                {form.recipientType === 'NCC' && suppliers.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                                                {form.recipientType === 'Thầu phụ' && contractors.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Số tiền *</label><input className="form-input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Hạng mục</label>
                                    <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        {(form.expenseType === 'Công ty' ? COMPANY_CATEGORIES : PROJECT_CATEGORIES).map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Người đề nghị</label><input className="form-input" value={form.submittedBy} onChange={e => setForm({ ...form, submittedBy: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Ngày</label><input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>

                            {form.expenseType === 'Công ty' && (
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <label className="form-label" style={{ margin: 0 }}>Phân bổ vào dự án</label>
                                        <button type="button" className="btn" style={{ fontSize: 12, padding: '4px 10px' }} onClick={addAllocation}>+ Thêm DA</button>
                                    </div>
                                    {allocations.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Không phân bổ — chi phí công ty chung</div>}
                                    {allocations.map((a, i) => (
                                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, marginBottom: 6, alignItems: 'end' }}>
                                            <select className="form-select" value={a.projectId} onChange={e => updateAllocation(i, 'projectId', e.target.value)}>
                                                <option value="">— Chọn dự án —</option>
                                                {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                            </select>
                                            <input className="form-input" type="number" placeholder="Số tiền" value={a.amount} onChange={e => updateAllocation(i, 'amount', e.target.value)} />
                                            <button type="button" className="btn" style={{ padding: '6px 8px', color: '#ef4444' }} onClick={() => removeAllocation(i)}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
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
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit}>{editing ? 'Cập nhật' : isHistorical ? '📋 Lưu chứng từ lịch sử' : 'Tạo lệnh chi'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal proof */}
            {proofModal && (
                <div className="modal-overlay" onClick={() => !uploading && setProofModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header"><h3>💸 Chi tiền — Upload chứng từ</h3><button className="modal-close" onClick={() => !uploading && setProofModal(null)}>×</button></div>
                        <div className="modal-body">
                            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                                <div><strong>Mã:</strong> {proofModal.code}</div>
                                <div><strong>Mô tả:</strong> {proofModal.description}</div>
                                <div><strong>Dự án:</strong> {proofModal.project?.name}</div>
                                <div><strong>Số tiền chi:</strong> <span style={{ fontWeight: 700, color: 'var(--status-danger)' }}>{fmt(proofModal.amount)}</span></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">📎 Chứng từ chi * <span style={{ color: 'var(--status-danger)', fontSize: 11 }}>(Bắt buộc)</span></label>
                                <div onPaste={handleExpPaste} onDrop={handleExpDrop} onDragOver={e => e.preventDefault()} tabIndex={0}
                                    style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer', background: proofFile ? 'var(--bg-secondary)' : 'transparent', outline: 'none' }}
                                    onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                    onClick={() => proofRef.current?.click()}>
                                    <input ref={proofRef} type="file" accept="image/*" onChange={handleProofFileChange} style={{ display: 'none' }} />
                                    {proofPreview ? (
                                        <div>
                                            <img src={proofPreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, marginBottom: 8 }} />
                                            <div style={{ fontSize: 12, color: 'var(--status-success)' }}>✅ {proofFile?.name || 'Ảnh từ clipboard'}</div>
                                        </div>
                                    ) : (
                                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>📋 <strong>Ctrl+V</strong> paste ảnh &nbsp;|&nbsp; 📁 Click chọn file &nbsp;|&nbsp; 🖱️ Kéo thả</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setProofModal(null)} disabled={uploading}>Hủy</button>
                            <button className="btn btn-primary" onClick={confirmPayWithProof} disabled={uploading || !proofFile}>{uploading ? '⏳ Đang xử lý...' : '💸 Xác nhận chi tiền'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
