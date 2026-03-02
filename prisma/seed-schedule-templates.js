const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seed schedule templates cho HomeERP.
 * Run: node prisma/seed-schedule-templates.js
 */
async function main() {
    console.log('Seeding schedule templates...');

    // ===== 1. MẪU THI CÔNG XÂY THÔ 3 THÁNG =====
    const thoCung = await prisma.scheduleTemplate.create({
        data: {
            name: 'Thi công xây thô 3 tháng',
            type: 'Xây thô',
            description: 'Mẫu tiến độ cho công trình xây thô từ móng đến hoàn thiện kết cấu. Phù hợp nhà phố 3-4 tầng.',
        },
    });

    const thoItems = [
        // Level 0: Giai đoạn   |  Level 1: Hạng mục
        { name: 'Phần Móng', level: 0, wbs: '1', duration: 15, weight: 3, color: '#ef4444', parent: null, pred: null },
        { name: 'Đào đất, san lấp', level: 1, wbs: '1.1', duration: 3, weight: 1, color: '', parent: 0, pred: null },
        { name: 'Ép cọc / Khoan nhồi', level: 1, wbs: '1.2', duration: 4, weight: 1, color: '', parent: 0, pred: 1 },
        { name: 'Làm thép đài móng', level: 1, wbs: '1.3', duration: 3, weight: 1, color: '', parent: 0, pred: 2 },
        { name: 'Đổ bê tông đài móng', level: 1, wbs: '1.4', duration: 2, weight: 1, color: '', parent: 0, pred: 3 },
        { name: 'Xây tường móng + chống thấm', level: 1, wbs: '1.5', duration: 3, weight: 1, color: '', parent: 0, pred: 4 },

        { name: 'Phần Thô', level: 0, wbs: '2', duration: 45, weight: 5, color: '#f59e0b', parent: null, pred: 0 },
        { name: 'Cốt thép + ván khuôn tầng 1', level: 1, wbs: '2.1', duration: 7, weight: 1, color: '', parent: 6, pred: null },
        { name: 'Đổ bê tông sàn tầng 1', level: 1, wbs: '2.2', duration: 2, weight: 1, color: '', parent: 6, pred: 7 },
        { name: 'Xây tường tầng 1', level: 1, wbs: '2.3', duration: 7, weight: 1, color: '', parent: 6, pred: 8 },
        { name: 'Cốt thép + ván khuôn tầng 2', level: 1, wbs: '2.4', duration: 7, weight: 1, color: '', parent: 6, pred: 9 },
        { name: 'Đổ bê tông sàn tầng 2', level: 1, wbs: '2.5', duration: 2, weight: 1, color: '', parent: 6, pred: 10 },
        { name: 'Xây tường tầng 2', level: 1, wbs: '2.6', duration: 7, weight: 1, color: '', parent: 6, pred: 11 },
        { name: 'Đổ bê tông mái', level: 1, wbs: '2.7', duration: 3, weight: 1, color: '', parent: 6, pred: 12 },

        { name: 'Hoàn thiện thô', level: 0, wbs: '3', duration: 25, weight: 3, color: '#22c55e', parent: null, pred: 6 },
        { name: 'Trát tường trong + ngoài', level: 1, wbs: '3.1', duration: 10, weight: 1, color: '', parent: 14, pred: null },
        { name: 'Lắp đặt điện nước âm tường', level: 1, wbs: '3.2', duration: 7, weight: 1, color: '', parent: 14, pred: 15 },
        { name: 'Chống thấm sàn vệ sinh', level: 1, wbs: '3.3', duration: 3, weight: 1, color: '', parent: 14, pred: 16 },
        { name: 'Cán nền', level: 1, wbs: '3.4', duration: 5, weight: 1, color: '', parent: 14, pred: 17 },
    ];

    const thoCreated = [];
    for (let i = 0; i < thoItems.length; i++) {
        const item = thoItems[i];
        const created = await prisma.scheduleTemplateItem.create({
            data: {
                name: item.name,
                order: i,
                level: item.level,
                wbs: item.wbs,
                duration: item.duration,
                weight: item.weight,
                color: item.color,
                parentId: item.parent !== null ? thoCreated[item.parent].id : null,
                predecessorId: item.pred !== null ? thoCreated[item.pred].id : null,
                templateId: thoCung.id,
            },
        });
        thoCreated.push(created);
    }
    console.log(`  ✅ ${thoCung.name}: ${thoCreated.length} items`);

    // ===== 2. MẪU HOÀN THIỆN NỘI THẤT 1 THÁNG =====
    const noiThat = await prisma.scheduleTemplate.create({
        data: {
            name: 'Thi công nội thất tiêu chuẩn',
            type: 'Nội thất',
            description: 'Mẫu tiến độ cho giai đoạn hoàn thiện nội thất căn hộ/nhà phố. Bao gồm sơn, ốp lát, thiết bị.',
        },
    });

    const ntItems = [
        { name: 'Sơn & Trang trí', level: 0, wbs: '1', duration: 12, weight: 2, color: '#8b5cf6', parent: null, pred: null },
        { name: 'Sơn lót tường', level: 1, wbs: '1.1', duration: 3, weight: 1, color: '', parent: 0, pred: null },
        { name: 'Sơn phủ 2 lớp', level: 1, wbs: '1.2', duration: 4, weight: 1, color: '', parent: 0, pred: 1 },
        { name: 'Sơn trần thạch cao', level: 1, wbs: '1.3', duration: 3, weight: 1, color: '', parent: 0, pred: 2 },
        { name: 'Thi công giấy dán tường', level: 1, wbs: '1.4', duration: 2, weight: 1, color: '', parent: 0, pred: 3 },

        { name: 'Ốp lát & Sàn', level: 0, wbs: '2', duration: 10, weight: 2, color: '#f59e0b', parent: null, pred: 0 },
        { name: 'Lát gạch nền', level: 1, wbs: '2.1', duration: 5, weight: 1, color: '', parent: 5, pred: null },
        { name: 'Ốp gạch vệ sinh', level: 1, wbs: '2.2', duration: 3, weight: 1, color: '', parent: 5, pred: 6 },
        { name: 'Lắp sàn gỗ phòng ngủ', level: 1, wbs: '2.3', duration: 2, weight: 1, color: '', parent: 5, pred: 7 },

        { name: 'Lắp đặt thiết bị', level: 0, wbs: '3', duration: 8, weight: 3, color: '#3b82f6', parent: null, pred: 5 },
        { name: 'Thiết bị vệ sinh', level: 1, wbs: '3.1', duration: 2, weight: 1, color: '', parent: 9, pred: null },
        { name: 'Thiết bị điện (đèn, ổ cắm)', level: 1, wbs: '3.2', duration: 3, weight: 1, color: '', parent: 9, pred: 10 },
        { name: 'Lắp đặt tủ bếp', level: 1, wbs: '3.3', duration: 3, weight: 1, color: '', parent: 9, pred: 11 },
        { name: 'Lắp cửa gỗ + kính', level: 1, wbs: '3.4', duration: 2, weight: 1, color: '', parent: 9, pred: 12 },

        { name: 'Nội thất & Bàn giao', level: 0, wbs: '4', duration: 5, weight: 2, color: '#22c55e', parent: null, pred: 9 },
        { name: 'Kê đặt nội thất', level: 1, wbs: '4.1', duration: 2, weight: 1, color: '', parent: 14, pred: null },
        { name: 'Vệ sinh tổng', level: 1, wbs: '4.2', duration: 1, weight: 1, color: '', parent: 14, pred: 15 },
        { name: 'Nghiệm thu & Bàn giao', level: 1, wbs: '4.3', duration: 2, weight: 1, color: '', parent: 14, pred: 16 },
    ];

    const ntCreated = [];
    for (let i = 0; i < ntItems.length; i++) {
        const item = ntItems[i];
        const created = await prisma.scheduleTemplateItem.create({
            data: {
                name: item.name,
                order: i,
                level: item.level,
                wbs: item.wbs,
                duration: item.duration,
                weight: item.weight,
                color: item.color,
                parentId: item.parent !== null ? ntCreated[item.parent].id : null,
                predecessorId: item.pred !== null ? ntCreated[item.pred].id : null,
                templateId: noiThat.id,
            },
        });
        ntCreated.push(created);
    }
    console.log(`  ✅ ${noiThat.name}: ${ntCreated.length} items`);

    console.log('✅ All schedule templates seeded!');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
