import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const type = searchParams.get('type');
    const warehouseId = searchParams.get('warehouseId');
    const productId = searchParams.get('productId');
    const search = searchParams.get('search') || '';

    const where = {};
    if (type) where.type = type;
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (search) {
        where.OR = [
            { code: { contains: search, mode: 'insensitive' } },
            { product: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const [transactions, total, warehouses] = await Promise.all([
        prisma.inventoryTransaction.findMany({
            where,
            include: {
                product: { select: { name: true, unit: true } },
                warehouse: { select: { name: true } },
                project: { select: { name: true } },
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit,
        }),
        prisma.inventoryTransaction.count({ where }),
        prisma.warehouse.findMany({ orderBy: { name: 'asc' } }),
    ]);

    return NextResponse.json({
        ...paginatedResponse(transactions, total, { page, limit }),
        warehouses,
    });
});

export const POST = withAuth(async (request) => {
    const data = await request.json();
    if (!data.warehouseId) return NextResponse.json({ error: 'Kho bắt buộc' }, { status: 400 });

    // Support both single item (legacy) and items array
    const items = data.items?.length > 0
        ? data.items
        : [{ productId: data.productId, quantity: data.quantity, unit: data.unit }];

    if (!items.length || !items[0].productId) {
        return NextResponse.json({ error: 'Sản phẩm bắt buộc' }, { status: 400 });
    }

    const type = data.type || 'Nhập';
    const prefix = type === 'Nhập' ? 'PNK' : 'PXK';

    // Validate xuất kho không vượt tồn kho
    if (type !== 'Nhập') {
        for (const item of items) {
            const qty = Number(item.quantity) || 0;
            const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { stock: true, name: true } });
            if (!product) return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 400 });
            if ((product.stock || 0) < qty) {
                return NextResponse.json({ error: `${product.name}: tồn kho không đủ (tồn: ${product.stock}, cần: ${qty})` }, { status: 400 });
            }
        }
    }

    const results = [];
    for (const item of items) {
        const qty = Number(item.quantity) || 0;
        if (!item.productId || qty <= 0) continue;
        const code = await generateCode('inventoryTransaction', prefix);
        const tx = await prisma.inventoryTransaction.create({
            data: {
                code,
                type,
                quantity: qty,
                unit: item.unit || '',
                note: data.note || '',
                date: data.date ? new Date(data.date) : new Date(),
                productId: item.productId,
                warehouseId: data.warehouseId,
                projectId: data.projectId || null,
            },
        });
        const delta = type === 'Nhập' ? qty : -qty;
        await prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: delta } } });
        results.push(tx);
    }

    return NextResponse.json(results.length === 1 ? results[0] : results, { status: 201 });
});
