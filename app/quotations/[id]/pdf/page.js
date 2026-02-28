'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

/* =============================================
   TEMPLATE QUẢNG CÁO THEO TỪNG LOẠI BÁO GIÁ
   Chỉnh sửa nội dung trong object này
   ============================================= */
const QUOTE_TEMPLATES = {
    'Thiết kế': {
        accentColor: '#7C3AED',
        docTitle: 'BÁO GIÁ THIẾT KẾ',
        promoHeader: {
            badge: '🎨 DỊCH VỤ THIẾT KẾ NỘI THẤT',
            headline: 'Kiến tạo không gian sống trong mơ — Cá nhân hóa từng đường nét',
            features: [
                { icon: '✏️', title: 'Tư vấn 1-1', desc: 'Kiến trúc sư dày dặn kinh nghiệm đồng hành từ ý tưởng đến bản vẽ hoàn chỉnh' },
                { icon: '🖥️', title: 'Phối cảnh 3D sống động', desc: 'Mô phỏng không gian thực tế trước khi thi công, chỉnh sửa không giới hạn' },
                { icon: '📐', title: 'Hồ sơ kỹ thuật đầy đủ', desc: 'Bản vẽ CAD, bảng vật liệu, tiến độ thi công chi tiết' },
                { icon: '🔄', title: 'Bảo hành bản vẽ', desc: 'Hỗ trợ điều chỉnh thiết kế trong suốt quá trình thi công' },
            ],
            tag: '#ThietKe #NoiThat #MotNha',
        },
        promoFooter: {
            commitTitle: '🌟 CAM KẾT CỦA MỘT NHÀ VỀ DỊCH VỤ THIẾT KẾ',
            commits: [
                '✅ Bản vẽ thiết kế chuyên nghiệp, đúng hẹn 100%',
                '✅ Phối cảnh 3D đẹp và sát thực tế nhất thị trường',
                '✅ Tư vấn miễn phí phong cách và xu hướng thiết kế mới nhất',
                '✅ Bảo mật thông tin dự án tuyệt đối',
            ],
            projects: [
                { name: 'Căn hộ Vinhomes Grand Park', area: '85m²', style: 'Scandinavian' },
                { name: 'Nhà phố Thủ Đức', area: '250m²', style: 'Modern Luxury' },
                { name: 'Villa Bình Dương', area: '450m²', style: 'Indochine' },
            ],
            cta: 'Xem portfolio tại: motnha.vn/portfolio',
        },
    },
    'Thi công thô': {
        accentColor: '#D97706',
        docTitle: 'BÁO GIÁ THI CÔNG THÔ',
        promoHeader: {
            badge: '🏗️ DỊCH VỤ THI CÔNG XÂY DỰNG THÔ',
            headline: 'Nền móng vững chắc — Kết cấu chuẩn kỹ thuật — Bàn giao đúng tiến độ',
            features: [
                { icon: '🧱', title: 'Vật liệu chất lượng', desc: 'Xi măng, thép, gạch từ nhà cung cấp uy tín, có chứng chỉ kiểm định' },
                { icon: '👷', title: 'Đội thợ lành nghề', desc: 'Trên 10 năm kinh nghiệm, tuân thủ nghiêm ngặt tiêu chuẩn TCVN xây dựng' },
                { icon: '📋', title: 'Giám sát chặt chẽ', desc: 'Kỹ sư giám sát tại công trình hàng ngày, báo cáo tiến độ định kỳ' },
                { icon: '🛡️', title: 'Bảo hành kết cấu 5 năm', desc: 'Cam kết bảo hành toàn bộ phần thô: móng, cột, dầm, sàn, tường' },
            ],
            tag: '#ThiCongTho #XayDung #MotNha',
        },
        promoFooter: {
            commitTitle: '🔧 CAM KẾT CỦA MỘT NHÀ VỀ THI CÔNG THÔ',
            commits: [
                '✅ Nghiệm thu từng giai đoạn, có biên bản ký kết chi tiết',
                '✅ Không phát sinh chi phí ngoài hợp đồng',
                '✅ Bảo hành kết cấu 5 năm kể từ ngày bàn giao',
                '✅ Vệ sinh công trình sạch sẽ trước khi bàn giao',
            ],
            projects: [
                { name: 'Nhà phố 4 tầng - Q.Bình Thạnh', area: '200m²', style: 'BTCT toàn khối' },
                { name: 'Biệt thự Bình Dương', area: '380m²', style: 'Móng cọc nhồi' },
                { name: 'Shophouse Nhơn Trạch', area: '650m²', style: 'Khung thép + BTCT' },
            ],
            cta: 'Hotline tư vấn: 0901-234-567 | motnha.vn',
        },
    },
    'Thi công hoàn thiện': {
        accentColor: '#059669',
        docTitle: 'BÁO GIÁ THI CÔNG HOÀN THIỆN',
        promoHeader: {
            badge: '🏠 DỊCH VỤ THI CÔNG HOÀN THIỆN NỘI THẤT',
            headline: 'Biến kết cấu thô thành không gian sống tiện nghi — Hoàn thiện từng chi tiết',
            features: [
                { icon: '🎨', title: 'Sơn & Hoàn thiện bề mặt', desc: 'Sơn nước cao cấp Dulux/Jotun, bả matit phẳng, xử lý chống thấm triệt để' },
                { icon: '🪟', title: 'Cửa & Cửa sổ', desc: 'Lắp đặt cửa nhôm cao cấp, cửa gỗ veneer, cửa kính cường lực' },
                { icon: '⚡', title: 'Điện & Nước', desc: 'Thi công đường điện âm tường, hệ thống cấp thoát nước đúng tiêu chuẩn IEC/TCVN' },
                { icon: '🪴', title: 'Ốp lát & Trần thạch cao', desc: 'Gạch ceramics/porcelain cao cấp, trần thạch cao phẳng hoặc trang trí' },
            ],
            tag: '#HoanThien #SonSua #MotNha',
        },
        promoFooter: {
            commitTitle: '✨ CAM KẾT CỦA MỘT NHÀ VỀ HOÀN THIỆN',
            commits: [
                '✅ Hoàn thiện phẳng, đều, đúng kỹ thuật — không nứt, không thấm',
                '✅ Bảo hành sơn 2 năm, ốp lát 3 năm, điện nước 2 năm',
                '✅ Dọn dẹp vệ sinh toàn bộ trước khi bàn giao',
                '✅ Hậu mãi: hỗ trợ sửa chữa nhỏ miễn phí 12 tháng đầu',
            ],
            projects: [
                { name: 'Căn hộ Sky Garden - Q7', area: '120m²', style: 'Scandinavian hiện đại' },
                { name: 'Nhà phố Gò Vấp', area: '160m²', style: 'Tân cổ điển' },
                { name: 'Văn phòng Bình Thạnh', area: '300m²', style: 'Modern Corporate' },
            ],
            cta: 'Tư vấn miễn phí: 0901-234-567 | motnha.vn',
        },
    },
    'Nội thất': {
        accentColor: '#1C3A6B',
        docTitle: 'BÁO GIÁ NỘI THẤT',
        promoHeader: {
            badge: '🛋️ GIẢI PHÁP NỘI THẤT TOÀN DIỆN',
            headline: 'Nội thất nhập khẩu & sản xuất riêng — Phong cách sống đẳng cấp cho mỗi tổ ấm',
            features: [
                { icon: '🪵', title: 'Gỗ tự nhiên & Gỗ công nghiệp cao cấp', desc: 'Tủ bếp, tủ quần áo, bàn ghế từ gỗ MDF phủ Melamine / Acrylic / veneer gỗ thật' },
                { icon: '🛋️', title: 'Sofa & Upholstery', desc: 'Vải bọc nhập khẩu Malaysia/Thổ Nhĩ Kỳ, khung gỗ soi thẩm mỹ, ray giảm chấn Blum/Hettich' },
                { icon: '💡', title: 'Đèn trang trí & Điều hòa', desc: 'Đèn LED Champagne/Philips, điều hòa inverter Daikin/Mitsubishi lắp âm trần' },
                { icon: '🏺', title: 'Decor & Phụ kiện', desc: 'Rèm vải cao cấp, gương, tranh trang trí nhập khẩu — hoàn chỉnh không gian sống' },
            ],
            tag: '#NoiThat #TuBep #SofaNhapKhau',
        },
        promoFooter: {
            commitTitle: '🏆 CAM KẾT CỦA MỘT NHÀ VỀ NỘI THẤT',
            commits: [
                '✅ Vật liệu chính hãng, có chứng nhận xuất xứ rõ ràng',
                '✅ Bảo hành nội thất 2–5 năm tuỳ hạng mục',
                '✅ Lắp đặt hoàn chỉnh, bàn giao turnkey trọn gói',
                '✅ Hỗ trợ tháo lắp, vận chuyển miễn phí trong TP.HCM',
            ],
            projects: [
                { name: 'Penthouse The Metropole - Q1', area: '350m²', style: 'Art Deco luxury' },
                { name: 'Căn hộ Vinhomes Central Park', area: '145m²', style: 'Japandi minimalist' },
                { name: 'Nhà phố Thủ Đức', area: '220m²', style: 'Modern Classic' },
            ],
            cta: 'Showroom: motnha.vn | 0901-234-567',
        },
    },
};

// Map 5 quotation types → 4 templates
const TYPE_TEMPLATE_MAP = {
    'Thiết kế kiến trúc': 'Thiết kế',
    'Thiết kế nội thất': 'Thiết kế',
    'Thi công thô': 'Thi công thô',
    'Thi công hoàn thiện': 'Thi công hoàn thiện',
    'Thi công nội thất': 'Nội thất',
};
const getTemplate = (type) => QUOTE_TEMPLATES[TYPE_TEMPLATE_MAP[type] || type] || QUOTE_TEMPLATES['Nội thất'];

function PromoHeader({ template }) {
    const { badge, headline, features, tag } = template.promoHeader;
    const color = template.accentColor;
    return (
        <div style={{ margin: '18px 0 16px', border: `1.5px solid ${color}33`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: 1, marginBottom: 3 }}>{badge}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.4 }}>{headline}</div>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textAlign: 'right', whiteSpace: 'nowrap', marginLeft: 16 }}>{tag}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, background: '#fff' }}>
                {features.map((f, i) => (
                    <div key={i} style={{ padding: '10px 14px', borderRight: i % 2 === 0 ? `1px solid ${color}22` : 'none', borderBottom: i < 2 ? `1px solid ${color}22` : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: color, marginBottom: 2 }}>{f.title}</div>
                            <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>{f.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PromoFooter({ template }) {
    const { commitTitle, commits, projects, cta } = template.promoFooter;
    const color = template.accentColor;
    return (
        <div style={{ margin: '24px 0 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ border: `1.5px solid ${color}33`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: `${color}12`, padding: '8px 14px', borderBottom: `1px solid ${color}22` }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: color }}>{commitTitle}</span>
                </div>
                <div style={{ padding: '10px 14px', background: '#fff' }}>
                    {commits.map((c, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#334155', marginBottom: 6, lineHeight: 1.5 }}>{c}</div>
                    ))}
                </div>
            </div>
            <div style={{ border: `1.5px solid ${color}33`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: `${color}12`, padding: '8px 14px', borderBottom: `1px solid ${color}22` }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: color }}>🏅 DỰ ÁN TIÊU BIỂU ĐÃ HOÀN THÀNH</span>
                </div>
                <div style={{ padding: '10px 14px', background: '#fff' }}>
                    {projects.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7, paddingBottom: 7, borderBottom: i < projects.length - 1 ? `1px dashed ${color}22` : 'none' }}>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{p.name}</div>
                                <div style={{ fontSize: 10, color: '#64748b' }}>{p.style}</div>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: color, background: `${color}12`, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', marginLeft: 8 }}>{p.area}</div>
                        </div>
                    ))}
                    <div style={{ marginTop: 8, fontSize: 10, color: color, fontWeight: 600, textAlign: 'right' }}>→ {cta}</div>
                </div>
            </div>
        </div>
    );
}

export default function QuotationPDFPage() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        apiFetch(`/api/quotations/${id}`).then(d => {
            setData(d);
            // Set meaningful document title for PDF filename
            const code = d.code || '';
            const cust = d.customer?.name || '';
            const type = d.type || '';
            document.title = [code, cust, type].filter(Boolean).join('_');
        });
    }, [id]);

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!data) return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'sans-serif' }}>⏳ Đang tải...</div>;
    const q = data;
    const tpl = getTemplate(q.type);
    const accent = tpl.accentColor;
    const dateStr = new Date(q.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const validStr = q.validUntil ? new Date(q.validUntil).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;
    const afterDiscount = q.total - (q.total * (q.discount || 0) / 100);
    const vatAmount = afterDiscount * ((q.vat || 0) / 100);

    return (
        <>
            <style>{`
                * { box-sizing: border-box; }
                body { background: #e2e8f0 !important; margin: 0; font-family: 'Segoe UI', Arial, sans-serif; }
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .print-page { box-shadow: none !important; margin: 0 !important; padding: 16px 22px !important; max-width: 100% !important; }
                    @page { margin: 8mm; size: A4 landscape; }
                }
                .print-page { max-width: 1100px; margin: 20px auto 40px; background: #fff; padding: 36px 44px; box-shadow: 0 4px 32px rgba(0,0,0,0.15); color: #1e293b; border-radius: 8px; }
                .pdf-header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:18px; margin-bottom:20px; border-bottom:3px solid ${accent}; }
                .company-logo { font-size:18px; font-weight:800; color:${accent}; margin:0 0 3px; }
                .company-sub { font-size:11px; color:#64748b; line-height:1.9; }
                .doc-right { text-align:right; }
                .doc-title-text { margin:0; font-size:22px; font-weight:900; color:#1e293b; letter-spacing:2px; }
                .doc-code { font-size:15px; font-weight:700; color:${accent}; margin-top:2px; }
                .doc-meta { font-size:11px; color:#64748b; margin-top:3px; line-height:1.8; }
                .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:0; }
                .info-box { background:#f8fafc; padding:12px 14px; border-radius:6px; border:1px solid #e2e8f0; }
                .info-label { font-size:9px; font-weight:700; color:${accent}; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px; }
                .info-name { font-size:13px; font-weight:700; margin-bottom:2px; }
                .info-sub { font-size:11px; color:#475569; line-height:1.8; }
                .cat-title { background:linear-gradient(90deg,${accent},${accent}BB); color:#fff; padding:8px 12px; border-radius:5px 5px 0 0; font-weight:700; font-size:12px; display:flex; justify-content:space-between; margin-top:16px; }
                .cat-title:first-of-type { margin-top:0; }
                .pdf-table { width:100%; border-collapse:collapse; font-size:11.5px; }
                .pdf-table th { background:${accent}15; color:${accent}; font-weight:700; padding:7px 8px; border:1px solid ${accent}35; font-size:10px; text-transform:uppercase; letter-spacing:.4px; white-space:nowrap; }
                .pdf-table td { border:1px solid #e2e8f0; padding:6px 8px; vertical-align:middle; }
                .pdf-table .r { text-align:right; }
                .pdf-table .c { text-align:center; }
                .pdf-table .amt { font-weight:700; color:${accent}; }
                .pdf-table .item-img { width:36px; height:36px; object-fit:cover; border-radius:4px; border:1px solid #e2e8f0; display:block; }
                .pdf-table .no-img { width:36px; height:36px; border-radius:4px; border:1.5px dashed #cbd5e1; display:flex; align-items:center; justify-content:center; font-size:14px; opacity:.3; }
                .sub-row td { background:${accent}12; font-weight:700; font-size:11px; color:${accent}; border-top:2px solid ${accent}35; }
                .desc-cell { font-size:10.5px; color:#64748b; font-style:italic; }
                .summary-wrap { display:flex; justify-content:flex-end; margin-top:20px; }
                .sum-box { width:300px; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; }
                .sum-row { display:flex; justify-content:space-between; padding:7px 14px; font-size:12px; border-bottom:1px solid #f1f5f9; }
                .sum-row.total { background:${accent}; color:#fff; font-weight:800; font-size:14px; border:none; }
                .sum-row.red span:last-child { color:#ef4444; }
                .sign-grid { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:36px; text-align:center; }
                .sign-title { font-weight:700; font-size:12px; margin-bottom:52px; }
                .sign-line { border-top:1px solid #cbd5e1; padding-top:6px; font-size:10px; color:#94a3b8; }
                .pdf-footer { margin-top:28px; padding-top:12px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; }
                .pdf-notes { margin-top:14px; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:10px 14px; font-size:11.5px; color:#92400e; }
            `}</style>

            {/* Toolbar */}
            <div className="no-print" style={{ background: '#1e293b', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,.3)' }}>
                <span style={{ color: '#94a3b8', fontSize: 13, flex: 1 }}>
                    📄 <strong style={{ color: '#fff' }}>{q.code}</strong> — {q.customer?.name} &nbsp;·&nbsp;
                    <span style={{ fontSize: 11, background: '#334155', padding: '2px 8px', borderRadius: 4, color: '#93c5fd' }}>{tpl.docTitle}</span>
                </span>
                <button onClick={copyLink} style={{ padding: '7px 14px', background: copied ? '#10b981' : '#334155', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {copied ? '✅ Đã copy!' : '🔗 Copy link gửi KH'}
                </button>
                <button onClick={() => window.print()} style={{ padding: '7px 18px', background: accent, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    🖨️ Xuất PDF
                </button>
                <span style={{ color: '#64748b', fontSize: 11 }}>Ctrl+P → Save as PDF</span>
            </div>

            <div className="print-page">
                {/* HEADER */}
                <div className="pdf-header">
                    <div>
                        <div className="company-logo">🏠 MỘT NHÀ — Thiết kế & Xây dựng Nội thất</div>
                        <div className="company-sub">
                            MST: 0316xxxxxx &nbsp;|&nbsp; Hotline: 0901-234-567 &nbsp;|&nbsp; Zalo: 0901-234-567<br />
                            123 Đường ABC, Quận 1, TP.HCM<br />
                            Email: info@motnha.vn &nbsp;|&nbsp; Web: motnha.vn
                        </div>
                    </div>
                    <div className="doc-right">
                        <h2 className="doc-title-text">{tpl.docTitle}</h2>
                        <div className="doc-code">{q.code}</div>
                        <div className="doc-meta">
                            Ngày lập: {dateStr}{validStr && <>&nbsp;|&nbsp;Hiệu lực: {validStr}</>}<br />
                            Loại: {q.type} &nbsp;|&nbsp; Trạng thái: {q.status}
                        </div>
                    </div>
                </div>

                {/* INFO KH + Dự án */}
                <div className="info-grid">
                    <div className="info-box">
                        <div className="info-label">Kính gửi khách hàng</div>
                        <div className="info-name">{q.customer?.name}</div>
                        <div className="info-sub">
                            {q.customer?.address && <>{q.customer.address}<br /></>}
                            {q.customer?.phone && <>ĐT: {q.customer.phone}<br /></>}
                            {q.customer?.email && <>Email: {q.customer.email}</>}
                        </div>
                    </div>
                    <div className="info-box">
                        <div className="info-label">Công trình / Dự án</div>
                        <div className="info-name">{q.project?.name || '—'}</div>
                        <div className="info-sub">{q.project?.address}</div>
                    </div>
                </div>

                {/* PROMO HEADER */}
                <PromoHeader template={tpl} />

                {/* BẢNG ITEMS */}
                {(q.categories && q.categories.length > 0) ? q.categories.map((cat, ci) => (
                    <div key={cat.id || ci}>
                        <div className="cat-title">
                            <span>#{ci + 1} — {cat.name || `Khu vực ${ci + 1}`}</span>
                            <span>{fmt(cat.subtotal)}</span>
                        </div>
                        <table className="pdf-table">
                            <thead><tr>
                                <th className="c" style={{ width: 30 }}>STT</th>
                                <th className="c" style={{ width: 42 }}>Ảnh</th>
                                <th>Hạng mục / Sản phẩm</th>
                                <th>Diễn giải</th>
                                <th className="c" style={{ width: 42 }}>ĐVT</th>
                                <th className="r" style={{ width: 44 }}>Dài</th>
                                <th className="r" style={{ width: 44 }}>Rộng</th>
                                <th className="r" style={{ width: 44 }}>Cao</th>
                                <th className="r" style={{ width: 44 }}>SL</th>
                                <th className="r" style={{ width: 84 }}>Đơn giá</th>
                                <th className="r" style={{ width: 92 }}>Thành tiền</th>
                            </tr></thead>
                            <tbody>
                                {(cat.items || []).map((item, ii) => (
                                    <tr key={item.id || ii}>
                                        <td className="c" style={{ color: '#94a3b8', fontSize: 10 }}>{ii + 1}</td>
                                        <td className="c">
                                            {item.image ? <img src={item.image} className="item-img" alt="" /> : <div className="no-img">📦</div>}
                                        </td>
                                        <td style={{ fontWeight: 600, fontSize: 12 }}>{item.name}</td>
                                        <td><span className="desc-cell">{item.description || ''}</span></td>
                                        <td className="c">{item.unit}</td>
                                        <td className="r">{item.length ? fmtNum(item.length) : ''}</td>
                                        <td className="r">{item.width ? fmtNum(item.width) : ''}</td>
                                        <td className="r">{item.height ? fmtNum(item.height) : ''}</td>
                                        <td className="r">{fmtNum(item.quantity)}</td>
                                        <td className="r">{fmt(item.unitPrice)}</td>
                                        <td className="r amt">{fmt(item.amount)}</td>
                                    </tr>
                                ))}
                                <tr className="sub-row">
                                    <td colSpan={10} className="r" style={{ paddingRight: 10 }}>Tổng khu vực #{ci + 1}</td>
                                    <td className="r">{fmt(cat.subtotal)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )) : (
                    <table className="pdf-table">
                        <thead><tr>
                            <th className="c" style={{ width: 30 }}>STT</th>
                            <th>Hạng mục</th><th>Diễn giải</th>
                            <th className="c">ĐVT</th><th className="r">SL</th>
                            <th className="r">Đơn giá</th><th className="r">Thành tiền</th>
                        </tr></thead>
                        <tbody>{q.items?.map((item, i) => (
                            <tr key={item.id}><td className="c">{i + 1}</td>
                                <td style={{ fontWeight: 600 }}>{item.name}</td>
                                <td><span className="desc-cell">{item.description}</span></td>
                                <td className="c">{item.unit}</td>
                                <td className="r">{fmtNum(item.quantity)}</td>
                                <td className="r">{fmt(item.unitPrice)}</td>
                                <td className="r amt">{fmt(item.amount)}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                )}

                {q.notes && <div className="pdf-notes">📝 <strong>Ghi chú:</strong> {q.notes}</div>}

                {/* TỔNG KẾT */}
                <div className="summary-wrap">
                    <div className="sum-box">
                        {q.directCost > 0 && <div className="sum-row"><span>Chi phí trực tiếp</span><span>{fmt(q.directCost)}</span></div>}
                        {q.managementFee > 0 && <div className="sum-row"><span>Phí quản lý ({q.managementFeeRate}%)</span><span>{fmt(q.managementFee)}</span></div>}
                        {q.designFee > 0 && <div className="sum-row"><span>Phí thiết kế</span><span>{fmt(q.designFee)}</span></div>}
                        {q.otherFee > 0 && <div className="sum-row"><span>Chi phí khác</span><span>{fmt(q.otherFee)}</span></div>}
                        <div className="sum-row"><span>Tổng trước thuế</span><span style={{ fontWeight: 700 }}>{fmt(q.total)}</span></div>
                        {q.discount > 0 && <div className="sum-row red"><span>Chiết khấu ({q.discount}%)</span><span>-{fmt(q.total * q.discount / 100)}</span></div>}
                        <div className="sum-row"><span>VAT ({q.vat}%)</span><span>{fmt(vatAmount)}</span></div>
                        <div className="sum-row total"><span>TỔNG GIÁ TRỊ</span><span>{fmt(q.grandTotal)}</span></div>
                    </div>
                </div>

                {/* PROMO FOOTER */}
                <PromoFooter template={tpl} />

                {/* KÝ TÊN */}
                <div className="sign-grid">
                    <div><div className="sign-title">ĐẠI DIỆN KHÁCH HÀNG</div><div className="sign-line">(Ký, ghi rõ họ tên)</div></div>
                    <div><div className="sign-title">ĐẠI DIỆN MỘT NHÀ</div><div className="sign-line">(Ký tên, đóng dấu)</div></div>
                </div>

                {/* FOOTER */}
                <div className="pdf-footer">
                    <span>Báo giá có hiệu lực theo thỏa thuận. Mọi thắc mắc liên hệ Hotline: <strong>0901-234-567</strong> — motnha.vn</span>
                    <span>{q.code} — {dateStr}</span>
                </div>
            </div>
        </>
    );
}