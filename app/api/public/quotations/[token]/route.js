import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/quotations/[token] — public view BG + track view
export async function GET(req, { params }) {
    const { token } = await params;
    try {
        const q = await prisma.quotation.findFirst({
            where: { shareToken: token, deletedAt: null },
            include: {
                customer: { select: { name: true, phone: true, address: true } },
                project: { select: { name: true, code: true } },
                categories: { include: { items: true }, orderBy: { sortOrder: 'asc' } },
            },
        });
        if (!q) return NextResponse.json({ error: 'Không tìm thấy báo giá' }, { status: 404 });

        // Track view
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const ua = req.headers.get('user-agent') || '';
        const device = /mobile|android|iphone/i.test(ua) ? 'Mobile' : 'PC';

        await prisma.quotation.update({
            where: { id: q.id },
            data: {
                viewCount: { increment: 1 },
                lastViewedAt: new Date(),
            },
        });

        // Log view (via notes append — lightweight, no extra table)
        console.log(`[BG View] ${q.code} | IP: ${ip} | Device: ${device} | ${new Date().toISOString()}`);

        return NextResponse.json(q);
    } catch (e) {
        console.error('Public quotation error:', e);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
