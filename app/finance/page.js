'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function FinancePage() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
    const [summary, setSummary] = useState({});
    const [receivables, setReceivables] = useState({ payments: [], summary: {} });
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterProject, setFilterProject] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showTxModal, setShowTxModal] = useState(false);
    const [txForm, setTxForm] = useState({ type: 'Thu', description: '', amount: 0, category: '', date: new Date().toISOString().split('T')[0] });
    const [confirmModal, setConfirmModal] = useState(null); // { payment, file }
    const [uploading, setUploading] = useState(false);
    const proofRef = useRef();

    const fetchAll = async () => {
        setLoading(true);
        const [finRes, recRes] = await Promise.all([
            fetch('/api/finance').then(r => r.json()),
            fetch('/api/finance/receivables').then(r => r.json()),
        ]);
        setSummary(finRes.summary || {});
        setTransactions(finRes.transactions || []);
        setReceivables(recRes);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    // === Thu tiền — bắt buộc upload proof ===
    const startCollect = (payment) => {
        setConfirmModal({ payment, file: null, amount: payment.amount - (payment.paidAmount || 0) });
    };

    const handleProofUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) setConfirmModal(prev => ({ ...prev, file }));
    };

    const confirmCollect = async () => {
        if (!confirmModal?.file) return alert('Vui lòng upload ảnh chuyển khoản hoặc chữ ký KH!');
        setUploading(true);

        // Upload proof image
        const fd = new FormData();
        fd.append('file', confirmModal.file);
        fd.append('type', 'payments');
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
        const { url: proofUrl } = await uploadRes.json();

        if (!proofUrl) { setUploading(false); return alert('Upload thất bại!'); }

        // Update payment
        const p = confirmModal.payment;
        const newPaid = (p.paidAmount || 0) + Number(confirmModal.amount);
        await fetch(`/api/contracts/${p.contractId}/payments/${p.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                paidAmount: newPaid,
                status: newPaid >= p.amount ? 'Đã thu' : 'Thu một phần',
                proofUrl,
                paidDate: new Date().toISOString(),
            }),
        });

        setUploading(false);
        setConfirmModal(null);
        fetchAll();
    };

    // === In phiếu thu 2 liên — Một Nhà Design&Build ===
    const printReceipt = (payment) => {
        const c = payment.contract;
        const today = new Date().toLocaleDateString('vi-VN');
        const cv = c?.contractValue || 0;
        const pct = cv > 0 ? Math.round((payment.amount || 0) / cv * 100) : 0;
        const amountText = fmt(payment.paidAmount || payment.amount);

        const w = window.open('', '_blank', 'width=800,height=900');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu thu - ${c?.code || ''}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Times New Roman',serif;font-size:14px;color:#000;background:#fff}
.page{width:100%;padding:20px 30px;page-break-after:always}
/* === Header Một Nhà === */
.mn-header{display:flex;align-items:center;border-bottom:3px solid #1a3a5c;padding-bottom:14px;margin-bottom:10px;gap:16px}
.mn-logo{display:flex;flex-direction:column;align-items:center;min-width:120px}
.mn-logo-icon{font-size:28px;font-weight:900;color:#1a3a5c;line-height:1;letter-spacing:-1px}
.mn-logo-sub{font-size:7px;text-transform:uppercase;color:#c8a555;letter-spacing:3px;font-weight:600;margin-top:2px}
.mn-brand{flex:1}
.mn-brand-name{font-size:11px;font-weight:800;color:#1a3a5c;text-transform:uppercase;letter-spacing:1px}
.mn-brand-web{font-size:9px;color:#666;margin-top:1px}
.mn-info{text-align:right;font-size:9px;line-height:1.6;color:#555}
.mn-info b{color:#1a3a5c}
/* === Title === */
.receipt-title{text-align:center;margin:14px 0 10px}
.receipt-title h1{font-size:22px;font-weight:bold;text-transform:uppercase;letter-spacing:3px;color:#1a3a5c}
.receipt-title .date{font-size:12px;color:#888;margin-top:4px}
.copy-label{text-align:center;font-style:italic;color:#c8a555;margin-bottom:10px;font-size:11px;font-weight:600;letter-spacing:1px}
/* === Info rows === */
.info{margin:14px 0}
.info .row{display:flex;padding:5px 0;border-bottom:1px dotted #ddd;font-size:13px}
.info .row .label{width:150px;color:#555;flex-shrink:0}
.info .row .value{flex:1;font-weight:600}
/* === Amount box === */
.amount-box{margin:18px 0;padding:16px;border:2px solid #1a3a5c;text-align:center;background:linear-gradient(135deg,#f8f6f0,#fff);border-radius:4px}
.amount-box .label{font-size:12px;color:#555;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}
.amount-box .value{font-size:24px;font-weight:bold;color:#1a3a5c;letter-spacing:1px}
/* === Sign === */
.sign-area{display:flex;justify-content:space-between;margin-top:40px;text-align:center}
.sign-area div{width:40%}
.sign-area .role{font-weight:bold;font-size:13px;margin-bottom:60px;color:#1a3a5c}
.sign-area .hint{font-size:10px;font-style:italic;color:#999}
.separator{border:none;border-top:1px dashed #c8a555;margin:20px 0}
.edit-field{border:none;border-bottom:1px solid #333;font-family:inherit;font-size:inherit;font-weight:inherit;background:transparent;width:100%;padding:2px 0}
.edit-field:focus{outline:none;border-bottom:2px solid #1a3a5c}
.no-print{position:fixed;top:10px;right:10px;z-index:9999}
.no-print button{padding:10px 24px;font-size:14px;cursor:pointer;background:#1a3a5c;color:#fff;border:none;border-radius:6px;margin-left:8px;font-weight:600}
.no-print button:hover{background:#2c4f7c}
.proof-img{max-width:180px;max-height:100px;margin-top:8px;border:1px solid #ddd;border-radius:4px}
.footer-note{text-align:center;font-size:9px;color:#aaa;margin-top:16px;font-style:italic}
@media print{.no-print{display:none!important}.edit-field{border-bottom:none}}
</style></head><body>
<div class="no-print">
    <button onclick="window.print()">🖨️ In phiếu thu</button>
</div>
${[1, 2].map(copy => `
<div class="page">
    <div class="copy-label">Liên ${copy}: ${copy === 1 ? 'LƯU SỔ KẾ TOÁN' : 'GIAO KHÁCH HÀNG'}</div>
    <div class="mn-header">
        <div class="mn-logo">
            <div class="mn-logo-icon">MỘT NHÀ</div>
            <div class="mn-logo-sub">Design & Build</div>
        </div>
        <div class="mn-brand">
            <div class="mn-brand-name">CÔNG TY TNHH THIẾT KẾ & XÂY DỰNG MỘT NHÀ</div>
            <div class="mn-brand-web">🌐 motnha.vn &nbsp;|&nbsp; 📞 0944 886 989</div>
        </div>
        <div class="mn-info">
            <div><b>Trụ sở:</b> R6 Royal City, Thanh Xuân, HN</div>
            <div><b>Showroom HN:</b> 10 Chương Dương Độ, Hoàn Kiếm</div>
            <div><b>Showroom SL:</b> 105C Tô Hiệu, Sơn La</div>
            <div><b>Nhà máy SX:</b> KĐT Picenza, Chiềng An, Sơn La</div>
        </div>
    </div>
    <div class="receipt-title">
        <h1>Phiếu Thu Tiền</h1>
        <div class="date">Ngày ${today} — Mã HĐ: ${c?.code || '...'}</div>
    </div>
    <div class="info">
        <div class="row"><span class="label">Người nộp tiền:</span><span class="value" contenteditable="true">${c?.customer?.name || '...'}</span></div>
        <div class="row"><span class="label">Hợp đồng:</span><span class="value">${c?.code || ''} — ${c?.name || ''}</span></div>
        <div class="row"><span class="label">Dự án:</span><span class="value">${c?.project?.name || '—'}</span></div>
        <div class="row"><span class="label">Loại hợp đồng:</span><span class="value">${c?.type || ''}</span></div>
        <div class="row"><span class="label">Đợt thanh toán:</span><span class="value">${payment.phase}</span></div>
        <div class="row"><span class="label">Tỷ lệ:</span><span class="value">${pct}% giá trị HĐ</span></div>
        <div class="row"><span class="label">Giá trị đợt:</span><span class="value">${fmt(payment.amount)}</span></div>
        <div class="row"><span class="label">Lý do thu:</span><span class="value" contenteditable="true">Thanh toán đợt "${payment.phase}" theo hợp đồng ${c?.code || ''}</span></div>
    </div>
    <div class="amount-box">
        <div class="label">SỐ TIỀN THU</div>
        <div class="value">${amountText}</div>
    </div>
    ${payment.proofUrl ? `<div style="text-align:center;margin:10px 0"><div style="font-size:10px;color:#888;margin-bottom:4px">Ảnh xác nhận chuyển khoản:</div><img class="proof-img" src="${payment.proofUrl}" /></div>` : ''}
    <div class="sign-area">
        <div><div class="role">Người nộp tiền</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
        <div><div class="role">Người thu tiền</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
    </div>
    <div class="footer-note">MỘT NHÀ DESIGN & BUILD — motnha.vn — 0944 886 989</div>
</div>`).join('')}
</body></html>`);
        w.document.close();
    };

    // === Thêm giao dịch thu chi khác ===
    const handleSubmitTx = async () => {
        await fetch('/api/finance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...txForm, amount: Number(txForm.amount), date: new Date(txForm.date) }),
        });
        setShowTxModal(false);
        setTxForm({ type: 'Thu', description: '', amount: 0, category: '', date: new Date().toISOString().split('T')[0] });
        fetchAll();
    };

    // === Filter receivables ===
    const projects = [...new Set(receivables.payments.map(p => p.contract?.project?.name).filter(Boolean))];
    const filteredPayments = receivables.payments.filter(p => {
        if (filterProject && p.contract?.project?.name !== filterProject) return false;
        if (filterStatus && p.status !== filterStatus) return false;
        return true;
    });

    const TABS = [
        { key: 'overview', label: '📊 Tổng quan', icon: '' },
        { key: 'receivables', label: '📈 Công nợ phải thu', icon: '' },
        { key: 'payables', label: '📉 Công nợ phải trả', icon: '' },
        { key: 'transactions', label: '💳 Thu chi khác', icon: '' },
    ];

    return (
        <div>
            {/* KPI Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--status-success)' }}>{fmt(summary.totalReceived)}</div>
                        <div className="stat-label">Đã thu từ HĐ</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🔴</div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--status-danger)' }}>{fmt(summary.receivableOutstanding)}</div>
                        <div className="stat-label">Công nợ phải thu</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">�</div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--status-warning)' }}>{fmt(summary.totalExpensePaid)}</div>
                        <div className="stat-label">Đã chi (DA+CT)</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">�📉</div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--status-warning)' }}>{fmt(summary.payableOutstanding)}</div>
                        <div className="stat-label">Công nợ nhà thầu</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💵</div>
                    <div>
                        <div className="stat-value" style={{ color: (summary.netCashflow || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmt(summary.netCashflow)}</div>
                        <div className="stat-label">Dòng tiền ròng</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <div className="tab-bar">
                        {TABS.map(t => (
                            <button key={t.key} className={`tab-item ${activeTab === t.key ? 'active' : ''}`}
                                onClick={() => setActiveTab(t.key)}>{t.label}</button>
                        ))}
                    </div>
                    {activeTab === 'transactions' && (
                        <button className="btn btn-primary" onClick={() => setShowTxModal(true)}>+ Thêm giao dịch</button>
                    )}
                </div>

                {/* TAB: Tổng quan */}
                {activeTab === 'overview' && (
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            {/* Phải thu */}
                            <div className="card" style={{ border: '1px solid var(--border)' }}>
                                <div className="card-header"><h3>📈 Công nợ phải thu</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Tổng phải thu</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalReceivable)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Đã thu</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalReceived)}</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}>
                                        <div className="progress-fill" style={{ width: `${summary.totalReceivable > 0 ? Math.round((summary.totalReceived || 0) / summary.totalReceivable * 100) : 0}%` }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--status-danger)' }}>
                                        <span>Còn phải thu</span><span>{fmt(summary.receivableOutstanding)}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Phải trả */}
                            <div className="card" style={{ border: '1px solid var(--border)' }}>
                                <div className="card-header"><h3>📉 Công nợ nhà thầu</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Tổng phải trả</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalPayable)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Đã trả</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalPaid)}</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}>
                                        <div className="progress-fill" style={{ width: `${summary.totalPayable > 0 ? Math.round((summary.totalPaid || 0) / summary.totalPayable * 100) : 0}%`, background: 'var(--status-warning)' }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--status-warning)' }}>
                                        <span>Còn phải trả</span><span>{fmt(summary.payableOutstanding)}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Chi phí dự án + công ty */}
                            <div className="card" style={{ border: '1px solid var(--border)' }}>
                                <div className="card-header"><h3>💸 Chi phí (DA + Công ty)</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Tổng phải chi</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalExpenseApproved)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Đã chi</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalExpensePaid)}</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}>
                                        <div className="progress-fill" style={{ width: `${summary.totalExpenseApproved > 0 ? Math.round((summary.totalExpensePaid || 0) / summary.totalExpenseApproved * 100) : 0}%`, background: 'var(--status-danger)' }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                                        <span>Chờ duyệt</span><span style={{ fontWeight: 600, color: 'var(--status-warning)' }}>{fmt(summary.totalExpensePending)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Thu chi khác */}
                        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                                <span>Thu khác</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.manualIncome)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                                <span>Chi khác</span><span style={{ fontWeight: 700, color: 'var(--status-danger)' }}>{fmt(summary.manualExpense)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: Công nợ phải thu */}
                {activeTab === 'receivables' && (
                    <>
                        <div className="filter-bar" style={{ padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                            <select className="form-select" style={{ width: 200 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                                <option value="">Tất cả dự án</option>
                                {projects.map(p => <option key={p}>{p}</option>)}
                            </select>
                            <select className="form-select" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="">Tất cả TT</option>
                                <option>Chưa thu</option>
                                <option>Thu một phần</option>
                                <option>Đã thu</option>
                            </select>
                            <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
                                {filteredPayments.length} đợt • Tổng: {fmt(filteredPayments.reduce((s, p) => s + (p.amount || 0), 0))}
                                • Đã thu: {fmt(filteredPayments.reduce((s, p) => s + (p.paidAmount || 0), 0))}
                            </div>
                        </div>
                        {loading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : filteredPayments.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có đợt thanh toán nào</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead><tr>
                                        <th>Dự án</th>
                                        <th>Hợp đồng</th>
                                        <th>Loại HĐ</th>
                                        <th>Đợt thanh toán</th>
                                        <th>Giá trị</th>
                                        <th>Đã thu</th>
                                        <th>Còn lại</th>
                                        <th>Trạng thái</th>
                                        <th>Thao tác</th>
                                    </tr></thead>
                                    <tbody>
                                        {filteredPayments.map(p => {
                                            const remaining = (p.amount || 0) - (p.paidAmount || 0);
                                            return (
                                                <tr key={p.id} style={{ opacity: p.status === 'Đã thu' ? 0.6 : 1 }}>
                                                    <td style={{ fontSize: 12 }}>{p.contract?.project?.name || '—'}</td>
                                                    <td>
                                                        <a href={`/contracts/${p.contractId}`} className="accent" style={{ fontWeight: 600 }}>{p.contract?.code}</a>
                                                    </td>
                                                    <td><span className="badge info" style={{ fontSize: 10 }}>{p.contract?.type}</span></td>
                                                    <td style={{ fontWeight: 600 }}>{p.phase}</td>
                                                    <td className="amount">{fmt(p.amount)}</td>
                                                    <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(p.paidAmount)}</td>
                                                    <td style={{ color: remaining > 0 ? 'var(--status-danger)' : 'var(--text-muted)', fontWeight: 600 }}>{fmt(remaining)}</td>
                                                    <td>
                                                        <span className={`badge ${p.status === 'Đã thu' ? 'success' : p.status === 'Thu một phần' ? 'warning' : 'muted'}`}>{p.status}</span>
                                                        {p.proofUrl && (
                                                            <a href={p.proofUrl} target="_blank" rel="noreferrer" title="Xem ảnh xác nhận" style={{ marginLeft: 4 }}>📸</a>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            {p.status !== 'Đã thu' && (
                                                                <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}
                                                                    onClick={() => startCollect(p)}>💵 Thu tiền</button>
                                                            )}
                                                            {(p.paidAmount || 0) > 0 && (
                                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                                                                    onClick={() => printReceipt(p)}>🧾 Phiếu thu</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* TAB: Công nợ phải trả */}
                {activeTab === 'payables' && (
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            {/* Công nợ nhà thầu */}
                            <div className="card" style={{ border: '1px solid var(--border)' }}>
                                <div className="card-header"><h3>👷 Công nợ nhà thầu</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Tổng HĐ thầu phụ</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalPayable)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Đã trả</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalPaid)}</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}>
                                        <div className="progress-fill" style={{ width: `${summary.totalPayable > 0 ? Math.round((summary.totalPaid || 0) / summary.totalPayable * 100) : 0}%`, background: 'var(--status-warning)' }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--status-warning)' }}>
                                        <span>Còn nợ</span><span>{fmt(summary.payableOutstanding)}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Chi phí dự án + công ty */}
                            <div className="card" style={{ border: '1px solid var(--border)' }}>
                                <div className="card-header"><h3>💸 Chi phí dự án + Công ty</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Tổng chi đã duyệt</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalExpenseApproved)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Đã chi</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalExpensePaid)}</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}>
                                        <div className="progress-fill" style={{ width: `${summary.totalExpenseApproved > 0 ? Math.round((summary.totalExpensePaid || 0) / summary.totalExpenseApproved * 100) : 0}%`, background: 'var(--status-danger)' }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Chờ duyệt</span><span style={{ fontWeight: 600, color: 'var(--status-warning)' }}>{fmt(summary.totalExpensePending)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: 16, textAlign: 'center' }}>
                            <a href="/expenses" style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: 13 }}>📋 Xem chi tiết chi phí →</a>
                        </div>
                    </div>
                )}

                {/* TAB: Thu chi khác */}
                {activeTab === 'transactions' && (
                    <>
                        <div className="filter-bar" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                            <select className="form-select" style={{ width: 140 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="">Tất cả</option>
                                <option>Thu</option>
                                <option>Chi</option>
                            </select>
                        </div>
                        {loading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : (
                            <table className="data-table" style={{ margin: 0 }}>
                                <thead><tr>
                                    <th>Mã GD</th><th>Loại</th><th>Mô tả</th><th>Số tiền</th><th>Danh mục</th><th>Dự án</th><th>Ngày</th>
                                </tr></thead>
                                <tbody>
                                    {transactions
                                        .filter(t => !filterType || t.type === filterType)
                                        .map(t => (
                                            <tr key={t.id}>
                                                <td className="accent">{t.code}</td>
                                                <td><span className={`badge ${t.type === 'Thu' ? 'success' : 'danger'}`}>{t.type}</span></td>
                                                <td>{t.description}</td>
                                                <td style={{ fontWeight: 600, color: t.type === 'Thu' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                                    {t.type === 'Thu' ? '+' : '-'}{fmt(t.amount)}
                                                </td>
                                                <td><span className="badge muted">{t.category}</span></td>
                                                <td>{t.project?.name || '—'}</td>
                                                <td>{fmtDate(t.date)}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        )}
                    </>
                )}
            </div>

            {/* Modal: Xác nhận thu tiền (BẮT BUỘC upload proof) */}
            {confirmModal && (
                <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>💵 Xác nhận thu tiền</h3>
                            <button className="modal-close" onClick={() => setConfirmModal(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>HĐ:</span>
                                    <span style={{ fontWeight: 600 }}>{confirmModal.payment.contract?.code} — {confirmModal.payment.contract?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Đợt:</span>
                                    <span style={{ fontWeight: 600 }}>{confirmModal.payment.phase}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Giá trị đợt:</span>
                                    <span style={{ fontWeight: 700 }}>{fmt(confirmModal.payment.amount)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Đã thu:</span>
                                    <span style={{ fontWeight: 600, color: 'var(--status-success)' }}>{fmt(confirmModal.payment.paidAmount)}</span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Số tiền thu lần này *</label>
                                <input className="form-input" type="number" value={confirmModal.amount}
                                    onChange={e => setConfirmModal(prev => ({ ...prev, amount: e.target.value }))} />
                                {confirmModal.amount > 0 && (
                                    <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>{fmt(confirmModal.amount)}</div>
                                )}
                            </div>

                            <div className="form-group" style={{ marginTop: 14 }}>
                                <label className="form-label">📸 Ảnh chuyển khoản / Chữ ký KH * <span style={{ color: 'var(--status-danger)' }}>(Bắt buộc)</span></label>
                                {confirmModal.file ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--status-success)' }}>
                                        <img src={URL.createObjectURL(confirmModal.file)} alt="proof"
                                            style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{confirmModal.file.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--status-success)' }}>✅ Đã chọn file</div>
                                        </div>
                                        <button className="btn btn-ghost" style={{ fontSize: 11 }}
                                            onClick={() => setConfirmModal(prev => ({ ...prev, file: null }))}>Đổi</button>
                                    </div>
                                ) : (
                                    <div onClick={() => proofRef.current?.click()}
                                        style={{ padding: 20, border: '2px dashed var(--status-danger)', borderRadius: 8, textAlign: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: 28 }}>📸</div>
                                        <div style={{ fontSize: 12, marginTop: 6 }}>Bấm để chọn ảnh chuyển khoản hoặc chữ ký</div>
                                        <div style={{ fontSize: 11, color: 'var(--status-danger)', marginTop: 4 }}>⚠️ Bắt buộc upload để xác nhận thanh toán</div>
                                    </div>
                                )}
                                <input ref={proofRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProofUpload} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setConfirmModal(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={confirmCollect} disabled={uploading || !confirmModal.file}>
                                {uploading ? '⏳ Đang xử lý...' : '✅ Xác nhận thu tiền'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Thêm giao dịch thủ công */}
            {showTxModal && (
                <div className="modal-overlay" onClick={() => setShowTxModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Thêm giao dịch</h3><button className="modal-close" onClick={() => setShowTxModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Loại</label>
                                    <select className="form-select" value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })}>
                                        <option>Thu</option><option>Chi</option>
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Số tiền</label>
                                    <input className="form-input" type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Mô tả</label>
                                <input className="form-input" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Danh mục</label>
                                    <input className="form-input" value={txForm.category} onChange={e => setTxForm({ ...txForm, category: e.target.value })} />
                                </div>
                                <div className="form-group"><label className="form-label">Ngày</label>
                                    <input className="form-input" type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowTxModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmitTx}>Lưu</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
