import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const logs = await prisma.trackingLog.findMany({
            include: { project: { select: { name: true, code: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(logs);
    } catch (e) {
        console.error('TrackingLog GET error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        const log = await prisma.trackingLog.create({ data });
        return NextResponse.json(log);
    } catch (e) {
        console.error('TrackingLog POST error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
