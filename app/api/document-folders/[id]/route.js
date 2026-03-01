import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { folderUpdateSchema } from '@/lib/validations/document';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = folderUpdateSchema.parse(body);

    const folder = await prisma.documentFolder.update({ where: { id }, data });
    return NextResponse.json(folder);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;

    // Move documents in this folder to unsorted (folderId = null)
    await prisma.$transaction(async (tx) => {
        await tx.projectDocument.updateMany({
            where: { folderId: id },
            data: { folderId: null },
        });
        // Delete child folders first (move their docs too)
        const children = await tx.documentFolder.findMany({ where: { parentId: id } });
        for (const child of children) {
            await tx.projectDocument.updateMany({
                where: { folderId: child.id },
                data: { folderId: null },
            });
            await tx.documentFolder.delete({ where: { id: child.id } });
        }
        await tx.documentFolder.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
});
