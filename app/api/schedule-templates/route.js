import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { scheduleTemplateCreateSchema } from '@/lib/validations/scheduleTemplate';

export const GET = withAuth(async () => {
    const templates = await prisma.scheduleTemplate.findMany({
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(templates);
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { items, ...validated } = scheduleTemplateCreateSchema.parse(body);

    const template = await prisma.$transaction(async (tx) => {
        const tpl = await tx.scheduleTemplate.create({ data: validated });

        if (items && items.length > 0) {
            // Create items with parent/predecessor mapping
            const idMap = new Map(); // index → created id
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const created = await tx.scheduleTemplateItem.create({
                    data: {
                        name: item.name,
                        order: item.order || i,
                        level: item.level || 0,
                        wbs: item.wbs || '',
                        duration: item.duration || 1,
                        weight: item.weight || 1,
                        color: item.color || '',
                        parentId: item.parentIndex != null ? (idMap.get(item.parentIndex) || null) : null,
                        predecessorId: item.predecessorIndex != null ? (idMap.get(item.predecessorIndex) || null) : null,
                        templateId: tpl.id,
                    },
                });
                idMap.set(i, created.id);
            }
        }

        return await tx.scheduleTemplate.findUnique({
            where: { id: tpl.id },
            include: { items: { orderBy: { order: 'asc' } } },
        });
    });

    return NextResponse.json(template, { status: 201 });
}, { roles: ['giam_doc', 'pho_gd'] });
