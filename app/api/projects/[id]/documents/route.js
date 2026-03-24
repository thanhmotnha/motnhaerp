import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const documents = await prisma.projectDocument.findMany({
        where: { projectId: id },
        select: {
            id: true, name: true, fileName: true, category: true,
            fileUrl: true, mimeType: true, thumbnailUrl: true,
            folder: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(documents);
}, { skipLog: true });
