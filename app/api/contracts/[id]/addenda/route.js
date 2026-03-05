import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req, { params }) => {
    const { id } = await params;
    const addenda = await prisma.contractAddendum.findMany({
        where: { contractId: id },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(addenda);
});

export const POST = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const { title, description = '', amount = 0, signDate, status = 'Nháp' } = body;
    if (!title?.trim()) return NextResponse.json({ error: 'Tiêu đề phụ lục là bắt buộc' }, { status: 400 });

    const contract = await prisma.contract.findUnique({ where: { id }, select: { id: true, code: true } });
    if (!contract) return NextResponse.json({ error: 'Hợp đồng không tồn tại' }, { status: 404 });

    const addendum = await withCodeRetry('contractAddendum', `${contract.code}-PL`, async (code) => {
        return prisma.contractAddendum.create({
            data: { code, contractId: id, title: title.trim(), description, amount: Number(amount) || 0, signDate: signDate ? new Date(signDate) : null, status },
        });
    });

    return NextResponse.json(addendum, { status: 201 });
});
