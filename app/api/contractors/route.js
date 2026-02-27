import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

export async function GET() {
    const contractors = await prisma.contractor.findMany({
        include: { payments: { select: { contractAmount: true, paidAmount: true, status: true } } },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(contractors);
}

export async function POST(request) {
    try {
        const data = await request.json();
        if (!data.name?.trim()) return NextResponse.json({ error: 'Tên thầu phụ bắt buộc' }, { status: 400 });
        const code = await generateCode('contractor', 'TT');
        const contractor = await prisma.contractor.create({
            data: {
                code,
                name: data.name.trim(),
                type: data.type || 'Thầu xây dựng',
                phone: data.phone || '',
                address: data.address || '',
                bankAccount: data.bankAccount || '',
                bankName: data.bankName || '',
                rating: Number(data.rating) || 3,
            },
        });
        return NextResponse.json(contractor, { status: 201 });
    } catch (e) {
        console.error('Create contractor error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
