import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Prices from retail sites (giá niêm yết gốc / giá bán thị trường)
const PRICES = [
    { name: 'Thanh suốt treo quần áo bọc da OVAL BV', salePrice: 1100000, importPrice: 770000 },
    { name: 'Gương xoay toàn thân BV 2.0', salePrice: 4900000, importPrice: 3430000 },
    { name: 'Ngăn kéo đựng đồ trang điểm BV 2.0', salePrice: 5500000, importPrice: 3850000 },
    { name: 'Ngăn kéo đựng đồ nội y Higold', salePrice: 4700000, importPrice: 3525000 },
    { name: 'Góc xoay treo quần áo Series A', salePrice: 3590000, importPrice: 2510000 },
    { name: 'Thanh suốt - Bas treo quần áo Series A', salePrice: 958000, importPrice: 718000 },
    { name: 'Gương xoay toàn thân Series A', salePrice: 1090000, importPrice: 763000 },
    { name: 'Ngăn kéo cao đựng đồ đa năng Series A', salePrice: 5460000, importPrice: 3822000 },
    { name: 'Giá đựng đồ ba tầng bắt hông Series BV', salePrice: 5500000, importPrice: 3850000 },
    { name: 'Giá treo quần áo nâng hạ Series BV', salePrice: 4300000, importPrice: 3010000 },
    { name: 'Giá treo cà vạt Series BV', salePrice: 550000, importPrice: 385000 },
    { name: 'Hộp xoay đồng hồ cơ Series BV', salePrice: 17000000, importPrice: 11900000 },
    { name: 'Két sắt bảo hiểm Series BV', salePrice: 12600000, importPrice: 6825000 },
    { name: 'Giá treo quần áo góc tủ Series BV', salePrice: 8200000, importPrice: 5740000 },
    { name: 'Kệ xoay đựng giày Series BV', salePrice: 26200000, importPrice: 18340000 },
    { name: 'Giá treo quần gắn trên Series BV', salePrice: 2000000, importPrice: 1400000 },
    { name: 'Kệ xoay đựng giày Series A', salePrice: 8900000, importPrice: 6225000 },
    { name: 'Ngăn kéo treo quần Series A', salePrice: 2590000, importPrice: 1813000 },
    { name: 'Ngăn kéo đựng đồ trang sức Series A', salePrice: 3900000, importPrice: 2730000 },
    { name: 'Ngăn kéo cao đựng quần áo Series BV 2.0', salePrice: 5700000, importPrice: 3990000 },
    { name: 'Ngăn kéo thấp đựng quần áo Series BV 2.0', salePrice: 4800000, importPrice: 3360000 },
    { name: 'Ngăn kéo đựng đồ nội y Series BV 2.0', salePrice: 4700000, importPrice: 3525000 },
    { name: 'Ngăn kéo treo quần âu Series BV 2.0', salePrice: 4190000, importPrice: 2933000 },
    { name: 'Ngăn kéo đựng đồ trang sức Series BV 2.0', salePrice: 5500000, importPrice: 4125000 },
];

async function main() {
    let updated = 0, notFound = 0;
    for (const p of PRICES) {
        const product = await prisma.product.findFirst({ where: { name: p.name } });
        if (!product) { notFound++; console.log(`  ❌ Not found: ${p.name}`); continue; }

        await prisma.product.update({
            where: { id: product.id },
            data: { salePrice: p.salePrice, importPrice: p.importPrice },
        });
        updated++;
        console.log(`  ✅ ${p.name}: ${p.salePrice.toLocaleString()}đ (nhập: ${p.importPrice.toLocaleString()}đ)`);
    }
    console.log(`\n🎯 Done: ${updated} updated, ${notFound} not found`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
