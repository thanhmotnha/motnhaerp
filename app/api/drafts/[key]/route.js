import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/drafts/[key] — Lấy draft per-user
export const GET = withAuth(async (request, { params }, session) => {
    const { key } = await params;
    const settingKey = `draft_${session.user.id}_${key}`;

    const setting = await prisma.systemSetting.findUnique({ where: { key: settingKey } });
    if (!setting) return NextResponse.json(null);

    try {
        const data = JSON.parse(setting.value);
        // Check expiry (7 days)
        if (data._savedAt && Date.now() - data._savedAt > 7 * 24 * 60 * 60 * 1000) {
            await prisma.systemSetting.delete({ where: { key: settingKey } });
            return NextResponse.json(null);
        }
        return NextResponse.json(data);
    } catch {
        return NextResponse.json(null);
    }
});

// PUT /api/drafts/[key] — Lưu draft per-user
export const PUT = withAuth(async (request, { params }, session) => {
    const { key } = await params;
    const settingKey = `draft_${session.user.id}_${key}`;
    const body = await request.json();

    const value = JSON.stringify({ ...body, _savedAt: Date.now() });

    await prisma.systemSetting.upsert({
        where: { key: settingKey },
        create: { key: settingKey, value },
        update: { value },
    });

    return NextResponse.json({ success: true });
});

// DELETE /api/drafts/[key] — Xóa draft
export const DELETE = withAuth(async (request, { params }, session) => {
    const { key } = await params;
    const settingKey = `draft_${session.user.id}_${key}`;

    await prisma.systemSetting.deleteMany({ where: { key: settingKey } });
    return NextResponse.json({ success: true });
});
