/**
 * Migrate data từ WorkItemLibrary sang Products cho các category nội thất
 * Nội thất, Đồ rời, Decor, Phòng thờ, Thiết bị vệ sinh, Điều hòa, Thiết bị khác
 * → sang Products (salePrice = unitPrice, category giữ nguyên)
 * 
 * Và xóa khỏi WorkItemLibrary sau khi migrate
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Các category sẽ chuyển từ WorkItemLibrary → Products
const MOVE_TO_PRODUCTS = [
    'Nội thất',
    'Đồ rời',
    'Decor',
    'Phòng thờ',
    'Thiết bị vệ sinh',
    'Điều hòa',
    'Thiết bị khác',
];

async function main() {
    // Lấy tất cả items cần migrate
    const items = await prisma.workItemLibrary.findMany({
        where: { category: { in: MOVE_TO_PRODUCTS } }
    });

    console.log(`📦 Tìm thấy ${items.length} items cần chuyển sang Products`);

    // Group by category để log
    const byCategory = {};
    items.forEach(i => { byCategory[i.category] = (byCategory[i.category] || 0) + 1; });
    Object.entries(byCategory).forEach(([cat, cnt]) => console.log(`  - ${cat}: ${cnt} items`));

    let created = 0;
    let skipped = 0;

    for (const item of items) {
        // Tạo code unique
        const code = `LKS-${item.category.substring(0, 3).toUpperCase()}-${Date.now().toString(36).slice(-4)}-${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

        try {
            await prisma.product.create({
                data: {
                    code,
                    name: item.name.substring(0, 200),
                    category: item.category,
                    unit: item.unit || 'cái',
                    importPrice: item.mainMaterial || 0,
                    salePrice: item.unitPrice || item.mainMaterial || 0,
                    stock: 0,
                    minStock: 0,
                    supplier: '',
                    brand: '',
                    origin: '',
                    material: '',
                    color: '',
                    dimensions: '',
                    warranty: '',
                    description: item.description || item.subcategory || '',
                    location: '',
                    image: item.image || '',
                }
            });
            created++;
        } catch (e) {
            console.error(`  ⚠ Skip "${item.name}":`, e.message.split('\n')[0]);
            skipped++;
        }
    }

    console.log(`\n✅ Đã tạo ${created} sản phẩm, bỏ qua ${skipped}`);

    // Xóa khỏi WorkItemLibrary
    const deleted = await prisma.workItemLibrary.deleteMany({
        where: { category: { in: MOVE_TO_PRODUCTS } }
    });
    console.log(`🗑️  Đã xóa ${deleted.count} items khỏi WorkItemLibrary`);

    // Thống kê còn lại
    const remaining = await prisma.workItemLibrary.groupBy({ by: ['category'], _count: { id: true } });
    console.log('\n📋 WorkItemLibrary còn lại (Hạng mục thi công):');
    remaining.forEach(r => console.log(`  ${r.category}: ${r._count.id} hạng mục`));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
