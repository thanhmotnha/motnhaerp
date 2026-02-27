import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const plans = await prisma.materialPlan.findMany({
            include: {
                product: { select: { name: true, code: true, unit: true } },
                project: { select: { name: true, code: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(plans);
    } catch (e) {
        console.error('MaterialPlan GET error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        const plan = await prisma.materialPlan.create({ data });
        return NextResponse.json(plan);
    } catch (e) {
        console.error('MaterialPlan POST error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
