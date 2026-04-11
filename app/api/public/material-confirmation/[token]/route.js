import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET — KH lấy thông tin vật liệu để xem
export const GET = withAuth(async (request, { params }) => {
    const { token } = await params;

    const sel = await prisma.materialSelection.findUnique({
        where: { confirmationToken: token },
        include: {
            items: true,
            furnitureOrder: {
                select: {
                    name: true,
                    customer: { select: { name: true } },
                },
            },
        },
    });

    if (!sel) return NextResponse.json({ error: 'Link không hợp lệ hoặc đã hết hạn' }, { status: 404 });
    if (sel.selTokenExpiresAt && sel.selTokenExpiresAt < new Date()) {
        return NextResponse.json({ error: 'Link đã hết hạn' }, { status: 410 });
    }

    return NextResponse.json({
        selectionRound: sel.selectionRound,
        title: sel.title,
        status: sel.status,
        orderName: sel.furnitureOrder.name,
        customerName: sel.furnitureOrder.customer?.name || '',
        confirmedAt: sel.confirmedAt,
        confirmedByName: sel.confirmedByName,
        items: sel.items,
    });
}, { public: true });

// POST — KH xác nhận
export const POST = withAuth(async (request, { params }) => {
    const { token } = await params;
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Vui lòng nhập họ tên' }, { status: 400 });

    const sel = await prisma.materialSelection.findUnique({
        where: { confirmationToken: token },
        select: { id: true, selTokenExpiresAt: true, status: true },
    });

    if (!sel) return NextResponse.json({ error: 'Link không hợp lệ' }, { status: 404 });
    if (sel.selTokenExpiresAt && sel.selTokenExpiresAt < new Date()) {
        return NextResponse.json({ error: 'Link đã hết hạn' }, { status: 410 });
    }
    if (sel.status === 'confirmed') {
        return NextResponse.json({ error: 'Vật liệu đã được xác nhận trước đó' }, { status: 400 });
    }

    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        '';

    await prisma.materialSelection.update({
        where: { id: sel.id },
        data: {
            status: 'confirmed',
            confirmedAt: new Date(),
            confirmedByName: name.trim(),
            confirmedIp: ip,
            confirmationToken: null,
            selTokenExpiresAt: null,
        },
    });

    return NextResponse.json({ success: true });
}, { public: true });
