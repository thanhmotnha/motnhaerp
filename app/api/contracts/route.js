import { withAuth, withAuthAndLog } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { contractCreateSchema } from '@/lib/validations/contract';
import { PAYMENT_TEMPLATES } from '@/lib/contractTemplates';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const projectId = searchParams.get('projectId');
    const customerId = searchParams.get('customerId');

    const where = { deletedAt: null };
    if (status) where.status = status;
    if (type) where.type = type;
    if (projectId) where.projectId = projectId;
    if (customerId) where.customerId = customerId;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const [contracts, total] = await Promise.all([
        prisma.contract.findMany({
            where,
            include: {
                customer: { select: { name: true, code: true } },
                project: { select: { name: true, code: true, status: true } },
                quotation: { select: { code: true } },
                payments: { orderBy: { createdAt: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.contract.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(contracts, total, { page, limit }));
});

export const POST = withAuthAndLog(async (request) => {
    const body = await request.json();
    const { paymentPhases, ...validated } = contractCreateSchema.parse(body);

    const contractValue = Number(validated.contractValue) || 0;

    // Retry up to 3 times on code collision (P2002)
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const code = await generateCode('contract', 'HD');
            result = await prisma.$transaction(async (tx) => {
                const contract = await tx.contract.create({
                    data: {
                        code,
                        name: validated.name,
                        type: validated.type || 'Thi công thô',
                        contractValue,
                        status: validated.signDate ? 'Đã ký' : 'Nháp',
                        signDate: validated.signDate || null,
                        startDate: validated.startDate || null,
                        endDate: validated.endDate || null,
                        paymentTerms: validated.paymentTerms || '',
                        notes: validated.notes || '',
                        customerId: validated.customerId,
                        projectId: validated.projectId || null,
                        quotationId: validated.quotationId || null,
                    },
                });

                // Create payment phases: client-sent > template fallback
                const phases = paymentPhases?.length > 0
                    ? paymentPhases
                    : (PAYMENT_TEMPLATES[validated.type] || []).map(t => ({
                        phase: t.phase, pct: t.pct, category: t.category,
                        amount: Math.round(contractValue * t.pct / 100),
                    }));

                if (phases.length > 0) {
                    await tx.contractPayment.createMany({
                        data: phases.map(t => ({
                            contractId: contract.id,
                            phase: t.phase || '',
                            amount: Number(t.amount) || Math.round(contractValue * Number(t.pct || 0) / 100),
                            paidAmount: 0,
                            category: t.category || validated.type || 'Hợp đồng',
                            status: 'Chưa thu',
                        })),
                    });
                }

                // Auto-create MaterialPlan from quotation items
                if (validated.quotationId && validated.projectId) {
                    const qItems = await tx.quotationItem.findMany({
                        where: { quotationId: validated.quotationId, productId: { not: null } },
                        include: {
                            product: { select: { importPrice: true } },
                            category: { select: { group: true, name: true } },
                        },
                    });

                    const grouped = {};
                    for (const item of qItems) {
                        const pid = item.productId;
                        if (!grouped[pid]) {
                            grouped[pid] = {
                                qty: 0,
                                unitPrice: item.product?.importPrice || item.unitPrice || 0,
                                category: item.category?.group || item.category?.name || '',
                            };
                        }
                        grouped[pid].qty += item.volume || item.quantity || 0;
                    }

                    const existing = await tx.materialPlan.findMany({
                        where: { projectId: validated.projectId },
                        select: { productId: true },
                    });
                    const existingSet = new Set(existing.map(e => e.productId));

                    const newPlans = Object.entries(grouped)
                        .filter(([pid]) => !existingSet.has(pid))
                        .filter(([, { qty }]) => qty > 0)
                        .map(([productId, { qty, unitPrice, category }]) => ({
                            productId,
                            projectId: validated.projectId,
                            quantity: qty,
                            unitPrice,
                            totalAmount: qty * unitPrice,
                            budgetUnitPrice: unitPrice,
                            category,
                            status: 'Chưa đặt',
                            type: 'Chính',
                        }));

                    if (newPlans.length > 0) {
                        await tx.materialPlan.createMany({ data: newPlans });
                    }
                }

                return await tx.contract.findUnique({
                    where: { id: contract.id },
                    include: { payments: true },
                });
            });

            break;
        } catch (err) {
            if (err.code === 'P2002' && attempt < 2) continue;
            throw err;
        }
    }

    return NextResponse.json(result, { status: 201 });
}, { entityType: 'Contract' });
