import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const customerId = searchParams.get('customerId');
        const where = {};
        if (projectId) where.projectId = projectId;
        if (customerId) where.customerId = customerId;

        const docs = await prisma.projectDocument.findMany({
            where,
            include: {
                project: { select: { name: true, code: true } },
                customer: { select: { name: true, code: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(docs);
    } catch (e) {
        console.error('ProjectDocument GET error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        const doc = await prisma.projectDocument.create({ data });
        return NextResponse.json(doc);
    } catch (e) {
        console.error('ProjectDocument POST error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        await prisma.projectDocument.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('ProjectDocument DELETE error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
