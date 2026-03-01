import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { employeeCreateSchema } from '@/lib/validations/employee';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const departmentId = searchParams.get('departmentId');
    const search = searchParams.get('search');

    const where = {};
    if (departmentId) where.departmentId = departmentId;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [data, total, departments] = await Promise.all([
        prisma.employee.findMany({
            where,
            include: { department: { select: { name: true } } },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.employee.count({ where }),
        prisma.department.findMany({
            include: { _count: { select: { employees: true } } },
            orderBy: { name: 'asc' },
        }),
    ]);
    return NextResponse.json({
        ...paginatedResponse(data, total, { page, limit }),
        departments,
    });
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = employeeCreateSchema.parse(body);
    const code = await generateCode('employee', 'NV');
    const employee = await prisma.employee.create({
        data: { code, ...data },
    });
    return NextResponse.json(employee, { status: 201 });
});
