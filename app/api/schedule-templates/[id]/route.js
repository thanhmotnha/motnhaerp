import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const template = await prisma.scheduleTemplate.findUnique({
        where: { id },
        include: { items: { orderBy: { order: 'asc' } } },
    });
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(template);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { items, ...meta } = body;

    const result = await prisma.$transaction(async (tx) => {
        // Update template metadata
        await tx.scheduleTemplate.update({ where: { id }, data: { name: meta.name, type: meta.type, description: meta.description } });

        if (items && Array.isArray(items)) {
            // Delete all existing items
            await tx.scheduleTemplateItem.deleteMany({ where: { templateId: id } });

            // Recreate items with parent/predecessor mapping by index
            const created = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const rec = await tx.scheduleTemplateItem.create({
                    data: {
                        name: item.name || '',
                        order: i,
                        level: item.level || 0,
                        wbs: item.wbs || '',
                        duration: item.duration || 0,
                        weight: item.weight || 1,
                        color: item.color || '',
                        parentId: item._parentIdx != null && created[item._parentIdx] ? created[item._parentIdx].id : null,
                        predecessorId: item._predIdx != null && created[item._predIdx] ? created[item._predIdx].id : null,
                        templateId: id,
                    },
                });
                created.push(rec);
            }
        }

        return await tx.scheduleTemplate.findUnique({
            where: { id },
            include: { items: { orderBy: { order: 'asc' } } },
        });
    });

    return NextResponse.json(result);
}, { roles: ['giam_doc'] });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.scheduleTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: ['giam_doc'] });
