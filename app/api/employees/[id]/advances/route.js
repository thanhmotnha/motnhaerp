import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET — list salary advances for an employee
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const advances = await prisma.salaryAdvance.findMany({
        where: { employeeId: id },
        orderBy: { requestDate: 'desc' },
    });
    return NextResponse.json(advances);
}, { roles: ["giam_doc", "ke_toan"] });

// POST — create salary advance request
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { amount, reason, deductMonth } = body;

    if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'amount phải > 0' }, { status: 400 });
    }

    const advance = await prisma.salaryAdvance.create({
        data: {
            amount,
            reason: reason || '',
            deductMonth: deductMonth || '',
            employeeId: id,
        },
    });

    return NextResponse.json(advance, { status: 201 });
}, { roles: ["giam_doc", "ke_toan"] });

// PATCH — approve/reject advance (from body: { id, status, approvedBy })
export const PATCH = withAuth(async (request, { params }) => {
    const body = await request.json();
    const { advanceId, status, approvedBy } = body;

    if (!advanceId || !status) {
        return NextResponse.json({ error: 'advanceId và status là bắt buộc' }, { status: 400 });
    }

    const data = { status };
    if (status === 'Đã duyệt') {
        data.approvedBy = approvedBy || '';
        data.approvedAt = new Date();
    }

    const advance = await prisma.salaryAdvance.update({
        where: { id: advanceId },
        data,
    });

    return NextResponse.json(advance);
}, { roles: ["giam_doc", "ke_toan"] });
