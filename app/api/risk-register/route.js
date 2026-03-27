import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const where = { projectId };
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    if (status) where.status = status;
    if (category) where.category = category;

    const items = await prisma.riskEntry.findMany({
        where,
        orderBy: [{ riskScore: 'desc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(items);
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const {
        projectId, title, description = '', category = 'Kỹ thuật',
        probability = 'Trung bình', impact = 'Trung bình',
        status = 'Mở', mitigation = '', owner = '', dueDate,
    } = body;
    if (!projectId || !title?.trim()) {
        return NextResponse.json({ error: 'projectId và title là bắt buộc' }, { status: 400 });
    }
    // Simple risk score: Low=1, Med=2, High=3, Critical=4
    const pMap = { 'Thấp': 1, 'Trung bình': 2, 'Cao': 3 };
    const iMap = { 'Thấp': 1, 'Trung bình': 2, 'Cao': 3, 'Nghiêm trọng': 4 };
    const riskScore = (pMap[probability] || 2) * (iMap[impact] || 2);

    const item = await prisma.riskEntry.create({
        data: {
            projectId, title: title.trim(), description, category,
            probability, impact, riskScore, status, mitigation, owner,
            dueDate: dueDate ? new Date(dueDate) : null,
        },
    });
    return NextResponse.json(item, { status: 201 });
});
