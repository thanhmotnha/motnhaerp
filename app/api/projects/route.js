import { withAuth, withAuthAndLog } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { projectCreateSchema } from '@/lib/validations/project';
import { createDefaultFolders } from '@/lib/defaultFolders';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where = { deletedAt: null };
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [projects, total] = await Promise.all([
        prisma.project.findMany({
            where,
            include: {
                customer: { select: { name: true } },
                contracts: { select: { contractValue: true, variationAmount: true, payments: { select: { paidAmount: true } } } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.project.count({ where }),
    ]);

    // Compute real values from contracts
    const enriched = projects.map(p => {
        const sumCV = p.contracts.reduce((s, c) => s + (c.contractValue ?? 0) + (c.variationAmount ?? 0), 0);
        const sumCollected = p.contracts.reduce((s, c) => s + c.payments.reduce((ps, pay) => ps + (pay.paidAmount ?? 0), 0), 0);
        const { contracts, ...rest } = p;
        return {
            ...rest,
            contractValue: sumCV || p.contractValue || 0,
            paidAmount: sumCollected || p.paidAmount || 0,
            contractCount: contracts.length,
            debtFromCustomer: (sumCV || p.contractValue || 0) - (sumCollected || p.paidAmount || 0),
        };
    });

    return NextResponse.json(paginatedResponse(enriched, total, { page, limit }));
});

export const POST = withAuthAndLog(async (request) => {
    const body = await request.json();
    const data = projectCreateSchema.parse(body);

    const project = await withCodeRetry('project', 'DA', async (code) => {
        return prisma.$transaction(async (tx) => {
            const proj = await tx.project.create({
                data: { code, ...data },
            });
            await createDefaultFolders(tx, proj.id);
            return proj;
        });
    });

    return NextResponse.json(project, { status: 201 });
}, { entityType: 'Project' });
