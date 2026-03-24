import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
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

const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];
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

    const data = expenseUpdateSchema.parse(raw);
    const expense = await prisma.projectExpense.update({ where: { id }, data });
    return NextResponse.json(expense);
});

export const DELETE = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.projectExpense.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
