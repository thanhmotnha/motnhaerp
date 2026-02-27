// ============================================================
// MOCK DATA - ERP Nội thất & Xây dựng
// ============================================================

export const customers = [
  { id: 'KH001', name: 'Nguyễn Văn An', phone: '0901234567', email: 'an.nguyen@email.com', address: '123 Nguyễn Huệ, Q.1, TP.HCM', type: 'Cá nhân', status: 'VIP', totalProjects: 3, totalSpent: 2850000000, joinDate: '2024-03-15' },
  { id: 'KH002', name: 'Trần Thị Bích', phone: '0912345678', email: 'bich.tran@email.com', address: '456 Lê Lợi, Q.3, TP.HCM', type: 'Cá nhân', status: 'Khách hàng', totalProjects: 1, totalSpent: 450000000, joinDate: '2024-06-20' },
  { id: 'KH003', name: 'Công ty TNHH Hoàng Gia', phone: '0283456789', email: 'info@hoanggia.vn', address: '789 Võ Văn Tần, Q.3, TP.HCM', type: 'Doanh nghiệp', status: 'VIP', totalProjects: 5, totalSpent: 12500000000, joinDate: '2023-11-10' },
  { id: 'KH004', name: 'Lê Minh Cường', phone: '0923456789', email: 'cuong.le@email.com', address: '321 Điện Biên Phủ, Bình Thạnh, TP.HCM', type: 'Cá nhân', status: 'Prospect', totalProjects: 0, totalSpent: 0, joinDate: '2025-01-05' },
  { id: 'KH005', name: 'Phạm Hồng Đào', phone: '0934567890', email: 'dao.pham@email.com', address: '654 Cách Mạng Tháng 8, Q.10, TP.HCM', type: 'Cá nhân', status: 'Khách hàng', totalProjects: 2, totalSpent: 980000000, joinDate: '2024-08-12' },
  { id: 'KH006', name: 'Công ty CP Sunrise', phone: '0287654321', email: 'contact@sunrise.vn', address: '100 Nguyễn Thị Minh Khai, Q.1, TP.HCM', type: 'Doanh nghiệp', status: 'Khách hàng', totalProjects: 2, totalSpent: 5600000000, joinDate: '2024-02-28' },
  { id: 'KH007', name: 'Võ Thanh Hà', phone: '0945678901', email: 'ha.vo@email.com', address: '88 Phan Xích Long, Phú Nhuận, TP.HCM', type: 'Cá nhân', status: 'Lead', totalProjects: 0, totalSpent: 0, joinDate: '2025-02-01' },
  { id: 'KH008', name: 'Đỗ Quang Khải', phone: '0956789012', email: 'khai.do@email.com', address: '200 Trường Chinh, Tân Bình, TP.HCM', type: 'Cá nhân', status: 'Khách hàng', totalProjects: 1, totalSpent: 350000000, joinDate: '2024-11-18' },
];

export const projects = [
  { id: 'DA001', name: 'Villa Thảo Điền - Nội thất toàn bộ', customer: 'Nguyễn Văn An', customerId: 'KH001', type: 'Thiết kế nội thất', address: '15 Thảo Điền, Q.2, TP.HCM', budget: 1200000000, spent: 850000000, status: 'Thi công', progress: 65, startDate: '2025-06-01', endDate: '2025-12-30', manager: 'Trần Đức Minh' },
  { id: 'DA002', name: 'Nhà phố Quận 7 - Xây trọn gói', customer: 'Trần Thị Bích', customerId: 'KH002', type: 'Xây nhà trọn gói', address: '45 Nguyễn Lương Bằng, Q.7, TP.HCM', budget: 4500000000, spent: 1200000000, status: 'Thiết kế', progress: 20, startDate: '2025-09-15', endDate: '2026-09-15', manager: 'Nguyễn Hoàng Long' },
  { id: 'DA003', name: 'Văn phòng Hoàng Gia - Cải tạo', customer: 'Công ty TNHH Hoàng Gia', customerId: 'KH003', type: 'Cải tạo', address: '789 Võ Văn Tần, Q.3, TP.HCM', budget: 3200000000, spent: 3100000000, status: 'Nghiệm thu', progress: 95, startDate: '2025-01-10', endDate: '2025-11-30', manager: 'Trần Đức Minh' },
  { id: 'DA004', name: 'Biệt thự Q.9 - Xây dựng & Nội thất', customer: 'Công ty TNHH Hoàng Gia', customerId: 'KH003', type: 'Xây nhà trọn gói', address: '200 Đỗ Xuân Hợp, Q.9, TP.HCM', budget: 8500000000, spent: 2500000000, status: 'Thi công', progress: 35, startDate: '2025-08-01', endDate: '2026-12-31', manager: 'Nguyễn Hoàng Long' },
  { id: 'DA005', name: 'Căn hộ Vinhomes - Nội thất', customer: 'Phạm Hồng Đào', customerId: 'KH005', type: 'Thiết kế nội thất', address: 'Vinhomes Central Park, Bình Thạnh', budget: 580000000, spent: 580000000, status: 'Bàn giao', progress: 100, startDate: '2025-02-01', endDate: '2025-08-30', manager: 'Lê Thu Hương' },
  { id: 'DA006', name: 'Showroom Sunrise - Thiết kế', customer: 'Công ty CP Sunrise', customerId: 'KH006', type: 'Thiết kế nội thất', address: '100 NTMK, Q.1, TP.HCM', budget: 2800000000, spent: 500000000, status: 'Báo giá', progress: 10, startDate: '2025-11-01', endDate: '2026-06-30', manager: 'Lê Thu Hương' },
  { id: 'DA007', name: 'Nhà phố Tân Bình - Nội thất phòng khách', customer: 'Đỗ Quang Khải', customerId: 'KH008', type: 'Thiết kế nội thất', address: '200 Trường Chinh, Tân Bình', budget: 350000000, spent: 200000000, status: 'Thi công', progress: 55, startDate: '2025-10-01', endDate: '2026-02-28', manager: 'Trần Đức Minh' },
];

export const products = [
  { id: 'SP001', name: 'Gỗ Óc chó (Walnut) nhập Mỹ', category: 'Gỗ', unit: 'm³', importPrice: 35000000, salePrice: 45000000, stock: 12, minStock: 5, supplier: 'Timber World USA' },
  { id: 'SP002', name: 'Gỗ Sồi (Oak) Châu Âu', category: 'Gỗ', unit: 'm³', importPrice: 22000000, salePrice: 30000000, stock: 18, minStock: 8, supplier: 'Euro Wood Co.' },
  { id: 'SP003', name: 'Đá Marble trắng Ý', category: 'Đá', unit: 'm²', importPrice: 3500000, salePrice: 5200000, stock: 45, minStock: 20, supplier: 'Italian Stone SRL' },
  { id: 'SP004', name: 'Sơn Dulux Weathershield', category: 'Sơn', unit: 'thùng', importPrice: 850000, salePrice: 1200000, stock: 120, minStock: 30, supplier: 'AkzoNobel VN' },
  { id: 'SP005', name: 'Tay nắm cửa inox 304', category: 'Phụ kiện', unit: 'bộ', importPrice: 180000, salePrice: 350000, stock: 200, minStock: 50, supplier: 'Hafele VN' },
  { id: 'SP006', name: 'Bản lề giảm chấn Blum', category: 'Phụ kiện', unit: 'bộ', importPrice: 95000, salePrice: 180000, stock: 350, minStock: 100, supplier: 'Blum Austria' },
  { id: 'SP007', name: 'Đèn LED panel 600x600', category: 'Thiết bị', unit: 'cái', importPrice: 320000, salePrice: 550000, stock: 80, minStock: 20, supplier: 'Philips VN' },
  { id: 'SP008', name: 'Sofa da Ý - 3 chỗ ngồi', category: 'Nội thất', unit: 'bộ', importPrice: 25000000, salePrice: 42000000, stock: 5, minStock: 2, supplier: 'Milano Furniture' },
  { id: 'SP009', name: 'Bàn ăn gỗ Óc chó 8 chỗ', category: 'Nội thất', unit: 'cái', importPrice: 18000000, salePrice: 32000000, stock: 3, minStock: 2, supplier: 'Xưởng nội thất ABC' },
  { id: 'SP010', name: 'Xi măng Holcim PCB40', category: 'Vật liệu XD', unit: 'tấn', importPrice: 1800000, salePrice: 2200000, stock: 50, minStock: 15, supplier: 'Holcim VN' },
  { id: 'SP011', name: 'Thép Hòa Phát D10', category: 'Vật liệu XD', unit: 'tấn', importPrice: 14500000, salePrice: 16000000, stock: 30, minStock: 10, supplier: 'Hòa Phát Group' },
  { id: 'SP012', name: 'Gạch lát nền Viglacera 60x60', category: 'Vật liệu XD', unit: 'm²', importPrice: 185000, salePrice: 280000, stock: 500, minStock: 100, supplier: 'Viglacera' },
];

export const quotations = [
  { id: 'BG001', projectId: 'DA001', project: 'Villa Thảo Điền', customer: 'Nguyễn Văn An', total: 1200000000, discount: 5, vat: 10, grandTotal: 1254000000, status: 'Hợp đồng', createdDate: '2025-05-15', validUntil: '2025-06-15' },
  { id: 'BG002', projectId: 'DA002', project: 'Nhà phố Quận 7', customer: 'Trần Thị Bích', total: 4500000000, discount: 3, vat: 10, grandTotal: 4801500000, status: 'Đàm phán', createdDate: '2025-09-01', validUntil: '2025-10-01' },
  { id: 'BG003', projectId: 'DA003', project: 'Văn phòng Hoàng Gia', customer: 'Công ty TNHH Hoàng Gia', total: 3200000000, discount: 8, vat: 10, grandTotal: 3238400000, status: 'Hợp đồng', createdDate: '2024-12-20', validUntil: '2025-01-20' },
  { id: 'BG004', projectId: 'DA006', project: 'Showroom Sunrise', customer: 'Công ty CP Sunrise', total: 2800000000, discount: 5, vat: 10, grandTotal: 2926000000, status: 'Gửi KH', createdDate: '2025-10-25', validUntil: '2025-11-25' },
  { id: 'BG005', projectId: 'DA007', project: 'Nhà phố Tân Bình', customer: 'Đỗ Quang Khải', total: 350000000, discount: 0, vat: 10, grandTotal: 385000000, status: 'Hợp đồng', createdDate: '2025-09-20', validUntil: '2025-10-20' },
  { id: 'BG006', projectId: null, project: 'Căn hộ Masteri - Nội thất', customer: 'Võ Thanh Hà', total: 280000000, discount: 0, vat: 10, grandTotal: 308000000, status: 'Nháp', createdDate: '2026-02-10', validUntil: '2026-03-10' },
];

export const inventory = [
  { id: 'PXK001', type: 'Xuất', product: 'Gỗ Óc chó (Walnut)', quantity: 2, unit: 'm³', warehouse: 'Kho chính', project: 'DA001', date: '2025-10-15', note: 'Xuất cho thi công tủ bếp' },
  { id: 'PNK001', type: 'Nhập', product: 'Gỗ Sồi (Oak) Châu Âu', quantity: 5, unit: 'm³', warehouse: 'Kho chính', project: null, date: '2025-10-10', note: 'Nhập hàng từ Euro Wood' },
  { id: 'PXK002', type: 'Xuất', product: 'Đá Marble trắng Ý', quantity: 15, unit: 'm²', warehouse: 'Kho chính', project: 'DA003', date: '2025-10-12', note: 'Xuất cho ốp sảnh VP' },
  { id: 'PNK002', type: 'Nhập', product: 'Sơn Dulux Weathershield', quantity: 50, unit: 'thùng', warehouse: 'Kho công trình Q7', project: null, date: '2025-10-08', note: 'Nhập cho dự án nhà phố Q7' },
  { id: 'PXK003', type: 'Xuất', product: 'Xi măng Holcim PCB40', quantity: 10, unit: 'tấn', warehouse: 'Kho công trình Q7', project: 'DA002', date: '2025-10-14', note: 'Xuất đổ móng' },
  { id: 'PXK004', type: 'Xuất', product: 'Bản lề giảm chấn Blum', quantity: 30, unit: 'bộ', warehouse: 'Kho chính', project: 'DA001', date: '2025-10-16', note: 'Xuất lắp tủ' },
  { id: 'PNK003', type: 'Nhập', product: 'Sofa da Ý - 3 chỗ ngồi', quantity: 3, unit: 'bộ', warehouse: 'Kho showroom', project: null, date: '2025-10-05', note: 'Nhập trưng bày showroom' },
  { id: 'PXK005', type: 'Xuất', product: 'Thép Hòa Phát D10', quantity: 8, unit: 'tấn', warehouse: 'Kho công trình Q9', project: 'DA004', date: '2025-10-13', note: 'Xuất đổ dầm tầng 2' },
];

export const warehouses = [
  { id: 'W01', name: 'Kho chính - Bình Dương', address: 'KCN VSIP, Bình Dương', totalItems: 840, value: 4250000000 },
  { id: 'W02', name: 'Kho công trình Q7', address: '45 Nguyễn Lương Bằng, Q.7', totalItems: 120, value: 580000000 },
  { id: 'W03', name: 'Kho công trình Q9', address: '200 Đỗ Xuân Hợp, Q.9', totalItems: 95, value: 820000000 },
  { id: 'W04', name: 'Kho Showroom', address: '100 NTMK, Q.1, TP.HCM', totalItems: 45, value: 1200000000 },
];

export const finances = {
  revenue: [
    { month: 'T1', value: 1200000000 },
    { month: 'T2', value: 980000000 },
    { month: 'T3', value: 1500000000 },
    { month: 'T4', value: 1350000000 },
    { month: 'T5', value: 1800000000 },
    { month: 'T6', value: 2100000000 },
    { month: 'T7', value: 1950000000 },
    { month: 'T8', value: 2300000000 },
    { month: 'T9', value: 2150000000 },
    { month: 'T10', value: 2500000000 },
    { month: 'T11', value: 2800000000 },
    { month: 'T12', value: 3100000000 },
  ],
  expenses: [
    { month: 'T1', value: 850000000 },
    { month: 'T2', value: 720000000 },
    { month: 'T3', value: 1100000000 },
    { month: 'T4', value: 980000000 },
    { month: 'T5', value: 1300000000 },
    { month: 'T6', value: 1550000000 },
    { month: 'T7', value: 1400000000 },
    { month: 'T8', value: 1700000000 },
    { month: 'T9', value: 1600000000 },
    { month: 'T10', value: 1850000000 },
    { month: 'T11', value: 2100000000 },
    { month: 'T12', value: 2350000000 },
  ],
  transactions: [
    { id: 'GD001', type: 'Thu', description: 'Thanh toán đợt 2 - Villa Thảo Điền', amount: 360000000, project: 'DA001', date: '2026-02-15', category: 'Thanh toán dự án' },
    { id: 'GD002', type: 'Chi', description: 'Mua gỗ Óc chó - Timber World', amount: 175000000, project: 'DA001', date: '2026-02-14', category: 'Vật tư' },
    { id: 'GD003', type: 'Thu', description: 'Đặt cọc - Showroom Sunrise', amount: 500000000, project: 'DA006', date: '2026-02-13', category: 'Đặt cọc' },
    { id: 'GD004', type: 'Chi', description: 'Lương nhân viên tháng 1/2026', amount: 485000000, project: null, date: '2026-02-05', category: 'Lương' },
    { id: 'GD005', type: 'Chi', description: 'Mua thép Hòa Phát - DA004', amount: 116000000, project: 'DA004', date: '2026-02-12', category: 'Vật tư' },
    { id: 'GD006', type: 'Thu', description: 'Thanh toán cuối - Căn hộ Vinhomes', amount: 180000000, project: 'DA005', date: '2026-02-10', category: 'Thanh toán dự án' },
    { id: 'GD007', type: 'Chi', description: 'Thuê xe cẩu - Biệt thự Q9', amount: 45000000, project: 'DA004', date: '2026-02-08', category: 'Thuê thiết bị' },
    { id: 'GD008', type: 'Chi', description: 'Điện nước văn phòng T1', amount: 12000000, project: null, date: '2026-02-03', category: 'Vận hành' },
  ],
  receivables: 5200000000,
  payables: 2800000000,
};

export const employees = [
  { id: 'NV001', name: 'Trần Đức Minh', department: 'Quản lý dự án', position: 'Giám đốc dự án', phone: '0901111111', email: 'minh.td@company.vn', salary: 45000000, joinDate: '2020-03-15', status: 'Đang làm', projects: ['DA001', 'DA003', 'DA007'] },
  { id: 'NV002', name: 'Nguyễn Hoàng Long', department: 'Quản lý dự án', position: 'Quản lý dự án', phone: '0902222222', email: 'long.nh@company.vn', salary: 35000000, joinDate: '2021-06-01', status: 'Đang làm', projects: ['DA002', 'DA004'] },
  { id: 'NV003', name: 'Lê Thu Hương', department: 'Thiết kế', position: 'Trưởng phòng Thiết kế', phone: '0903333333', email: 'huong.lt@company.vn', salary: 38000000, joinDate: '2020-08-10', status: 'Đang làm', projects: ['DA005', 'DA006'] },
  { id: 'NV004', name: 'Phạm Văn Tùng', department: 'Thiết kế', position: 'Kiến trúc sư', phone: '0904444444', email: 'tung.pv@company.vn', salary: 28000000, joinDate: '2022-01-15', status: 'Đang làm', projects: ['DA002'] },
  { id: 'NV005', name: 'Hoàng Minh Tuấn', department: 'Thi công', position: 'Đội trưởng thi công', phone: '0905555555', email: 'tuan.hm@company.vn', salary: 22000000, joinDate: '2021-09-20', status: 'Đang làm', projects: ['DA001', 'DA004'] },
  { id: 'NV006', name: 'Nguyễn Thị Lan', department: 'Kinh doanh', position: 'Trưởng phòng KD', phone: '0906666666', email: 'lan.nt@company.vn', salary: 32000000, joinDate: '2020-05-01', status: 'Đang làm', projects: [] },
  { id: 'NV007', name: 'Vũ Đức Anh', department: 'Kế toán', position: 'Kế toán trưởng', phone: '0907777777', email: 'anh.vd@company.vn', salary: 30000000, joinDate: '2020-04-01', status: 'Đang làm', projects: [] },
  { id: 'NV008', name: 'Đặng Thị Mai', department: 'Hành chính', position: 'Trưởng phòng HC-NS', phone: '0908888888', email: 'mai.dt@company.vn', salary: 25000000, joinDate: '2021-02-15', status: 'Đang làm', projects: [] },
  { id: 'NV009', name: 'Lý Thanh Sơn', department: 'Thi công', position: 'Kỹ sư giám sát', phone: '0909999999', email: 'son.lt@company.vn', salary: 25000000, joinDate: '2022-07-10', status: 'Đang làm', projects: ['DA003', 'DA007'] },
  { id: 'NV010', name: 'Bùi Văn Hải', department: 'Thi công', position: 'Thợ mộc chính', phone: '0911111111', email: 'hai.bv@company.vn', salary: 18000000, joinDate: '2023-01-20', status: 'Đang làm', projects: ['DA001'] },
];

export const departments = [
  { name: 'Quản lý dự án', count: 2, head: 'Trần Đức Minh' },
  { name: 'Thiết kế', count: 2, head: 'Lê Thu Hương' },
  { name: 'Thi công', count: 3, head: 'Hoàng Minh Tuấn' },
  { name: 'Kinh doanh', count: 1, head: 'Nguyễn Thị Lan' },
  { name: 'Kế toán', count: 1, head: 'Vũ Đức Anh' },
  { name: 'Hành chính', count: 1, head: 'Đặng Thị Mai' },
];

export const activities = [
  { id: 1, action: 'Cập nhật tiến độ', detail: 'Villa Thảo Điền đạt 65%', user: 'Trần Đức Minh', time: '2 giờ trước', icon: '📊' },
  { id: 2, action: 'Tạo báo giá mới', detail: 'BG006 - Căn hộ Masteri', user: 'Nguyễn Thị Lan', time: '3 giờ trước', icon: '📋' },
  { id: 3, action: 'Nhập kho', detail: '5m³ Gỗ Sồi Châu Âu', user: 'Bùi Văn Hải', time: '5 giờ trước', icon: '📦' },
  { id: 4, action: 'Thanh toán nhận', detail: '360 triệu - Villa Thảo Điền', user: 'Vũ Đức Anh', time: '1 ngày trước', icon: '💰' },
  { id: 5, action: 'Khách hàng mới', detail: 'Võ Thanh Hà - Lead mới', user: 'Nguyễn Thị Lan', time: '1 ngày trước', icon: '👤' },
  { id: 6, action: 'Nghiệm thu', detail: 'VP Hoàng Gia hoàn thành 95%', user: 'Lý Thanh Sơn', time: '2 ngày trước', icon: '✅' },
];

export const dashboardStats = {
  totalRevenue: 24730000000,
  revenueGrowth: 18.5,
  activeProjects: 4,
  projectsGrowth: 12,
  newCustomers: 3,
  customerGrowth: 25,
  pendingQuotations: 2,
  quotationValue: 5109500000,
};

export const projectStatusDistribution = [
  { status: 'Khảo sát', count: 0, color: '#94a3b8' },
  { status: 'Thiết kế', count: 1, color: '#818cf8' },
  { status: 'Báo giá', count: 1, color: '#fbbf24' },
  { status: 'Thi công', count: 3, color: '#38bdf8' },
  { status: 'Nghiệm thu', count: 1, color: '#a78bfa' },
  { status: 'Bàn giao', count: 1, color: '#34d399' },
];

// Format helpers
export const formatCurrency = (value) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)} tỷ`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)} triệu`;
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
};

export const formatFullCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};
