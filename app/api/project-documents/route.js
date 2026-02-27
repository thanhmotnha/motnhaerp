import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const projectId = searchParams.get('projectId');
    const customerId = searchParams.get('customerId');
    const search = searchParams.get('search') || '';

    const where = {};
    if (projectId) where.projectId = projectId;
    if (customerId) where.customerId = customerId;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { project: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const [docs, total] = await Promise.all([
        prisma.projectDocument.findMany({
            where,
            include: {
                project: { select: { name: true, code: true } },
                customer: { select: { name: true, code: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.projectDocument.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(docs, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const data = await request.json();
    const doc = await prisma.projectDocument.create({ data });
    return NextResponse.json(doc);
});

export const DELETE = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.projectDocument.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
