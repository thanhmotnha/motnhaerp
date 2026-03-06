import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { workItemLibraryUpdateSchema } from '@/lib/validations/workItemLibrary';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const validated = workItemLibraryUpdateSchema.parse(body);
    const item = await prisma.workItemLibrary.update({ where: { id }, data: validated });
    return NextResponse.json(item);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    try {
        await prisma.workItemLibrary.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err) {
        if (err.code === 'P2003') {
            return NextResponse.json({ error: 'Hạng mục đang được sử dụng, không thể xóa.' }, { status: 409 });
        }
        throw err;
    }
});
