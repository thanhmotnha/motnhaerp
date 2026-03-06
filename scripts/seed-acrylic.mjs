/**
 * Resize Acrylic images + bulk insert products
 * Source: E:\AC\Acrylic
 * Category: Acrylic
 * Name: Acrylic An Cường {code}
 * No variants
 * 
 * Run: node scripts/seed-acrylic.mjs
 */
import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { PrismaClient } from '@prisma/client';

const SRC_DIR = 'E:\\AC\\Acrylic';
const DEST_DIR = join(process.cwd(), 'public', 'uploads', 'products');
const WIDTH = 800;
const QUALITY = 80;

const prisma = new PrismaClient();

async function main() {
    await mkdir(DEST_DIR, { recursive: true });

    // 1. Resize images
    const files = await readdir(SRC_DIR);
    const images = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    console.log(`📦 ${images.length} Acrylic images to process`);

    const imageMap = new Map(); // code → filename
    let resized = 0;

    for (const file of images) {
        const srcPath = join(SRC_DIR, file);
        const raw = basename(file, extname(file));
        const slug = raw.replace(/\s+/g, '-').toLowerCase();
        const destFile = `acrylic-${slug}.jpg`;
        const destPath = join(DEST_DIR, destFile);

        try {
            await sharp(srcPath)
                .resize({ width: WIDTH, withoutEnlargement: true })
                .jpeg({ quality: QUALITY, progressive: true })
                .toFile(destPath);
            imageMap.set(raw, destFile);
            resized++;
        } catch (e) {
            console.error(`  ❌ ${file}: ${e.message}`);
        }
    }
    console.log(`✅ ${resized} images resized\n`);

    // 2. Get/create category
    let category = await prisma.productCategory.findFirst({ where: { name: 'Acrylic' } });
    if (!category) {
        category = await prisma.productCategory.create({
            data: { name: 'Acrylic', slug: 'acrylic', order: 101 },
        });
        console.log('📂 Created category "Acrylic":', category.id);
    } else {
        console.log('📂 Found category "Acrylic":', category.id);
    }

    // 3. Get last product code
    const lastProduct = await prisma.product.findFirst({
        orderBy: { code: 'desc' },
        where: { code: { startsWith: 'SP-' } },
        select: { code: true },
    });
    let nextNum = lastProduct ? parseInt(lastProduct.code.replace(/\D/g, '')) + 1 : 1;

    // 4. Check existing
    const existing = await prisma.product.findMany({
        where: { category: 'Acrylic' },
        select: { surfaceCode: true },
    });
    const existingCodes = new Set(existing.map(p => p.surfaceCode));

    // 5. Insert products
    let created = 0, skipped = 0;

    for (const [raw, destFile] of imageMap) {
        if (existingCodes.has(raw)) { skipped++; continue; }

        const code = `SP-${String(nextNum++).padStart(6, '0')}`;
        const name = `Acrylic An Cường ${raw}`;
        const imageUrl = `/uploads/products/${destFile}`;

        try {
            await prisma.product.create({
                data: {
                    code,
                    name,
                    category: 'Acrylic',
                    categoryId: category.id,
                    unit: 'tấm',
                    brand: 'An Cường',
                    supplier: 'An Cường',
                    origin: 'Việt Nam',
                    material: 'Acrylic',
                    status: 'Đang bán',
                    supplyType: 'Vật tư đặt hàng',
                    description: `Tấm Acrylic An Cường - Mã ${raw}`,
                    image: imageUrl,
                    surfaceCode: raw,
                    dimensions: '2440 x 1220 mm',
                },
            });
            created++;
        } catch (e) {
            console.error(`  ❌ ${raw}: ${e.message}`);
        }
    }

    console.log(`\n🎉 Done! ${created} created, ${skipped} skipped`);
    const samples = await prisma.product.findMany({ where: { category: 'Acrylic' }, select: { name: true, image: true }, take: 5, orderBy: { name: 'asc' } });
    samples.forEach(s => console.log(`  ${s.name} → ${s.image}`));
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
