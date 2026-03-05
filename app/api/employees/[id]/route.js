import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { employeeUpdateSchema } from '@/lib/validations/employee';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = employeeUpdateSchema.parse(body);
    const employee = await prisma.employee.update({ where: { id }, data });
    return NextResponse.json(employee);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.employee.update({ where: { id }, data: { deletedAt: new Date(), status: 'Nghỉ việc' } });
    return NextResponse.json({ success: true });
});
