import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET: Load quotation with furniture items grouped by category
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const quotation = await prisma.quotation.findFirst({
        where: { id },
        include: {
            customer: { select: { id: true, name: true, phone: true } },
            project: { select: { id: true, name: true } },
            categories: {
                include: {
                    items: {
                        where: { parentItemId: null },
                        orderBy: { order: 'asc' },
                    },
                },
                orderBy: { order: 'asc' },
            },
        },
    });
    if (!quotation) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(quotation);
});

// PUT: Update furniture specs per item (lightweight — no rebuild)
const FURNITURE_FIELDS = [
    'functionality', 'functionalImages', 'attachments',
    'bodyColorCode', 'bodyColorName', 'bodyColorImage',
    'doorColorCode', 'doorColorName', 'doorColorImage',
    'hardware', 'renderImage',
];

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { items, furnitureConfirmedAt } = body;

    if (!items || !Array.isArray(items)) {
        return NextResponse.json({ error: 'items[] bắt buộc' }, { status: 400 });
    }

    // Verify quotation exists
    const quotation = await prisma.quotation.findFirst({ where: { id } });
    if (!quotation) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    // Update each item's furniture fields
    await prisma.$transaction(async (tx) => {
        for (const item of items) {
            if (!item.id) continue;
            const data = {};
            for (const field of FURNITURE_FIELDS) {
                if (field in item) data[field] = item[field];
            }
            if (Object.keys(data).length > 0) {
                await tx.quotationItem.update({
                    where: { id: item.id },
                    data,
                });
            }
        }
    });

    return NextResponse.json({ success: true });
}, { skipLog: true });
