'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

const PIPELINE = [
    { key: 'Khảo sát', label: 'CRM', icon: '📊' },
    { key: 'Thiết kế', label: 'Thiết kế', icon: '🎨' },
    { key: 'Ký HĐ', label: 'Ký HĐ', icon: '📝' },
    { key: 'Đang thi công', label: 'Thi công', icon: '🔨' },
    { key: 'Bảo hành', label: 'Bảo hành', icon: '🛡️' },
    { key: 'Hoàn thành', label: 'Hậu mãi', icon: '✅' },
];

const STATUS_MAP = { 'Khảo sát': 0, 'Báo giá': 0, 'Thiết kế': 1, 'Chuẩn bị thi công': 2, 'Đang thi công': 3, 'Bảo hành': 4, 'Hoàn thành': 5 };

export default function ProjectDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [tab, setTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [financeSubTab, setFinanceSubTab] = useState('payments');
    const [contractForm, setContractForm] = useState({ name: '', type: 'Thi công thô', contractValue: '', signDate: '', startDate: '', endDate: '', paymentTerms: '', notes: '' });
    const [paymentPhases, setPaymentPhases] = useState([]);

    const PAYMENT_TEMPLATES = {
        'Thiết kế': [
            { phase: 'Đặt cọc thiết kế', pct: 50, category: 'Thiết kế' },
            { phase: 'Nghiệm thu bản vẽ', pct: 50, category: 'Thiết kế' },
        ],
        'Thi công thô': [
            { phase: 'Đặt cọc thi công', pct: 30, category: 'Thi công' },
            { phase: 'Hoàn thiện móng + khung', pct: 30, category: 'Thi công' },
            { phase: 'Hoàn thiện xây thô', pct: 30, category: 'Thi công' },
            { phase: 'Nghiệm thu bàn giao thô', pct: 10, category: 'Thi công' },
        ],
        'Thi công hoàn thiện': [
            { phase: 'Đặt cọc hoàn thiện', pct: 30, category: 'Hoàn thiện' },
            { phase: 'Hoàn thiện trát + ốp lát', pct: 25, category: 'Hoàn thiện' },
            { phase: 'Hoàn thiện sơn + điện nước', pct: 25, category: 'Hoàn thiện' },
            { phase: 'Nghiệm thu bàn giao', pct: 20, category: 'Hoàn thiện' },
        ],
        'Nội thất': [
            { phase: 'Đặt cọc nội thất', pct: 50, category: 'Nội thất' },
            { phase: 'Giao hàng + lắp đặt', pct: 40, category: 'Nội thất' },
            { phase: 'Nghiệm thu hoàn thiện', pct: 10, category: 'Nội thất' },
        ],
    };

    // Auto-populate phases when type changes
    const setTypeAndPhases = (type) => {
        const template = PAYMENT_TEMPLATES[type] || [];
        const val = Number(contractForm.contractValue) || 0;
        setContractForm({ ...contractForm, type, name: '' });
        setPaymentPhases(template.map(t => ({ ...t, amount: Math.round(val * t.pct / 100) })));
    };

    // Recalculate amounts when value changes
    const setValueAndRecalc = (contractValue) => {
        const val = Number(contractValue) || 0;
        setContractForm({ ...contractForm, contractValue });
        setPaymentPhases(prev => prev.map(p => ({ ...p, amount: Math.round(val * p.pct / 100) })));
    };

    const updatePhase = (idx, field, value) => {
        setPaymentPhases(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            if (field === 'pct') {
                const val = Number(contractForm.contractValue) || 0;
                updated[idx].amount = Math.round(val * Number(value) / 100);
            }
            return updated;
        });
    };
    const removePhase = (idx) => setPaymentPhases(prev => prev.filter((_, i) => i !== idx));
    const addPhase = () => setPaymentPhases(prev => [...prev, { phase: `Đợt ${prev.length + 1}`, pct: 0, amount: 0, category: contractForm.type }]);
    const [woForm, setWoForm] = useState({ title: '', category: 'Thi công', priority: 'Trung bình', assignee: '', dueDate: '', description: '' });
    const [expenseForm, setExpenseForm] = useState({ description: '', category: 'Vận chuyển', amount: '', submittedBy: '' });
    const [logForm, setLogForm] = useState({ type: 'Điện thoại', content: '', createdBy: '' });
    const [docForm, setDocForm] = useState({ name: '', category: 'Khác', fileName: '', uploadedBy: '', notes: '' });
    const fetchData = () => { fetch(`/api/projects/${id}`).then(r => r.json()).then(d => { setData(d); setLoading(false); }); };
    useEffect(fetchData, [id]);

    const updateMilestone = async (msId, progress) => {
        await fetch(`/api/milestones/${msId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: Number(progress), status: Number(progress) === 100 ? 'Hoàn thành' : Number(progress) > 0 ? 'Đang làm' : 'Chưa bắt đầu' }) });
        fetchData();
    };

    const updateWorkOrder = async (woId, status) => {
        await fetch(`/api/work-orders/${woId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        fetchData();
    };

    const CONTRACT_TYPES = ['Thiết kế', 'Thi công thô', 'Thi công hoàn thiện', 'Nội thất'];
    const createContract = async () => {
        const cName = contractForm.name.trim() || `HĐ ${contractForm.type} - ${p.name}`;
        const res = await fetch('/api/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...contractForm, name: cName, contractValue: Number(contractForm.contractValue) || 0, projectId: id, customerId: data.customerId, paymentPhases }) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo HĐ'); }
        setModal(null); setContractForm({ name: '', type: 'Thi công thô', contractValue: '', signDate: '', startDate: '', endDate: '', paymentTerms: '', notes: '' }); setPaymentPhases([]); fetchData();
    };
    const createWorkOrder = async () => {
        await fetch('/api/work-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...woForm, projectId: id }) });
        setModal(null); setWoForm({ title: '', category: 'Thi công', priority: 'Trung bình', assignee: '', dueDate: '', description: '' }); fetchData();
    };
    const createExpense = async () => {
        await fetch('/api/project-expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...expenseForm, amount: Number(expenseForm.amount) || 0, projectId: id }) });
        setModal(null); setExpenseForm({ description: '', category: 'Vận chuyển', amount: '', submittedBy: '' }); fetchData();
    };
    const createTrackingLog = async () => {
        await fetch('/api/tracking-logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...logForm, projectId: id }) });
        setModal(null); setLogForm({ type: 'Điện thoại', content: '', createdBy: '' }); fetchData();
    };
    const createDocument = async () => {
        await fetch('/api/project-documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...docForm, projectId: id }) });
        setModal(null); setDocForm({ name: '', category: 'Khác', fileName: '', uploadedBy: '', notes: '' }); fetchData();
    };

    // PO from materials
    const [poForm, setPoForm] = useState({ supplier: '', deliveryDate: '', notes: '' });
    const [poItems, setPoItems] = useState([]);
    const openPOModal = () => {
        const unordered = (data?.materialPlans || []).filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần');
        setPoItems(unordered.map(m => ({ productName: m.product?.name || '', unit: m.product?.unit || '', quantity: m.quantity - m.orderedQty, unitPrice: m.unitPrice, amount: (m.quantity - m.orderedQty) * m.unitPrice, productId: m.productId, _mpId: m.id })));
        setPoForm({ supplier: '', deliveryDate: '', notes: '' });
        setModal('po');
    };
    const updatePOItem = (idx, field, value) => {
        setPoItems(prev => { const u = [...prev]; u[idx] = { ...u[idx], [field]: value }; if (field === 'quantity' || field === 'unitPrice') u[idx].amount = (Number(u[idx].quantity) || 0) * (Number(u[idx].unitPrice) || 0); return u; });
    };
    const removePOItem = (idx) => setPoItems(prev => prev.filter((_, i) => i !== idx));
    const createPO = async () => {
        if (!poForm.supplier.trim()) return alert('Vui lòng nhập tên nhà cung cấp');
        if (poItems.length === 0) return alert('Không có vật tư nào để đặt');
        const totalAmount = poItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const res = await fetch('/api/purchase-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...poForm, projectId: id, totalAmount, items: poItems.map(({ _mpId, ...rest }) => ({ ...rest, quantity: Number(rest.quantity), unitPrice: Number(rest.unitPrice), amount: Number(rest.amount) })) }) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo PO'); }
        // Update material plan statuses
        for (const item of poItems) {
            if (item._mpId) {
                await fetch(`/api/material-plans/${item._mpId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderedQty: Number(item.quantity), status: 'Đã đặt đủ' }) }).catch(() => { });
            }
        }
        setModal(null); setPoItems([]); fetchData(); setTab('purchase');
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    const p = data;
    const pnl = p.pnl;
    const st = p.settlement;
    const pipelineIdx = STATUS_MAP[p.status] ?? 0;

    const tabs = [
        { key: 'overview', label: 'Tổng quan', icon: '📋' },
        { key: 'logs', label: 'Nhật ký', icon: '📒', count: p.trackingLogs?.length },
        { key: 'milestones', label: 'Tiến độ', icon: '📊', count: p.milestones?.length },
        { key: 'contracts', label: 'Hợp đồng', icon: '📝', count: p.contracts?.length },
        { key: 'workorders', label: 'Phiếu CV', icon: '📋', count: p.workOrders?.length },
        { key: 'materials', label: 'Vật tư', icon: '🧱', count: p.materialPlans?.length },
        { key: 'purchase', label: 'Mua hàng', icon: '🛒', count: p.purchaseOrders?.length },
        { key: 'contractors', label: 'Thầu phụ', icon: '👷', count: p.contractorPays?.length },
        { key: 'finance', label: 'Tài chính', icon: '💰' },
        { key: 'documents', label: 'Tài liệu', icon: '📁', count: p.documents?.length },
    ];

    return (
        <div>
            <button className="btn btn-secondary" onClick={() => router.push('/projects')} style={{ marginBottom: 16 }}>← Quay lại</button>

            {/* Project Header */}
            <div className="card" style={{ marginBottom: 24, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--text-accent)', fontSize: 14, fontWeight: 600 }}>{p.code}</span>
                            <span className={`badge ${p.status === 'Hoàn thành' ? 'success' : p.status === 'Đang thi công' ? 'warning' : 'info'}`}>{p.status}</span>
                            {p.phase && <span className="badge muted">{p.phase}</span>}
                            {/* Project Health Badge */}
                            {(() => {
                                const now = new Date();
                                const end = p.endDate ? new Date(p.endDate) : null;
                                const overdueDays = end ? Math.ceil((now - end) / 86400000) : 0;
                                const budgetRate = p.budget > 0 ? (p.spent / p.budget) * 100 : 0;
                                const isDone = p.status === 'Hoàn thành';
                                let health = 'success', healthLabel = '🟢 Bình thường', healthTitle = 'Dự án đang đúng tiến độ & ngân sách';
                                if (!isDone && (overdueDays > 30 || budgetRate > 100)) {
                                    health = 'danger'; healthLabel = '🔴 Rủi ro cao'; healthTitle = overdueDays > 30 ? `Trễ ${overdueDays} ngày` : `Chi phí vượt ${Math.round(budgetRate)}% ngân sách`;
                                } else if (!isDone && (overdueDays > 0 || budgetRate > 80)) {
                                    health = 'warning'; healthLabel = '🟡 Cần theo dõi'; healthTitle = overdueDays > 0 ? `Trễ ${overdueDays} ngày` : `Chi phí đạt ${Math.round(budgetRate)}% ngân sách`;
                                }
                                return <span className={`badge ${health}`} title={healthTitle}>{healthLabel}</span>;
                            })()}
                            {pnl.profit >= 0 ? <span className="badge success">📈 Lãi {fmt(pnl.profit)}</span> : <span className="badge danger">📉 Lỗ {fmt(Math.abs(pnl.profit))}</span>}
                        </div>
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{p.name}</h2>
                        <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 13 }}>{p.customer?.name} • {p.address}</div>
                        {/* PM + Team */}
                        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                            {p.manager && <span title="Quản lý dự án">👤 PM: <strong>{p.manager}</strong></span>}
                            {p.designer && <span title="Thiết kế">🎨 TK: {p.designer}</span>}
                            {p.supervisor && <span title="Giám sát">🔧 GS: {p.supervisor}</span>}
                        </div>
                        {/* Timeline */}
                        {(p.startDate || p.endDate) && (() => {
                            const now = new Date();
                            const end = p.endDate ? new Date(p.endDate) : null;
                            const overdue = end && now > end && p.status !== 'Hoàn thành';
                            const overdueDays = overdue ? Math.ceil((now - end) / 86400000) : 0;
                            return (
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, fontSize: 12 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>📅 {fmtDate(p.startDate)} → {fmtDate(p.endDate)}</span>
                                    {overdue && <span className="badge danger" style={{ fontSize: 11, animation: 'pulse 2s infinite' }}>⚠ Trễ {overdueDays} ngày</span>}
                                </div>
                            );
                        })()}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 32, fontWeight: 700 }}>{p.progress}%</div>
                        <div className="progress-bar" style={{ width: 120 }}><div className="progress-fill" style={{ width: `${p.progress}%` }}></div></div>
                    </div>
                </div>

                {/* Pipeline */}
                <div className="pipeline">
                    {PIPELINE.map((stage, i) => (
                        <div className="pipeline-step" key={stage.key}>
                            <div className={`pipeline-node ${i === pipelineIdx ? 'active' : i < pipelineIdx ? 'completed' : ''}`}>
                                <div className="pipeline-dot">{i < pipelineIdx ? '✓' : stage.icon}</div>
                                <span className="pipeline-label">{stage.label}</span>
                            </div>
                            {i < PIPELINE.length - 1 && <div className={`pipeline-line ${i < pipelineIdx ? 'completed' : ''}`}></div>}
                        </div>
                    ))}
                </div>

                {/* Quick Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 8 }}>
                    {[
                        { v: `${p.area}m²`, l: 'Diện tích' }, { v: `${p.floors} tầng`, l: 'Số tầng' },
                        { v: fmt(p.contractValue), l: 'Giá trị HĐ' }, { v: fmt(p.paidAmount), l: 'Đã thu' },
                        { v: fmt(pnl.debtFromCustomer), l: 'KH còn nợ', c: pnl.debtFromCustomer > 0 ? 'var(--status-danger)' : 'var(--status-success)' }
                    ].map(s => (
                        <div key={s.l} style={{ textAlign: 'center', padding: '8px 0' }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: s.c || 'var(--text-primary)' }}>{s.v}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.l}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="project-tabs">
                {tabs.map(t => (
                    <button key={t.key} className={`project-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                        <span>{t.icon}</span> {t.label}
                        {t.count > 0 && <span className="tab-count">{t.count}</span>}
                    </button>
                ))}
            </div>

            {/* TAB: Nhật ký */}
            {tab === 'logs' && (
                <div className="card" style={{ padding: 24 }}>
                    <div className="card-header"><span className="card-title">📒 Nhật ký theo dõi</span><button className="btn btn-primary btn-sm" onClick={() => setModal('log')}>+ Ghi chú</button></div>
                    {p.trackingLogs.map(log => (
                        <div key={log.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border-light)' }}>
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                                {log.type === 'Điện thoại' ? '📞' : log.type === 'Gặp mặt' ? '🤝' : log.type === 'Email' ? '📧' : '💬'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{log.content}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 12 }}>
                                    <span>{log.createdBy || 'N/A'}</span>
                                    <span>{fmtDate(log.createdAt)}</span>
                                    <span className="badge muted" style={{ fontSize: 10 }}>{log.type}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {p.trackingLogs.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có nhật ký theo dõi</div>}
                </div>
            )}

            {/* TAB: Tổng quan */}
            {tab === 'overview' && (
                <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div className="card">
                        <div className="card-header"><span className="card-title">👥 Nhân sự</span></div>
                        {p.employees.map(e => (
                            <div key={e.employeeId} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{e.employee.name}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{e.employee.position}</span>
                            </div>
                        ))}
                        {p.employees.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center', fontSize: 13 }}>Chưa có nhân sự</div>}
                    </div>
                    <div className="card">
                        <div className="card-header"><span className="card-title">💰 Giao dịch gần đây</span></div>
                        {p.transactions.map(t => (
                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <div><span style={{ fontWeight: 600, fontSize: 13 }}>{t.description}</span><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(t.date)}</div></div>
                                <span style={{ fontWeight: 700, fontSize: 13, color: t.type === 'Thu' ? 'var(--status-success)' : 'var(--status-danger)' }}>{t.type === 'Thu' ? '+' : '-'}{fmt(t.amount)}</span>
                            </div>
                        ))}
                        {p.transactions.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center', fontSize: 13 }}>Chưa có giao dịch</div>}
                    </div>
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <div className="card-header"><span className="card-title">📝 Nhật ký theo dõi</span>{p.trackingLogs.length > 5 && <button className="btn btn-ghost btn-sm" onClick={() => setTab('logs')} style={{ fontSize: 12 }}>Xem tất cả ({p.trackingLogs.length}) →</button>}</div>
                        {p.trackingLogs.slice(0, 5).map(log => (
                            <div key={log.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                                    {log.type === 'Điện thoại' ? '📞' : log.type === 'Gặp mặt' ? '🤝' : log.type === 'Email' ? '📧' : '💬'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{log.content}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{log.createdBy} • {fmtDate(log.createdAt)} • {log.type}</div>
                                </div>
                            </div>
                        ))}
                        {(!p.trackingLogs || p.trackingLogs.length === 0) && <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center', fontSize: 13 }}>Chưa có nhật ký</div>}
                    </div>
                </div>
            )}

            {/* TAB: Tiến độ */}
            {tab === 'milestones' && (
                <div className="card" style={{ padding: 24 }}>
                    <div className="card-header"><span className="card-title">📊 Tiến độ hạng mục</span><span className="badge info">Link KH: /progress/{p.code}</span></div>
                    {p.milestones.map(m => (
                        <div key={m.id} style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span className={`badge ${m.status === 'Hoàn thành' ? 'success' : m.status === 'Đang làm' || m.status === 'Đang thực hiện' ? 'warning' : 'muted'}`}>{m.status}</span>
                                    <input type="range" min="0" max="100" step="5" value={m.progress} onChange={e => updateMilestone(m.id, e.target.value)} style={{ width: 100, accentColor: 'var(--accent-primary)' }} />
                                    <span style={{ fontWeight: 700, width: 40, textAlign: 'right', fontSize: 13 }}>{m.progress}%</span>
                                </div>
                            </div>
                            <div className="progress-bar"><div className={`progress-fill ${m.progress === 100 ? 'success' : ''}`} style={{ width: `${m.progress}%` }}></div></div>
                        </div>
                    ))}
                    {p.milestones.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>Chưa có hạng mục</div>}
                </div>
            )}

            {/* TAB: Hợp đồng */}
            {tab === 'contracts' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><h3 style={{ margin: 0 }}>📝 Hợp đồng</h3><button className="btn btn-primary btn-sm" onClick={() => setModal('contract')}>+ Thêm HĐ</button></div>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
                        <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon revenue">📝</span></div><div className="stat-card .stat-value" style={{ fontSize: 20, fontWeight: 700 }}>{p.contracts.length}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng HĐ</div></div>
                        <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon customers">💰</span></div><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-success)' }}>{fmt(p.contracts.reduce((s, c) => s + c.contractValue, 0))}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng giá trị</div></div>
                        <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon projects">✅</span></div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(p.contracts.reduce((s, c) => s + c.paidAmount, 0))}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã thu</div></div>
                    </div>
                    <div className="card">
                        <div className="table-container"><table className="data-table">
                            <thead><tr><th>Mã HĐ</th><th>Tên</th><th>Loại</th><th>Giá trị</th><th>Biến động</th><th>Đã thu</th><th>Tỷ lệ</th><th>Trạng thái</th></tr></thead>
                            <tbody>{p.contracts.map(c => {
                                const rate = pct(c.paidAmount, c.contractValue + c.variationAmount);
                                return (
                                    <tr key={c.id}>
                                        <td className="accent">{c.code}</td>
                                        <td className="primary">{c.name}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.quotation?.code ? `Từ ${c.quotation.code}` : ''} • Ký {fmtDate(c.signDate)}</div></td>
                                        <td><span className="badge info">{c.type}</span></td>
                                        <td className="amount">{fmt(c.contractValue)}</td>
                                        <td style={{ color: c.variationAmount > 0 ? 'var(--status-warning)' : '' }}>{c.variationAmount > 0 ? `+${fmt(c.variationAmount)}` : '—'}</td>
                                        <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(c.paidAmount)}</td>
                                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="progress-bar" style={{ flex: 1, maxWidth: 60 }}><div className="progress-fill" style={{ width: `${rate}%` }}></div></div><span style={{ fontSize: 12 }}>{rate}%</span></div></td>
                                        <td><span className={`badge ${c.status === 'Hoàn thành' ? 'success' : c.status === 'Đang thực hiện' ? 'warning' : c.status === 'Đã ký' ? 'info' : 'muted'}`}>{c.status}</span></td>
                                    </tr>
                                );
                            })}</tbody>
                        </table></div>
                        {p.contracts.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có hợp đồng</div>}
                    </div>
                </div>
            )}

            {/* TAB: Tài chính (gộp Thu/Chi/Quyết toán) */}
            {tab === 'finance' && (
                <div>
                    {/* Finance Sub-tabs */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border-light)', paddingBottom: 0 }}>
                        {[{ key: 'payments', label: '💵 Thu tiền' }, { key: 'expenses', label: '💸 Chi phí' }, { key: 'settlement', label: '🧮 Lãi / Lỗ' }].map(st2 => (
                            <button key={st2.key} onClick={() => setFinanceSubTab(st2.key)}
                                style={{ padding: '10px 20px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0', background: financeSubTab === st2.key ? 'var(--bg-card)' : 'transparent', color: financeSubTab === st2.key ? 'var(--accent-primary)' : 'var(--text-muted)', borderBottom: financeSubTab === st2.key ? '2px solid var(--accent-primary)' : '2px solid transparent', marginBottom: -2, transition: 'all 0.2s' }}>
                                {st2.label}
                            </button>
                        ))}
                    </div>

                    {/* Sub-tab: Thu tiền */}
                    {financeSubTab === 'payments' && (
                        <div>
                            {p.contracts.map(c => (
                                <div key={c.id} className="card" style={{ marginBottom: 20, padding: 24 }}>
                                    <div className="card-header">
                                        <span className="card-title">💵 {c.code} — {c.name}</span>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <span className="badge info">HĐ: {fmt(c.contractValue)}</span>
                                            <span className="badge success">Đã thu: {fmt(c.paidAmount)}</span>
                                            <span className="badge danger">Còn: {fmt(c.contractValue + c.variationAmount - c.paidAmount)}</span>
                                        </div>
                                    </div>
                                    <div className="table-container"><table className="data-table">
                                        <thead><tr><th>Đợt</th><th>Hạng mục</th><th>Kế hoạch</th><th>Đã thu</th><th>Còn lại</th><th>Trạng thái</th></tr></thead>
                                        <tbody>{c.payments.map(pay => (
                                            <tr key={pay.id}>
                                                <td className="primary">{pay.phase}</td>
                                                <td><span className="badge muted">{pay.category}</span></td>
                                                <td className="amount">{fmt(pay.amount)}</td>
                                                <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(pay.paidAmount)}</td>
                                                <td style={{ color: pay.amount - pay.paidAmount > 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 600 }}>{fmt(pay.amount - pay.paidAmount)}</td>
                                                <td><span className={`badge ${pay.status === 'Đã thu' ? 'success' : pay.status === 'Thu một phần' ? 'warning' : 'danger'}`}>{pay.status}</span></td>
                                            </tr>
                                        ))}</tbody>
                                    </table></div>
                                    {c.payments.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 16, textAlign: 'center', fontSize: 13 }}>Chưa có đợt thu</div>}
                                </div>
                            ))}
                            {p.contracts.length === 0 && <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có hợp đồng để thu tiền</div>}
                        </div>
                    )}

                    {/* Sub-tab: Chi phí */}
                    {financeSubTab === 'expenses' && (
                        <div>
                            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}>
                                <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700 }}>{p.expenses.length}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng phiếu</div></div>
                                <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-danger)' }}>{fmt(p.expenses.reduce((s, e) => s + e.amount, 0))}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng CP</div></div>
                                <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-success)' }}>{fmt(p.expenses.reduce((s, e) => s + e.paidAmount, 0))}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã TT</div></div>
                                <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-warning)' }}>{p.expenses.filter(e => e.status === 'Chờ duyệt').length}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chờ duyệt</div></div>
                            </div>
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}><button className="btn btn-primary btn-sm" onClick={() => setModal('expense')}>+ Thêm chi phí</button></div>
                                <div className="table-container"><table className="data-table">
                                    <thead><tr><th>Mã</th><th>Mô tả</th><th>Hạng mục</th><th>Số tiền</th><th>Đã TT</th><th>Người nộp</th><th>Ngày</th><th>Trạng thái</th></tr></thead>
                                    <tbody>{p.expenses.map(e => (
                                        <tr key={e.id}>
                                            <td className="accent">{e.code}</td>
                                            <td className="primary">{e.description}</td>
                                            <td><span className="badge muted">{e.category}</span></td>
                                            <td className="amount">{fmt(e.amount)}</td>
                                            <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(e.paidAmount)}</td>
                                            <td style={{ fontSize: 12 }}>{e.submittedBy || '—'}</td>
                                            <td style={{ fontSize: 12 }}>{fmtDate(e.date)}</td>
                                            <td><span className={`badge ${e.status === 'Đã thanh toán' ? 'success' : e.status === 'Đã duyệt' ? 'info' : 'warning'}`}>{e.status}</span></td>
                                        </tr>
                                    ))}</tbody>
                                </table></div>
                                {p.expenses.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có chi phí phát sinh</div>}
                            </div>
                        </div>
                    )}

                    {/* Sub-tab: Lãi / Lỗ (Quyết toán) */}
                    {financeSubTab === 'settlement' && (
                        <div>
                            <div className="settlement-profit" style={{ marginBottom: 24 }}>
                                <div className="profit-value" style={{ color: st.profit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{st.profit >= 0 ? '📈' : '📉'} {fmt(st.profit)}</div>
                                <div className="profit-label">{st.profit >= 0 ? 'Lợi nhuận dự án' : 'Lỗ dự án'}</div>
                                <div className="profit-rate" style={{ background: st.profit >= 0 ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: st.profit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>Tỷ lệ: {st.profitRate}%</div>
                            </div>
                            <div className="settlement-grid">
                                <div className="settlement-card side-a">
                                    <h3>🏠 Bên A — Doanh thu (Khách hàng)</h3>
                                    <div className="settlement-row"><span className="label">Giá trị hợp đồng</span><span className="value">{fmt(st.sideA.contractValue)}</span></div>
                                    <div className="settlement-row"><span className="label">Phát sinh / Biến động</span><span className="value" style={{ color: st.sideA.variation > 0 ? 'var(--status-warning)' : '' }}>{st.sideA.variation > 0 ? '+' : ''}{fmt(st.sideA.variation)}</span></div>
                                    <div className="settlement-row total"><span className="label">Tổng doanh thu</span><span className="value">{fmt(st.sideA.total)}</span></div>
                                    <div className="settlement-row"><span className="label">Đã thu</span><span className="value" style={{ color: 'var(--status-success)' }}>{fmt(st.sideA.collected)}</span></div>
                                    <div className="settlement-row"><span className="label">Còn phải thu</span><span className="value" style={{ color: st.sideA.remaining > 0 ? 'var(--status-danger)' : '' }}>{fmt(st.sideA.remaining)}</span></div>
                                    <div className="settlement-row"><span className="label">Tỷ lệ thu</span><span className="value">{st.sideA.rate}%</span></div>
                                </div>
                                <div className="settlement-card side-b">
                                    <h3>🏗️ Bên B — Chi phí</h3>
                                    <div className="settlement-row"><span className="label">Mua sắm vật tư</span><span className="value">{fmt(st.sideB.purchase)}</span></div>
                                    <div className="settlement-row"><span className="label">Chi phí phát sinh</span><span className="value">{fmt(st.sideB.expenses)}</span></div>
                                    <div className="settlement-row"><span className="label">Thầu phụ</span><span className="value">{fmt(st.sideB.contractor)}</span></div>
                                    <div className="settlement-row total"><span className="label">Tổng chi phí</span><span className="value" style={{ color: 'var(--status-danger)' }}>{fmt(st.sideB.total)}</span></div>
                                    <div className="settlement-row"><span className="label">Đã thanh toán</span><span className="value">{fmt(st.sideB.paid)}</span></div>
                                    <div className="settlement-row"><span className="label">Còn phải trả</span><span className="value" style={{ color: st.sideB.remaining > 0 ? 'var(--status-warning)' : '' }}>{fmt(st.sideB.remaining)}</span></div>
                                </div>
                            </div>
                            <div className="card" style={{ padding: 24 }}>
                                <div className="card-header"><span className="card-title">📊 Định mức chi phí</span></div>
                                <div className="table-container"><table className="data-table">
                                    <thead><tr><th>Hạng mục</th><th>Định mức</th><th>Thực tế</th><th>Chênh lệch</th><th>%</th></tr></thead>
                                    <tbody>{p.budgets.map(b => {
                                        const diff = b.budgetAmount - b.actualAmount;
                                        const rate = pct(b.actualAmount, b.budgetAmount);
                                        return (
                                            <tr key={b.id}>
                                                <td className="primary">{b.category}</td>
                                                <td>{fmt(b.budgetAmount)}</td>
                                                <td>{fmt(b.actualAmount)}</td>
                                                <td style={{ color: diff >= 0 ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: 600 }}>{diff >= 0 ? '+' : ''}{fmt(diff)}</td>
                                                <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="progress-bar" style={{ flex: 1, maxWidth: 80 }}><div className={`progress-fill ${rate > 100 ? '' : 'success'}`} style={{ width: `${Math.min(rate, 100)}%`, background: rate > 100 ? 'var(--status-danger)' : '' }}></div></div><span style={{ fontSize: 12 }}>{rate}%</span></div></td>
                                            </tr>
                                        );
                                    })}</tbody>
                                </table></div>
                                {p.budgets.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>Chưa có định mức</div>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: Phiếu công việc */}
            {tab === 'workorders' && (
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">📋 Phiếu công việc</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <span className="badge warning">{p.workOrders.filter(w => w.status === 'Chờ xử lý').length} chờ</span>
                            <span className="badge info">{p.workOrders.filter(w => w.status === 'Đang xử lý').length} đang làm</span>
                            <span className="badge success">{p.workOrders.filter(w => w.status === 'Hoàn thành').length} xong</span>
                            <button className="btn btn-primary btn-sm" onClick={() => setModal('workorder')}>+ Thêm phiếu</button>
                        </div>
                    </div>
                    <div className="table-container"><table className="data-table">
                        <thead><tr><th>Mã</th><th>Tiêu đề</th><th>Loại</th><th>Ưu tiên</th><th>Người thực hiện</th><th>Hạn</th><th>Trạng thái</th><th></th></tr></thead>
                        <tbody>{p.workOrders.map(wo => (
                            <tr key={wo.id}>
                                <td className="accent">{wo.code}</td>
                                <td className="primary">{wo.title}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{wo.description}</div></td>
                                <td><span className="badge muted">{wo.category}</span></td>
                                <td><span className={`badge ${wo.priority === 'Cao' ? 'danger' : wo.priority === 'Trung bình' ? 'warning' : 'muted'}`}>{wo.priority}</span></td>
                                <td style={{ fontSize: 13 }}>{wo.assignee || '—'}</td>
                                <td style={{ fontSize: 12 }}>{fmtDate(wo.dueDate)}</td>
                                <td>
                                    <select value={wo.status} onChange={e => updateWorkOrder(wo.id, e.target.value)} className="form-select" style={{ padding: '4px 28px 4px 8px', fontSize: 12, minWidth: 110 }}>
                                        <option>Chờ xử lý</option><option>Đang xử lý</option><option>Hoàn thành</option><option>Quá hạn</option>
                                    </select>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table></div>
                    {p.workOrders.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có phiếu công việc</div>}
                </div>
            )}

            {/* TAB: Vật tư */}
            {tab === 'materials' && (
                <div>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700 }}>{p.materialPlans.length}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loại vật tư</div></div>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-danger)' }}>{fmt(p.materialPlans.reduce((s, m) => s + m.totalAmount, 0))}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng giá trị</div></div>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-warning)' }}>{p.materialPlans.filter(m => m.status === 'Chưa đặt').length}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chưa đặt</div></div>
                    </div>
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0', gap: 8 }}>
                            {p.materialPlans.filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần').length > 0 && (
                                <button className="btn btn-primary btn-sm" onClick={openPOModal}>🛒 Tạo PO từ vật tư chưa đặt ({p.materialPlans.filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần').length})</button>
                            )}
                        </div>
                        <div className="table-container"><table className="data-table">
                            <thead><tr><th>Mã</th><th>Vật tư</th><th>Loại</th><th>SL cần</th><th>Đã đặt</th><th>Đã nhận</th><th>Còn thiếu</th><th>Đơn giá</th><th>Tổng</th><th>TT</th></tr></thead>
                            <tbody>{p.materialPlans.map(m => {
                                const missing = m.quantity - m.receivedQty;
                                return (
                                    <tr key={m.id}>
                                        <td className="accent">{m.product?.code}</td>
                                        <td className="primary">{m.product?.name}</td>
                                        <td><span className="badge muted">{m.type}</span></td>
                                        <td>{m.quantity} {m.product?.unit}</td>
                                        <td style={{ color: 'var(--status-info)' }}>{m.orderedQty}</td>
                                        <td style={{ color: 'var(--status-success)' }}>{m.receivedQty}</td>
                                        <td style={{ color: missing > 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 600 }}>{missing}</td>
                                        <td>{fmt(m.unitPrice)}</td>
                                        <td className="amount">{fmt(m.totalAmount)}</td>
                                        <td><span className={`badge ${m.status === 'Đã đặt đủ' ? 'success' : m.status === 'Đặt một phần' ? 'warning' : 'danger'}`}>{m.status}</span></td>
                                    </tr>
                                );
                            })}</tbody>
                        </table></div>
                        {p.materialPlans.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có kế hoạch vật tư</div>}
                    </div>
                </div>
            )}

            {/* TAB: Mua hàng */}
            {tab === 'purchase' && (
                <div>
                    {p.purchaseOrders.map(po => (
                        <div key={po.id} className="card" style={{ marginBottom: 20, padding: 24 }}>
                            <div className="card-header">
                                <div>
                                    <span className="card-title">🛒 {po.code} — {po.supplier}</span>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Đặt: {fmtDate(po.orderDate)} • Giao: {fmtDate(po.deliveryDate)} • Nhận: {fmtDate(po.receivedDate)}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span className={`badge ${po.status === 'Hoàn thành' ? 'success' : po.status === 'Đang giao' ? 'info' : po.status === 'Chờ duyệt' ? 'warning' : 'muted'}`}>{po.status}</span>
                                    <span className="badge purple">{fmt(po.totalAmount)}</span>
                                </div>
                            </div>
                            <div className="table-container"><table className="data-table">
                                <thead><tr><th>Sản phẩm</th><th>ĐVT</th><th>SL đặt</th><th>Đơn giá</th><th>Thành tiền</th><th>Đã nhận</th></tr></thead>
                                <tbody>{po.items.map(item => (
                                    <tr key={item.id}>
                                        <td className="primary">{item.productName}</td>
                                        <td>{item.unit}</td>
                                        <td>{item.quantity}</td>
                                        <td>{fmt(item.unitPrice)}</td>
                                        <td className="amount">{fmt(item.amount)}</td>
                                        <td style={{ color: item.receivedQty >= item.quantity ? 'var(--status-success)' : 'var(--status-warning)', fontWeight: 600 }}>{item.receivedQty}/{item.quantity}</td>
                                    </tr>
                                ))}</tbody>
                            </table></div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 12, fontSize: 13 }}>
                                <span>Tổng: <strong>{fmt(po.totalAmount)}</strong></span>
                                <span>Đã TT: <strong style={{ color: 'var(--status-success)' }}>{fmt(po.paidAmount)}</strong></span>
                                <span>Còn: <strong style={{ color: po.totalAmount - po.paidAmount > 0 ? 'var(--status-danger)' : '' }}>{fmt(po.totalAmount - po.paidAmount)}</strong></span>
                            </div>
                        </div>
                    ))}
                    {p.purchaseOrders.length === 0 && <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có đơn mua hàng</div>}
                </div>
            )}


            {/* TAB: Thầu phụ */}
            {tab === 'contractors' && (
                <div className="card">
                    <div className="card-header"><span className="card-title">👷 Thầu phụ & Công nợ</span><span className="badge warning">Tổng nợ thầu: {fmt(pnl.debtToContractors)}</span></div>
                    <div className="table-container"><table className="data-table">
                        <thead><tr><th>Thầu phụ</th><th>Loại</th><th>Mô tả</th><th>HĐ thầu</th><th>Đã TT</th><th>Còn nợ</th><th>TT</th></tr></thead>
                        <tbody>{p.contractorPays.map(cp => (
                            <tr key={cp.id}>
                                <td className="primary">{cp.contractor.name}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cp.contractor.phone}</div></td>
                                <td><span className="badge muted">{cp.contractor.type}</span></td>
                                <td style={{ fontSize: 12 }}>{cp.description}</td>
                                <td className="amount">{fmt(cp.contractAmount)}</td>
                                <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(cp.paidAmount)}</td>
                                <td style={{ fontWeight: 700, color: cp.contractAmount - cp.paidAmount > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>{fmt(cp.contractAmount - cp.paidAmount)}</td>
                                <td><span className={`badge ${cp.status === 'Đã TT' ? 'success' : 'warning'}`}>{cp.status}</span></td>
                            </tr>
                        ))}</tbody>
                    </table></div>
                    {p.contractorPays.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có thầu phụ</div>}
                </div>
            )}

            {/* TAB: Tài liệu */}
            {tab === 'documents' && (
                <div className="card">
                    <div className="card-header"><span className="card-title">📁 Tài liệu dự án</span><button className="btn btn-primary btn-sm" onClick={() => setModal('document')}>+ Thêm tài liệu</button></div>
                    <div className="table-container"><table className="data-table">
                        <thead><tr><th>Tên</th><th>Danh mục</th><th>File</th><th>Kích thước</th><th>Người upload</th><th>Ngày</th></tr></thead>
                        <tbody>{p.documents.map(doc => (
                            <tr key={doc.id}>
                                <td className="primary">{doc.name}</td>
                                <td><span className={`badge ${doc.category === 'Bản vẽ' ? 'info' : doc.category === 'Hợp đồng' ? 'purple' : doc.category === 'Ảnh thi công' ? 'success' : 'muted'}`}>{doc.category}</span></td>
                                <td style={{ fontSize: 12, color: 'var(--text-accent)' }}>{doc.fileName || '—'}</td>
                                <td style={{ fontSize: 12 }}>{doc.fileSize > 0 ? `${(doc.fileSize / 1024 / 1024).toFixed(1)} MB` : '—'}</td>
                                <td style={{ fontSize: 12 }}>{doc.uploadedBy || '—'}</td>
                                <td style={{ fontSize: 12 }}>{fmtDate(doc.createdAt)}</td>
                            </tr>
                        ))}</tbody>
                    </table></div>
                    {p.documents.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có tài liệu</div>}
                </div>
            )}

            {/* MODALS */}
            {modal === 'contract' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
                        <div className="modal-header"><h3>Thêm hợp đồng</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            {/* Type selector */}
                            <div className="form-group"><label className="form-label">Loại hợp đồng *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {CONTRACT_TYPES.map(t => (
                                        <button key={t} type="button" onClick={() => setTypeAndPhases(t)} className={`btn ${contractForm.type === t ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '10px 12px', fontSize: 13, justifyContent: 'flex-start', textAlign: 'left' }}>
                                            {t === 'Thiết kế' && '🎨 '}{t === 'Thi công thô' && '🧱 '}{t === 'Thi công hoàn thiện' && '🏠 '}{t === 'Nội thất' && '🪑 '}{t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Tên HĐ</label><input className="form-input" value={contractForm.name} onChange={e => setContractForm({ ...contractForm, name: e.target.value })} placeholder={`HĐ ${contractForm.type} - ${p.name}`} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Giá trị HĐ *</label><input className="form-input" type="number" value={contractForm.contractValue} onChange={e => setValueAndRecalc(e.target.value)} placeholder="VNĐ" /></div>
                                <div className="form-group"><label className="form-label">Ngày ký</label><input className="form-input" type="date" value={contractForm.signDate} onChange={e => setContractForm({ ...contractForm, signDate: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Ngày bắt đầu</label><input className="form-input" type="date" value={contractForm.startDate} onChange={e => setContractForm({ ...contractForm, startDate: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Ngày kết thúc</label><input className="form-input" type="date" value={contractForm.endDate} onChange={e => setContractForm({ ...contractForm, endDate: e.target.value })} /></div>
                            </div>

                            {/* Payment Phases Editor */}
                            <div style={{ marginTop: 16, border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
                                <div style={{ background: 'var(--bg-elevated)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>💰 Đợt thanh toán ({paymentPhases.length} đợt{paymentPhases.length > 0 ? ` — Tổng ${paymentPhases.reduce((s, p) => s + p.pct, 0)}%` : ''})</span>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={addPhase} style={{ fontSize: 12, padding: '4px 10px' }}>+ Thêm đợt</button>
                                </div>
                                {paymentPhases.length === 0 ? (
                                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Chọn loại HĐ để hiển thị đợt thanh toán mẫu</div>
                                ) : (
                                    <table className="data-table" style={{ marginBottom: 0 }}>
                                        <thead><tr><th style={{ width: 30 }}>#</th><th>Tên đợt</th><th style={{ width: 60 }}>%</th><th style={{ width: 130 }}>Số tiền</th><th style={{ width: 30 }}></th></tr></thead>
                                        <tbody>{paymentPhases.map((phase, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{idx + 1}</td>
                                                <td><input className="form-input" value={phase.phase} onChange={e => updatePhase(idx, 'phase', e.target.value)} style={{ padding: '4px 8px', fontSize: 13 }} /></td>
                                                <td><input className="form-input" type="number" min="0" max="100" value={phase.pct} onChange={e => updatePhase(idx, 'pct', e.target.value)} style={{ padding: '4px 6px', fontSize: 13, textAlign: 'center' }} /></td>
                                                <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--status-success)' }}>{fmt(phase.amount)}</td>
                                                <td><button type="button" onClick={() => removePhase(idx)} style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>×</button></td>
                                            </tr>
                                        ))}</tbody>
                                        {paymentPhases.reduce((s, p) => s + p.pct, 0) !== 100 && (
                                            <tfoot><tr><td colSpan={5} style={{ background: 'rgba(255,180,0,0.1)', color: 'var(--status-warning)', fontSize: 12, fontWeight: 600 }}>⚠ Tổng {paymentPhases.reduce((s, p) => s + Number(p.pct), 0)}% — nên = 100%</td></tr></tfoot>
                                        )}
                                    </table>
                                )}
                            </div>

                            <div className="form-row" style={{ marginTop: 16 }}>
                                <div className="form-group"><label className="form-label">Điều khoản thanh toán</label><input className="form-input" value={contractForm.paymentTerms} onChange={e => setContractForm({ ...contractForm, paymentTerms: e.target.value })} placeholder="VD: Thanh toán theo tiến độ" /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={contractForm.notes} onChange={e => setContractForm({ ...contractForm, notes: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={createContract}>Tạo hợp đồng</button></div>
                    </div>
                </div>
            )}
            {modal === 'workorder' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
                        <div className="modal-header"><h3>Thêm phiếu công việc</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tiêu đề *</label><input className="form-input" value={woForm.title} onChange={e => setWoForm({ ...woForm, title: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Loại</label><select className="form-select" value={woForm.category} onChange={e => setWoForm({ ...woForm, category: e.target.value })}><option>Thi công</option><option>Vật tư</option><option>Nội thất</option><option>Điện nước</option><option>Hoàn thiện</option><option>Khác</option></select></div>
                                <div className="form-group"><label className="form-label">Ưu tiên</label><select className="form-select" value={woForm.priority} onChange={e => setWoForm({ ...woForm, priority: e.target.value })}><option>Cao</option><option>Trung bình</option><option>Thấp</option></select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Người thực hiện</label><input className="form-input" value={woForm.assignee} onChange={e => setWoForm({ ...woForm, assignee: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Hạn</label><input className="form-input" type="date" value={woForm.dueDate} onChange={e => setWoForm({ ...woForm, dueDate: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Mô tả</label><textarea className="form-input" rows={2} value={woForm.description} onChange={e => setWoForm({ ...woForm, description: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={createWorkOrder}>Lưu</button></div>
                    </div>
                </div>
            )}
            {modal === 'expense' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header"><h3>Thêm chi phí phát sinh</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Mô tả *</label><input className="form-input" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Hạng mục</label><select className="form-select" value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}><option>Vận chuyển</option><option>Ăn uống</option><option>Xăng dầu</option><option>Dụng cụ</option><option>Sửa chữa</option><option>Khác</option></select></div>
                                <div className="form-group"><label className="form-label">Số tiền *</label><input className="form-input" type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Người nộp</label><input className="form-input" value={expenseForm.submittedBy} onChange={e => setExpenseForm({ ...expenseForm, submittedBy: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={createExpense}>Lưu</button></div>
                    </div>
                </div>
            )}
            {modal === 'log' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header"><h3>Thêm nhật ký</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Loại</label><select className="form-select" value={logForm.type} onChange={e => setLogForm({ ...logForm, type: e.target.value })}><option>Điện thoại</option><option>Gặp mặt</option><option>Email</option><option>Zalo</option></select></div>
                            <div className="form-group"><label className="form-label">Nội dung *</label><textarea className="form-input" rows={3} value={logForm.content} onChange={e => setLogForm({ ...logForm, content: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Người ghi</label><input className="form-input" value={logForm.createdBy} onChange={e => setLogForm({ ...logForm, createdBy: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={createTrackingLog}>Lưu</button></div>
                    </div>
                </div>
            )}
            {modal === 'document' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header"><h3>Thêm tài liệu</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tên tài liệu *</label><input className="form-input" value={docForm.name} onChange={e => setDocForm({ ...docForm, name: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Danh mục</label><select className="form-select" value={docForm.category} onChange={e => setDocForm({ ...docForm, category: e.target.value })}><option>Bản vẽ</option><option>Hợp đồng</option><option>Ảnh thi công</option><option>Nghiệm thu</option><option>Bảo hành</option><option>Khác</option></select></div>
                                <div className="form-group"><label className="form-label">Tên file</label><input className="form-input" value={docForm.fileName} onChange={e => setDocForm({ ...docForm, fileName: e.target.value })} placeholder="vd: ban-ve-v2.pdf" /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Người upload</label><input className="form-input" value={docForm.uploadedBy} onChange={e => setDocForm({ ...docForm, uploadedBy: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={docForm.notes} onChange={e => setDocForm({ ...docForm, notes: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={createDocument}>Lưu</button></div>
                    </div>
                </div>
            )}
            {modal === 'po' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
                        <div className="modal-header"><h3>🛒 Tạo đơn mua hàng từ vật tư</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Nhà cung cấp *</label><input className="form-input" value={poForm.supplier} onChange={e => setPoForm({ ...poForm, supplier: e.target.value })} placeholder="Tên NCC" /></div>
                                <div className="form-group"><label className="form-label">Ngày giao dự kiến</label><input type="date" className="form-input" value={poForm.deliveryDate} onChange={e => setPoForm({ ...poForm, deliveryDate: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} /></div>
                            <div style={{ marginTop: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📦 Danh sách vật tư ({poItems.length} mục)</div>
                                <div className="table-container"><table className="data-table">
                                    <thead><tr><th>Sản phẩm</th><th>ĐVT</th><th>SL đặt</th><th>Đơn giá</th><th>Thành tiền</th><th></th></tr></thead>
                                    <tbody>{poItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="primary">{item.productName}</td>
                                            <td>{item.unit}</td>
                                            <td><input type="number" className="form-input" style={{ width: 80, padding: '4px 8px' }} value={item.quantity} onChange={e => updatePOItem(idx, 'quantity', e.target.value)} /></td>
                                            <td><input type="number" className="form-input" style={{ width: 110, padding: '4px 8px' }} value={item.unitPrice} onChange={e => updatePOItem(idx, 'unitPrice', e.target.value)} /></td>
                                            <td className="amount">{fmt(item.amount)}</td>
                                            <td><button className="btn btn-ghost btn-sm" onClick={() => removePOItem(idx)} style={{ color: 'var(--status-danger)' }}>✕</button></td>
                                        </tr>
                                    ))}</tbody>
                                    <tfoot><tr><td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Tổng cộng:</td><td className="amount" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{fmt(poItems.reduce((s, i) => s + (Number(i.amount) || 0), 0))}</td><td></td></tr></tfoot>
                                </table></div>
                                {poItems.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 16, textAlign: 'center' }}>Không có vật tư nào cần đặt</div>}
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={createPO}>🛒 Tạo đơn mua hàng</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
