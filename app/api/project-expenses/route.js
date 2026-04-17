import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode, withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { expenseCreateSchema, expenseUpdateSchema } from '@/lib/validations/expense';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get('status');
    const expenseType = searchParams.get('expenseType');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const projectId = searchParams.get('projectId');

    const where = {};
    if (status) where.status = status;
    if (expenseType) where.expenseType = expenseType;
    if (categoryId) where.categoryId = categoryId;
    if (projectId) {
        // Tìm cả expense trực tiếp + expense có allocation vào project
        where.OR = [
            { projectId },
            { allocations: { some: { projectId } } },
        ];
    }
    if (search) where.description = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
        prisma.projectExpense.findMany({
            where,
            include: {
                project: { select: { name: true, code: true } },
                expenseCategory: { select: { id: true, name: true, code: true, linkType: true } },
                allocations: {
                    include: { project: { select: { id: true, name: true, code: true } } },
                },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.projectExpense.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { allocations, ...data } = expenseCreateSchema.parse(body);
    const code = await generateCode('projectExpense', 'CP');

    const expense = await prisma.$transaction(async (tx) => {
        const exp = await tx.projectExpense.create({
            data: { code, ...data },
        });

        // Tạo allocations nếu có
        if (allocations && allocations.length > 0) {
            await tx.expenseAllocation.createMany({
                data: allocations.map(a => ({
                    expenseId: exp.id,
                    projectId: a.projectId,
                    amount: a.amount || 0,
                    ratio: a.ratio || 0,
                    notes: a.notes || '',
                })),
            });
        }

        return tx.projectExpense.findFirst({
            where: { id: exp.id },
            include: {
                expenseCategory: { select: { id: true, name: true, code: true } },
                allocations: { include: { project: { select: { id: true, name: true, code: true } } } },
            },
        });
    });

    return NextResponse.json(expense, { status: 201 });
});

const FINANCE_ROLES = ['giam_doc', 'ke_toan'];
const APPROVAL_STATUSES = ['Đã duyệt', 'Từ chối', 'Đã chi', 'Hoàn thành'];

export const PUT = withAuth(async (request, context, session) => {
    const body = await request.json();
    const { id, ...raw } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Only finance roles can approve/reject expenses
    if (raw.status && APPROVAL_STATUSES.includes(raw.status)) {
        const role = session?.user?.role;
        if (!FINANCE_ROLES.includes(role)) {
            return NextResponse.json(
                { error: 'Chỉ Giám đốc, Phó GĐ hoặc Kế toán mới có quyền duyệt chi phí' },
                { status: 403 }
            );
        }
        if (raw.status === 'Đã duyệt') {
            raw.approvedBy = session.user.name || session.user.email;
        }
    }

    const { allocations, ...updateData } = expenseUpdateSchema.parse(raw);

    const existing = await prisma.projectExpense.findUnique({
        where: { id },
        select: { recipientType: true, recipientId: true, amount: true, date: true, description: true, paymentAccount: true },
    });

    if (!existing) return NextResponse.json({ error: 'Không tìm thấy lệnh chi' }, { status: 404 });

    const expense = await prisma.$transaction(async (tx) => {
        if (allocations !== undefined) {
            await tx.expenseAllocation.deleteMany({ where: { expenseId: id } });
            if (allocations.length > 0) {
                await tx.expenseAllocation.createMany({
                    data: allocations.map(a => ({
                        expenseId: id,
                        projectId: a.projectId,
                        amount: a.amount || 0,
                        ratio: a.ratio || 0,
                        notes: a.notes || '',
                    })),
                });
            }
        }
        return tx.projectExpense.update({ where: { id }, data: updateData });
    });

    // Auto-create SupplierPayment khi status → "Đã chi" và là NCC
    if (updateData.status === 'Đã chi' && existing?.recipientType === 'NCC' && existing?.recipientId) {
        const alreadyLinked = await prisma.supplierPayment.findUnique({ where: { expenseId: id } });
        if (!alreadyLinked) {
            await withCodeRetry('supplierPayment', 'SP', (spCode) =>
                prisma.supplierPayment.create({
                    data: {
                        code: spCode,
                        supplierId: existing.recipientId,
                        amount: updateData.amount ?? existing.amount,
                        date: updateData.date ? new Date(updateData.date) : existing.date,
                        notes: existing.description || '',
                        paymentAccount: updateData.paymentAccount ?? existing.paymentAccount ?? '',
                        expenseId: id,
                        createdById: session.user.id,
                    },
                })
            );
        }
    }

    return NextResponse.json(expense);
});

export const DELETE = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.projectExpense.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: ['giam_doc', 'ke_toan'] });
