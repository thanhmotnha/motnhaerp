import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/production-batches/[id]/costs
export async function GET(req, { params }) {
    const { id } = await params;

    const costs = await prisma.productionCost.findMany({
        where: { batchId: id },
        orderBy: { createdAt: 'desc' },
    });

    // summary by category
    const summary = {};
    let grandTotal = 0;
    for (const c of costs) {
        summary[c.category] = (summary[c.category] || 0) + c.totalAmount;
        grandTotal += c.totalAmount;
    }

    return NextResponse.json({ costs, summary, grandTotal });
}

// POST /api/production-batches/[id]/costs
export async function POST(req, { params }) {
    const { id } = await params;
    const body = await req.json();

    const amount = parseFloat(body.amount) || 0;
    const quantity = parseFloat(body.quantity) || 1;
    const totalAmount = amount * quantity;

    const cost = await prisma.productionCost.create({
        data: {
            batchId: id,
            category: body.category || 'Vật tư',
            description: body.description || '',
            amount,
            quantity,
            unit: body.unit || '',
            totalAmount,
            receiptUrl: body.receiptUrl || '',
            createdBy: body.createdBy || '',
        },
    });

    return NextResponse.json(cost, { status: 201 });
}
