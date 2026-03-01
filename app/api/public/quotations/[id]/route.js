import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Public API - no auth required, read-only
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const quotation = await prisma.quotation.findUnique({
            where: { id },
            include: {
                customer: {
                    select: { name: true, phone: true, email: true, address: true },
                },
                project: {
                    select: { name: true, address: true, code: true },
                },
                categories: {
                    orderBy: { order: 'asc' },
                    include: {
                        items: { orderBy: { order: 'asc' } },
                    },
                },
                items: { orderBy: { order: 'asc' } },
            },
        });

        if (!quotation) {
            return NextResponse.json({ error: 'Báo giá không tồn tại' }, { status: 404 });
        }

        return NextResponse.json(quotation);
    } catch (error) {
        console.error('Public quotation API error:', error);
        return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
    }
}
