'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const SignaturePad = dynamic(() => import('@/components/ui/SignaturePad'), { ssr: false });

const BRAND = {
    blue: '#234093',
    gold: '#DBB35E',
    grey: '#C6C6C6',
    dark: '#1a1a2e',
    white: '#ffffff',
    textDark: '#1e293b',
    textMid: '#475569',
    textLight: '#94a3b8',
};

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const STATUS_COLORS = {
    'Chờ ký': { bg: '#fef3c7', text: '#92400e', icon: '⏳' },
    'Đã ký': { bg: '#dcfce7', text: '#166534', icon: '✅' },
    'Đang thi công': { bg: '#dbeafe', text: '#1e40af', icon: '🏗️' },
    'Hoàn thành': { bg: '#d1fae5', text: '#065f46', icon: '🎉' },
    'Hủy': { bg: '#fee2e2', text: '#991b1b', icon: '❌' },
};

const PAYMENT_STATUS_COLORS = {
    'Chưa thu': { bg: '#fef3c7', text: '#92400e' },
    'Đã thu': { bg: '#dcfce7', text: '#166534' },
    'Quá hạn': { bg: '#fee2e2', text: '#991b1b' },
    'Thu một phần': { bg: '#dbeafe', text: '#1e40af' },
};

export default function PublicContractPage() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [acceptModal, setAcceptModal] = useState(false);
    const [acceptForm, setAcceptForm] = useState({ customerName: '', notes: '' });
    const [accepting, setAccepting] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [signatureData, setSignatureData] = useState(null);

    const handleAccept = async () => {
        if (!acceptForm.customerName.trim()) return alert('Vui lòng nhập tên xác nhận');
        if (!signatureData) return alert('Vui lòng vẽ chữ ký');
        setAccepting(true);
        const res = await fetch(`/api/public/contracts/${id}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...acceptForm, signatureData }),
        });
        setAccepting(false);
        if (res.ok) { setAccepted(true); setAcceptModal(false); }
        else { const d = await res.json(); alert(d.error || 'Lỗi hệ thống'); }
    };

    useEffect(() => {
        fetch(`/api/public/contracts/${id}`)
            .then(r => {
                if (!r.ok) throw new Error('Không tìm thấy hợp đồng');
                return r.json();
            })
            .then(d => {
                setData(d);
                document.title = `Hợp đồng ${d.code} - ${d.customer?.name || ''} | Một Nhà`;
            })
            .catch(e => setError(e.message));
    }, [id]);

    if (error) return (
        <div style={{ padding: 60, textAlign: 'center', fontFamily: 'Montserrat, sans-serif' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: BRAND.blue, marginBottom: 8 }}>Hợp đồng không tồn tại</div>
            <div style={{ fontSize: 13, color: BRAND.textMid }}>Vui lòng liên hệ Một Nhà để được hỗ trợ</div>
            <div style={{ marginTop: 20, fontSize: 12, color: BRAND.gold, fontWeight: 600 }}>Hotline: (+84) 948 869 89 | www.motnha.vn</div>
        </div>
    );

    if (!data) return (
        <div style={{ padding: 60, textAlign: 'center', fontFamily: 'Montserrat, sans-serif', color: BRAND.blue }}>
            <div style={{ width: 40, height: 40, border: `3px solid ${BRAND.blue}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            Đang tải hợp đồng...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    const c = data;
    const st = STATUS_COLORS[c.status] || STATUS_COLORS['Chờ ký'];
    const dateStr = fmtDate(c.createdAt);
    const totalPaid = c.payments?.reduce((s, p) => s + (p.paidAmount || 0), 0) || 0;
    const remaining = (c.contractValue || 0) - totalPaid;
    const paidPercent = c.contractValue > 0 ? Math.round((totalPaid / c.contractValue) * 100) : 0;
    const canSign = !accepted && !['Đã ký', 'Đang thi công', 'Hoàn thành', 'Hủy', 'Nháp'].includes(c.status);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { background: #e8ecf1 !important; font-family: 'Montserrat', sans-serif; color: ${BRAND.textDark}; }
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .pdf-page { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; border-radius: 0 !important; }
                    @page { size: A4 portrait; margin: 10mm; }
                }
                .pdf-page { max-width: 900px; margin: 20px auto 40px; background: #fff; box-shadow: 0 4px 40px rgba(0,0,0,0.12); border-radius: 4px; position: relative; overflow: hidden; }
                .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 120px; font-weight: 900; color: ${BRAND.blue}; opacity: 0.025; pointer-events: none; white-space: nowrap; letter-spacing: 20px; z-index: 0; }
            `}</style>

            {/* Toolbar */}
            <div className="no-print" style={{ background: BRAND.blue, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src="https://pub-1e1be66737b446708af785e6cc8fe673.r2.dev/assets/motnha-header.jpg" alt="Một Nhà" style={{ height: 28, width: 'auto' }} />
                    <span style={{ color: BRAND.gold, fontSize: 11, fontWeight: 500 }}>— Hợp đồng {c.code}</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {accepted ? (
                        <span style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>✅ Đã ký hợp đồng</span>
                    ) : canSign && (
                        <button onClick={() => setAcceptModal(true)} style={{ padding: '8px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Montserrat' }}>
                            ✍️ Ký hợp đồng
                        </button>
                    )}
                    <button onClick={() => window.print()} style={{ padding: '8px 24px', background: BRAND.gold, color: BRAND.blue, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Montserrat' }}>
                        🖨️ In / Tải PDF
                    </button>
                </div>
            </div>

            <div className="pdf-page">
                <div className="watermark">MỘT NHÀ</div>

                {/* HEADER */}
                <div style={{ width: '100%', lineHeight: 0 }}>
                    <img src="https://pub-1e1be66737b446708af785e6cc8fe673.r2.dev/assets/motnha-header.jpg" alt="Một Nhà" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>

                {/* Title + Status */}
                <div style={{ padding: '20px 38px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: BRAND.blue, letterSpacing: 1 }}>HỢP ĐỒNG {(c.type || '').toUpperCase()}</div>
                        <div style={{ fontSize: 11, color: BRAND.textMid, marginTop: 4 }}>
                            Mã: <strong style={{ color: BRAND.blue }}>{c.code}</strong> &nbsp;|&nbsp; Ngày lập: <strong>{dateStr}</strong>
                            {c.signDate && <> &nbsp;|&nbsp; Ngày ký: <strong>{fmtDate(c.signDate)}</strong></>}
                        </div>
                    </div>
                    <div style={{ padding: '6px 16px', background: st.bg, color: st.text, borderRadius: 20, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {st.icon} {c.status}
                    </div>
                </div>

                <div style={{ padding: '16px 38px 28px' }}>
                    {/* INFO ROW */}
                    <div style={{ display: 'flex', border: `1px solid #e2e8f0`, borderRadius: 6, overflow: 'hidden', margin: '16px 0' }}>
                        <div style={{ padding: '14px 20px', flex: 1 }}>
                            <div style={{ fontSize: 8, fontWeight: 700, color: BRAND.blue, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>Khách hàng</div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{c.customer?.name}</div>
                            <div style={{ fontSize: 11, color: BRAND.textMid, lineHeight: 1.8 }}>
                                {c.customer?.phone && <>SĐT: {c.customer.phone}<br /></>}
                                {c.customer?.email && <>Email: {c.customer.email}<br /></>}
                                {c.customer?.address && <>Địa chỉ: {c.customer.address}</>}
                            </div>
                        </div>
                        <div style={{ padding: '14px 20px', flex: 1, borderLeft: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: 8, fontWeight: 700, color: BRAND.blue, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>Công trình / Dự án</div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{c.project?.name || '—'}</div>
                            <div style={{ fontSize: 11, color: BRAND.textMid, lineHeight: 1.8 }}>
                                {c.project?.address && <>Địa điểm: {c.project.address}<br /></>}
                                {c.project?.code && <>Mã dự án: {c.project.code}<br /></>}
                                <span style={{ color: BRAND.gold, fontWeight: 600 }}>Loại HĐ: {c.type || 'Thi công'}</span>
                            </div>
                        </div>
                        {c.quotation && (
                            <div style={{ padding: '14px 20px', flex: 1, borderLeft: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 8, fontWeight: 700, color: BRAND.blue, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>Báo giá liên kết</div>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>{c.quotation.code}</div>
                                <div style={{ fontSize: 11, color: BRAND.textMid, lineHeight: 1.8 }}>
                                    Loại: {c.quotation.type || '—'}<br />
                                    Giá trị: <strong style={{ color: BRAND.blue }}>{fmt(c.quotation.grandTotal)}</strong>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CONTRACT VALUE */}
                    <div style={{ background: `${BRAND.blue}08`, border: `1px solid ${BRAND.blue}22`, borderRadius: 8, padding: '20px 24px', margin: '20px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.blue, textTransform: 'uppercase', letterSpacing: 1 }}>Giá trị hợp đồng</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: BRAND.blue }}>{fmt(c.contractValue)}</div>
                        </div>
                        {c.variationAmount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: BRAND.textMid, marginBottom: 6 }}>
                                <span>Phát sinh</span><span style={{ fontWeight: 700, color: '#dc2626' }}>+{fmt(c.variationAmount)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: BRAND.textMid, marginBottom: 4 }}>
                            <span>Đã thanh toán</span><span style={{ fontWeight: 700, color: '#16a34a' }}>{fmt(totalPaid)} ({paidPercent}%)</span>
                        </div>
                        <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', margin: '6px 0 8px' }}>
                            <div style={{ width: `${paidPercent}%`, height: '100%', background: `linear-gradient(90deg, ${BRAND.blue}, ${BRAND.gold})`, borderRadius: 4, transition: 'width 0.6s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: BRAND.textMid }}>Còn lại</span><span style={{ fontWeight: 800, color: BRAND.blue }}>{fmt(remaining)}</span>
                        </div>
                    </div>

                    {/* CONTRACT BODY - Rich text content */}
                    {c.contractBody && (
                        <div style={{ margin: '24px 0', padding: '20px 0', borderTop: `1px solid ${BRAND.grey}`, borderBottom: `1px solid ${BRAND.grey}` }}>
                            <div style={{ fontSize: 14, lineHeight: 1.8, fontFamily: "'Times New Roman', serif", color: BRAND.textDark }}
                                dangerouslySetInnerHTML={{ __html: c.contractBody }} />
                        </div>
                    )}

                    {/* TIMELINE */}
                    {(c.startDate || c.endDate) && (
                        <div style={{ display: 'flex', gap: 16, margin: '16px 0' }}>
                            {c.startDate && (
                                <div style={{ flex: 1, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 1 }}>Ngày bắt đầu</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginTop: 4 }}>{fmtDate(c.startDate)}</div>
                                </div>
                            )}
                            {c.endDate && (
                                <div style={{ flex: 1, padding: '12px 16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6 }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 1 }}>Ngày kết thúc</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginTop: 4 }}>{fmtDate(c.endDate)}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PAYMENT SCHEDULE */}
                    {c.payments && c.payments.length > 0 && (
                        <div style={{ margin: '24px 0' }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: BRAND.blue, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>📋 Lịch thanh toán</div>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, border: `1px solid ${BRAND.grey}`, borderRadius: 8, overflow: 'hidden' }}>
                                <thead>
                                    <tr>
                                        <th style={{ background: BRAND.blue, color: '#fff', padding: '8px 10px', fontWeight: 700, fontSize: 10, textAlign: 'left' }}>Đợt</th>
                                        <th style={{ background: BRAND.blue, color: '#fff', padding: '8px 10px', fontWeight: 700, fontSize: 10, textAlign: 'right' }}>Giá trị</th>
                                        <th style={{ background: BRAND.blue, color: '#fff', padding: '8px 10px', fontWeight: 700, fontSize: 10, textAlign: 'right' }}>Đã thu</th>
                                        <th style={{ background: BRAND.blue, color: '#fff', padding: '8px 10px', fontWeight: 700, fontSize: 10, textAlign: 'center' }}>Hạn</th>
                                        <th style={{ background: BRAND.blue, color: '#fff', padding: '8px 10px', fontWeight: 700, fontSize: 10, textAlign: 'center' }}>Trạng thái</th>
                                        {c.payments.some(p => p.notes) && <th style={{ background: BRAND.blue, color: '#fff', padding: '8px 10px', fontWeight: 700, fontSize: 10, textAlign: 'left' }}>Ghi chú</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {c.payments.map((p, i) => {
                                        const ps = PAYMENT_STATUS_COLORS[p.status] || PAYMENT_STATUS_COLORS['Chưa thu'];
                                        return (
                                            <tr key={p.id} style={{ background: i % 2 === 1 ? '#fafbfc' : '#fff' }}>
                                                <td style={{ padding: '8px 10px', fontWeight: 600, borderBottom: `1px solid ${BRAND.grey}` }}>{p.phase}</td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: BRAND.blue, borderBottom: `1px solid ${BRAND.grey}` }}>{fmt(p.amount)}</td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#16a34a', borderBottom: `1px solid ${BRAND.grey}` }}>{fmt(p.paidAmount)}</td>
                                                <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${BRAND.grey}` }}>{fmtDate(p.dueDate)}</td>
                                                <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${BRAND.grey}` }}>
                                                    <span style={{ padding: '3px 10px', background: ps.bg, color: ps.text, borderRadius: 12, fontSize: 10, fontWeight: 700 }}>{p.status}</span>
                                                </td>
                                                {c.payments.some(pp => pp.notes) && <td style={{ padding: '8px 10px', fontSize: 10, color: BRAND.textMid, borderBottom: `1px solid ${BRAND.grey}` }}>{p.notes}</td>}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ADDENDA */}
                    {c.addenda && c.addenda.length > 0 && (
                        <div style={{ margin: '24px 0' }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: BRAND.blue, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>📎 Phụ lục hợp đồng</div>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, border: `1px solid ${BRAND.grey}`, borderRadius: 8, overflow: 'hidden' }}>
                                <thead>
                                    <tr>
                                        <th style={{ background: BRAND.gold, color: '#fff', padding: '8px 10px', fontWeight: 700, fontSize: 10, textAlign: 'left' }}>Mã</th>
                                        <th style={{ background: BRAND.gold, color: '#fff', padding: '8px 10px', fontWeight: 700, fontSize: 10, textAlign: 'left' }}>Tiêu đề</th>
                                        <th style={{ background: BRAND.gold, color: '#fff', padding: '8px 10px', fontWeight: 700, fontSize: 10, textAlign: 'right' }}>Giá trị</th>
                                        <th style={{ background: BRAND.gold, color: '#fff', padding: '8px 10px', fontWeight: 700, fontSize: 10, textAlign: 'center' }}>Ngày ký</th>
                                        <th style={{ background: BRAND.gold, color: '#fff', padding: '8px 10px', fontWeight: 700, fontSize: 10, textAlign: 'center' }}>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {c.addenda.map((a, i) => (
                                        <tr key={a.id} style={{ background: i % 2 === 1 ? '#fafbfc' : '#fff' }}>
                                            <td style={{ padding: '8px 10px', fontWeight: 600, borderBottom: `1px solid ${BRAND.grey}` }}>{a.code}</td>
                                            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${BRAND.grey}` }}>{a.title}</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: BRAND.blue, borderBottom: `1px solid ${BRAND.grey}` }}>{fmt(a.amount)}</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${BRAND.grey}` }}>{fmtDate(a.signDate)}</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${BRAND.grey}` }}>
                                                <span style={{ padding: '3px 10px', background: a.status === 'Đã ký' ? '#dcfce7' : '#fef3c7', color: a.status === 'Đã ký' ? '#166534' : '#92400e', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>{a.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* PAYMENT TERMS / NOTES */}
                    {c.paymentTerms && (
                        <div style={{ margin: '16px 0', border: `1px solid ${BRAND.gold}66`, borderLeft: `3px solid ${BRAND.gold}`, padding: '10px 14px', fontSize: 11, color: BRAND.textMid, background: `${BRAND.gold}08`, whiteSpace: 'pre-wrap' }}>
                            📝 <strong>Điều khoản thanh toán:</strong><br />{c.paymentTerms}
                        </div>
                    )}
                    {c.notes && (
                        <div style={{ margin: '16px 0', border: `1px solid ${BRAND.blue}33`, borderLeft: `3px solid ${BRAND.blue}`, padding: '10px 14px', fontSize: 11, color: BRAND.textMid, background: `${BRAND.blue}08`, whiteSpace: 'pre-wrap' }}>
                            📌 <strong>Ghi chú:</strong><br />{c.notes}
                        </div>
                    )}

                    {/* SIGNATURE */}
                    <div style={{ marginTop: 24, paddingTop: 16, borderTop: `2px solid ${BRAND.blue}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginBottom: 28 }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: 700, fontSize: 11, color: BRAND.blue, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Đại diện<br />Khách hàng</div>
                                {(c.signatureData || signatureData) ? (
                                    <>
                                        <img src={c.signatureData || signatureData} alt="Chữ ký" style={{ maxWidth: 200, height: 'auto', margin: '0 auto 6px', display: 'block' }} />
                                        <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.textDark }}>{c.signedByName || acceptForm.customerName}</div>
                                        {c.signedAt && <div style={{ fontSize: 9, color: BRAND.textLight }}>{new Date(c.signedAt).toLocaleString('vi-VN')}</div>}
                                    </>
                                ) : (
                                    <>
                                        <div style={{ height: 55 }} />
                                        <div style={{ borderTop: `1px solid ${BRAND.grey}`, paddingTop: 6, fontSize: 9, color: BRAND.textLight, fontStyle: 'italic' }}>(Ký, ghi rõ họ tên)</div>
                                    </>
                                )}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: 700, fontSize: 11, color: BRAND.blue, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Đại diện<br />Một Nhà</div>
                                <div style={{ height: 55 }} />
                                <div style={{ borderTop: `1px solid ${BRAND.grey}`, paddingTop: 6, fontSize: 9, color: BRAND.textLight, fontStyle: 'italic' }}>(Ký tên, đóng dấu)</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BRAND STRIP */}
                <div style={{ background: BRAND.blue, padding: '12px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>
                        <strong style={{ color: BRAND.gold }}>MỘT NHÀ</strong> — Nhà ở trọn gói / Nội thất thông minh &nbsp;|&nbsp;
                        Hotline: <strong style={{ color: BRAND.gold }}>(+84) 948 869 89</strong> &nbsp;|&nbsp; www.motnha.vn
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{c.code} — {dateStr}</div>
                </div>
            </div>

            {/* Accept Modal with SignaturePad */}
            {acceptModal && (
                <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 520, width: '100%', fontFamily: 'Montserrat, sans-serif', maxHeight: '90vh', overflow: 'auto' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: BRAND.blue, marginBottom: 8 }}>✒️ Ký xác nhận hợp đồng</div>
                        <div style={{ fontSize: 13, color: BRAND.textMid, marginBottom: 20 }}>Hợp đồng <strong>{c.code}</strong> — {fmt(c.contractValue)}</div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: BRAND.blue, display: 'block', marginBottom: 4 }}>Họ tên xác nhận *</label>
                            <input value={acceptForm.customerName} onChange={e => setAcceptForm(f => ({ ...f, customerName: e.target.value }))}
                                placeholder="Nhập tên của bạn" style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${BRAND.grey}`, borderRadius: 6, fontSize: 13, fontFamily: 'Montserrat' }} />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: BRAND.blue, display: 'block', marginBottom: 6 }}>✒️ Chữ ký *</label>
                            <SignaturePad
                                width={460}
                                height={180}
                                onSave={(data) => setSignatureData(data)}
                            />
                            {signatureData && <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 6 }}>✅ Đã ký</div>}
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: BRAND.blue, display: 'block', marginBottom: 4 }}>Ghi chú</label>
                            <textarea value={acceptForm.notes} onChange={e => setAcceptForm(f => ({ ...f, notes: e.target.value }))}
                                rows={2} placeholder="Ghi chú thêm (nếu có)..." style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${BRAND.grey}`, borderRadius: 6, fontSize: 13, fontFamily: 'Montserrat', resize: 'vertical' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={handleAccept} disabled={accepting || !signatureData}
                                style={{ flex: 1, padding: '12px 0', background: signatureData ? '#16a34a' : '#e2e8f0', color: signatureData ? '#fff' : '#94a3b8', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 800, cursor: signatureData ? 'pointer' : 'not-allowed' }}>
                                {accepting ? 'Đang gửi...' : '✒️ Xác nhận ký'}
                            </button>
                            <button onClick={() => { setAcceptModal(false); setSignatureData(null); }}
                                style={{ padding: '12px 20px', background: BRAND.grey, color: BRAND.dark, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
