import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET all workshops
export const GET = withAuth(async () => {
    const workshops = await prisma.workshop.findMany({
        where: { isActive: true },
        include: {
            _count: { select: { batches: true } },
            batches: {
                where: { status: 'in_progress' },
                select: { id: true, code: true, status: true },
            },
        },
        orderBy: { code: 'asc' },
    });
    return NextResponse.json(workshops);
});

// POST create workshop
export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { code, name, address, phone, managerId, capacity, notes } = body;
    if (!code || !name) return NextResponse.json({ error: 'Thiếu mã hoặc tên xưởng' }, { status: 400 });

    const workshop = await prisma.workshop.create({
        data: { code, name, address: address || '', phone: phone || '', managerId: managerId || null, capacity: capacity || 0, notes: notes || '' },
    });
    return NextResponse.json(workshop, { status: 201 });
}, { roles: ['giam_doc'] });
