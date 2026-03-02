import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Check if adding componentId to productId's BOM would create a circular dependency
async function wouldCreateCycle(productId, componentId, visited = new Set()) {
    if (componentId === productId) return true;
    if (visited.has(componentId)) return false;
    visited.add(componentId);
    // Check if the component itself contains productId in its BOM (recursively)
    const componentBom = await prisma.productBOM.findMany({
        where: { productId: componentId },
        select: { componentId: true },
    });
    for (const item of componentBom) {
        if (await wouldCreateCycle(productId, item.componentId, visited)) return true;
    }
    return false;
}

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const bom = await prisma.productBOM.findMany({
        where: { productId: id },
        include: {
            component: { select: { id: true, code: true, name: true, unit: true, category: true, image: true } },
        },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(bom);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { componentId, quantity, unit, notes } = await request.json();
    if (!componentId) return NextResponse.json({ error: 'Thiếu vật tư thành phần' }, { status: 400 });
    if (componentId === id) return NextResponse.json({ error: 'Không thể thêm sản phẩm vào chính nó' }, { status: 400 });

    // M4: Check circular dependency (A contains B, B contains A)
    if (await wouldCreateCycle(id, componentId)) {
        return NextResponse.json({ error: 'Vòng lặp BOM: sản phẩm này đã nằm trong BOM của thành phần được chọn' }, { status: 400 });
    }

    const item = await prisma.productBOM.create({
        data: { productId: id, componentId, quantity: quantity || 1, unit: unit || '', notes: notes || '' },
        include: {
            component: { select: { id: true, code: true, name: true, unit: true, category: true, image: true } },
        },
    });
    return NextResponse.json(item, { status: 201 });
});
