import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/apiHandler';

export const GET = withAuth(async (req, { params }) => {
    const { id } = await params;
    const contracts = await prisma.employeeContract.findMany({
        where: { employeeId: id },
        orderBy: { startDate: 'desc' },
    });
    return NextResponse.json(contracts);
, { roles: ["giam_doc", "ke_toan"] });

export const POST = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();

    const last = await prisma.employeeContract.findFirst({ orderBy: { code: 'desc' } });
    const num = last ? parseInt(last.code.replace('HDLD-', '')) + 1 : 1;
    const code = `HDLD-${String(num).padStart(3, '0')}`;

    const contract = await prisma.employeeContract.create({
        data: {
            code,
            employeeId: id,
            type: body.type || 'Chính thức',
            startDate: new Date(body.startDate),
            endDate: body.endDate ? new Date(body.endDate) : null,
            salary: parseFloat(body.salary) || 0,
            insuranceSalary: parseFloat(body.insuranceSalary) || 0,
            position: body.position || '',
            department: body.department || '',
            notes: body.notes || '',
            signedAt: body.signedAt ? new Date(body.signedAt) : null,
            status: body.status || 'Hiệu lực',
        },
    });

    return NextResponse.json(contract, { status: 201 });
, { roles: ["giam_doc", "ke_toan"] });

export const PATCH = withAuth(async (req, { params }) => {
    const { id } = await params;
    const { contractId, status } = await req.json();
    const updated = await prisma.employeeContract.update({
        where: { id: contractId, employeeId: id },
        data: { status },
    });
    return NextResponse.json(updated);
, { roles: ["giam_doc", "ke_toan"] });

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const contractId = searchParams.get('contractId');
    await prisma.employeeContract.delete({ where: { id: contractId, employeeId: id } });
    return NextResponse.json({ success: true });
, { roles: ["giam_doc", "ke_toan"] });
