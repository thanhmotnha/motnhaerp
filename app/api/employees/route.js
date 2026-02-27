import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const search = searchParams.get('search');

    const where = {};
    if (departmentId) where.departmentId = departmentId;
    if (search) where.name = { contains: search };

    const employees = await prisma.employee.findMany({
        where,
        include: { department: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
    });
    const departments = await prisma.department.findMany({
        include: { _count: { select: { employees: true } } },
        orderBy: { name: 'asc' },
    });
    return NextResponse.json({ employees, departments });
}

export async function POST(request) {
    try {
        const data = await request.json();
        if (!data.name?.trim()) return NextResponse.json({ error: 'Tên NV bắt buộc' }, { status: 400 });
        if (!data.departmentId) return NextResponse.json({ error: 'Phòng ban bắt buộc' }, { status: 400 });
        const code = await generateCode('employee', 'NV');
        const employee = await prisma.employee.create({
            data: {
                code,
                name: data.name.trim(),
                position: data.position || '',
                phone: data.phone || '',
                email: data.email || '',
                salary: Number(data.salary) || 0,
                status: data.status || 'Đang làm',
                joinDate: data.joinDate ? new Date(data.joinDate) : null,
                departmentId: data.departmentId,
            },
        });
        return NextResponse.json(employee, { status: 201 });
    } catch (e) {
        console.error('Create employee error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
