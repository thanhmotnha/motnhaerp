'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

/* Brand colors */
const BRAND = { blue: '#234093', gold: '#DBB35E', grey: '#C6C6C6', textDark: '#1e293b', textMid: '#475569', textLight: '#94a3b8' };
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

function numberToWords(n) {
    if (!n || n === 0) return 'Không đồng';
    const u = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    function readGroup(num, leadZero) {
        const h = Math.floor(num / 100), t = Math.floor((num % 100) / 10), o = num % 10;
        let s = '';
        if (h) s += u[h] + ' trăm ';
        if (t === 0) { if (o) s += (h || leadZero ? 'lẻ ' : '') + u[o] + ' '; }
        else if (t === 1) { s += 'mười ' + (o === 5 ? 'lăm ' : o ? u[o] + ' ' : ''); }
        else { s += u[t] + ' mươi ' + (o === 1 ? 'mốt ' : o === 5 ? 'lăm ' : o ? u[o] + ' ' : ''); }
        return s;
    }
    const ty = Math.floor(n / 1e9), tr = Math.floor((n % 1e9) / 1e6), ng = Math.floor((n % 1e6) / 1e3), rem = n % 1e3;
    let r = '';
    if (ty) r += readGroup(ty, false) + 'tỷ ';
    if (tr) r += readGroup(tr, !!ty) + 'triệu ';
    if (ng) r += readGroup(ng, !!(ty || tr)) + 'nghìn ';
    if (rem) r += readGroup(rem, !!(ty || tr || ng));
    r = r.trim();
    return r.charAt(0).toUpperCase() + r.slice(1) + ' đồng';
}

const DOC_TITLE_MAP = {
    'Thiết kế': 'BÁO GIÁ THIẾT KẾ', 'Thiết kế kiến trúc': 'BÁO GIÁ THIẾT KẾ KIẾN TRÚC',
    'Thiết kế nội thất': 'BÁO GIÁ THIẾT KẾ NỘI THẤT', 'Thi công thô': 'BÁO GIÁ THI CÔNG THÔ',
    'Thi công hoàn thiện': 'BÁO GIÁ THI CÔNG HOÀN THIỆN', 'Nội thất': 'BÁO GIÁ NỘI THẤT',
    'Thi công nội thất': 'BÁO GIÁ NỘI THẤT',
};

export default function PublicQuotationPage() {
    const { token } = useParams();
    const [data, setData] = useState(null);

    useEffect(() => {
        fetch(`/api/public/quotations/${token}`)
            .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
            .then(d => {
                setData(d);
                document.title = `${d.code || 'Báo giá'} - ${d.customer?.name || ''} | Một Nhà`;
            })
            .catch(() => setData({ error: true }));
    }, [token]);

    if (!data) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontFamily: 'Montserrat, sans-serif' }}>
            <div style={{ textAlign: 'center', color: BRAND.blue }}>
                <div style={{ width: 40, height: 40, border: `3px solid ${BRAND.blue}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                Đang tải báo giá...
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );

    if (data.error) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontFamily: 'Montserrat, sans-serif' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>Báo giá không tồn tại</div>
                <div style={{ fontSize: 13, color: BRAND.textMid, marginTop: 4 }}>Link không hợp lệ hoặc đã hết hạn.</div>
            </div>
        </div>
    );

    const q = data;
    const docTitle = DOC_TITLE_MAP[q.type] || `BÁO GIÁ ${(q.type || '').toUpperCase()}`;
    const dateStr = new Date(q.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const validStr = q.validUntil ? new Date(q.validUntil).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;

    // Group categories
    const grouped = {};
    const groupOrder = [];
    (q.categories || []).forEach(cat => {
        const g = cat.group || cat.name || 'Hạng mục';
        if (!grouped[g]) { grouped[g] = []; groupOrder.push(g); }
        grouped[g].push(cat);
    });

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { background: #e8ecf1 !important; font-family: 'Montserrat', sans-serif; color: ${BRAND.textDark}; }
                .pub-page { max-width: 1100px; margin: 0 auto; background: #fff; box-shadow: 0 4px 40px rgba(0,0,0,0.12); position: relative; overflow: hidden; }
                .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 120px; font-weight: 900; color: ${BRAND.blue}; opacity: 0.025; pointer-events: none; white-space: nowrap; letter-spacing: 20px; z-index: 0; }
                .pub-header-img { width: 100%; display: block; max-height: 130px; overflow: hidden; position: relative; z-index: 1; }
                .pub-header-img img { width: 100%; height: auto; max-height: 130px; display: block; object-fit: cover; object-position: center; }
                .pub-doc-bar { display: flex; justify-content: flex-end; align-items: center; gap: 20px; padding: 6px 38px; font-size: 10px; font-style: italic; color: ${BRAND.textMid}; position: relative; z-index: 1; }
                .pub-doc-bar .code { font-weight: 700; color: ${BRAND.blue}; }
                .pub-content { padding: 0 38px 28px; position: relative; z-index: 1; }
                .pub-info-row { display: flex; align-items: stretch; margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
                .pub-info-cell { padding: 14px 20px; flex: 1; }
                .pub-info-cell + .pub-info-cell { border-left: 1px solid #e2e8f0; }
                .pub-info-label { font-size: 8px; font-weight: 700; color: ${BRAND.blue}; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
                .pub-info-name { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
                .pub-info-detail { font-size: 10px; color: ${BRAND.textMid}; line-height: 1.8; }
                .pub-cat-main { background: linear-gradient(135deg, ${BRAND.blue} 0%, #1a327a 100%); color: #fff; display: flex; align-items: stretch; border-radius: 8px 8px 0 0; overflow: hidden; }
                .pub-cat-label { background: ${BRAND.gold}; color: #fff; padding: 0 14px; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; min-width: 36px; }
                .pub-cat-block { flex: 1; padding: 10px 18px; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
                .pub-cat-subtitle { font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: ${BRAND.gold}; opacity: 0.9; }
                .pub-cat-name { font-weight: 900; font-size: 15px; letter-spacing: 1px; text-transform: uppercase; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,0.25); }
                .pub-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 10.5px; margin-bottom: 2px; border: 1px solid ${BRAND.grey}; border-top: none; border-radius: 0 0 6px 6px; overflow: hidden; }
                .pub-table th { background: #e8ecf4; color: ${BRAND.blue}; font-weight: 700; padding: 8px 6px; font-size: 9px; text-transform: uppercase; border-bottom: 2px solid ${BRAND.blue}30; white-space: nowrap; }
                .pub-table td { border-bottom: 1px solid ${BRAND.grey}; padding: 6px; vertical-align: middle; }
                .pub-table .r { text-align: right; } .pub-table .c { text-align: center; }
                .pub-table .amt { font-weight: 700; color: ${BRAND.blue}; }
                .pub-sub-total td { background: linear-gradient(135deg, ${BRAND.blue}0A 0%, ${BRAND.blue}15 100%); font-weight: 800; font-size: 11.5px; color: ${BRAND.blue}; border-top: 2px solid ${BRAND.gold}; padding: 9px 10px; }
                .pub-sum-wrap { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin: 20px 0; }
                .pub-sum-words { flex: 1; padding: 12px 16px; background: ${BRAND.blue}05; border: 1px solid ${BRAND.blue}20; border-left: 3px solid ${BRAND.blue}; border-radius: 6px; font-size: 10.5px; color: ${BRAND.textMid}; }
                .pub-sum-box { width: 310px; flex-shrink: 0; border: 1px solid ${BRAND.grey}; border-radius: 6px; overflow: hidden; }
                .pub-sum-row { display: flex; justify-content: space-between; padding: 7px 14px; font-size: 10.5px; font-weight: 500; border-bottom: 1px solid #f1f5f9; }
                .pub-sum-row.total { background: linear-gradient(135deg, ${BRAND.blue} 0%, #1a327a 100%); color: rgba(255,255,255,0.85); font-weight: 700; font-size: 11.5px; border: none; padding: 11px 14px; }
                .pub-sum-row.total span:last-child { color: ${BRAND.gold}; font-weight: 900; font-size: 13px; }
                .pub-sum-row.discount span:last-child { color: #dc2626; font-weight: 600; }
                .pub-notes { margin: 16px 0; border: 1px solid ${BRAND.gold}66; border-left: 3px solid ${BRAND.gold}; padding: 10px 14px; font-size: 11px; color: ${BRAND.textMid}; background: ${BRAND.gold}08; }
                .pub-footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid ${BRAND.blue}; }
                .pub-footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 28px; }
                .pub-validity { font-size: 10px; color: ${BRAND.textMid}; line-height: 1.9; }
                .pub-validity strong { color: ${BRAND.textDark}; font-weight: 700; }
                .pub-sign-area { text-align: center; }
                .pub-sign-title { font-weight: 700; font-size: 11px; color: ${BRAND.blue}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
                .pub-sign-space { height: 80px; display: flex; align-items: center; justify-content: center; }
                .pub-stamp { width: 72px; height: 72px; border-radius: 50%; border: 2px dashed ${BRAND.blue}40; display: flex; align-items: center; justify-content: center; font-size: 8px; color: ${BRAND.blue}40; font-style: italic; text-align: center; }
                .pub-sign-line { border-top: 1px solid ${BRAND.grey}; padding-top: 6px; font-size: 9px; color: ${BRAND.textLight}; font-style: italic; }
                .pub-brand-strip { background: ${BRAND.blue}; padding: 12px 36px; display: flex; justify-content: space-between; align-items: center; }
                .pub-brand-strip .left { font-size: 9px; color: rgba(255,255,255,0.7); } .pub-brand-strip strong { color: ${BRAND.gold}; font-weight: 700; }
                .pub-brand-strip .right { font-size: 9px; color: rgba(255,255,255,0.5); }
                .item-img { width: 44px; height: 44px; object-fit: cover; border-radius: 3px; border: 1px solid ${BRAND.grey}; display: block; }
                .no-img { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border: 1px dashed ${BRAND.grey}; border-radius: 3px; font-size: 12px; opacity: 0.3; }
                @media (max-width: 768px) {
                    .pub-page { margin: 0; border-radius: 0; }
                    .pub-content { padding: 0 16px 20px; }
                    .pub-info-row { flex-direction: column; }
                    .pub-info-cell + .pub-info-cell { border-left: none; border-top: 1px solid #e2e8f0; }
                    .pub-sum-wrap { flex-direction: column; }
                    .pub-sum-box { width: 100%; }
                    .pub-table { font-size: 9px; }
                    .pub-table th, .pub-table td { padding: 4px 3px; }
                    .pub-footer-grid { grid-template-columns: 1fr; gap: 20px; }
                    .pub-cat-name { font-size: 12px; }
                    .pub-doc-bar { padding: 6px 16px; }
                    .pub-header-img img { height: 70px; }
                }
                @media print {
                    body { background: white !important; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .pub-page { box-shadow: none !important; max-width: 100% !important; }
                    @page { size: A4 landscape; margin: 6mm 8mm; }
                    .pub-table tr { page-break-inside: avoid; break-inside: avoid; }
                    .pub-cat-main { page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; break-after: avoid; }
                    .pub-sub-total { page-break-inside: avoid; break-inside: avoid; }
                    .pub-footer { page-break-inside: avoid; break-inside: avoid; }
                    .pub-sum-wrap { page-break-inside: avoid; break-inside: avoid; }
                    .pub-info-row { page-break-inside: avoid; break-inside: avoid; }
                    thead { display: table-header-group; }
                }
            `}</style>

            <div className="pub-page">
                <div className="watermark">MỘT NHÀ</div>

                <div className="pub-header-img">
                    <img src="https://pub-1e1be66737b446708af785e6cc8fe673.r2.dev/assets/motnha-header.jpg" alt="Một Nhà" onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                </div>
                <div className="pub-doc-bar">
                    <span className="code">{q.code}</span>
                    <span>Ngày lập: <strong>{dateStr}</strong>{validStr && <> &nbsp;|&nbsp; Hiệu lực đến: <strong>{validStr}</strong></>}</span>
                </div>

                <div className="pub-content">
                    {/* Customer + Project */}
                    <div className="pub-info-row">
                        <div className="pub-info-cell">
                            <div className="pub-info-label">Khách hàng</div>
                            <div className="pub-info-name">{q.customer?.name}</div>
                            <div className="pub-info-detail">{q.customer?.phone && <>SĐT: {q.customer.phone}</>}</div>
                        </div>
                        <div className="pub-info-cell">
                            <div className="pub-info-label">Công trình / Dự án</div>
                            <div className="pub-info-name">{q.project?.name || '—'}</div>
                            <div className="pub-info-detail">
                                <span style={{ color: BRAND.gold, fontWeight: 600 }}>Hạng mục: {q.type || 'Thi công'}</span>
                            </div>
                        </div>
                        <div className="pub-info-cell" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'center' }}>
                            {[{ icon: '🏗️', text: 'Vật liệu chuẩn' }, { icon: '👁️', text: 'Giám sát 24/7' }, { icon: '📋', text: 'Không phát sinh' }, { icon: '🛡️', text: 'Bảo hành lâu dài' }].map((u, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: '9.5px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    <span style={{ fontSize: 14 }}>{u.icon}</span>{u.text}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Categories */}
                    {groupOrder.map((groupName, gi) => {
                        const subs = grouped[groupName];
                        return (
                            <div key={gi}>
                                {subs.map((cat, ci) => {
                                    const items = cat.items || [];
                                    const hasAnyImage = items.some(i => i.image);
                                    const hasAnyDim = items.some(i => i.length || i.width || i.height);
                                    const hasAnyVolDiff = items.some(i => {
                                        const v = Number(i.volume) || Number(i.quantity) || 0;
                                        const qty = Number(i.quantity) || 0;
                                        return v !== qty;
                                    });
                                    return (
                                        <div key={cat.id || ci}>
                                            <div className="pub-cat-main" style={{ marginTop: (gi > 0 || ci > 0) ? 18 : 0 }}>
                                                <div className="pub-cat-label">#{gi + 1}.{ci + 1}</div>
                                                <div className="pub-cat-block">
                                                    <div className="pub-cat-subtitle">{(groupName || q.type || '').toUpperCase()}</div>
                                                    <div className="pub-cat-name">{cat.name || `Khu vực ${ci + 1}`}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <table className="pub-table">
                                                        <thead><tr>
                                                            <th className="c" style={{ width: 28 }}>STT</th>
                                                            {hasAnyImage && <th className="c" style={{ width: 52 }}>Ảnh</th>}
                                                            <th>Hạng mục / Sản phẩm</th>
                                                            <th className="c" style={{ width: 38 }}>ĐVT</th>
                                                            {hasAnyDim && <th className="r" style={{ width: 36 }}>Dài</th>}
                                                            {hasAnyDim && <th className="r" style={{ width: 36 }}>Rộng</th>}
                                                            {hasAnyDim && <th className="r" style={{ width: 36 }}>Cao</th>}
                                                            <th className="r" style={{ width: 36 }}>SL</th>
                                                            {hasAnyVolDiff && <th className="r" style={{ width: 40 }}>KL</th>}
                                                            <th className="r" style={{ width: 80 }}>Đơn giá</th>
                                                            <th className="r" style={{ width: 88 }}>Thành tiền</th>
                                                        </tr></thead>
                                                        <tbody>
                                                            {items.map((item, ii) => (
                                                                <React.Fragment key={item.id || ii}>
                                                                    <tr style={{ background: ii % 2 === 1 ? '#fafbfc' : '#fff' }}>
                                                                        <td className="c" style={{ color: BRAND.textLight, fontSize: 9 }}>{ii + 1}</td>
                                                                        {hasAnyImage && <td className="c">{item.image ? <img src={item.image} className="item-img" alt="" /> : <div className="no-img">—</div>}</td>}
                                                                        <td>
                                                                            <div style={{ fontWeight: 600, fontSize: 11 }}>{item.name}</div>
                                                                            {item.description && <div style={{ fontSize: 9, color: BRAND.textMid, fontStyle: 'italic', marginTop: 2 }}>{item.description}</div>}
                                                                        </td>
                                                                        <td className="c">{item.unit}</td>
                                                                        {hasAnyDim && <td className="r">{item.length ? fmtNum(item.length) : ''}</td>}
                                                                        {hasAnyDim && <td className="r">{item.width ? fmtNum(item.width) : ''}</td>}
                                                                        {hasAnyDim && <td className="r">{item.height ? fmtNum(item.height) : ''}</td>}
                                                                        <td className="r">{fmtNum(item.quantity)}</td>
                                                                        {hasAnyVolDiff && <td className="r">{fmtNum(item.volume || item.quantity)}</td>}
                                                                        <td className="r">{fmt(item.unitPrice)}</td>
                                                                        <td className="r amt">{fmt(item.amount)}</td>
                                                                    </tr>
                                                                    {(item.subItems || []).map((si, sii) => (
                                                                        <tr key={`sub-${ii}-${sii}`} style={{ background: '#f8f9fc' }}>
                                                                            <td className="c" style={{ fontSize: 8, opacity: 0.3 }}>↳</td>
                                                                            {hasAnyImage && <td></td>}
                                                                            <td style={{ paddingLeft: 18 }}>
                                                                                <div style={{ fontSize: 10, fontStyle: 'italic', color: BRAND.textMid }}>{si.name}</div>
                                                                                {si.description && <div style={{ fontSize: 8, color: BRAND.textLight, marginTop: 1 }}>{si.description}</div>}
                                                                            </td>
                                                                            <td className="c">{si.unit}</td>
                                                                            {hasAnyDim && <td className="r">{si.length ? fmtNum(si.length) : ''}</td>}
                                                                            {hasAnyDim && <td className="r">{si.width ? fmtNum(si.width) : ''}</td>}
                                                                            {hasAnyDim && <td className="r">{si.height ? fmtNum(si.height) : ''}</td>}
                                                                            <td className="r">{fmtNum(si.quantity)}</td>
                                                                            {hasAnyVolDiff && <td className="r">{fmtNum(si.volume || si.quantity)}</td>}
                                                                            <td className="r">{fmt(si.unitPrice)}</td>
                                                                            <td className="r">{fmt(si.amount)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </React.Fragment>
                                                            ))}
                                                            <tr className="pub-sub-total">
                                                                <td colSpan={99} style={{ padding: '8px 12px' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                                                                        <span>Tổng {cat.name || `Khu vực ${ci + 1}`}</span>
                                                                        <span style={{ fontWeight: 900, minWidth: 100, textAlign: 'right' }}>{fmt(cat.subtotal)}</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {cat.image && (
                                                    <div style={{ width: 220, flexShrink: 0 }}>
                                                        <img src={cat.image} alt={cat.name || ''} style={{ width: '100%', borderRadius: 6, border: `2px solid ${BRAND.blue}20` }} />
                                                        <div style={{ fontSize: 7, color: BRAND.textMid, fontStyle: 'italic', marginTop: 3, textAlign: 'center' }}>{cat.name || 'Phối cảnh'}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}

                    {/* Notes */}
                    {q.notes && <div className="pub-notes">📝 <strong>Ghi chú:</strong> {q.notes}</div>}

                    {/* Summary */}
                    <div className="pub-sum-wrap">
                        <div className="pub-sum-words">
                            <span style={{ display: 'block', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: BRAND.blue, marginBottom: 5, opacity: 0.8 }}>Tổng giá trị bằng chữ</span>
                            <span style={{ color: BRAND.textDark, fontWeight: 600, fontStyle: 'italic' }}>{numberToWords(Math.round(q.grandTotal))}</span>
                        </div>
                        <div className="pub-sum-box">
                            {q.otherFee > 0 && <div className="pub-sum-row"><span>Vận chuyển, lắp đặt</span><span>{fmt(q.otherFee)}</span></div>}
                            <div className="pub-sum-row"><span>Tổng cộng</span><span style={{ fontWeight: 700 }}>{fmt(q.total)}</span></div>
                            {q.discount > 0 && <div className="pub-sum-row discount"><span>Chiết khấu ({q.discount}%)</span><span>-{fmt(q.total * q.discount / 100)}</span></div>}
                            {(q.deductions || []).map((d, di) => (
                                <div key={di} className="pub-sum-row discount">
                                    <span>{d.type === 'khuyến mại' ? '🎁 KM' : '📉 GT'} {d.name}</span>
                                    <span>-{fmt(d.amount)}</span>
                                </div>
                            ))}
                            <div style={{ fontSize: 8, color: '#888', fontStyle: 'italic', textAlign: 'right', padding: '3px 0' }}>* Đơn giá đã bao gồm VAT</div>
                            <div className="pub-sum-row total"><span>TỔNG GIÁ TRỊ</span><span>{fmt(q.grandTotal)}</span></div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pub-footer">
                        <div className="pub-footer-grid">
                            <div className="pub-validity">
                                <strong>Điều khoản & Cam kết:</strong><br />
                                • Báo giá có hiệu lực {validStr ? `đến ${validStr}` : '30 ngày'} kể từ ngày lập.<br />
                                • Thanh toán theo tiến độ giai đoạn được thỏa thuận trong hợp đồng.<br />
                                • Giá trên đã bao gồm nhân công, vật tư theo bảng chi tiết.<br />
                                • Một Nhà cam kết thi công đúng tiến độ, đúng chất lượng.
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div className="pub-sign-area">
                                    <div className="pub-sign-title">Đại diện<br />Khách hàng</div>
                                    <div className="pub-sign-space"></div>
                                    <div className="pub-sign-line">(Ký, ghi rõ họ tên)</div>
                                </div>
                                <div className="pub-sign-area">
                                    <div className="pub-sign-title">Đại diện<br />Một Nhà Design &amp; Build</div>
                                    <div className="pub-sign-space">
                                        <div className="pub-stamp">Dấu<br />công ty</div>
                                    </div>
                                    <div className="pub-sign-line">(Ký tên, đóng dấu)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Brand strip */}
                <div className="pub-brand-strip">
                    <div className="left">
                        <strong>MỘT NHÀ</strong> — Nhà ở trọn gói / Nội thất thông minh &nbsp;|&nbsp;
                        Hotline: <strong>(+84) 948 869 89</strong> &nbsp;|&nbsp; www.motnha.vn
                    </div>
                    <div className="right">{q.code} — {dateStr}</div>
                </div>
            </div>
        </>
    );
}
