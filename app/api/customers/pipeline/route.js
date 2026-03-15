import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/customers/pipeline?search=xxx
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where = { deletedAt: null };
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
        ];
    }

    const stages = ['Lead', 'Tiếp cận', 'Báo giá', 'Thương lượng', 'Chốt đơn', 'Thi công', 'Hoàn thành', 'Mất'];

    const customers = await prisma.customer.findMany({
        where,
        select: {
            id: true, code: true, name: true, phone: true,
            pipelineStage: true, estimatedValue: true, nextFollowUp: true,
            score: true, lastContactAt: true, lostReason: true,
            salesPerson: true, source: true, type: true,
            projects: { select: { id: true, name: true, status: true }, take: 3 },
            createdAt: true,
        },
        orderBy: { updatedAt: 'desc' },
    });

    // Group by stage
    const pipeline = {};
    for (const stage of stages) {
        pipeline[stage] = customers.filter(c => c.pipelineStage === stage);
    }

    // Summary stats
    const summary = {
        total: customers.length,
        byStage: stages.map(s => ({ stage: s, count: pipeline[s].length })),
        totalEstimatedValue: customers.reduce((sum, c) => sum + (c.estimatedValue || 0), 0),
        followUpToday: customers.filter(c => {
            if (!c.nextFollowUp) return false;
            const d = new Date(c.nextFollowUp);
            const today = new Date();
            return d.toDateString() === today.toDateString();
        }).length,
    };

    return NextResponse.json({ pipeline, summary, stages });
});

// PATCH /api/customers/pipeline — move stage
export const PATCH = withAuth(async (request) => {
    const body = await request.json();
    const { customerId, newStage, lostReason } = body;

    if (!customerId || !newStage) {
        return NextResponse.json({ error: 'customerId và newStage là bắt buộc' }, { status: 400 });
    }

    const updateData = { pipelineStage: newStage };
    if (newStage === 'Mất' && lostReason) updateData.lostReason = lostReason;

    const customer = await prisma.customer.update({
        where: { id: customerId },
        data: updateData,
    });

    return NextResponse.json(customer);
});
