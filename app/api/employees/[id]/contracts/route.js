import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/employees/[id]/contracts
export async function GET(req, { params }) {
    const { id } = await params;
    const contracts = await prisma.employeeContract.findMany({
        where: { employeeId: id },
        orderBy: { startDate: 'desc' },
    });
    return NextResponse.json(contracts);
}

// POST /api/employees/[id]/contracts
export async function POST(req, { params }) {
    const { id } = await params;
    const body = await req.json();

    // auto-gen code: HDLD-001, HDLD-002...
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
        },
    });

    return NextResponse.json(contract, { status: 201 });
}
