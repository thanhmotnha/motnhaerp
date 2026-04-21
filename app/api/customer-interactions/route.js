import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET — list interactions across customers (cho giám đốc / kế toán; NVKD tự filter của mình)
export const GET = withAuth(async (request, _ctx, session) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const salesPersonId = searchParams.get('salesPersonId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const outcome = searchParams.get('outcome');
    const type = searchParams.get('type');

    const where = {};

    if (session.user.role === 'kinh_doanh') {
        where.createdBy = session.user.id;
    } else if (session.user.role === 'ky_thuat' || session.user.role === 'kho') {
        return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    } else if (salesPersonId) {
        where.createdBy = salesPersonId;
    }

    if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to) where.date.lte = new Date(to);
    }
    if (outcome) where.outcome = outcome;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
        prisma.customerInteraction.findMany({
            where,
            include: {
                customer: { select: { id: true, code: true, name: true, phone: true, salesPersonId: true } },
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit,
        }),
        prisma.customerInteraction.count({ where }),
    ]);

    const userIds = new Set();
    for (const it of items) {
        if (it.createdBy) userIds.add(it.createdBy);
        for (const c of it.companionIds || []) userIds.add(c);
    }
    const users = userIds.size > 0
        ? await prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true } })
        : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const enriched = items.map(it => ({
        ...it,
        createdByUser: userMap.get(it.createdBy) || null,
        companions: (it.companionIds || []).map(cid => userMap.get(cid)).filter(Boolean),
    }));

    return NextResponse.json(paginatedResponse(enriched, total, { page, limit }));
});
