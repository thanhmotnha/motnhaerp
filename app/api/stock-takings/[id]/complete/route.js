import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (_request, { params }) => {
    const { id } = await params;

    const taking = await prisma.stockTaking.findUnique({
        where: { id },
        include: {
            items: {
                include: { product: { select: { id: true, unit: true, name: true } } },
            },
        },
    });
    if (!taking) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    if (taking.status !== 'Nháp') {
        return NextResponse.json({ error: 'Phiếu đã chốt' }, { status: 422 });
    }

    const itemsWithCount = taking.items.filter(it => it.countedStock !== null);
    if (itemsWithCount.length === 0) {
        return NextResponse.json({ error: 'Nhập ít nhất 1 SP trước khi chốt' }, { status: 400 });
    }

    const diffItems = itemsWithCount.filter(it => it.countedStock !== it.systemStock);
    let dcBaseMax = 0;
    if (diffItems.length > 0) {
        const maxResult = await prisma.$queryRawUnsafe(
            `SELECT COALESCE(MAX(CAST(REPLACE(code, $1, '') AS INTEGER)), 0) as max_num
             FROM "InventoryTransaction"
             WHERE code LIKE $2 AND REPLACE(code, $1, '') ~ '^[0-9]+$'`,
            'DC', 'DC%'
        );
        dcBaseMax = Number(maxResult?.[0]?.max_num ?? 0);
    }
    let dcIdx = 0;

    await prisma.$transaction(async (tx) => {
        for (const it of itemsWithCount) {
            const delta = (it.countedStock || 0) - it.systemStock;
            if (delta !== 0) {
                await tx.product.update({
                    where: { id: it.productId },
                    data: { stock: it.countedStock || 0 },
                });

                const dcCode = `DC${String(dcBaseMax + 1 + dcIdx).padStart(3, '0')}`;
                dcIdx++;
                await tx.inventoryTransaction.create({
                    data: {
                        code: dcCode,
                        type: 'Điều chỉnh',
                        quantity: delta,
                        unit: it.product?.unit || '',
                        note: `Kiểm kê ${taking.code}${it.note ? ` — ${it.note}` : ''}`,
                        productId: it.productId,
                        warehouseId: taking.warehouseId,
                        date: new Date(),
                    },
                });
            }
        }

        await tx.stockTaking.update({
            where: { id },
            data: { status: 'Hoàn thành', completedAt: new Date() },
        });
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
}, { roles: ['ke_toan', 'giam_doc'] });
