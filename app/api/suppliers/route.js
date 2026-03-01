import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { supplierCreateSchema } from '@/lib/validations/supplier';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const where = {};

    const [data, total] = await Promise.all([
        prisma.supplier.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.supplier.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = supplierCreateSchema.parse(body);
    const code = await generateCode('supplier', 'NCC');
    const supplier = await prisma.supplier.create({
        data: { code, ...data },
    });
    return NextResponse.json(supplier, { status: 201 });
});
