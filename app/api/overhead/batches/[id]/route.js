import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { overheadBatchUpdateSchema } from '@/lib/validations/overhead';

export const GET = withAuth(async (_request, { params }) => {
    const { id } = await params;
    const batch = await prisma.overheadBatch.findFirst({
        where: { id, deletedAt: null },
        include: {
            items: {
                include: { expense: { include: { category: { select: { name: true } } } } },
            },
            allocations: {
                include: { project: { select: { id: true, name: true, code: true } } },
            },
        },
    });
    if (!batch) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(batch);
}, { roles: ["giam_doc", "ke_toan"] });

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const existing = await prisma.overheadBatch.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (existing.status === 'confirmed') {
        return NextResponse.json({ error: 'Không thể sửa đợt đã xác nhận' }, { status: 400 });
    }
    const { expenseIds, ...data } = overheadBatchUpdateSchema.parse(await request.json());

    const batch = await prisma.$transaction(async (tx) => {
        if (expenseIds !== undefined) {
            const expenses = await tx.overheadExpense.findMany({
                where: { id: { in: expenseIds }, status: 'approved' },
                select: { id: true, amount: true },
            });
            const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
            await tx.overheadBatchItem.deleteMany({ where: { batchId: id } });
            await tx.overheadBatchItem.createMany({
                data: expenses.map(e => ({ batchId: id, expenseId: e.id, amount: e.amount })),
            });
            data.totalAmount = totalAmount;
        }
        await tx.overheadBatch.update({ where: { id }, data });
        return tx.overheadBatch.findFirst({
            where: { id },
            include: {
                items: { include: { expense: { include: { category: { select: { name: true } } } } } },
                allocations: { include: { project: { select: { id: true, name: true, code: true } } } },
            },
        });
    });
    return NextResponse.json(batch);
}, { roles: ["giam_doc", "ke_toan"] });

export const DELETE = withAuth(async (_request, { params }) => {
    const { id } = await params;
    const existing = await prisma.overheadBatch.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (existing.status === 'confirmed') {
        return NextResponse.json({ error: 'Không thể xóa đợt đã xác nhận' }, { status: 400 });
    }
    await prisma.overheadBatch.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
}, { roles: ["giam_doc", "ke_toan"] });
