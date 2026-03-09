import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const acceptanceUpdateSchema = z.object({
    status: z.enum(['Chờ duyệt', 'Đạt', 'Không đạt']).optional(),
    signedByCustomer: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    inspector: z.string().trim().optional(),
    customerRep: z.string().trim().optional(),
    items: z.array(z.object({
        name: z.string(),
        status: z.enum(['pass', 'fail', 'na']),
        note: z.string().optional(),
    })).optional(),
}).strict();

// GET /api/acceptance/[id]
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const report = await prisma.acceptanceReport.findUnique({
        where: { id },
        include: {
            project: { select: { id: true, code: true, name: true } },
            milestone: { select: { id: true, name: true } },
        },
    });
    if (!report) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(report);
});

// PUT /api/acceptance/[id] — cập nhật trạng thái, duyệt biên bản
// Chỉ giam_doc và pho_gd được phép duyệt (Đạt / Không đạt)
export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const parsed = acceptanceUpdateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Dữ liệu không hợp lệ' }, { status: 400 });
    }
    const { status, signedByCustomer, notes, inspector, customerRep, items } = parsed.data;

    // Kiểm tra quyền duyệt
    const approvalStatuses = ['Đạt', 'Không đạt'];
    if (status && approvalStatuses.includes(status)) {
        const role = session.user?.role;
        if (!['giam_doc', 'pho_gd'].includes(role)) {
            return NextResponse.json({ error: 'Chỉ Giám đốc hoặc Phó GĐ được duyệt biên bản' }, { status: 403 });
        }
    }

    const data = {};
    if (status !== undefined) data.status = status;
    if (signedByCustomer !== undefined) data.signedByCustomer = signedByCustomer;
    if (notes !== undefined) data.notes = notes;
    if (inspector !== undefined) data.inspector = inspector;
    if (customerRep !== undefined) data.customerRep = customerRep;
    if (items !== undefined) data.items = items;

    // Ghi nhận thời điểm duyệt
    if (status && approvalStatuses.includes(status)) {
        data.signedAt = new Date();
    }

    const report = await prisma.acceptanceReport.update({
        where: { id },
        data,
        include: {
            project: { select: { id: true, code: true, name: true } },
            milestone: { select: { id: true, name: true } },
        },
    });
    return NextResponse.json(report);
});
