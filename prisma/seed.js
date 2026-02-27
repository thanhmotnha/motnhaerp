const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Clean all tables
    await prisma.contractPayment.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.workOrder.deleteMany();
    await prisma.materialPlan.deleteMany();
    await prisma.purchaseOrderItem.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.projectExpense.deleteMany();
    await prisma.trackingLog.deleteMany();
    await prisma.projectDocument.deleteMany();
    await prisma.contractorPayment.deleteMany();
    await prisma.projectMilestone.deleteMany();
    await prisma.projectBudget.deleteMany();
    await prisma.projectEmployee.deleteMany();
    await prisma.quotationItem.deleteMany();
    await prisma.quotation.deleteMany();
    await prisma.inventoryTransaction.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.project.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.product.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.contractor.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.department.deleteMany();

    // Departments
    const deps = await Promise.all([
        prisma.department.create({ data: { name: 'Thiết kế' } }),
        prisma.department.create({ data: { name: 'Thi công' } }),
        prisma.department.create({ data: { name: 'Kinh doanh' } }),
        prisma.department.create({ data: { name: 'Vật tư' } }),
        prisma.department.create({ data: { name: 'Kế toán' } }),
    ]);

    // Employees
    const emps = await Promise.all([
        prisma.employee.create({ data: { code: 'NV001', name: 'Nguyễn Văn An', position: 'Giám đốc thiết kế', phone: '0901111111', email: 'an@home.vn', salary: 25000000, departmentId: deps[0].id, joinDate: new Date('2023-01-15') } }),
        prisma.employee.create({ data: { code: 'NV002', name: 'Trần Thị Bình', position: 'Thiết kế viên', phone: '0902222222', email: 'binh@home.vn', salary: 15000000, departmentId: deps[0].id, joinDate: new Date('2023-03-01') } }),
        prisma.employee.create({ data: { code: 'NV003', name: 'Lê Minh Cường', position: 'Quản lý thi công', phone: '0903333333', email: 'cuong@home.vn', salary: 20000000, departmentId: deps[1].id, joinDate: new Date('2023-02-01') } }),
        prisma.employee.create({ data: { code: 'NV004', name: 'Phạm Hồng Đức', position: 'Kỹ sư giám sát', phone: '0904444444', email: 'duc@home.vn', salary: 18000000, departmentId: deps[1].id, joinDate: new Date('2023-04-01') } }),
        prisma.employee.create({ data: { code: 'NV005', name: 'Hoàng Thị Em', position: 'Kinh doanh', phone: '0905555555', email: 'em@home.vn', salary: 12000000, departmentId: deps[2].id, joinDate: new Date('2023-05-01') } }),
        prisma.employee.create({ data: { code: 'NV006', name: 'Vũ Quang Phi', position: 'Quản lý vật tư', phone: '0906666666', email: 'phi@home.vn', salary: 14000000, departmentId: deps[3].id, joinDate: new Date('2023-06-01') } }),
        prisma.employee.create({ data: { code: 'NV007', name: 'Đặng Thu Giang', position: 'Kế toán trưởng', phone: '0907777777', email: 'giang@home.vn', salary: 16000000, departmentId: deps[4].id, joinDate: new Date('2023-01-01') } }),
    ]);

    // Warehouses
    const wh = await Promise.all([
        prisma.warehouse.create({ data: { code: 'KHO01', name: 'Kho chính', address: 'Quận 7, TP.HCM' } }),
        prisma.warehouse.create({ data: { code: 'KHO02', name: 'Kho phụ', address: 'Quận 9, TP.HCM' } }),
    ]);

    // Products
    const products = await Promise.all([
        prisma.product.create({ data: { code: 'VT001', name: 'Gạch lát nền 60x60', category: 'Vật liệu xây dựng', unit: 'm²', importPrice: 120000, salePrice: 180000, stock: 500, minStock: 50, supplier: 'Viglacera', brand: 'Viglacera', material: 'Ceramic', origin: 'Việt Nam', location: 'KHO01-A1' } }),
        prisma.product.create({ data: { code: 'VT002', name: 'Sơn nội thất Dulux', category: 'Sơn & Phụ kiện', unit: 'thùng', importPrice: 450000, salePrice: 650000, stock: 200, minStock: 20, supplier: 'AkzoNobel', brand: 'Dulux', origin: 'Singapore', location: 'KHO01-B2' } }),
        prisma.product.create({ data: { code: 'VT003', name: 'Tủ bếp gỗ MDF', category: 'Nội thất', unit: 'bộ', importPrice: 8000000, salePrice: 15000000, stock: 10, minStock: 2, supplier: 'An Cường', brand: 'An Cường', material: 'MDF phủ Melamine', origin: 'Việt Nam', location: 'KHO02-C1' } }),
        prisma.product.create({ data: { code: 'VT004', name: 'Đèn LED âm trần 12W', category: 'Điện & Chiếu sáng', unit: 'cái', importPrice: 85000, salePrice: 150000, stock: 300, minStock: 30, supplier: 'Rạng Đông', brand: 'Rạng Đông', origin: 'Việt Nam', location: 'KHO01-D1' } }),
        prisma.product.create({ data: { code: 'VT005', name: 'Ống nước PPR DN25', category: 'Cấp thoát nước', unit: 'cây', importPrice: 45000, salePrice: 75000, stock: 150, minStock: 20, supplier: 'Bình Minh', brand: 'Bình Minh', origin: 'Việt Nam', location: 'KHO01-E1' } }),
        prisma.product.create({ data: { code: 'VT006', name: 'Sàn gỗ công nghiệp 8mm', category: 'Vật liệu hoàn thiện', unit: 'm²', importPrice: 200000, salePrice: 350000, stock: 400, minStock: 50, supplier: 'Kronotex', brand: 'Kronotex', material: 'HDF', origin: 'Đức', location: 'KHO02-A2' } }),
        prisma.product.create({ data: { code: 'VT007', name: 'Xi măng PCB40', category: 'Vật liệu xây dựng', unit: 'bao', importPrice: 85000, salePrice: 110000, stock: 1000, minStock: 100, supplier: 'Holcim', brand: 'INSEE', origin: 'Việt Nam', location: 'KHO01-F1' } }),
        prisma.product.create({ data: { code: 'VT008', name: 'Cửa nhôm Xingfa', category: 'Cửa & Khung', unit: 'm²', importPrice: 1200000, salePrice: 2000000, stock: 50, minStock: 5, supplier: 'Xingfa', brand: 'Xingfa', material: 'Nhôm', origin: 'Trung Quốc', location: 'KHO02-B1' } }),
    ]);

    // Customers
    const custs = await Promise.all([
        prisma.customer.create({ data: { code: 'KH001', name: 'Nguyễn Thanh Hùng', phone: '0911222333', email: 'hung@gmail.com', address: 'Quận 2, TP.HCM', status: 'Đang thi công', source: 'Facebook', salesPerson: 'Hoàng Thị Em', designer: 'Nguyễn Văn An', totalRevenue: 850000000, projectAddress: '123 Nguyễn Hữu Thọ, Q7' } }),
        prisma.customer.create({ data: { code: 'KH002', name: 'Trần Văn Minh', phone: '0922333444', email: 'minh@gmail.com', address: 'Quận 7, TP.HCM', status: 'Thiết kế', source: 'Giới thiệu', salesPerson: 'Hoàng Thị Em', designer: 'Trần Thị Bình', totalRevenue: 0, projectAddress: '456 Lê Văn Lương, Q7' } }),
        prisma.customer.create({ data: { code: 'KH003', name: 'Lê Thị Hoa', phone: '0933444555', email: 'hoa@gmail.com', address: 'Quận 1, TP.HCM', status: 'Hoàn thành', source: 'Website', salesPerson: 'Hoàng Thị Em', designer: 'Nguyễn Văn An', totalRevenue: 1200000000, projectAddress: '789 Điện Biên Phủ, Q1' } }),
        prisma.customer.create({ data: { code: 'KH004', name: 'Phạm Đức Anh', phone: '0944555666', email: 'anh@gmail.com', address: 'Thủ Đức, TP.HCM', status: 'Báo giá', source: 'Zalo', salesPerson: 'Hoàng Thị Em', designer: 'Trần Thị Bình', totalRevenue: 0, projectAddress: '321 Võ Văn Ngân, Thủ Đức' } }),
        prisma.customer.create({ data: { code: 'KH005', name: 'Võ Thành Long', phone: '0955666777', email: 'long@gmail.com', address: 'Bình Thạnh, TP.HCM', status: 'Ký hợp đồng', source: 'Showroom', salesPerson: 'Hoàng Thị Em', designer: 'Nguyễn Văn An', totalRevenue: 500000000, projectAddress: '654 Xô Viết Nghệ Tĩnh, Bình Thạnh' } }),
        prisma.customer.create({ data: { code: 'KH006', name: 'Đặng Minh Tuấn', phone: '0966777888', email: 'tuan@gmail.com', address: 'Quận 3, TP.HCM', status: 'Lead', source: 'Google Ads', totalRevenue: 0 } }),
        prisma.customer.create({ data: { code: 'KH007', name: 'Bùi Thị Mai', phone: '0977888999', email: 'mai@gmail.com', address: 'Gò Vấp, TP.HCM', status: 'Bảo hành', source: 'Giới thiệu', totalRevenue: 750000000, projectAddress: '888 Quang Trung, Gò Vấp' } }),
        prisma.customer.create({ data: { code: 'KH008', name: 'Cao Văn Thắng', phone: '0988999000', email: 'thang@gmail.com', address: 'Quận 9, TP.HCM', status: 'Đang thi công', source: 'Facebook', salesPerson: 'Hoàng Thị Em', totalRevenue: 650000000, projectAddress: '999 Lê Văn Việt, Q9' } }),
    ]);

    // Contractors
    const ctrs = await Promise.all([
        prisma.contractor.create({ data: { code: 'TP001', name: 'Đội điện Minh Tâm', type: 'Điện', phone: '0912345678', address: 'Q.Bình Tân', rating: 5 } }),
        prisma.contractor.create({ data: { code: 'TP002', name: 'Đội nước Hòa Phát', type: 'Nước', phone: '0923456789', rating: 4 } }),
        prisma.contractor.create({ data: { code: 'TP003', name: 'Đội sơn Đại Việt', type: 'Sơn', phone: '0934567890', rating: 4 } }),
        prisma.contractor.create({ data: { code: 'TP004', name: 'Đội mộc Phú Quý', type: 'Mộc', phone: '0945678901', rating: 5 } }),
        prisma.contractor.create({ data: { code: 'TP005', name: 'Đội xây Thành Đạt', type: 'Xây dựng', phone: '0956789012', rating: 3 } }),
    ]);

    // Projects
    const projs = await Promise.all([
        prisma.project.create({ data: { code: 'DA001', name: 'Biệt thự Phú Mỹ Hưng', type: 'Biệt thự', address: '123 Nguyễn Hữu Thọ, Q7', area: 350, floors: 3, budget: 2500000000, spent: 1800000000, contractValue: 2200000000, paidAmount: 1500000000, status: 'Đang thi công', phase: 'Hoàn thiện', progress: 72, startDate: new Date('2025-06-01'), endDate: new Date('2026-06-01'), manager: 'Lê Minh Cường', customerId: custs[0].id } }),
        prisma.project.create({ data: { code: 'DA002', name: 'Căn hộ Vinhomes Q7', type: 'Căn hộ', address: '456 Lê Văn Lương, Q7', area: 85, floors: 1, budget: 350000000, contractValue: 0, status: 'Thiết kế', phase: 'Thiết kế', progress: 15, startDate: new Date('2026-01-15'), manager: 'Nguyễn Văn An', customerId: custs[1].id } }),
        prisma.project.create({ data: { code: 'DA003', name: 'Nhà phố Quận 1', type: 'Nhà phố', address: '789 Điện Biên Phủ, Q1', area: 120, floors: 4, budget: 1800000000, spent: 1750000000, contractValue: 1600000000, paidAmount: 1600000000, status: 'Hoàn thành', phase: 'Bàn giao', progress: 100, startDate: new Date('2024-06-01'), endDate: new Date('2025-03-01'), manager: 'Lê Minh Cường', customerId: custs[2].id } }),
        prisma.project.create({ data: { code: 'DA004', name: 'Showroom Thủ Đức', type: 'Thương mại', address: '321 Võ Văn Ngân', area: 200, budget: 800000000, status: 'Báo giá', phase: 'Khảo sát', progress: 0, customerId: custs[3].id } }),
        prisma.project.create({ data: { code: 'DA005', name: 'Penthouse Bình Thạnh', type: 'Căn hộ', address: '654 Xô Viết Nghệ Tĩnh', area: 180, floors: 2, budget: 1500000000, contractValue: 1350000000, paidAmount: 500000000, status: 'Chuẩn bị thi công', phase: 'Ký HĐ', progress: 5, startDate: new Date('2026-03-01'), manager: 'Lê Minh Cường', customerId: custs[4].id } }),
        prisma.project.create({ data: { code: 'DA006', name: 'Nhà phố Gò Vấp', type: 'Nhà phố', address: '888 Quang Trung', area: 100, floors: 3, budget: 900000000, spent: 880000000, contractValue: 850000000, paidAmount: 850000000, status: 'Bảo hành', phase: 'Bảo hành', progress: 100, startDate: new Date('2024-01-01'), endDate: new Date('2024-12-01'), manager: 'Phạm Hồng Đức', customerId: custs[6].id } }),
        prisma.project.create({ data: { code: 'DA007', name: 'Villa Quận 9', type: 'Biệt thự', address: '999 Lê Văn Việt', area: 280, floors: 2, budget: 1800000000, spent: 600000000, contractValue: 1650000000, paidAmount: 650000000, status: 'Đang thi công', phase: 'Thô', progress: 35, startDate: new Date('2025-11-01'), endDate: new Date('2026-08-01'), manager: 'Lê Minh Cường', customerId: custs[7].id } }),
    ]);

    // Milestones for DA001
    const ms = ['Phá dỡ & chuẩn bị', 'Xây thô', 'Điện nước', 'Trát tô', 'Lát gạch', 'Sơn bả', 'Lắp nội thất', 'Hoàn thiện & bàn giao'];
    for (let i = 0; i < ms.length; i++) {
        await prisma.projectMilestone.create({ data: { name: ms[i], order: i + 1, progress: i < 5 ? 100 : i === 5 ? 60 : 0, status: i < 5 ? 'Hoàn thành' : i === 5 ? 'Đang thực hiện' : 'Chưa bắt đầu', projectId: projs[0].id, startDate: new Date(2025, 5 + Math.floor(i / 2), 1), endDate: new Date(2025, 6 + Math.floor(i / 2), 1) } });
    }

    // Milestones for DA007
    const ms7 = ['Móng', 'Xây thô tầng 1', 'Xây thô tầng 2', 'Mái', 'Điện nước', 'Hoàn thiện'];
    for (let i = 0; i < ms7.length; i++) {
        await prisma.projectMilestone.create({ data: { name: ms7[i], order: i + 1, progress: i < 2 ? 100 : i === 2 ? 40 : 0, status: i < 2 ? 'Hoàn thành' : i === 2 ? 'Đang thực hiện' : 'Chưa bắt đầu', projectId: projs[6].id } });
    }

    // Budgets
    const budgetCats = ['Vật liệu xây dựng', 'Nhân công', 'Nội thất', 'Điện nước', 'Sơn & hoàn thiện', 'Quản lý & khác'];
    for (const p of [projs[0], projs[2], projs[6]]) {
        for (const cat of budgetCats) {
            const bAmt = Math.round((Math.random() * 300 + 100) * 1000000);
            await prisma.projectBudget.create({ data: { category: cat, budgetAmount: bAmt, actualAmount: Math.round(bAmt * (0.7 + Math.random() * 0.5)), projectId: p.id } });
        }
    }

    // Contractor Payments
    await prisma.contractorPayment.create({ data: { contractAmount: 180000000, paidAmount: 120000000, status: 'Đang TT', description: 'Hệ thống điện toàn bộ', contractorId: ctrs[0].id, projectId: projs[0].id } });
    await prisma.contractorPayment.create({ data: { contractAmount: 95000000, paidAmount: 95000000, status: 'Đã TT', description: 'Hệ thống nước', contractorId: ctrs[1].id, projectId: projs[0].id } });
    await prisma.contractorPayment.create({ data: { contractAmount: 250000000, paidAmount: 100000000, status: 'Đang TT', description: 'Đồ gỗ nội thất', contractorId: ctrs[3].id, projectId: projs[0].id } });
    await prisma.contractorPayment.create({ data: { contractAmount: 120000000, paidAmount: 40000000, status: 'Đang TT', description: 'Xây thô', contractorId: ctrs[4].id, projectId: projs[6].id } });

    // Quotations
    const q1 = await prisma.quotation.create({ data: { code: 'BG001', total: 2000000000, discount: 5, vat: 10, grandTotal: 2090000000, status: 'Đã duyệt', type: 'Thi công', customerId: custs[0].id, projectId: projs[0].id } });
    const q2 = await prisma.quotation.create({ data: { code: 'BG002', total: 320000000, discount: 0, vat: 10, grandTotal: 352000000, status: 'Chờ duyệt', type: 'Thiết kế', customerId: custs[1].id, projectId: projs[1].id } });
    const q3 = await prisma.quotation.create({ data: { code: 'BG003', total: 1500000000, discount: 3, vat: 10, grandTotal: 1599750000, status: 'Đã duyệt', type: 'Thi công', customerId: custs[2].id, projectId: projs[2].id } });
    const q4 = await prisma.quotation.create({ data: { code: 'BG004', total: 750000000, discount: 0, vat: 10, grandTotal: 825000000, status: 'Nháp', type: 'Thi công', customerId: custs[3].id, projectId: projs[3].id } });
    const q5 = await prisma.quotation.create({ data: { code: 'BG005', total: 1300000000, discount: 2, vat: 10, grandTotal: 1401400000, status: 'Đã duyệt', type: 'Thi công + Nội thất', customerId: custs[4].id, projectId: projs[4].id } });

    // Quotation Items for BG001
    await prisma.quotationItem.createMany({
        data: [
            { name: 'Phá dỡ & vận chuyển', unit: 'm²', quantity: 350, unitPrice: 150000, amount: 52500000, quotationId: q1.id },
            { name: 'Xây tường gạch', unit: 'm²', quantity: 500, unitPrice: 350000, amount: 175000000, quotationId: q1.id },
            { name: 'Lát gạch nền', unit: 'm²', quantity: 350, unitPrice: 180000, amount: 63000000, quotationId: q1.id, productId: products[0].id },
            { name: 'Sơn nội thất', unit: 'm²', quantity: 800, unitPrice: 85000, amount: 68000000, quotationId: q1.id, productId: products[1].id },
            { name: 'Tủ bếp gỗ MDF', unit: 'bộ', quantity: 1, unitPrice: 15000000, amount: 15000000, quotationId: q1.id, productId: products[2].id },
        ]
    });

    // Contracts
    const c1 = await prisma.contract.create({ data: { code: 'HD001', name: 'HĐ thi công Biệt thự PMH', type: 'Thi công', contractValue: 2200000000, paidAmount: 1500000000, status: 'Đang thực hiện', signDate: new Date('2025-05-20'), startDate: new Date('2025-06-01'), endDate: new Date('2026-06-01'), paymentTerms: 'Thanh toán theo tiến độ', customerId: custs[0].id, projectId: projs[0].id, quotationId: q1.id } });
    const c2 = await prisma.contract.create({ data: { code: 'HD002', name: 'HĐ thiết kế Căn hộ VH', type: 'Thiết kế', contractValue: 50000000, paidAmount: 50000000, status: 'Đang thực hiện', signDate: new Date('2026-01-10'), customerId: custs[1].id, projectId: projs[1].id, quotationId: q2.id } });
    const c3 = await prisma.contract.create({ data: { code: 'HD003', name: 'HĐ thi công Nhà phố Q1', type: 'Thi công + Nội thất', contractValue: 1600000000, paidAmount: 1600000000, status: 'Hoàn thành', signDate: new Date('2024-05-15'), customerId: custs[2].id, projectId: projs[2].id, quotationId: q3.id } });
    const c4 = await prisma.contract.create({ data: { code: 'HD004', name: 'HĐ thi công Penthouse', type: 'Thi công', contractValue: 1350000000, paidAmount: 500000000, variationAmount: 50000000, status: 'Đã ký', signDate: new Date('2026-02-15'), customerId: custs[4].id, projectId: projs[4].id, quotationId: q5.id } });
    const c5 = await prisma.contract.create({ data: { code: 'HD005', name: 'HĐ thi công Villa Q9', type: 'Thi công', contractValue: 1650000000, paidAmount: 650000000, status: 'Đang thực hiện', signDate: new Date('2025-10-20'), customerId: custs[7].id, projectId: projs[6].id } });

    // Contract Payments (thu tiền theo đợt)
    const payPhases = [
        { phase: 'Đợt 1 - Ký HĐ (30%)', pct: 0.3 },
        { phase: 'Đợt 2 - Xây thô (30%)', pct: 0.3 },
        { phase: 'Đợt 3 - Hoàn thiện (30%)', pct: 0.3 },
        { phase: 'Đợt 4 - Bàn giao (10%)', pct: 0.1 },
    ];
    for (const ct of [c1, c4, c5]) {
        for (let i = 0; i < payPhases.length; i++) {
            const amt = Math.round(ct.contractValue * payPhases[i].pct);
            const pd = i === 0 ? amt : i === 1 && ct === c1 ? amt : 0;
            await prisma.contractPayment.create({ data: { phase: payPhases[i].phase, amount: amt, paidAmount: pd, category: 'Hợp đồng', status: pd >= amt ? 'Đã thu' : pd > 0 ? 'Thu một phần' : 'Chưa thu', contractId: ct.id } });
        }
    }

    // Work Orders
    const woData = [
        { code: 'WO001', title: 'Kiểm tra hệ thống điện tầng 2', priority: 'Cao', status: 'Đang xử lý', assignee: 'Phạm Hồng Đức', category: 'Điện', projectId: projs[0].id },
        { code: 'WO002', title: 'Lắp đặt tủ bếp', priority: 'Trung bình', status: 'Chờ xử lý', assignee: 'Lê Minh Cường', category: 'Nội thất', projectId: projs[0].id },
        { code: 'WO003', title: 'Sửa ống nước rò rỉ', priority: 'Cao', status: 'Hoàn thành', assignee: 'Phạm Hồng Đức', category: 'Nước', projectId: projs[0].id },
        { code: 'WO004', title: 'Đo đạc mặt bằng', priority: 'Trung bình', status: 'Đang xử lý', assignee: 'Nguyễn Văn An', category: 'Khảo sát', projectId: projs[1].id },
        { code: 'WO005', title: 'Nghiệm thu sơn tầng 1', priority: 'Thấp', status: 'Chờ xử lý', assignee: 'Lê Minh Cường', category: 'Sơn', projectId: projs[6].id },
        { code: 'WO006', title: 'Lắp cửa nhôm tầng trệt', priority: 'Cao', status: 'Đang xử lý', assignee: 'Phạm Hồng Đức', category: 'Cửa', projectId: projs[6].id },
        { code: 'WO007', title: 'Bảo hành nứt tường', priority: 'Cao', status: 'Chờ xử lý', assignee: 'Lê Minh Cường', category: 'Bảo hành', projectId: projs[5].id },
    ];
    for (const wo of woData) {
        await prisma.workOrder.create({ data: { ...wo, dueDate: new Date(Date.now() + Math.random() * 30 * 86400000) } });
    }

    // Material Plans
    for (const prod of [products[0], products[1], products[3], products[4], products[6]]) {
        const qty = Math.round(Math.random() * 100 + 20);
        const ordered = Math.round(qty * (0.3 + Math.random() * 0.5));
        await prisma.materialPlan.create({ data: { quantity: qty, orderedQty: ordered, receivedQty: Math.round(ordered * 0.8), unitPrice: prod.importPrice, totalAmount: qty * prod.importPrice, status: ordered >= qty ? 'Đã đặt đủ' : ordered > 0 ? 'Đặt một phần' : 'Chưa đặt', type: 'Chính', productId: prod.id, projectId: projs[0].id } });
    }
    for (const prod of [products[5], products[6], products[7]]) {
        const qty = Math.round(Math.random() * 50 + 10);
        await prisma.materialPlan.create({ data: { quantity: qty, orderedQty: 0, receivedQty: 0, unitPrice: prod.importPrice, totalAmount: qty * prod.importPrice, status: 'Chưa đặt', type: 'Chính', productId: prod.id, projectId: projs[6].id } });
    }

    // Purchase Orders
    const po1 = await prisma.purchaseOrder.create({ data: { code: 'PO001', supplier: 'Viglacera', totalAmount: 18000000, paidAmount: 18000000, status: 'Hoàn thành', orderDate: new Date('2025-07-01'), deliveryDate: new Date('2025-07-10'), receivedDate: new Date('2025-07-10'), projectId: projs[0].id } });
    await prisma.purchaseOrderItem.create({ data: { productName: 'Gạch lát nền 60x60', unit: 'm²', quantity: 100, unitPrice: 120000, amount: 12000000, receivedQty: 100, purchaseOrderId: po1.id } });
    await prisma.purchaseOrderItem.create({ data: { productName: 'Xi măng PCB40', unit: 'bao', quantity: 50, unitPrice: 85000, amount: 4250000, receivedQty: 50, purchaseOrderId: po1.id } });

    const po2 = await prisma.purchaseOrder.create({ data: { code: 'PO002', supplier: 'An Cường', totalAmount: 15000000, paidAmount: 7500000, status: 'Đang giao', orderDate: new Date('2026-01-15'), deliveryDate: new Date('2026-02-01'), projectId: projs[0].id } });
    await prisma.purchaseOrderItem.create({ data: { productName: 'Tủ bếp gỗ MDF', unit: 'bộ', quantity: 1, unitPrice: 15000000, amount: 15000000, receivedQty: 0, purchaseOrderId: po2.id } });

    const po3 = await prisma.purchaseOrder.create({ data: { code: 'PO003', supplier: 'Xingfa', totalAmount: 60000000, status: 'Chờ duyệt', projectId: projs[6].id } });
    await prisma.purchaseOrderItem.create({ data: { productName: 'Cửa nhôm Xingfa', unit: 'm²', quantity: 30, unitPrice: 1200000, amount: 36000000, purchaseOrderId: po3.id } });
    await prisma.purchaseOrderItem.create({ data: { productName: 'Sàn gỗ công nghiệp 8mm', unit: 'm²', quantity: 80, unitPrice: 200000, amount: 16000000, purchaseOrderId: po3.id } });

    // Project Expenses
    const expCats = ['Giao thông', 'Vận chuyển', 'Ăn uống', 'Dụng cụ', 'Xăng dầu', 'Khác'];
    for (let i = 0; i < 12; i++) {
        const cat = expCats[Math.floor(Math.random() * expCats.length)];
        const amt = Math.round((Math.random() * 5 + 0.5) * 100000);
        const proj = i < 7 ? projs[0] : projs[6];
        const st = i < 5 ? 'Đã thanh toán' : i < 8 ? 'Đã duyệt' : 'Chờ duyệt';
        await prisma.projectExpense.create({ data: { code: `CP${String(i + 1).padStart(3, '0')}`, description: `Chi phí ${cat.toLowerCase()} ${i + 1}`, amount: amt, paidAmount: st === 'Đã thanh toán' ? amt : 0, category: cat, status: st, submittedBy: emps[Math.floor(Math.random() * 4)].name, date: new Date(Date.now() - Math.random() * 90 * 86400000), projectId: proj.id } });
    }

    // Tracking Logs
    const logTypes = ['Điện thoại', 'Gặp mặt', 'Zalo', 'Email', 'Ghi chú'];
    for (const cust of [custs[0], custs[1], custs[3], custs[5]]) {
        for (let i = 0; i < 3; i++) {
            await prisma.trackingLog.create({ data: { content: `Liên hệ lần ${i + 1}: trao đổi về tiến độ và yêu cầu`, type: logTypes[Math.floor(Math.random() * logTypes.length)], contactMethod: logTypes[Math.floor(Math.random() * 3)], createdBy: 'Hoàng Thị Em', customerId: cust.id, projectId: cust === custs[0] ? projs[0].id : null, nextFollowUp: new Date(Date.now() + (i + 1) * 7 * 86400000), createdAt: new Date(Date.now() - (3 - i) * 7 * 86400000) } });
        }
    }

    // Documents
    const docCats = ['Bản vẽ', 'Ảnh hiện trạng', 'Hợp đồng', 'Biên bản', 'Báo giá', 'Ảnh thi công'];
    for (const proj of [projs[0], projs[2], projs[6]]) {
        for (let i = 0; i < 4; i++) {
            const cat = docCats[Math.floor(Math.random() * docCats.length)];
            await prisma.projectDocument.create({ data: { name: `${cat} - ${proj.name} (${i + 1})`, fileName: `${cat.toLowerCase().replace(/ /g, '_')}_${i + 1}.pdf`, category: cat, fileSize: Math.round(Math.random() * 5000000), uploadedBy: emps[Math.floor(Math.random() * 3)].name, projectId: proj.id, customerId: proj.customerId } });
        }
    }

    // Financial Transactions
    const txData = [
        { code: 'TX001', type: 'Thu', description: 'Thu đợt 1 - DA001', amount: 660000000, category: 'Hợp đồng', projectId: projs[0].id },
        { code: 'TX002', type: 'Thu', description: 'Thu đợt 2 - DA001', amount: 660000000, category: 'Hợp đồng', projectId: projs[0].id },
        { code: 'TX003', type: 'Thu', description: 'Thu thêm - DA001', amount: 180000000, category: 'Phát sinh', projectId: projs[0].id },
        { code: 'TX004', type: 'Chi', description: 'Thanh toán thầu phụ điện', amount: 120000000, category: 'Thầu phụ', projectId: projs[0].id },
        { code: 'TX005', type: 'Chi', description: 'Mua vật tư đợt 1', amount: 350000000, category: 'Vật tư', projectId: projs[0].id },
        { code: 'TX006', type: 'Thu', description: 'Thanh toán toàn bộ - DA003', amount: 1600000000, category: 'Hợp đồng', projectId: projs[2].id },
        { code: 'TX007', type: 'Chi', description: 'Chi phí thi công - DA003', amount: 1200000000, category: 'Thi công', projectId: projs[2].id },
        { code: 'TX008', type: 'Thu', description: 'Thu đợt 1 - DA007', amount: 495000000, category: 'Hợp đồng', projectId: projs[6].id },
        { code: 'TX009', type: 'Thu', description: 'Thu đợt 2 - DA007', amount: 155000000, category: 'Hợp đồng', projectId: projs[6].id },
        { code: 'TX010', type: 'Chi', description: 'Mua vật tư - DA007', amount: 200000000, category: 'Vật tư', projectId: projs[6].id },
    ];
    for (const tx of txData) {
        await prisma.transaction.create({ data: { ...tx, date: new Date(Date.now() - Math.random() * 180 * 86400000) } });
    }

    console.log('✅ Seeding complete!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
