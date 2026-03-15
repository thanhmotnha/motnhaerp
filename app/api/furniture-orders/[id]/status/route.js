import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const VALID_TRANSITIONS = {
    draft:              ['confirmed', 'cancelled'],
    confirmed:          ['design_review', 'cancelled'],
    design_review:      ['design_approved', 'confirmed'],
    design_approved:    ['material_confirmed'],
    material_confirmed: ['in_production'],
    in_production:      ['qc_done'],
    qc_done:            ['installing'],
    installing:         ['completed'],
    completed:          [],
    cancelled:          ['draft'],
};

export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { status: newStatus } = await request.json();
    if (!newStatus) return NextResponse.json({ error: 'Thiếu status' }, { status: 400 });

    const order = await prisma.furnitureOrder.findUnique({ where: { id }, select: { status: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
        return NextResponse.json({ error: `Không thể chuyển từ '${order.status}' sang '${newStatus}'` }, { status: 400 });
    }

    const updateData = { status: newStatus };
    if (newStatus === 'completed') updateData.deliveredAt = new Date();

    const updated = await prisma.furnitureOrder.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
});
