import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams, 50);

    const entityType = searchParams.get('entityType') || '';
    const actor = searchParams.get('actor') || '';
    const search = searchParams.get('search') || '';

    const where = {};
    if (entityType) where.entityType = entityType;
    if (actor) where.actor = { contains: actor, mode: 'insensitive' };
    if (search) {
        where.OR = [
            { action: { contains: search, mode: 'insensitive' } },
            { entityLabel: { contains: search, mode: 'insensitive' } },
            { actor: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [logs, total] = await Promise.all([
        prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.activityLog.count({ where }),
    ]);

    // Get distinct entity types for filter dropdown
    const entityTypes = await prisma.activityLog.groupBy({
        by: ['entityType'],
        orderBy: { entityType: 'asc' },
    });

    return NextResponse.json({
        ...paginatedResponse(logs, total, { page, limit }),
        entityTypes: entityTypes.map(e => e.entityType),
    });
}, { roles: ['giam_doc', 'pho_gd'] });
