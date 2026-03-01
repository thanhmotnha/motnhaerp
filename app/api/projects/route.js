import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { projectCreateSchema } from '@/lib/validations/project';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [projects, total] = await Promise.all([
        prisma.project.findMany({
            where,
            include: { customer: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.project.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(projects, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = projectCreateSchema.parse(body);

    const code = await generateCode('project', 'DA');
    const project = await prisma.project.create({
        data: {
            code,
            ...data,
        },
    });

    return NextResponse.json(project, { status: 201 });
});
