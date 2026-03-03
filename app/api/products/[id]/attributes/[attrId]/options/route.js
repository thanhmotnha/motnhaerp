import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request, { params }) => {
    const { attrId } = await params;
    const { label, priceAddon = 0, order = 0 } = await request.json();
    if (!label?.trim()) return NextResponse.json({ error: 'Nhãn tùy chọn bắt buộc' }, { status: 400 });
    const option = await prisma.productAttributeOption.create({
        data: { attributeId: attrId, label: label.trim(), priceAddon: Number(priceAddon) || 0, order },
    });
    return NextResponse.json(option, { status: 201 });
});
