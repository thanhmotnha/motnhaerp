import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

const ROLES = ['giam_doc', 'ke_toan', 'kho'];

// GET /api/warehouses — List tất cả kho
export const GET = withAuth(async () => {
    const warehouses = await prisma.warehouse.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(warehouses);
}, { roles: ROLES });

// POST /api/warehouses — Tạo kho mới
export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { name, address, manager, phone, status } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Tên kho bắt buộc' }, { status: 400 });
    const code = await generateCode('warehouse', 'KHO');
    const wh = await prisma.warehouse.create({
        data: {
            code,
            name: name.trim(),
            address: address || '',
            manager: manager || '',
            phone: phone || '',
            status: status || 'Hoạt động',
        },
    });
    return NextResponse.json(wh, { status: 201 });
}, { roles: ['giam_doc', 'ke_toan'] });
