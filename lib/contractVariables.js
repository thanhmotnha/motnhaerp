/**
 * Contract Template Variable Engine
 * Fill {{variables}} in contract templates with real data
 */

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtCurrency = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '.../.../......';
const getDay = (d) => d ? new Date(d).getDate().toString() : '...';
const getMonth = (d) => d ? (new Date(d).getMonth() + 1).toString() : '...';
const getYear = (d) => d ? new Date(d).getFullYear().toString() : '......';

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
    { key: 'Ngay_Ky', label: 'Ngày ký (dd/mm/yyyy)', source: 'contract.signDate' },
    { key: 'Ngay_Ky_So', label: 'Ngày ký (số)', source: 'day of signDate' },
    { key: 'Thang_Ky', label: 'Tháng ký', source: 'month of signDate' },
    { key: 'Nam_Ky', label: 'Năm ký', source: 'year of signDate' },
    { key: 'Ngay_Bat_Dau', label: 'Ngày bắt đầu', source: 'contract.startDate' },
    { key: 'Ngay_Ket_Thuc', label: 'Ngày kết thúc', source: 'contract.endDate' },
    { key: 'Loai_Hop_Dong', label: 'Loại hợp đồng', source: 'contract.type' },
    { key: 'Bang_Hang_Muc', label: 'Bảng hạng mục công việc', source: 'auto-render' },
    { key: 'Dieu_Khoan_TT', label: 'Điều khoản thanh toán', source: 'auto-render' },
    { key: 'Ngay_Hien_Tai', label: 'Ngày hiện tại (dd/mm/yyyy)', source: 'today' },
    { key: 'Ngay_HT_So', label: 'Ngày hiện tại (số)', source: 'day of today' },
    { key: 'Thang_HT', label: 'Tháng hiện tại', source: 'month of today' },
    { key: 'Nam_HT', label: 'Năm hiện tại', source: 'year of today' },
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
        Ngay_Ky_So: getDay(contract.signDate),
        Thang_Ky: getMonth(contract.signDate),
        Nam_Ky: getYear(contract.signDate),
        Ngay_Bat_Dau: fmtDate(contract.startDate),
        Ngay_Ket_Thuc: fmtDate(contract.endDate),
        Loai_Hop_Dong: contract.type || 'Thi công',
        Bang_Hang_Muc: renderItemsTable(quotation, selectedItemIds),
        Dieu_Khoan_TT: renderPaymentTermsTable(payments),
        Ngay_Hien_Tai: today,
        Ngay_HT_So: new Date().getDate().toString(),
        Thang_HT: (new Date().getMonth() + 1).toString(),
        Nam_HT: new Date().getFullYear().toString(),
    };

    let result = html;
    for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
}

// === Employee Contract Variables ===
export const EMPLOYEE_CONTRACT_VARIABLES = [
    { key: 'Ma_HD_LD', label: 'Mã hợp đồng lao động', source: 'contract.code' },
    { key: 'Loai_HD_LD', label: 'Loại hợp đồng', source: 'contract.type' },
    { key: 'Ten_NV', label: 'Tên nhân viên', source: 'employee.name' },
    { key: 'Ngay_Sinh_NV', label: 'Ngày sinh NV', source: 'employee.dateOfBirth' },
    { key: 'CCCD_NV', label: 'CMND/CCCD NV', source: 'employee.idNumber' },
    { key: 'Dia_Chi_NV', label: 'Địa chỉ NV', source: 'employee.address' },
    { key: 'SDT_NV', label: 'SĐT nhân viên', source: 'employee.phone' },
    { key: 'Chuc_Vu_HD', label: 'Chức vụ (hợp đồng)', source: 'contract.position' },
    { key: 'Phong_Ban_HD', label: 'Phòng ban (hợp đồng)', source: 'contract.department' },
    { key: 'Luong_HD', label: 'Lương hợp đồng (số)', source: 'fmt(contract.salary)' },
    { key: 'Luong_HD_Chu', label: 'Lương hợp đồng (chữ)', source: 'numberToWords' },
    { key: 'Luong_BH', label: 'Lương đóng BH (số)', source: 'fmt(contract.insuranceSalary)' },
    { key: 'Ngay_BD_HD', label: 'Ngày bắt đầu HĐ', source: 'contract.startDate' },
    { key: 'Ngay_KT_HD', label: 'Ngày kết thúc HĐ', source: 'contract.endDate' },
    { key: 'Ngay_Ky_HD', label: 'Ngày ký HĐ', source: 'contract.signedAt' },
    { key: 'Ngay_Ky_HD_So', label: 'Ngày ký (số)', source: 'day of signedAt' },
    { key: 'Thang_Ky_HD', label: 'Tháng ký', source: 'month of signedAt' },
    { key: 'Nam_Ky_HD', label: 'Năm ký', source: 'year of signedAt' },
    { key: 'Ten_Cong_Ty', label: 'Tên công ty', source: 'static' },
    { key: 'DC_Cong_Ty', label: 'Địa chỉ công ty', source: 'static' },
    { key: 'Nguoi_DD_CT', label: 'Người đại diện công ty', source: 'static' },
    { key: 'Chuc_Vu_DD', label: 'Chức vụ người đại diện', source: 'static' },
];

export function fillEmployeeVariables(html, { contract = {}, employee = {} } = {}) {
    if (!html) return '';
    const today = new Date();

    const vars = {
        Ma_HD_LD: contract.code || '...',
        Loai_HD_LD: contract.type || '...',
        Ten_NV: employee.name || '...',
        Ngay_Sinh_NV: fmtDate(employee.dateOfBirth),
        CCCD_NV: employee.idNumber || '...',
        Dia_Chi_NV: employee.address || '...',
        SDT_NV: employee.phone || '...',
        Chuc_Vu_HD: contract.position || employee.position || '...',
        Phong_Ban_HD: contract.department || '...',
        Luong_HD: fmt(contract.salary),
        Luong_HD_Chu: numberToVietnameseWords(contract.salary),
        Luong_BH: fmt(contract.insuranceSalary),
        Ngay_BD_HD: fmtDate(contract.startDate),
        Ngay_KT_HD: contract.endDate ? fmtDate(contract.endDate) : 'Không xác định',
        Ngay_Ky_HD: fmtDate(contract.signedAt),
        Ngay_Ky_HD_So: getDay(contract.signedAt),
        Thang_Ky_HD: getMonth(contract.signedAt),
        Nam_Ky_HD: getYear(contract.signedAt),
        Ngay_Hien_Tai: today.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        Ngay_HT_So: today.getDate().toString(),
        Thang_HT: (today.getMonth() + 1).toString(),
        Nam_HT: today.getFullYear().toString(),
        Ten_Cong_Ty: 'Công ty TNHH Đầu tư và Thương Mại Beetify Việt Nam',
        DC_Cong_Ty: '105C Tô Hiệu, Phường Tô Hiệu, tỉnh Sơn La',
        Nguoi_DD_CT: 'Nguyễn Hữu Thanh',
        Chuc_Vu_DD: 'Giám đốc',
    };

    let result = html;
    for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '');
    }
    return result;
}
