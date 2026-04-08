import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import { uploadToR2, isR2Configured } from '@/lib/r2.js';

const HANDBOOK_KEY = 'hr/handbook.docx';

export const GET = withAuth(async () => {
    if (!isR2Configured) return NextResponse.json({ url: null, configured: false });
    const publicBase = process.env.R2_PUBLIC_URL || `https://${process.env.R2_BUCKET_NAME}.r2.dev`;
    const url = `${publicBase.replace(/\/$/, '')}/${HANDBOOK_KEY}`;
    return NextResponse.json({ url, configured: true });
});

export const POST = withAuth(async (request) => {
    if (!isR2Configured) return NextResponse.json({ error: 'R2 chưa cấu hình' }, { status: 500 });
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToR2(buffer, HANDBOOK_KEY, file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    return NextResponse.json({ url, success: true });
}, { roles: ['giam_doc', 'ke_toan'] });
