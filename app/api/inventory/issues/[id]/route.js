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
