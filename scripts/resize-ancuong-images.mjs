/**
 * Resize + compress An Cường product images
 * Source: C:\Users\Jason\Downloads\01. MFC\01. MFC
 * Dest: public/uploads/products/
 * Resize: 800px width, JPEG quality 80
 * 
 * Run: node scripts/resize-ancuong-images.mjs
 */
import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';

const SRC_DIR = 'C:\\Users\\Jason\\Downloads\\01. MFC\\01. MFC';
const DEST_DIR = join(process.cwd(), 'public', 'uploads', 'products');
const WIDTH = 800;
const QUALITY = 80;

async function main() {
    await mkdir(DEST_DIR, { recursive: true });

    const files = await readdir(SRC_DIR);
    const images = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

    console.log(`📦 Found ${images.length} images to process`);
    console.log(`📁 Source: ${SRC_DIR}`);
    console.log(`📁 Dest: ${DEST_DIR}`);
    console.log(`📐 Resize: ${WIDTH}px width, JPEG quality ${QUALITY}`);
    console.log('');

    let processed = 0;
    let errors = 0;

    for (const file of images) {
        const srcPath = join(SRC_DIR, file);
        // Sanitize filename: "MFC - MS 101 T.jpg" → "ms-101-t.jpg"
        const code = basename(file, extname(file))
            .replace(/^MFC\s*-\s*MS\s*/i, 'ms-')
            .replace(/\s+/g, '-')
            .toLowerCase();
        const destFile = `${code}.jpg`;
        const destPath = join(DEST_DIR, destFile);

        try {
            await sharp(srcPath)
                .resize({ width: WIDTH, withoutEnlargement: true })
                .jpeg({ quality: QUALITY, progressive: true })
                .toFile(destPath);

            processed++;
            if (processed % 50 === 0 || processed === images.length) {
                console.log(`  ✅ ${processed}/${images.length} processed...`);
            }
        } catch (e) {
            console.error(`  ❌ ${file}: ${e.message}`);
            errors++;
        }
    }

    console.log('');
    console.log(`🎉 Done! ${processed} resized, ${errors} errors`);
    console.log(`📁 Output: ${DEST_DIR}`);
    console.log(`🔗 URL pattern: /uploads/products/ms-xxx-yy.jpg`);
}

main().catch(e => { console.error(e); process.exit(1); });
