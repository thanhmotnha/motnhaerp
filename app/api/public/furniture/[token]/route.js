import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET public order view via token (no auth)
export async function GET(request, { params }) {
    const { token } = await params;

    const order = await prisma.furnitureOrder.findFirst({
        where: {
            publicToken: token,
            tokenExpiresAt: { gt: new Date() },
        },
        include: {
            customer: { select: { name: true, phone: true } },
            items: { where: { status: { not: 'cancelled' } }, orderBy: { sortOrder: 'asc' } },
            designs: { orderBy: { versionNumber: 'desc' } },
            materialSelections: { include: { items: true }, orderBy: { selectionRound: 'desc' } },
        },
    });

    if (!order) {
        return NextResponse.json({ error: 'Link không hợp lệ hoặc đã hết hạn' }, { status: 404 });
    }

    // Strip internal fields
    const { publicToken, tokenExpiresAt, internalNote, ...safe } = order;
    return NextResponse.json(safe);
}

// PUT customer action: approve/reject design via token
export async function PUT(request, { params }) {
    const { token } = await params;
    const body = await request.json();
    const { designId, action, customerFeedback, approvedByName, rejectionReason, clientIp } = body;

    if (!['approve', 'reject'].includes(action)) {
        return NextResponse.json({ error: 'action không hợp lệ' }, { status: 400 });
    }

    const order = await prisma.furnitureOrder.findFirst({
        where: { publicToken: token, tokenExpiresAt: { gt: new Date() } },
    });
    if (!order) return NextResponse.json({ error: 'Token không hợp lệ hoặc hết hạn' }, { status: 401 });
    if (!designId) return NextResponse.json({ error: 'Thiếu designId' }, { status: 400 });

    const design = await prisma.designVersion.findFirst({
        where: { id: designId, furnitureOrderId: order.id },
    });
    if (!design) return NextResponse.json({ error: 'Không tìm thấy bản vẽ' }, { status: 404 });
    if (design.status === 'approved') return NextResponse.json({ error: 'Bản vẽ đã được duyệt trước đó' }, { status: 400 });

    const ip = clientIp || request.headers.get('x-forwarded-for') || '';

    if (action === 'approve') {
        await prisma.$transaction([
            prisma.designVersion.update({
                where: { id: designId },
                data: { status: 'approved', approvedAt: new Date(), approvedByName: approvedByName || order.customer?.name || '', approvedIp: ip, customerFeedback: customerFeedback || '' },
            }),
            prisma.furnitureOrder.update({ where: { id: order.id }, data: { status: 'design_approved' } }),
        ]);
    } else {
        await prisma.designVersion.update({
            where: { id: designId },
            data: { status: 'rejected', rejectionReason: rejectionReason || '', customerFeedback: customerFeedback || '' },
        });
    }

    return NextResponse.json({ success: true, action });
}
