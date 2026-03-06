import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET contractors assigned to a schedule task
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const assignments = await prisma.subContractorTask.findMany({
        where: { taskId: id },
        include: {
            contractor: { select: { id: true, name: true, type: true, phone: true } },
        },
        orderBy: { assignedAt: 'asc' },
    });
    return NextResponse.json(assignments);
});

// POST assign contractor to task
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { contractorId, notes } = await request.json();

    if (!contractorId) {
        return NextResponse.json({ error: 'contractorId required' }, { status: 400 });
    }

    const assignment = await prisma.subContractorTask.create({
        data: {
            taskId: id,
            contractorId,
            notes: notes || '',
        },
        include: {
            contractor: { select: { id: true, name: true, type: true, phone: true } },
        },
    });

    return NextResponse.json(assignment, { status: 201 });
});

// DELETE unassign contractor from task
export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractorId');

    if (!contractorId) {
        return NextResponse.json({ error: 'contractorId required' }, { status: 400 });
    }

    await prisma.subContractorTask.deleteMany({
        where: { taskId: id, contractorId },
    });

    return NextResponse.json({ ok: true });
});
