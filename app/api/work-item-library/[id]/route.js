import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const data = await request.json();
        const item = await prisma.workItemLibrary.update({ where: { id }, data });
        return NextResponse.json(item);
    } catch (e) {
        console.error('WorkItemLibrary PUT error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        await prisma.workItemLibrary.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('WorkItemLibrary DELETE error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
