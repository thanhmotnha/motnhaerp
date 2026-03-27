import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET all tokens for a project (admin)
export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const tokens = await prisma.clientPortalToken.findMany({
        where: { projectId },
        orderBy: [{ createdAt: 'desc' }],
        select: {
            id: true, token: true, projectId: true, description: true,
            expiresAt: true, isActive: true, viewCount: true, lastViewAt: true,
            createdAt: true,
        },
    });
    return NextResponse.json(tokens);
});

// POST create new token
export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { projectId, description = '', expiresAt } = body;
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const token = await prisma.clientPortalToken.create({
        data: {
            projectId, description,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
    });
    return NextResponse.json(token, { status: 201 });
});
