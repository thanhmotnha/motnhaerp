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
    if (!data.productId) return NextResponse.json({ error: 'Sản phẩm bắt buộc' }, { status: 400 });
    if (!data.warehouseId) return NextResponse.json({ error: 'Kho bắt buộc' }, { status: 400 });
    const prefix = data.type === 'Nhập' ? 'PNK' : 'PXK';
    const code = await generateCode('inventoryTransaction', prefix);
    const qty = Number(data.quantity) || 0;

    // Validate xuất kho không vượt tồn kho
    if (data.type !== 'Nhập') {
        const product = await prisma.product.findUnique({ where: { id: data.productId }, select: { stock: true, name: true } });
        if (!product) return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 400 });
        if ((product.stock || 0) < qty) {
            return NextResponse.json({ error: `Tồn kho không đủ. Hiện có: ${product.stock} — Cần xuất: ${qty}` }, { status: 400 });
        }
    }

    const tx = await prisma.inventoryTransaction.create({
        data: {
            code,
            type: data.type || 'Nhập',
            quantity: qty,
            unit: data.unit || '',
            note: data.note || '',
            date: data.date ? new Date(data.date) : new Date(),
            productId: data.productId,
            warehouseId: data.warehouseId,
            projectId: data.projectId || null,
        },
    });

    // Update product stock
    const delta = data.type === 'Nhập' ? qty : -qty;
    await prisma.product.update({ where: { id: data.productId }, data: { stock: { increment: delta } } });

    return NextResponse.json(tx, { status: 201 });
});
