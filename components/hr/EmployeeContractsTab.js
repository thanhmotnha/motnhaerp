'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const CONTRACT_TYPES = ['Thử việc', 'Chính thức 1 năm', 'Chính thức không thời hạn', 'Thời vụ'];
const STATUS_COLORS = { 'Hiệu lực': '#10b981', 'Hết hạn': '#6b7280', 'Đã ký': '#3b82f6', 'Chờ ký': '#f59e0b', 'Đã hủy': '#ef4444' };
const EMPTY_FORM = { type: 'Chính thức 1 năm', startDate: '', endDate: '', salary: '', insuranceSalary: '', position: '', department: '', notes: '', signedAt: '', templateId: '' };

export default function EmployeeContractsTab() {
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [empData, setEmpData] = useState(null);
    const [contracts, setContracts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [preview, setPreview] = useState(null);
    const [exporting, setExporting] = useState(false);
    const toast = useToast();

    useEffect(() => {
        apiFetch('/api/employees?limit=500').then(d => setEmployees(d.data || [])).catch(() => {});
        apiFetch('/api/contract-templates?type=Lao+%C4%91%E1%BB%99ng').then(d => setTemplates(Array.isArray(d) ? d : [])).catch(() => {});
    }, []);

    const loadContracts = async (empId) => {
        if (!empId) return;
        setLoading(true);
        try {
            const [cs, emp] = await Promise.all([
                apiFetch(`/api/employees/${empId}/contracts`),
                apiFetch(`/api/employees/${empId}`),
            ]);
            setContracts(Array.isArray(cs) ? cs : []);
            setEmpData(emp);
        } catch { toast.error('Lỗi tải hợp đồng'); }
        finally { setLoading(false); }
    };
    useEffect(() => { if (selectedEmp) loadContracts(selectedEmp); }, [selectedEmp]);

    const handlePreview = async (contract) => {
        if (!empData) return;
        const tpl = templates.find(t => t.id === contract.templateId) || templates[0];
        if (!tpl) return toast.error('Chưa có mẫu hợp đồng, nhấn "Tạo mẫu mặc định" trước');
        const { fillEmployeeVariables } = await import('@/lib/contractVariables');
        const html = fillEmployeeVariables(tpl.body, { contract, employee: empData });
        setPreview({ html });
    };

    const handleSubmit = async () => {
        if (!selectedEmp) return toast.error('Chọn nhân viên');
        if (!form.startDate) return toast.error('Nhập ngày bắt đầu');
        if (!form.salary) return toast.error('Nhập mức lương');
        try {
            const emp = employees.find(e => e.id === selectedEmp);
            await apiFetch(`/api/employees/${selectedEmp}/contracts`, {
                method: 'POST',
                body: { ...form, salary: parseFloat(form.salary), insuranceSalary: parseFloat(form.insuranceSalary) || 0, position: form.position || emp?.position || '' },
            });
            toast.success('Đã tạo hợp đồng');
            setShowForm(false);
            setForm(EMPTY_FORM);
            loadContracts(selectedEmp);
        } catch (e) { toast.error(e.message || 'Lỗi tạo hợp đồng'); }
    };

    const updateStatus = async (contractId, status) => {
        try {
            await apiFetch(`/api/employees/${selectedEmp}/contracts`, { method: 'PATCH', body: { contractId, status } });
            toast.success('Đã cập nhật');
            loadContracts(selectedEmp);
        } catch (e) { toast.error(e.message || 'Lỗi cập nhật'); }
    };

    const handleExportWord = async (contract) => {
        if (!empData) return;
        const tpl = templates.find(t => contract.type === 'Thử việc' ? t.name.toLowerCase().includes('thử việc') : !t.name.toLowerCase().includes('thử việc')) || templates[0];
        if (!tpl) return toast.error('Không tìm thấy mẫu hợp đồng');
        setExporting(true);
        try {
            const params = new URLSearchParams({ contractId: contract.id, templateId: tpl.id });
            const res = await fetch(`/api/employees/${empData.id}/contracts/export-docx?${params}`, {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Lỗi xuất Word'); }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${contract.code}-${empData.name}.docx`; a.click();
            URL.revokeObjectURL(url);
        } catch (e) { toast.error('Lỗi xuất Word: ' + e.message); }
        finally { setExporting(false); }
    };

    const seedTemplates = async () => {
        if (!confirm('Tạo 2 mẫu hợp đồng mặc định (thử việc + chính thức)?')) return;
        try {
            await apiFetch('/api/hr/seed-contract-templates', { method: 'POST' });
            const d = await apiFetch('/api/contract-templates?type=Lao+%C4%91%E1%BB%99ng');
            setTemplates(Array.isArray(d) ? d : []);
            toast.success('Đã tạo mẫu hợp đồng');
        } catch (e) { toast.error(e.message || 'Lỗi tạo mẫu'); }
    };

    return (
        <div>
            <div className="card-header" style={{ marginBottom: 16 }}>
                <span className="card-title">📄 Hợp đồng lao động</span>
                <div style={{ display: 'flex', gap: 8 }}>
                    {templates.length === 0 && <button className="btn btn-ghost btn-sm" onClick={seedTemplates}>📋 Tạo mẫu mặc định</button>}
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Tạo hợp đồng</button>
                </div>
            </div>

            <div style={{ marginBottom: 16 }}>
                <select className="form-select" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} style={{ maxWidth: 320 }}>
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.position || 'N/A'}</option>)}
                </select>
            </div>

            {showForm && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid var(--border-light)' }}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Loại hợp đồng</label>
                            <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mẫu hợp đồng</label>
                            <select className="form-select" value={form.templateId} onChange={e => setForm({ ...form, templateId: e.target.value })}>
                                <option value="">-- Chọn mẫu --</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">Ngày bắt đầu *</label><input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">Ngày kết thúc</label><input className="form-input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">Ngày ký</label><input className="form-input" type="date" value={form.signedAt} onChange={e => setForm({ ...form, signedAt: e.target.value })} /></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">Lương hợp đồng (VND) *</label><input className="form-input" type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} placeholder="0" /></div>
                        <div className="form-group"><label className="form-label">Lương đóng BH (VND)</label><input className="form-input" type="number" value={form.insuranceSalary} onChange={e => setForm({ ...form, insuranceSalary: e.target.value })} placeholder="0" /></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">Chức vụ</label><input className="form-input" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="Để trống = theo hồ sơ NV" /></div>
                        <div className="form-group"><label className="form-label">Phòng ban</label><input className="form-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Phòng ban" /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Hủy</button>
                        <button className="btn btn-primary btn-sm" onClick={handleSubmit}>Tạo hợp đồng</button>
                    </div>
                </div>
            )}

            {preview && (
                <div className="modal-overlay" onClick={() => setPreview(null)}>
                    <div className="modal" style={{ maxWidth: 800, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Xem trước hợp đồng</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setPreview(null)}>✕</button>
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: preview.html }} style={{ padding: 16, background: '#fff', color: '#000' }} />
                    </div>
                </div>
            )}

            {!selectedEmp ? (
                <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chọn nhân viên để xem hợp đồng</div>
            ) : loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
            ) : contracts.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chưa có hợp đồng nào</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {contracts.map(c => (
                        <div key={c.id} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16, border: '1px solid var(--border-light)', borderLeft: `4px solid ${STATUS_COLORS[c.status] || '#6b7280'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                        <strong style={{ fontSize: 14 }}>{c.code}</strong>
                                        <span className="badge" style={{ background: `${STATUS_COLORS[c.status] || '#6b7280'}22`, color: STATUS_COLORS[c.status] || '#6b7280' }}>{c.status}</span>
                                        <span className="badge muted">{c.type}</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                                        <span>📅 {fmtDate(c.startDate)} → {c.endDate ? fmtDate(c.endDate) : 'Không xác định'}</span>
                                        <span>💰 {fmt(c.salary)}</span>
                                        {c.position && <span>🏷️ {c.position}</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => handlePreview(c)}>👁 Xem</button>
                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => handleExportWord(c)} disabled={exporting}>⬇ Word</button>
                                    {c.status === 'Chờ ký' && <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => updateStatus(c.id, 'Đã ký')}>✅ Đã ký</button>}
                                    {c.status === 'Hiệu lực' && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: '#ef4444' }} onClick={() => { if (confirm('Hủy hợp đồng này?')) updateStatus(c.id, 'Đã hủy'); }}>Hủy HĐ</button>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
