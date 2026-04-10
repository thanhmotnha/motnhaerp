import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { overheadBatchConfirmSchema } from '@/lib/validations/overhead';

const CONFIRM_ROLES = ['giam_doc', 'ke_toan'];

export const POST = withAuth(async (request, { params }, session) => {
    if (!CONFIRM_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Không có quyền xác nhận' }, { status: 403 });
    }
    const { id } = await params;
    const existing = await prisma.overheadBatch.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (existing.status === 'confirmed') {
        return NextResponse.json({ error: 'Đợt đã được xác nhận' }, { status: 400 });
    }

    const { allocations } = overheadBatchConfirmSchema.parse(await request.json());

    // Validate tổng phân bổ phải khớp với tổng batch
    const allocationTotal = allocations.reduce((sum, a) => sum + Number(a.amount), 0);
    const diff = Math.abs(allocationTotal - Number(existing.totalAmount));
    if (diff > 0.01) {
        return NextResponse.json(
            { error: `Tổng phân bổ (${allocationTotal.toLocaleString('vi-VN')}) không khớp với tổng batch (${Number(existing.totalAmount).toLocaleString('vi-VN')})` },
            { status: 400 }
        );
    }

    const batch = await prisma.$transaction(async (tx) => {
        const projectIds = allocations.map(a => a.projectId);
        const validProjects = await tx.project.findMany({
            where: { id: { in: projectIds }, deletedAt: null },
            select: { id: true },
        });
        if (validProjects.length !== projectIds.length) {
            throw new Error('Một số dự án không tồn tại');
        }
        await tx.overheadAllocation.deleteMany({ where: { batchId: id } });
        await tx.overheadAllocation.createMany({
            data: allocations.map(a => ({
                batchId: id,
                projectId: a.projectId,
                ratio: a.ratio,
                amount: a.amount,
                isOverride: a.isOverride,
                notes: a.notes || '',
            })),
        });
        return tx.overheadBatch.update({
            where: { id },
            data: { status: 'confirmed', confirmedAt: new Date() },
        });
    });
    return NextResponse.json(batch);
});
