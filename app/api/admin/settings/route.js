import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET all settings
export const GET = withAuth(async () => {
    try {
        const rows = await prisma.systemSetting.findMany();
        const result = {};
        rows.forEach(r => { result[r.key] = r.value; });
        return NextResponse.json(result);
    } catch (e) {
        console.error('[Settings GET]', e.message);
        return NextResponse.json({});
    }
}, { roles: ['giam_doc'] });

// PUT update settings — batch upsert
export const PUT = withAuth(async (request) => {
    try {
        const body = await request.json();
        const entries = Object.entries(body).filter(([k, v]) => k && v !== undefined);

        if (entries.length === 0) {
            return NextResponse.json({ success: true });
        }

        // Upsert each setting via Prisma transaction
        await prisma.$transaction(
            entries.map(([key, value]) =>
                prisma.systemSetting.upsert({
                    where: { key },
                    update: { value: String(value ?? '') },
                    create: { key, value: String(value ?? '') },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[Settings PUT]', e.message, e.stack);
        return NextResponse.json({ error: e.message || 'Lỗi lưu cài đặt' }, { status: 500 });
    }
}, { roles: ['giam_doc'] });
