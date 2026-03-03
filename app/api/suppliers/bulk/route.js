import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { supplierCreateSchema } from '@/lib/validations/supplier';

export const POST = withAuth(async (request) => {
    const body = await request.json();
    if (!Array.isArray(body) || body.length === 0) {
        return NextResponse.json({ error: 'Danh sách rỗng' }, { status: 400 });
    }
    const created = [];
    for (const item of body) {
        const data = supplierCreateSchema.parse(item);
        const code = await generateCode('supplier', 'NCC');
        const supplier = await prisma.supplier.create({ data: { code, ...data } });
        created.push(supplier);
    }
    return NextResponse.json({ created: created.length }, { status: 201 });
});
