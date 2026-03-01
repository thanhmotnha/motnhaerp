import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { folderCreateSchema } from '@/lib/validations/document';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId bắt buộc' }, { status: 400 });

    // Return top-level folders with children (tree structure)
    const folders = await prisma.documentFolder.findMany({
        where: { projectId, parentId: null },
        include: {
            _count: { select: { documents: true } },
            children: {
                include: {
                    _count: { select: { documents: true } },
                },
                orderBy: { order: 'asc' },
            },
        },
        orderBy: { order: 'asc' },
    });

    return NextResponse.json(folders);
});

export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const data = folderCreateSchema.parse(body);

    const folder = await prisma.documentFolder.create({ data });
    return NextResponse.json(folder, { status: 201 });
});
