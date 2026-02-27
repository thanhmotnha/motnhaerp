import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const where = {};
        if (category) where.category = category;

        const items = await prisma.workItemLibrary.findMany({
            where,
            orderBy: [{ category: 'asc' }, { subcategory: 'asc' }, { name: 'asc' }],
        });
        return NextResponse.json(items);
    } catch (e) {
        console.error('WorkItemLibrary GET error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const data = await request.json();

        // Bulk create support
        if (Array.isArray(data)) {
            const items = await prisma.workItemLibrary.createMany({ data });
            return NextResponse.json({ count: items.count }, { status: 201 });
        }

        const item = await prisma.workItemLibrary.create({ data });
        return NextResponse.json(item, { status: 201 });
    } catch (e) {
        console.error('WorkItemLibrary POST error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// PATCH: rename category
export async function PATCH(request) {
    try {
        const { oldCategory, newCategory } = await request.json();
        if (!oldCategory || !newCategory || oldCategory === newCategory)
            return NextResponse.json({ error: 'Invalid' }, { status: 400 });
        await prisma.workItemLibrary.updateMany({
            where: { category: oldCategory },
            data: { category: newCategory },
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('WorkItemLibrary PATCH error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
