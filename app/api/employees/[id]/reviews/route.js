import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activityLogger';
import { employeeReviewCreateSchema } from '@/lib/validations/employeeReview';

// GET — list reviews for an employee
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    const where = { employeeId: id };
    if (period) where.period = period;

    const reviews = await prisma.employeeReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(reviews);
}, { roles: ["giam_doc", "ke_toan"] });

// POST — create new review
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();

    // Map frontend "rating" → DB "score"
    if (body.rating != null && body.score == null) {
        body.score = body.rating;
    }
    delete body.rating;

    const data = employeeReviewCreateSchema.parse(body);

    const review = await prisma.employeeReview.create({
        data: {
            ...data,
            employeeId: id,
        },
    });

    await logActivity({
        action: 'create',
        entityType: 'EmployeeReview',
        entityId: review.id,
        entityLabel: `${data.period} — ${data.type}`,
        actor: session?.user?.name || 'Unknown',
        actorId: session?.user?.id || '',
    });

    return NextResponse.json(review, { status: 201 });
}, { roles: ["giam_doc", "ke_toan"] });
