// app/api/hr/contract-commissions/route.js
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
    employeeId: z.string().min(1),
    contractId: z.string().min(1),
    rate: z.number().min(0).max(100),
}).strict();

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const where = employeeId ? { employeeId } : {};

    const commissions = await prisma.contractCommission.findMany({
        where,
        include: {
            employee: { select: { id: true, name: true, code: true } },
            contract: {
                select: {
                    id: true, code: true, contractValue: true,
                    variationAmount: true,
                    project: { select: { name: true, code: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    const data = commissions.map(c => ({
        ...c,
        estimatedAmount: Math.round(
            ((c.contract.contractValue || 0) + (c.contract.variationAmount || 0)) * c.rate / 100
        ),
    }));

    return NextResponse.json({ data });
, { roles: ["giam_doc", "ke_toan"] });

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const validated = createSchema.parse(body);

    const commission = await prisma.contractCommission.create({
        data: validated,
        include: {
            employee: { select: { id: true, name: true, code: true } },
            contract: {
                select: {
                    id: true, code: true,
                    contractValue: true, variationAmount: true,
                },
            },
        },
    });

    return NextResponse.json(commission, { status: 201 });
, { roles: ["giam_doc", "ke_toan"] });
