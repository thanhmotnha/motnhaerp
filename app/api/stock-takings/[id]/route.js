import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { stockTakingUpdateSchema } from '@/lib/validations/stockTaking';

export const GET = withAuth(async (_request, { params }) => {
    const { id } = await params;
    const taking = await prisma.stockTaking.findUnique({
        where: { id },
        include: {
            warehouse: { select: { id: true, name: true } },
            items: {
                include: {
                    product: { select: { id: true, code: true, name: true, unit: true, category: true, image: true } },
                },
                orderBy: { product: { name: 'asc' } },
            },
        },
    });
    if (!taking) return NextResponse.json({ error: 'Không tìm thấy phiếu kiểm kê' }, { status: 404 });
    return NextResponse.json(taking);
}, { roles: ['ke_toan', 'giam_doc', 'kho'] });

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = stockTakingUpdateSchema.parse(body);

    const existing = await prisma.stockTaking.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    if (existing.status !== 'Nháp') {
        return NextResponse.json({ error: 'Phiếu đã chốt, không sửa được' }, { status: 422 });
    }

    await prisma.$transaction(async (tx) => {
        if (data.note !== undefined) {
            await tx.stockTaking.update({ where: { id }, data: { note: data.note } });
        }
        if (data.items && data.items.length > 0) {
            for (const it of data.items) {
                await tx.stockTakingItem.update({
                    where: { id: it.id },
                    data: {
                        countedStock: it.countedStock ?? null,
                        note: it.note || '',
                    },
                });
            }
        }
    });

    const updated = await prisma.stockTaking.findUnique({
        where: { id },
        include: {
            warehouse: { select: { id: true, name: true } },
            items: {
                include: { product: { select: { id: true, code: true, name: true, unit: true, category: true, image: true } } },
                orderBy: { product: { name: 'asc' } },
            },
        },
    });
    return NextResponse.json(updated);
}, { roles: ['ke_toan', 'giam_doc', 'kho'] });

export const DELETE = withAuth(async (_request, { params }) => {
    const { id } = await params;
    const existing = await prisma.stockTaking.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    if (existing.status !== 'Nháp') {
        return NextResponse.json({ error: 'Chỉ xóa được phiếu Nháp' }, { status: 422 });
    }
    await prisma.stockTaking.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}, { roles: ['ke_toan', 'giam_doc', 'kho'] });
