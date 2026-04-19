import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { stockIssueCreateSchema } from '@/lib/validations/stockIssue';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const projectId = searchParams.get('projectId');

    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (projectId) where.projectId = projectId;

    const issues = await prisma.stockIssue.findMany({
        where,
        include: {
            warehouse: { select: { name: true } },
            project: { select: { name: true, code: true } },
            items: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });
    return NextResponse.json(issues);
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = stockIssueCreateSchema.parse(body);

    const code = await generateCode('stockIssue', 'PXK');

    let issue;
    try {
        issue = await prisma.$transaction(async (tx) => {
            // Validate tồn kho + kho-SP bên trong transaction để tránh race condition
            for (const item of data.items) {
                if (!item.productId) continue;
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { stock: true, name: true, warehouseId: true },
                });
                if (!product) throw Object.assign(new Error('Sản phẩm không tồn tại'), { status: 400 });
                if (product.warehouseId && product.warehouseId !== data.warehouseId) {
                    throw Object.assign(
                        new Error(`${product.name}: thuộc kho khác với phiếu xuất — tách phiếu riêng`),
                        { status: 400 }
                    );
                }
                if ((product.stock || 0) < item.qty) {
                    throw Object.assign(
                        new Error(`${item.productName}: tồn kho không đủ (tồn: ${product.stock}, cần: ${item.qty})`),
                        { status: 400 }
                    );
                }
            }

            const si = await tx.stockIssue.create({
                data: {
                    code,
                    warehouseId: data.warehouseId,
                    projectId: data.projectId,
                    issuedDate: data.issuedDate || new Date(),
                    issuedBy: data.issuedBy || '',
                    notes: data.notes || '',
                    createdById: session.user.id,
                    items: {
                        create: data.items.map(it => ({
                            productId: it.productId,
                            productName: it.productName,
                            unit: it.unit,
                            qty: it.qty,
                            unitPrice: it.unitPrice,
                            variantLabel: it.variantLabel || '',
                        })),
                    },
                },
                include: { items: true },
            });

            for (const item of si.items) {
                if (item.productId) {
                    // Dùng importPrice hiện tại nếu unitPrice chưa nhập
                    if (!item.unitPrice) {
                        const product = await tx.product.findUnique({
                            where: { id: item.productId },
                            select: { importPrice: true },
                        });
                        if (product?.importPrice) {
                            await tx.stockIssueItem.update({
                                where: { id: item.id },
                                data: { unitPrice: product.importPrice },
                            });
                        }
                    }
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.qty } },
                    });

                    const txCode = await generateCode('inventoryTransaction', 'XK');
                    await tx.inventoryTransaction.create({
                        data: {
                            code: txCode,
                            type: 'Xuất',
                            quantity: item.qty,
                            unit: item.unit,
                            note: `Phiếu xuất ${si.code}`,
                            productId: item.productId,
                            warehouseId: data.warehouseId,
                            projectId: data.projectId || null,
                            date: data.issuedDate || new Date(),
                        },
                    });
                }
            }

            return si;
        });
    } catch (e) {
        if (e.status === 400) return NextResponse.json({ error: e.message }, { status: 400 });
        throw e;
    }

    return NextResponse.json(issue, { status: 201 });
});
