import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) where.name = { contains: search };

    const projects = await prisma.project.findMany({
        where,
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(projects);
}

export async function POST(request) {
    try {
        const data = await request.json();
        if (!data.customerId) {
            return NextResponse.json({ error: 'Vui lòng chọn khách hàng' }, { status: 400 });
        }
        if (!data.name?.trim()) {
            return NextResponse.json({ error: 'Vui lòng nhập tên dự án' }, { status: 400 });
        }
        const code = await generateCode('project', 'DA');
        const project = await prisma.project.create({
            data: {
                code,
                name: data.name.trim(),
                type: data.type || 'Thiết kế nội thất',
                status: data.status || 'Khảo sát',
                address: data.address || '',
                area: Number(data.area) || 0,
                floors: Number(data.floors) || 1,
                budget: Number(data.budget) || 0,
                customerId: data.customerId,
                manager: data.designer || data.supervisor || '',
                notes: data.supervisor ? `Giám sát: ${data.supervisor}` : '',
            },
        });
        return NextResponse.json(project, { status: 201 });
    } catch (e) {
        console.error('Create project error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
