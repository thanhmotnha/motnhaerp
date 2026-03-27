import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const pMap = { 'Thấp': 1, 'Trung bình': 2, 'Cao': 3 };
const iMap = { 'Thấp': 1, 'Trung bình': 2, 'Cao': 3, 'Nghiêm trọng': 4 };

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const data = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.category !== undefined) data.category = body.category;
    if (body.probability !== undefined) data.probability = body.probability;
    if (body.impact !== undefined) data.impact = body.impact;
    if (body.probability !== undefined || body.impact !== undefined) {
        const current = await prisma.riskEntry.findUnique({ where: { id }, select: { probability: true, impact: true } });
        const p = body.probability ?? current?.probability ?? 'Trung bình';
        const i = body.impact ?? current?.impact ?? 'Trung bình';
        data.riskScore = (pMap[p] || 2) * (iMap[i] || 2);
    }
    if (body.status !== undefined) data.status = body.status;
    if (body.mitigation !== undefined) data.mitigation = body.mitigation;
    if (body.owner !== undefined) data.owner = body.owner;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

    const item = await prisma.riskEntry.update({ where: { id }, data });
    return NextResponse.json(item);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.riskEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
