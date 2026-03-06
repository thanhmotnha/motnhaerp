import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const PRODUCTS = [
    'Thanh suốt treo quần áo bọc da OVAL BV',
    'Gương xoay toàn thân BV 2.0',
    'Ngăn kéo đựng đồ trang điểm BV 2.0',
    'Ngăn kéo đựng đồ nội y Higold',
    'Góc xoay treo quần áo Series A',
    'Thanh suốt - Bas treo quần áo Series A',
    'Gương xoay toàn thân Series A',
    'Ngăn kéo cao đựng đồ đa năng Series A',
    'Giá đựng đồ ba tầng bắt hông Series BV',
    'Giá treo quần áo nâng hạ Series BV',
    'Giá treo cà vạt Series BV',
    'Hộp xoay đồng hồ cơ Series BV',
    'Két sắt bảo hiểm Series BV',
    'Giá treo quần áo góc tủ Series BV',
    'Kệ xoay đựng giày Series BV',
    'Giá treo quần gắn trên Series BV',
    'Kệ xoay đựng giày Series A',
    'Ngăn kéo treo quần Series A',
    'Ngăn kéo đựng đồ trang sức Series A',
    'Ngăn kéo cao đựng quần áo Series BV 2.0',
    'Ngăn kéo thấp đựng quần áo Series BV 2.0',
    'Ngăn kéo đựng đồ nội y Series BV 2.0',
    'Ngăn kéo treo quần âu Series BV 2.0',
    'Ngăn kéo đựng đồ trang sức Series BV 2.0',
];

async function main() {
    // Find or create "Phụ kiện tủ áo" category
    let cat = await prisma.productCategory.findFirst({ where: { name: 'Phụ kiện tủ áo' } });
    if (!cat) {
        cat = await prisma.productCategory.create({ data: { name: 'Phụ kiện tủ áo', slug: 'phu-kien-tu-ao' } });
        console.log('✅ Created category:', cat.name, cat.id);
    } else {
        console.log('📂 Found category:', cat.name, cat.id);
    }

    let created = 0, skipped = 0;
    for (let i = 0; i < PRODUCTS.length; i++) {
        const name = PRODUCTS[i];
        const exists = await prisma.product.findFirst({ where: { name } });
        if (exists) { skipped++; console.log(`  ⏭ ${name} (exists)`); continue; }

        const code = 'HG-TA-' + String(i + 1).padStart(3, '0');
        await prisma.product.create({
            data: {
                name,
                code,
                unit: 'Bộ',
                salePrice: 0,
                importPrice: 0,
                stock: 0,
                minStock: 0,
                category: 'Phụ kiện tủ áo',
                categoryId: cat.id,
                brand: 'Higold',
                supplyType: 'Mua ngoài',
            },
        });
        created++;
        console.log(`  ✅ ${name} (${code})`);
    }

    console.log(`\n🎯 Done: ${created} created, ${skipped} skipped`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
