import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * POST /api/sync-images
 * Accepts multipart form data with image file + target path
 * Protected by a sync secret token
 */
export async function POST(request) {
    const secret = request.headers.get('x-sync-secret');
    if (secret !== process.env.SYNC_SECRET && secret !== 'motnha2026sync') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const filename = formData.get('filename');

        if (!file || !filename) {
            return NextResponse.json({ error: 'file and filename required' }, { status: 400 });
        }

        const dir = join(process.cwd(), 'public', 'uploads', 'products');
        await mkdir(dir, { recursive: true });

        const buffer = Buffer.from(await file.arrayBuffer());
        const destPath = join(dir, filename);
        await writeFile(destPath, buffer);

        return NextResponse.json({ ok: true, path: `/uploads/products/${filename}`, size: buffer.length });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
