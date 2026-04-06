import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const itemSchema = z.object({
    productId: z.string().min(1),
    productName: z.string().min(1),
    unit: z.string().default(''),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
});

const groupSchema = z.object({
    supplierId: z.string().min(1),
    supplierName: z.string().min(1),
    items: z.array(itemSchema).min(1),
});

const bodySchema = z.object({
    quotationId: z.string().min(1),
    projectId: z.string().optional().nullable(),
    deliveryDate: z.string().optional().nullable(),
    groups: z.array(groupSchema).min(1),
}).strict();

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { quotationId, projectId, deliveryDate, groups } = bodySchema.parse(body);

    const createdPOs = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const group of groups) {
            const code = await generateCode('purchaseOrder', 'PO');
            const totalAmount = group.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

            const po = await tx.purchaseOrder.create({
                data: {
                    code,
                    supplier: group.supplierName,
                    supplierId: group.supplierId,
                    quotationId,
                    projectId: projectId || null,
                    deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
                    status: 'Nháp',
                    totalAmount,
                    notes: '',
                    items: {
                        create: group.items.map(it => ({
                            productId: it.productId,
                            productName: it.productName,
                            unit: it.unit,
                            quantity: it.quantity,
                            unitPrice: it.unitPrice,
                            amount: it.quantity * it.unitPrice,
                        })),
                    },
                },
                include: {
                    items: true,
                    project: { select: { name: true, code: true } },
                    supplierRel: { select: { name: true } },
                },
            });
            results.push(po);
        }
        return results;
    });

    return NextResponse.json(createdPOs, { status: 201 });
});
