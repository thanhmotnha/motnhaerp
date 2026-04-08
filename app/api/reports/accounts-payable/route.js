import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/reports/accounts-payable — Công nợ nhà cung cấp
export const GET = withAuth(async (request, context, session) => {
    // PO đã duyệt nhưng chưa trả hết
    const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: {
            status: { in: ['Đã duyệt', 'Đã giao', 'Hoàn thành'] },
        },
        select: {
            id: true,
            code: true,
            supplier: true,
            totalAmount: true,
            paidAmount: true,
            orderDate: true,
            deliveryDate: true,
            status: true,
            supplierId: true,
            supplierRel: { select: { name: true, phone: true, bankAccount: true, bankName: true } },
            project: { select: { code: true, name: true } },
        },
        orderBy: { orderDate: 'desc' },
    });

    // Contractor payments chưa trả hết
    const contractorPayments = await prisma.contractorPayment.findMany({
        where: {
            status: { notIn: ['rejected', 'cancelled'] },
        },
        select: {
            id: true,
            contractAmount: true,
            paidAmount: true,
            netAmount: true,
            status: true,
            phase: true,
            description: true,
            dueDate: true,
            retentionAmount: true,
            contractor: { select: { name: true, phone: true, bankAccount: true, bankName: true } },
            project: { select: { code: true, name: true } },
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    // Group PO by supplier
    const supplierMap = {};
    for (const po of purchaseOrders) {
        const key = po.supplierId || po.supplier;
        if (!supplierMap[key]) {
            supplierMap[key] = {
                name: po.supplierRel?.name || po.supplier,
                phone: po.supplierRel?.phone || '',
                bank: po.supplierRel?.bankAccount ? `${po.supplierRel.bankAccount} - ${po.supplierRel.bankName}` : '',
                totalOwed: 0,
                totalPaid: 0,
                orders: [],
            };
        }
        const remaining = (po.totalAmount || 0) - (po.paidAmount || 0);
        supplierMap[key].totalOwed += remaining;
        supplierMap[key].totalPaid += po.paidAmount || 0;
        if (remaining > 0) {
            supplierMap[key].orders.push({
                id: po.id,
                code: po.code,
                total: po.totalAmount,
                paid: po.paidAmount,
                remaining,
                date: po.orderDate,
                project: po.project,
                status: po.status,
            });
        }
    }

    // Group contractor payments
    const contractorMap = {};
    for (const cp of contractorPayments) {
        const key = cp.contractor?.name || 'Unknown';
        if (!contractorMap[key]) {
            contractorMap[key] = {
                name: cp.contractor?.name || key,
                phone: cp.contractor?.phone || '',
                bank: cp.contractor?.bankAccount ? `${cp.contractor.bankAccount} - ${cp.contractor.bankName}` : '',
                totalOwed: 0,
                totalPaid: 0,
                payments: [],
            };
        }
        const remaining = (cp.netAmount || cp.contractAmount || 0) - (cp.paidAmount || 0);
        contractorMap[key].totalOwed += Math.max(0, remaining);
        contractorMap[key].totalPaid += cp.paidAmount || 0;
        if (remaining > 0) {
            contractorMap[key].payments.push({
                id: cp.id,
                total: cp.netAmount || cp.contractAmount,
                paid: cp.paidAmount,
                remaining,
                phase: cp.phase || cp.description,
                dueDate: cp.dueDate,
                project: cp.project,
                status: cp.status,
                retention: cp.retentionAmount,
            });
        }
    }

    const suppliers = Object.values(supplierMap).filter(s => s.totalOwed > 0).sort((a, b) => b.totalOwed - a.totalOwed);
    const contractors = Object.values(contractorMap).filter(c => c.totalOwed > 0).sort((a, b) => b.totalOwed - a.totalOwed);

    return NextResponse.json({
        suppliers,
        contractors,
        summary: {
            totalSupplierDebt: suppliers.reduce((s, x) => s + x.totalOwed, 0),
            totalContractorDebt: contractors.reduce((s, x) => s + x.totalOwed, 0),
            supplierCount: suppliers.length,
            contractorCount: contractors.length,
        },
    });
}, { roles: ['giam_doc', 'ke_toan'] });
