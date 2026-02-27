import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    const { id } = await params;
    const data = await request.json();
    const employee = await prisma.employee.update({ where: { id }, data });
    return NextResponse.json(employee);
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        await prisma.projectEmployee.deleteMany({ where: { employeeId: id } });
        await prisma.employee.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Delete employee error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
