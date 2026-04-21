import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/customers/[id]/claim — NVKD nhận khách chưa có chủ
export const POST = withAuth(async (_request, { params }, session) => {
    if (session.user.role !== 'kinh_doanh') {
        return NextResponse.json({ error: 'Chỉ nhân viên kinh doanh được nhận khách' }, { status: 403 });
    }
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
        where: { id },
        select: { id: true, salesPersonId: true, name: true, deletedAt: true },
    });
    if (!customer || customer.deletedAt) {
        return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });
    }
    if (customer.salesPersonId) {
        return NextResponse.json({ error: 'Khách đã có chủ, không claim được' }, { status: 422 });
    }

    const updated = await prisma.customer.update({
        where: { id },
        data: { salesPersonId: session.user.id },
        include: { salesPerson: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(updated);
}, { roles: ['kinh_doanh'] });
