import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

// GET /api/furniture-orders/[id]/issues
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const issues = await prisma.furnitureIssue.findMany({
        where: { furnitureOrderId: id },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(issues);
});

// POST /api/furniture-orders/[id]/issues
// Body: { issueType, title, description, priority, imageUrl }
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();

    if (!body.title?.trim()) return NextResponse.json({ error: 'Cần nhập tiêu đề phát sinh' }, { status: 400 });

    const order = await prisma.furnitureOrder.findUnique({ where: { id }, select: { id: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });

    const code = await generateCode('furnitureIssue', 'PS');
    const issue = await prisma.furnitureIssue.create({
        data: {
            furnitureOrderId: id,
            code,
            issueType: body.issueType || 'material',
            title: body.title.trim(),
            description: body.description || '',
            priority: body.priority || 'normal',
            imageUrl: body.imageUrl || '',
            reportedBy: session.user.name || '',
        },
    });
    return NextResponse.json(issue, { status: 201 });
});
