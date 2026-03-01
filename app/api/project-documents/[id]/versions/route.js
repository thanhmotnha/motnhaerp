import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;

    // Get the document and all its versions (children)
    const doc = await prisma.projectDocument.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    // Find all versions: the document itself + all documents that point to it as parent
    const rootId = doc.parentDocumentId || doc.id;

    const versions = await prisma.projectDocument.findMany({
        where: {
            OR: [
                { id: rootId },
                { parentDocumentId: rootId },
            ],
        },
        orderBy: { version: 'desc' },
        select: {
            id: true,
            name: true,
            fileName: true,
            fileUrl: true,
            mimeType: true,
            fileSize: true,
            version: true,
            status: true,
            uploadedBy: true,
            createdAt: true,
        },
    });

    return NextResponse.json(versions);
});
