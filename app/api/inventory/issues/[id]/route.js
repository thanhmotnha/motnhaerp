import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const issue = await prisma.stockIssue.findUnique({
        where: { id },
        include: {
            warehouse: { select: { name: true, address: true } },
            project: { select: { name: true, code: true } },
            items: { include: { product: { select: { code: true } } } },
        },
    });
    if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(issue);
});
