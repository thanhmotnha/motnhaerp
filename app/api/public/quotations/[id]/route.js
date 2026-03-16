import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// UUID v4 pattern to distinguish shareToken from cuid
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public GET - no auth required (for shared PDF links + public BG page)
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;

    // Determine if id is a shareToken (UUID) or a cuid
    const isShareToken = UUID_RE.test(id);
    const whereClause = isShareToken ? { shareToken: id, deletedAt: null } : { id };

    const [quotation, termsSetting] = await Promise.all([
        prisma.quotation[isShareToken ? 'findFirst' : 'findUnique']({
            where: whereClause,
            include: {
                customer: { select: { name: true, phone: true, email: true, address: true } },
                project: { select: { name: true, address: true, code: true } },
                categories: {
                    include: { items: { where: { parentItemId: null }, orderBy: { order: 'asc' }, include: { subItems: { orderBy: { order: 'asc' } } } } },
                    orderBy: { order: 'asc' },
                },
                items: { where: { parentItemId: null }, orderBy: { order: 'asc' }, include: { subItems: { orderBy: { order: 'asc' } } } },
            },
        }),
        prisma.systemSetting.findUnique({ where: { key: 'quotation_terms' } }),
    ]);

    if (!quotation || quotation.status === 'Nháp') {
        return NextResponse.json({ error: 'Báo giá không tồn tại' }, { status: 404 });
    }

    // Track view if accessed via shareToken
    if (isShareToken) {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const ua = request.headers.get('user-agent') || '';
        const device = /mobile|android|iphone/i.test(ua) ? 'Mobile' : 'PC';
        console.log(`[BG View] ${quotation.code} | IP: ${ip} | Device: ${device} | ${new Date().toISOString()}`);

        await prisma.quotation.update({
            where: { id: quotation.id },
            data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
        }).catch(() => { });
    }

    let quotationTerms = null;
    if (termsSetting?.value) {
        try { quotationTerms = JSON.parse(termsSetting.value); } catch { }
    }
    return NextResponse.json({ ...quotation, quotationTerms });
}, { public: true });

