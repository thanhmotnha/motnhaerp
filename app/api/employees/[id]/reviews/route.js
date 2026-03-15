import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

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
});

// POST — create new review
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { period, score, criteria, strengths, weaknesses, reviewer, status } = body;

    if (!period) {
        return NextResponse.json({ error: 'period là bắt buộc' }, { status: 400 });
    }

    const review = await prisma.employeeReview.create({
        data: {
            period,
            score: score || 0,
            criteria: criteria || [],
            strengths: strengths || '',
            weaknesses: weaknesses || '',
            reviewer: reviewer || '',
            status: status || 'Nháp',
            employeeId: id,
        },
    });

    return NextResponse.json(review, { status: 201 });
});
