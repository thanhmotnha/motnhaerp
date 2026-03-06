/**
 * Upload product images to production server via upload API
 * Reads from public/uploads/products/ and POSTs to production
 * 
 * Run: node scripts/upload-images-prod.mjs
 */
import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';

const LOCAL_DIR = join(process.cwd(), 'public', 'uploads', 'products');
const PROD_URL = 'https://admin.tiktak.vn';

// You need a valid session cookie or API key
// Get this from browser DevTools > Application > Cookies > next-auth.session-token
const SESSION_TOKEN = process.env.SESSION_TOKEN || '';

async function uploadFile(filePath, fileName) {
    const fileData = await readFile(filePath);
    const blob = new Blob([fileData], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('type', 'product');

    const res = await fetch(`${PROD_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: {
            'Cookie': `next-auth.session-token=${SESSION_TOKEN}`,
        },
    });

    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
}

async function main() {
    if (!SESSION_TOKEN) {
        console.error('❌ Set SESSION_TOKEN env var (from browser cookie)');
        console.log('   Get it: Browser DevTools > Application > Cookies > next-auth.session-token');
        console.log('   Usage: SESSION_TOKEN=xxx node scripts/upload-images-prod.mjs');
        process.exit(1);
    }

    const files = await readdir(LOCAL_DIR);
    const images = files.filter(f => f.startsWith('ms-') && f.endsWith('.jpg'));
    console.log(`📦 ${images.length} images to upload to ${PROD_URL}`);

    let ok = 0, fail = 0;
    for (const file of images) {
        try {
            const result = await uploadFile(join(LOCAL_DIR, file), file);
            ok++;
            if (ok % 20 === 0) console.log(`  ✅ ${ok}/${images.length}...`);
        } catch (e) {
            console.error(`  ❌ ${file}: ${e.message}`);
            fail++;
            if (fail > 5) { console.error('Too many failures, stopping'); break; }
        }
    }
    console.log(`\n🎉 Done: ${ok} uploaded, ${fail} failed`);
}

main();
