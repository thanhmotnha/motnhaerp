import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { stockTakingCreateSchema } from '@/lib/validations/stockTaking';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const warehouseId = searchParams.get('warehouseId');

    const where = {};
    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;

    const takings = await prisma.stockTaking.findMany({
        where,
        include: {
            warehouse: { select: { id: true, name: true } },
            items: { select: { id: true, systemStock: true, countedStock: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    const data = takings.map(st => {
        const counted = st.items.filter(it => it.countedStock !== null).length;
        const diff = st.items.filter(it => it.countedStock !== null && it.countedStock !== it.systemStock).length;
        return {
            id: st.id,
            code: st.code,
            status: st.status,
            note: st.note,
            createdAt: st.createdAt,
            completedAt: st.completedAt,
            warehouse: st.warehouse,
            totalItems: st.items.length,
            countedItems: counted,
            diffItems: diff,
        };
    });

    return NextResponse.json(data);
}, { roles: ['ke_toan', 'giam_doc'] });

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = stockTakingCreateSchema.parse(body);

    const whereProducts = {
        deletedAt: null,
        warehouseId: data.warehouseId,
    };
    if (data.productIds && data.productIds.length > 0) {
        whereProducts.id = { in: data.productIds };
    }
    const products = await prisma.product.findMany({
        where: whereProducts,
        select: { id: true, stock: true },
    });

    if (products.length === 0) {
        return NextResponse.json({ error: 'Kho không có SP nào để kiểm kê' }, { status: 400 });
    }

    const code = await generateCode('stockTaking', 'KK');

    const taking = await prisma.stockTaking.create({
        data: {
            code,
            warehouseId: data.warehouseId,
            note: data.note || '',
            createdById: session.user.id,
            items: {
                create: products.map(p => ({
                    productId: p.id,
                    systemStock: p.stock || 0,
                })),
            },
        },
        include: {
            warehouse: { select: { id: true, name: true } },
            items: {
                include: {
                    product: { select: { id: true, code: true, name: true, unit: true, category: true, image: true } },
                },
            },
        },
    });

    return NextResponse.json(taking, { status: 201 });
}, { roles: ['ke_toan', 'giam_doc'] });
