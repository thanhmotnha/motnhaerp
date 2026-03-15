import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const designs = await prisma.designVersion.findMany({
        where: { furnitureOrderId: id },
        orderBy: { versionNumber: 'desc' },
    });
    return NextResponse.json(designs);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const maxVer = await prisma.designVersion.aggregate({
        where: { furnitureOrderId: id },
        _max: { versionNumber: true },
    });
    const design = await prisma.designVersion.create({
        data: {
            furnitureOrderId: id,
            versionNumber: (maxVer._max.versionNumber || 0) + 1,
            versionLabel: body.versionLabel || '',
            description: body.description || '',
            fileUrl: body.fileUrl || '',
            renderImageUrl: body.renderImageUrl || '',
            technicalSpec: body.technicalSpec || '',
            submittedBy: request.user?.name || '',
        },
    });
    return NextResponse.json(design, { status: 201 });
});
