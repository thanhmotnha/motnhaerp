/**
 * Bulk insert An Cường products from resized image files
 * Source: public/uploads/products/ms-*.jpg (428 files)
 * Category: Ván AC
 * Name: Ván gỗ MDF An Cường {code} (no MFC prefix)
 * Variants: 17mm, 6mm
 * 
 * Run: node scripts/seed-ancuong-bulk.mjs
 */
import { PrismaClient } from '@prisma/client';
import { readdir } from 'fs/promises';
import { join, basename, extname } from 'path';

const prisma = new PrismaClient();
const PRODUCTS_DIR = join(process.cwd(), 'public', 'uploads', 'products');

async function main() {
    // 1. Get/create category
    let category = await prisma.productCategory.findFirst({ where: { name: 'Ván AC' } });
    if (!category) {
        category = await prisma.productCategory.create({
            data: { name: 'Ván AC', slug: 'van-ac', order: 100 },
        });
    }
    console.log('📂 Category:', category.name, category.id);

    // 2. Read resized images
    const files = await readdir(PRODUCTS_DIR);
    const images = files.filter(f => f.startsWith('ms-') && f.endsWith('.jpg'));
    console.log(`📦 Found ${images.length} resized images\n`);

    // 3. Get existing products to skip duplicates
    const existing = await prisma.product.findMany({
        where: { category: 'Ván AC' },
        select: { surfaceCode: true },
    });
    const existingCodes = new Set(existing.map(p => p.surfaceCode));

    // 4. Get last code number
    const lastProduct = await prisma.product.findFirst({
        orderBy: { code: 'desc' },
        where: { code: { startsWith: 'SP-' } },
        select: { code: true },
    });
    let nextNum = lastProduct ? parseInt(lastProduct.code.replace(/\D/g, '')) + 1 : 1;

    let created = 0;
    let skipped = 0;

    for (const file of images) {
        // Parse: "ms-101-t.jpg" → "MS 101 T"
        const raw = basename(file, extname(file)); // "ms-101-t"
        const surfaceCode = raw
            .replace(/^ms-/i, 'MS ')
            .replace(/-/g, ' ')
            .toUpperCase();

        if (existingCodes.has(surfaceCode)) {
            skipped++;
            continue;
        }

        const code = `SP-${String(nextNum++).padStart(6, '0')}`;
        const name = `Ván gỗ MDF An Cường ${surfaceCode}`;
        const imageUrl = `/uploads/products/${file}`;

        try {
            await prisma.product.create({
                data: {
                    code,
                    name,
                    category: 'Ván AC',
                    categoryId: category.id,
                    unit: 'tấm',
                    brand: 'An Cường',
                    supplier: 'An Cường',
                    origin: 'Việt Nam',
                    material: 'MDF phủ Melamine',
                    status: 'Đang bán',
                    supplyType: 'Vật tư đặt hàng',
                    description: `Ván gỗ MDF phủ Melamine An Cường - Mã ${surfaceCode}`,
                    image: imageUrl,
                    surfaceCode,
                    dimensions: '2440 x 1220 mm',
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
            });
            created++;
            if (created % 50 === 0) console.log(`  ✅ ${created} created...`);
        } catch (e) {
            console.error(`  ❌ ${surfaceCode}: ${e.message}`);
        }
    }

    console.log(`\n🎉 Done! ${created} created, ${skipped} skipped (already exist)`);
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
