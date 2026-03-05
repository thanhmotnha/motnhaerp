import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/customer/quotation — Báo giá cho khách hàng
export const GET = withAuth(async (request) => {
    const user = request.user;

    const customer = await prisma.customer.findFirst({
        where: {
            OR: [
                { email: user.email },
                { phone: user.phone || '_none_' },
            ],
            deletedAt: null,
        },
        select: { id: true },
    });

    if (!customer) {
        return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });
    }

    // Lấy báo giá đã duyệt mới nhất
    const quotation = await prisma.quotation.findFirst({
        where: {
            customerId: customer.id,
            deletedAt: null,
            status: { in: ['Đã duyệt', 'Hoàn thành', 'Đã ký HĐ'] },
        },
        orderBy: { updatedAt: 'desc' },
        include: {
            categories: {
                orderBy: { order: 'asc' },
                include: {
                    items: {
                        where: { parentItemId: null },
                        orderBy: { order: 'asc' },
                        select: {
                            id: true,
                            name: true,
                            unit: true,
                            quantity: true,
                            unitPrice: true,
                            amount: true,
                            description: true,
                        },
                    },
                },
            },
        },
    });

    if (!quotation) {
        // Fallback: lấy báo giá mới nhất bất kỳ
        const latestQuotation = await prisma.quotation.findFirst({
            where: { customerId: customer.id, deletedAt: null },
            orderBy: { updatedAt: 'desc' },
            include: {
                categories: {
                    orderBy: { order: 'asc' },
                    include: {
                        items: {
                            where: { parentItemId: null },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                unit: true,
                                quantity: true,
                                unitPrice: true,
                                amount: true,
                                description: true,
                            },
                        },
                    },
                },
            },
        });

        if (!latestQuotation) {
            return NextResponse.json(null);
        }

        return formatQuotationResponse(latestQuotation, customer.id);
    }

    return formatQuotationResponse(quotation, customer.id);
});

async function formatQuotationResponse(quotation, customerId) {
    // Lấy payment schedule từ contract
    const contract = await prisma.contract.findFirst({
        where: { customerId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        include: {
            payments: {
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    phase: true,
                    amount: true,
                    paidAmount: true,
                    status: true,
                    dueDate: true,
                    paidDate: true,
                },
            },
        },
    });

    const payments = (contract?.payments || []).map(p => ({
        label: p.phase,
        amount: p.amount,
        paid: p.status === 'Đã thu' || p.status === 'Đã thanh toán',
        dueDate: p.dueDate,
        paidDate: p.paidDate,
    }));

    return NextResponse.json({
        id: quotation.id,
        code: quotation.code,
        title: `Báo giá ${quotation.code}`,
        status: quotation.status,
        total: quotation.directCost || quotation.total,
        managementFee: quotation.managementFee,
        designFee: quotation.designFee,
        grandTotal: quotation.grandTotal,
        date: quotation.createdAt,
        categories: quotation.categories.map(cat => ({
            name: cat.name,
            subtotal: cat.subtotal,
            items: cat.items.map(item => ({
                name: item.name,
                unit: item.unit,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.amount,
            })),
        })),
        payments,
    });
}
