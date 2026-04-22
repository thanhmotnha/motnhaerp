import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * API công nợ dịch vụ — hạch toán theo cơ sở TIỀN MẶT (cash basis).
 *
 * Luồng:
 *  1. POST /api/service-debts → tạo SupplierDebt/ContractorDebt với allocationPlan,
 *     KHÔNG sinh ProjectExpense. Chi phí dự án chưa phát sinh.
 *  2. Khi thanh toán (POST /api/debts/{supplier|contractor}/[id]/pay) → hook kiểm
 *     tra nếu debt có `allocationPlan` thì auto-sinh ProjectExpense + ExpenseAllocation
 *     pro-rata theo kế hoạch. Chi phí chỉ tính phần đã trả thực tế.
 *
 * Phân biệt với công nợ thường: `allocationPlan != null` = service debt (cash-basis).
 */

const allocationSchema = z.object({
    projectId: z.string().min(1),
    ratio: z.number().min(0).max(1), // 0..1
});

const createSchema = z.object({
    recipientType: z.enum(['NCC', 'Thầu phụ']),
    recipientId: z.string().min(1),
    recipientName: z.string().min(1),
    category: z.string().min(1),
    amount: z.number().positive(),
    date: z.string().optional(),
    invoiceNo: z.string().optional().default(''),
    notes: z.string().optional().default(''),
    allocations: z.array(allocationSchema).min(1),
}).strict();

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending' | 'paid' | 'all'

    const debtWhere = { allocationPlan: { not: null } };
    if (status === 'pending') debtWhere.status = { in: ['open', 'partial'] };
    if (status === 'paid') debtWhere.status = 'paid';

    const [supplierDebts, contractorDebts, expenses] = await Promise.all([
        prisma.supplierDebt.findMany({
            where: debtWhere,
            include: {
                supplier: { select: { id: true, name: true } },
                payments: { orderBy: { date: 'desc' } },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.contractorDebt.findMany({
            where: debtWhere,
            include: {
                contractor: { select: { id: true, name: true } },
                payments: { orderBy: { date: 'desc' } },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.projectExpense.findMany({
            where: { expenseType: 'Dịch vụ', deletedAt: null },
            include: {
                allocations: { include: { project: { select: { id: true, name: true, code: true } } } },
            },
            orderBy: { date: 'desc' },
        }),
    ]);

    const debts = [
        ...supplierDebts.map(d => ({ ...d, recipientType: 'NCC', recipientName: d.supplier?.name || '' })),
        ...contractorDebts.map(d => ({ ...d, recipientType: 'Thầu phụ', recipientName: d.contractor?.name || '' })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({ debts, expenses });
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = createSchema.parse(body);

    // Validate ratio sum ≈ 1
    const totalRatio = data.allocations.reduce((s, a) => s + a.ratio, 0);
    if (Math.abs(totalRatio - 1) > 0.01) {
        return NextResponse.json({ error: `Tổng tỷ lệ phân bổ phải = 100% (hiện ${Math.round(totalRatio * 100)}%)` }, { status: 400 });
    }
    // Validate projectIds unique + exist
    const projectIds = data.allocations.map(a => a.projectId);
    if (new Set(projectIds).size !== projectIds.length) {
        return NextResponse.json({ error: 'Mỗi dự án chỉ được chọn 1 lần' }, { status: 400 });
    }
    const existingProjects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true },
    });
    if (existingProjects.length !== projectIds.length) {
        return NextResponse.json({ error: 'Có dự án không tồn tại' }, { status: 400 });
    }

    const allocationPlan = data.allocations.map(a => ({
        projectId: a.projectId,
        ratio: a.ratio,
    }));

    const date = data.date ? new Date(data.date) : new Date();
    const description = `${data.category} — ${data.recipientName}`;

    if (data.recipientType === 'NCC') {
        const code = await generateCode('supplierDebt', 'CN');
        const debt = await prisma.supplierDebt.create({
            data: {
                code,
                supplierId: data.recipientId,
                projectId: null, // multi-project via allocationPlan
                description,
                totalAmount: data.amount,
                paidAmount: 0,
                status: 'open',
                date,
                invoiceNo: data.invoiceNo,
                notes: data.notes,
                createdById: session.user.id,
                serviceCategory: data.category,
                allocationPlan,
            },
            include: { supplier: { select: { id: true, name: true } } },
        });
        return NextResponse.json({ ...debt, recipientType: 'NCC', recipientName: debt.supplier?.name || '' }, { status: 201 });
    } else {
        // Thầu phụ: schema yêu cầu projectId NOT NULL → dùng project đầu tiên
        const code = await generateCode('contractorDebt', 'CNT');
        const debt = await prisma.contractorDebt.create({
            data: {
                code,
                contractorId: data.recipientId,
                projectId: data.allocations[0].projectId,
                description,
                totalAmount: data.amount,
                paidAmount: 0,
                status: 'open',
                date,
                notes: data.notes,
                createdById: session.user.id,
                serviceCategory: data.category,
                allocationPlan,
            },
            include: { contractor: { select: { id: true, name: true } } },
        });
        return NextResponse.json({ ...debt, recipientType: 'Thầu phụ', recipientName: debt.contractor?.name || '' }, { status: 201 });
    }
}, { roles: ['giam_doc', 'ke_toan'] });
