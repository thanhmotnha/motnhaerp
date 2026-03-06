import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MATERIALS = [
    { name: 'Gạch xây', unit: 'viên', importPrice: 18000 },
    { name: 'Bạt', unit: 'cuộn', importPrice: 19000 },
    { name: 'Máy thi công', unit: 'ca', importPrice: 1000000 },
];

async function main() {
    let cat = await prisma.productCategory.findFirst({ where: { name: 'Vật liệu xây dựng' } });
    let created = 0;
    for (const m of MATERIALS) {
        const ex = await prisma.product.findFirst({ where: { name: m.name } });
        if (ex) {
            await prisma.product.update({ where: { id: ex.id }, data: { importPrice: m.importPrice, salePrice: m.importPrice } });
            console.log('🔄 Updated:', m.name, m.importPrice.toLocaleString() + 'đ');
            continue;
        }
        await prisma.product.create({
            data: {
                name: m.name,
                code: 'VL-' + Date.now().toString().slice(-6) + String(created).padStart(2, '0'),
                unit: m.unit, importPrice: m.importPrice, salePrice: m.importPrice,
                category: 'Vật liệu xây dựng', categoryId: cat?.id || null,
                supplyType: 'buy', status: 'active',
            },
        });
        console.log('✅', m.name, m.unit, m.importPrice.toLocaleString() + 'đ');
        created++;
        await new Promise(r => setTimeout(r, 50));
    }
    console.log('Done:', created, 'created');
}

main().catch(console.error).finally(() => prisma.$disconnect());
