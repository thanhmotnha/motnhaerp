import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    const logs = await prisma.trackingLog.findMany({
        include: { project: { select: { name: true, code: true } } },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(logs);
}

export async function POST(request) {
    const data = await request.json();
    const log = await prisma.trackingLog.create({ data });
    return NextResponse.json(log);
}
