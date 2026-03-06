/**
 * Insert 1 test An Cường product with 2 variants (17mm, 6mm)
 * Run: node scripts/seed-ancuong-test.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Find or create "Ván AC" category
    let category = await prisma.productCategory.findFirst({ where: { name: 'Ván AC' } });
    if (!category) {
        category = await prisma.productCategory.create({
            data: { name: 'Ván AC', slug: 'van-ac', order: 100 },
        });
        console.log('✅ Created category "Ván AC":', category.id);
    } else {
        console.log('📂 Found category "Ván AC":', category.id);
    }

    // 2. Check if test product already exists
    const testCode = 'MS 01012 T';
    const existingName = `Ván gỗ MDF An Cường ${testCode}`;
    const existing = await prisma.product.findFirst({ where: { name: existingName } });
    if (existing) {
        console.log('⚠️ Product already exists:', existing.code, existing.name);
        await prisma.$disconnect();
        return;
    }

    // 3. Generate product code
    const lastProduct = await prisma.product.findFirst({ orderBy: { code: 'desc' }, where: { code: { startsWith: 'SP-' } } });
    const nextNum = lastProduct ? parseInt(lastProduct.code.replace(/\D/g, '')) + 1 : 1;
    const code = `SP-${String(nextNum).padStart(6, '0')}`;

    // 4. Create product
    const product = await prisma.product.create({
        data: {
            code,
            name: existingName,
            category: 'Ván AC',
            categoryId: category.id,
            unit: 'tấm',
            brand: 'An Cường',
            supplier: 'An Cường',
            origin: 'Việt Nam',
            material: 'MDF phủ Melamine',
            status: 'Đang bán',
            supplyType: 'Vật tư đặt hàng',
            description: `Ván gỗ MDF phủ Melamine An Cường - Mã ${testCode} (Laricio Pine). Có 2 biến thể: 17mm và 6mm.`,
            image: 'https://ancuong.com/products/products-webp/30300005400100361053.webp',
            surfaceCode: testCode,
            color: 'Laricio Pine',
            dimensions: '2440 x 1220 mm',
            // Create 2 variants as ProductAttribute
            attributes: {
                create: {
                    name: 'Độ dày',
                    inputType: 'select',
                    required: true,
                    order: 0,
                    options: {
                        create: [
                            { label: '17mm', priceAddon: 0, order: 0 },
                            { label: '6mm', priceAddon: 0, order: 1 },
                        ],
                    },
                },
            },
        },
        include: { attributes: { include: { options: true } } },
    });

    console.log('✅ Created product:', product.code, product.name);
    console.log('   Image:', product.image);
    console.log('   Variants:', product.attributes[0]?.options.map(o => o.label).join(', '));

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
