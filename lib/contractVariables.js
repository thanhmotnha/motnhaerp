/**
 * Contract Template Variable Engine
 * Fill {{variables}} in contract templates with real data
 */

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtCurrency = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '.../.../......';

// === Number to Vietnamese words ===
const ONES = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const GROUPS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

function readThreeDigits(n) {
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    let s = '';
    if (h > 0) s += ONES[h] + ' trăm ';
    if (t > 1) s += ONES[t] + ' mươi ';
    else if (t === 1) s += 'mười ';
    else if (t === 0 && h > 0 && o > 0) s += 'lẻ ';
    if (o === 1 && t > 1) s += 'mốt';
    else if (o === 5 && t > 0) s += 'lăm';
    else if (o === 4 && t > 1) s += 'tư';
    else if (o > 0) s += ONES[o];
    return s.trim();
}

export function numberToVietnameseWords(num) {
    if (!num || num === 0) return 'không';
    num = Math.round(Math.abs(num));
    if (num === 0) return 'không';

    const parts = [];
    let groupIdx = 0;
    while (num > 0) {
        const chunk = num % 1000;
        if (chunk > 0) {
            const words = readThreeDigits(chunk);
            parts.unshift(words + (GROUPS[groupIdx] ? ' ' + GROUPS[groupIdx] : ''));
        }
        num = Math.floor(num / 1000);
        groupIdx++;
    }
    const result = parts.join(' ').replace(/\s+/g, ' ').trim();
    return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
}

// === Available Variables ===
export const CONTRACT_VARIABLES = [
    { key: 'Ma_Hop_Dong', label: 'Mã hợp đồng', source: 'contract.code' },
    { key: 'Ten_Hop_Dong', label: 'Tên hợp đồng', source: 'contract.name' },
    { key: 'Ten_Khach_Hang', label: 'Tên khách hàng', source: 'customer.name' },
    { key: 'SDT_Khach_Hang', label: 'SĐT khách hàng', source: 'customer.phone' },
    { key: 'Dia_Chi_KH', label: 'Địa chỉ KH', source: 'customer.address' },
    { key: 'CCCD_Khach_Hang', label: 'CCCD khách hàng', source: 'customer.citizenId' },
    { key: 'Nguoi_Dai_Dien', label: 'Người đại diện', source: 'customer.representative' },
    { key: 'Ten_Du_An', label: 'Tên dự án', source: 'project.name' },
    { key: 'Dia_Chi_Du_An', label: 'Địa chỉ dự án', source: 'project.address' },
    { key: 'Gia_Tri_HD', label: 'Giá trị HĐ (số)', source: 'fmt(contract.contractValue)' },
    { key: 'Gia_Tri_HD_Chu', label: 'Giá trị HĐ (chữ)', source: 'numberToWords' },
    { key: 'Ngay_Ky', label: 'Ngày ký', source: 'contract.signDate' },
    { key: 'Ngay_Bat_Dau', label: 'Ngày bắt đầu', source: 'contract.startDate' },
    { key: 'Ngay_Ket_Thuc', label: 'Ngày kết thúc', source: 'contract.endDate' },
    { key: 'Loai_Hop_Dong', label: 'Loại hợp đồng', source: 'contract.type' },
    { key: 'Bang_Hang_Muc', label: 'Bảng hạng mục công việc', source: 'auto-render' },
    { key: 'Dieu_Khoan_TT', label: 'Điều khoản thanh toán', source: 'auto-render' },
    { key: 'Ngay_Hien_Tai', label: 'Ngày hiện tại', source: 'today' },
];

// === Render quotation items as HTML table ===
export function renderItemsTable(quotation, selectedItemIds = null) {
    if (!quotation?.categories?.length) return '<p><em>Chưa có hạng mục</em></p>';

    let rows = '';
    let idx = 0;
    let grandTotal = 0;

    quotation.categories.forEach(cat => {
        const items = cat.items || [];
        const filteredItems = selectedItemIds
            ? items.filter(item => selectedItemIds.includes(item.id))
            : items;
        if (filteredItems.length === 0) return;

        const catTotal = filteredItems.reduce((s, i) => s + (i.amount || 0), 0);
        grandTotal += catTotal;

        rows += `<tr style="background:#f0f4ff;font-weight:700">
            <td colspan="5" style="padding:8px 10px">${cat.name}</td>
            <td style="text-align:right;padding:8px 10px">${fmt(catTotal)}</td>
        </tr>`;

        filteredItems.forEach(item => {
            idx++;
            rows += `<tr>
                <td style="text-align:center;padding:6px 10px">${idx}</td>
                <td style="padding:6px 10px">${item.name}</td>
                <td style="text-align:center;padding:6px 10px">${item.unit || ''}</td>
                <td style="text-align:right;padding:6px 10px">${item.quantity || ''}</td>
                <td style="text-align:right;padding:6px 10px">${fmt(item.unitPrice)}</td>
                <td style="text-align:right;padding:6px 10px">${fmt(item.amount)}</td>
            </tr>`;
        });
    });

    return `<table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #ccc">
        <thead><tr style="background:#234093;color:#fff">
            <th style="padding:8px 10px;width:40px">STT</th>
            <th style="padding:8px 10px;text-align:left">Hạng mục</th>
            <th style="padding:8px 10px;width:70px">ĐVT</th>
            <th style="padding:8px 10px;width:80px;text-align:right">SL</th>
            <th style="padding:8px 10px;width:120px;text-align:right">Đơn giá</th>
            <th style="padding:8px 10px;width:130px;text-align:right">Thành tiền</th>
        </tr></thead>
        <tbody>${rows}
        <tr style="background:#f8fafc;font-weight:800;border-top:2px solid #234093">
            <td colspan="5" style="padding:10px;text-align:right">TỔNG CỘNG</td>
            <td style="text-align:right;padding:10px;color:#234093">${fmt(grandTotal)}</td>
        </tr></tbody>
    </table>`;
}

// === Render payment terms as HTML table ===
export function renderPaymentTermsTable(payments = []) {
    if (!payments.length) return '<p><em>Chưa có điều khoản thanh toán</em></p>';

    let rows = '';
    payments.forEach((p, i) => {
        const cv = p.amount || 0;
        rows += `<tr>
            <td style="text-align:center;padding:6px 10px">${i + 1}</td>
            <td style="padding:6px 10px">${p.phase || ''}</td>
            <td style="text-align:center;padding:6px 10px">${p.pct || 0}%</td>
            <td style="text-align:right;padding:6px 10px">${fmtCurrency(cv)}</td>
        </tr>`;
    });

    return `<table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #ccc">
        <thead><tr style="background:#234093;color:#fff">
            <th style="padding:8px 10px;width:50px">Đợt</th>
            <th style="padding:8px 10px;text-align:left">Nội dung</th>
            <th style="padding:8px 10px;width:80px">Tỷ lệ</th>
            <th style="padding:8px 10px;width:150px;text-align:right">Số tiền</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>`;
}

// === Fill all variables in HTML template ===
export function fillVariables(html, { contract = {}, customer = {}, project = {}, quotation = null, payments = [], selectedItemIds = null } = {}) {
    if (!html) return '';

    const today = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const vars = {
        Ma_Hop_Dong: contract.code || '...',
        Ten_Hop_Dong: contract.name || '...',
        Ten_Khach_Hang: customer.name || '...',
        SDT_Khach_Hang: customer.phone || '...',
        Dia_Chi_KH: customer.address || '...',
        CCCD_Khach_Hang: customer.citizenId || '...',
        Nguoi_Dai_Dien: customer.representative || customer.name || '...',
        Ten_Du_An: project?.name || '...',
        Dia_Chi_Du_An: project?.address || '...',
        Gia_Tri_HD: fmtCurrency(contract.contractValue),
        Gia_Tri_HD_Chu: numberToVietnameseWords(contract.contractValue),
        Ngay_Ky: fmtDate(contract.signDate),
        Ngay_Bat_Dau: fmtDate(contract.startDate),
        Ngay_Ket_Thuc: fmtDate(contract.endDate),
        Loai_Hop_Dong: contract.type || 'Thi công',
        Bang_Hang_Muc: renderItemsTable(quotation, selectedItemIds),
        Dieu_Khoan_TT: renderPaymentTermsTable(payments),
        Ngay_Hien_Tai: today,
    };

    let result = html;
    for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
}
