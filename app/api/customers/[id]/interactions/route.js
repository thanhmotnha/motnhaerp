import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET — list interactions for a customer
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const interactions = await prisma.customerInteraction.findMany({
        where: { customerId: id },
        orderBy: { date: 'desc' },
    });
    return NextResponse.json(interactions);
});

// POST — create new interaction
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { type, content, date, createdBy } = body;

    if (!type || !content) {
        return NextResponse.json({ error: 'type và content là bắt buộc' }, { status: 400 });
    }

    const interaction = await prisma.customerInteraction.create({
        data: {
            type,
            content,
            date: date ? new Date(date) : new Date(),
            createdBy: createdBy || '',
            customerId: id,
        },
    });

    // Update lastContactAt on customer
    await prisma.customer.update({
        where: { id },
        data: { lastContactAt: new Date() },
    });

    return NextResponse.json(interaction, { status: 201 });
});
