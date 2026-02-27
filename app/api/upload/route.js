import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const type = formData.get('type') || 'products'; // 'products' | 'library'

        if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure upload dir exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', type);
        await mkdir(uploadDir, { recursive: true });

        // Sanitize filename
        const ext = path.extname(file.name) || '.jpg';
        const base = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${base}_${Date.now()}${ext}`;
        const filepath = path.join(uploadDir, filename);

        await writeFile(filepath, buffer);

        const url = `/uploads/${type}/${filename}`;
        return NextResponse.json({ url });
    } catch (e) {
        console.error('Upload error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export const config = { api: { bodyParser: false } };
