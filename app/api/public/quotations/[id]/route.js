import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Public GET - no auth required (for shared PDF links)
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const [quotation, termsSetting] = await Promise.all([
        prisma.quotation.findUnique({
            where: { id },
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
        prisma.setting.findUnique({ where: { key: 'quotation_terms' } }),
    ]);
    if (!quotation || quotation.status === 'Nháp') {
        return NextResponse.json({ error: 'Báo giá không tồn tại' }, { status: 404 });
    }
    let quotationTerms = null;
    if (termsSetting?.value) {
        try { quotationTerms = JSON.parse(termsSetting.value); } catch { }
    }
    return NextResponse.json({ ...quotation, quotationTerms });
}, { public: true });
