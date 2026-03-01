import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createDefaultFolders } from '@/lib/defaultFolders';

// Bootstrap default folders for an existing project that doesn't have any
export const POST = withAuth(async (request, context, session) => {
    const { projectId } = await request.json();
    if (!projectId) return NextResponse.json({ error: 'projectId bắt buộc' }, { status: 400 });

    // Check if project already has folders
    const existing = await prisma.documentFolder.count({ where: { projectId } });
    if (existing > 0) {
        return NextResponse.json({ error: 'Dự án đã có thư mục' }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
        await createDefaultFolders(tx, projectId);
    });

    return NextResponse.json({ success: true }, { status: 201 });
});
