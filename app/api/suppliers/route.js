import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

export async function GET() {
    const suppliers = await prisma.supplier.findMany({
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(suppliers);
}

export async function POST(request) {
    try {
        const data = await request.json();
        if (!data.name?.trim()) return NextResponse.json({ error: 'Tên NCC bắt buộc' }, { status: 400 });
        const code = await generateCode('supplier', 'NCC');
        const supplier = await prisma.supplier.create({
            data: {
                code,
                name: data.name.trim(),
                type: data.type || 'Vật tư xây dựng',
                contact: data.contact || '',
                phone: data.phone || '',
                email: data.email || '',
                address: data.address || '',
                taxCode: data.taxCode || '',
                bankAccount: data.bankAccount || '',
                bankName: data.bankName || '',
                rating: Number(data.rating) || 3,
                notes: data.notes || '',
            },
        });
        return NextResponse.json(supplier, { status: 201 });
    } catch (e) {
        console.error('Create supplier error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
