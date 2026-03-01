import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Public GET - no auth required (for shared PDF links)
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: {
            customer: { select: { name: true, phone: true, email: true, address: true } },
            project: { select: { name: true, address: true } },
            categories: {
                include: { items: true },
                orderBy: { order: 'asc' },
            },
            items: true,
        },
    });
    if (!quotation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(quotation);
}, { public: true });
