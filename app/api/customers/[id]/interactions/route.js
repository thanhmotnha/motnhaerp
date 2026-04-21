import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { interactionCreateSchema } from '@/lib/validations/customerInteraction';

const SCORE_MAP = { 'Nóng': 5, 'Ấm': 3, 'Lạnh': 1 };
const PIPELINE_MAP = { 'Đặt cọc': 'Cọc', 'Từ chối': 'Dừng', 'Báo giá': 'Báo giá' };

// GET — list interactions for a customer (kèm join user)
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const interactions = await prisma.customerInteraction.findMany({
        where: { customerId: id },
        orderBy: { date: 'desc' },
    });

    const userIds = new Set();
    for (const it of interactions) {
        if (it.createdBy) userIds.add(it.createdBy);
        for (const c of it.companionIds || []) userIds.add(c);
    }
    const users = userIds.size > 0
        ? await prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true } })
        : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return NextResponse.json(interactions.map(it => ({
        ...it,
        createdByUser: userMap.get(it.createdBy) || null,
        companions: (it.companionIds || []).map(cid => userMap.get(cid)).filter(Boolean),
    })));
});

// POST — create interaction; NVKD chỉ tạo cho khách của mình
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const data = interactionCreateSchema.parse(body);

    const customer = await prisma.customer.findUnique({
        where: { id },
        select: { id: true, salesPersonId: true, deletedAt: true },
    });
    if (!customer || customer.deletedAt) {
        return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });
    }
    if (session.user.role === 'kinh_doanh' && customer.salesPersonId !== session.user.id) {
        return NextResponse.json({ error: 'Bạn chỉ có thể check-in cho khách của mình' }, { status: 403 });
    }
    if (session.user.role === 'ky_thuat' || session.user.role === 'kho') {
        return NextResponse.json({ error: 'Không có quyền check-in' }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
        const interaction = await tx.customerInteraction.create({
            data: {
                ...data,
                customerId: id,
                createdBy: session.user.id,
            },
        });

        const customerUpdate = { lastContactAt: new Date() };
        if (data.interestLevel && SCORE_MAP[data.interestLevel] !== undefined) {
            customerUpdate.score = SCORE_MAP[data.interestLevel];
        }
        if (data.outcome && PIPELINE_MAP[data.outcome]) {
            customerUpdate.pipelineStage = PIPELINE_MAP[data.outcome];
        }
        await tx.customer.update({ where: { id }, data: customerUpdate });

        return interaction;
    });

    return NextResponse.json(result, { status: 201 });
});
