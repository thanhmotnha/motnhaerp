import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Danh mục VL chính - vật liệu xây dựng cơ bản
const MATERIALS = [
    { name: 'Cát bê tông', unit: 'm3', importPrice: 450000, category: 'Vật liệu xây dựng' },
    { name: 'Cát trát hoà bình', unit: 'm3', importPrice: 580000, category: 'Vật liệu xây dựng' },
    { name: 'Đá mạt', unit: 'm3', importPrice: 230000, category: 'Vật liệu xây dựng' },
    { name: 'Thép đai F6 - F8', unit: 'kg', importPrice: 19200, category: 'Vật liệu xây dựng' },
    { name: 'Bê tông M100', unit: 'm3', importPrice: 1040000, category: 'Vật liệu xây dựng' },
    { name: 'Bê tông M200', unit: 'm3', importPrice: 1160000, category: 'Vật liệu xây dựng' },
    { name: 'Bê tông M250', unit: 'm3', importPrice: 1190000, category: 'Vật liệu xây dựng' },
    { name: 'Bê tông M300', unit: 'm3', importPrice: 1230000, category: 'Vật liệu xây dựng' },
    { name: 'Ca bơm + Cần bơm bê tông', unit: 'Ca', importPrice: 2000000, category: 'Vật liệu xây dựng' },
    { name: 'Thép F22', unit: 'Cây', importPrice: 550000, category: 'Vật liệu xây dựng' },
];

async function main() {
    // Find or create category
    let cat = await prisma.productCategory.findFirst({ where: { name: 'Vật liệu xây dựng' } });
    if (!cat) {
        cat = await prisma.productCategory.create({ data: { name: 'Vật liệu xây dựng', order: 99 } });
        console.log('✅ Created category:', cat.name);
    }

    let created = 0, skipped = 0;
    for (const m of MATERIALS) {
        const exists = await prisma.product.findFirst({ where: { name: m.name } });
        if (exists) {
            // Update price if changed
            if (exists.importPrice !== m.importPrice) {
                await prisma.product.update({ where: { id: exists.id }, data: { importPrice: m.importPrice, salePrice: m.importPrice } });
                console.log(`🔄 Updated price: ${m.name} → ${m.importPrice.toLocaleString()}đ`);
            } else {
                console.log(`⏭️ Exists: ${m.name}`);
            }
            skipped++;
            continue;
        }

        const code = 'VL-' + String(Date.now()).slice(-6) + String(created).padStart(2, '0');
        await prisma.product.create({
            data: {
                name: m.name,
                code,
                unit: m.unit,
                importPrice: m.importPrice,
                salePrice: m.importPrice,
                category: m.category,
                categoryId: cat.id,
                supplyType: 'buy',
                status: 'active',
            },
        });
        console.log(`✅ Created: ${m.name} (${m.unit}) - ${m.importPrice.toLocaleString()}đ`);
        created++;
        await new Promise(r => setTimeout(r, 50)); // avoid duplicate codes
    }

    console.log(`\n📊 Done: ${created} created, ${skipped} skipped/updated`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
