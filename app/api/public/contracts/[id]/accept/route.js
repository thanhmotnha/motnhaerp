import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/public/contracts/[id]/accept
// Khách hàng ký xác nhận hợp đồng — không cần auth
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { customerName, notes } = body;

    const contract = await prisma.contract.findUnique({
        where: { id },
        select: { id: true, status: true, code: true, deletedAt: true },
    });

    if (!contract || contract.deletedAt) {
        return NextResponse.json({ error: 'Hợp đồng không tồn tại' }, { status: 404 });
    }
    if (contract.status === 'Nháp') {
        return NextResponse.json({ error: 'Hợp đồng chưa sẵn sàng' }, { status: 400 });
    }
    if (contract.status === 'Đã ký') {
        return NextResponse.json({ error: 'Hợp đồng đã được ký trước đó' }, { status: 400 });
    }
    if (['Hoàn thành', 'Hủy'].includes(contract.status)) {
        return NextResponse.json({ error: 'Hợp đồng không thể ký ở trạng thái hiện tại' }, { status: 400 });
    }

    const updated = await prisma.contract.update({
        where: { id },
        data: {
            status: 'Đã ký',
            signDate: new Date(),
            notes: notes
                ? `[KH ký: ${customerName || 'Không rõ'}] ${notes}`
                : `[KH ký: ${customerName || 'Không rõ'}]`,
        },
    });

    return NextResponse.json({ success: true, code: updated.code, status: updated.status });
}, { public: true });
