import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    const plans = await prisma.materialPlan.findMany({
        include: {
            product: { select: { name: true, code: true, unit: true } },
            project: { select: { name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(plans);
}

export async function POST(request) {
    const data = await request.json();
    const plan = await prisma.materialPlan.create({ data });
    return NextResponse.json(plan);
}
