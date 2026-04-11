import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const issue = await prisma.stockIssue.findUnique({
        where: { id },
        include: {
            warehouse: { select: { name: true, address: true } },
            project: { select: { name: true, code: true } },
            items: { include: { product: { select: { code: true } } } },
        },
    });
    if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(issue);
});

export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { items, warehouseId, projectId, issuedBy, notes, issuedDate } = body;

    const existing = await prisma.stockIssue.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const issue = await prisma.$transaction(async (tx) => {
        // 1. Hoàn lại tồn kho cũ
        for (const old of existing.items) {
            if (old.productId && old.qty > 0) {
                await tx.product.update({
                    where: { id: old.productId },
                    data: { stock: { increment: old.qty } },
                });
            }
        }
        // 2. Xóa items cũ
        await tx.stockIssueItem.deleteMany({ where: { issueId: id } });

        // 3. Kiểm tra tồn kho mới + tạo items mới
        for (const it of (items || [])) {
            if (!it.productId || !(it.qty > 0)) continue;
            const product = await tx.product.findUnique({
                where: { id: it.productId },
                select: { stock: true, name: true, importPrice: true },
            });
            if (!product) throw Object.assign(new Error('Sản phẩm không tồn tại'), { status: 400 });
            if ((product.stock || 0) < Number(it.qty)) {
                throw Object.assign(
                    new Error(`${it.productName || product.name}: tồn không đủ (tồn: ${product.stock}, cần: ${it.qty})`),
                    { status: 400 }
                );
            }
            await tx.stockIssueItem.create({
                data: {
                    issueId: id,
                    productId: it.productId,
                    productName: it.productName || '',
                    unit: it.unit || '',
                    qty: Number(it.qty),
                    unitPrice: Number(it.unitPrice) || product.importPrice || 0,
                },
            });
            await tx.product.update({
                where: { id: it.productId },
                data: { stock: { decrement: Number(it.qty) } },
            });
        }

        // 4. Cập nhật metadata
        return tx.stockIssue.update({
            where: { id },
            data: {
                ...(warehouseId !== undefined && { warehouseId }),
                ...(projectId !== undefined && { projectId: projectId || null }),
                ...(issuedBy !== undefined && { issuedBy }),
                ...(notes !== undefined && { notes }),
                ...(issuedDate !== undefined && { issuedDate: new Date(issuedDate) }),
            },
            include: { items: true, warehouse: { select: { name: true } }, project: { select: { name: true, code: true } } },
        });
    });

    return NextResponse.json(issue);
}, { roles: ['giam_doc', 'ke_toan'] });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const issue = await prisma.stockIssue.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
        // Hoàn lại tồn kho (đảo ngược việc xuất)
        for (const item of issue.items) {
            if (item.productId && item.qty > 0) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.qty } },
                });
            }
        }
        await tx.stockIssue.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
}, { roles: ['giam_doc', 'ke_toan'] });
