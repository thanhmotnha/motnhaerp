/**
 * Resize + insert Sàn gỗ products
 * Source: E:\AC\Sàn gỗ
 * Category: Sàn gỗ
 * Name: Sàn gỗ An Cường {code}
 * Code: S{code} (no spaces)
 * No variants
 */
import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { PrismaClient } from '@prisma/client';

const SRC_DIR = 'E:\\AC\\Sàn gỗ';
const DEST_DIR = join(process.cwd(), 'public', 'uploads', 'products');
const WIDTH = 800;
const QUALITY = 80;
const prisma = new PrismaClient();

async function main() {
    await mkdir(DEST_DIR, { recursive: true });

    const files = await readdir(SRC_DIR);
    const images = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    console.log(`📦 ${images.length} Sàn gỗ images`);

    // 1. Resize
    const imageMap = new Map();
    let resized = 0;
    for (const file of images) {
        const srcPath = join(SRC_DIR, file);
        const raw = basename(file, extname(file));
        const slug = raw.replace(/\s+/g, '-').toLowerCase();
        const destFile = `san-${slug}.jpg`;
        const destPath = join(DEST_DIR, destFile);
        try {
            await sharp(srcPath)
                .resize({ width: WIDTH, withoutEnlargement: true })
                .jpeg({ quality: QUALITY, progressive: true })
                .toFile(destPath);
            imageMap.set(raw, destFile);
            resized++;
        } catch (e) {
            console.error(`  ❌ resize ${file}: ${e.message}`);
        }
    }
    console.log(`✅ ${resized} resized\n`);

    // 2. Category
    let category = await prisma.productCategory.findFirst({ where: { name: 'Sàn gỗ' } });
    if (!category) {
        category = await prisma.productCategory.create({
            data: { name: 'Sàn gỗ', slug: 'san-go', order: 102 },
        });
        console.log('📂 Created "Sàn gỗ":', category.id);
    } else {
        console.log('📂 Found "Sàn gỗ":', category.id);
    }

    // 3. Insert
    const existing = await prisma.product.findMany({
        where: { category: 'Sàn gỗ' }, select: { surfaceCode: true },
    });
    const existingCodes = new Set(existing.map(p => p.surfaceCode));

    let created = 0;
    for (const [raw, destFile] of imageMap) {
        if (existingCodes.has(raw)) continue;

        // Extract code: "SAN AC 388 RL" → "388RL", "SAN AC HE 521 MTQ" → "HE521MTQ"
        const colorCode = raw
            .replace(/^SAN\s*AC\s*/i, '')  // remove SAN AC prefix
            .replace(/^San\s*AC\s*/i, '')  // handle "San AC" variant
            .replace(/\s+/g, '');           // remove all spaces

        const code = `S${colorCode}`;
        const name = `Sàn gỗ An Cường ${colorCode}`;
        const imageUrl = `/uploads/products/${destFile}`;

        try {
            await prisma.product.create({
                data: {
                    code,
                    name,
                    category: 'Sàn gỗ',
                    categoryId: category.id,
                    unit: 'm²',
                    brand: 'An Cường',
                    supplier: 'An Cường',
                    origin: 'Việt Nam',
                    material: 'Sàn gỗ công nghiệp',
                    status: 'Đang bán',
                    supplyType: 'Vật tư đặt hàng',
                    description: `Sàn gỗ An Cường - Mã ${colorCode}`,
                    image: imageUrl,
                    surfaceCode: raw,
                },
            });
            created++;
        } catch (e) {
            console.error(`  ❌ ${code}: ${e.message.slice(0, 60)}`);
        }
    }

    console.log(`\n🎉 ${created} created`);
    const samples = await prisma.product.findMany({ where: { category: 'Sàn gỗ' }, select: { code: true, name: true }, take: 5, orderBy: { code: 'asc' } });
    samples.forEach(s => console.log(`  [${s.code}] ${s.name}`));
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
