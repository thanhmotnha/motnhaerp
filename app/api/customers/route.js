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

    const customers = await prisma.customer.findMany({
        where,
        include: { projects: { select: { id: true, name: true, status: true } } },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(customers);
}

export async function POST(request) {
    try {
        const data = await request.json();
        if (!data.name?.trim()) return NextResponse.json({ error: 'Tên KH bắt buộc' }, { status: 400 });
        if (!data.phone?.trim()) return NextResponse.json({ error: 'SĐT bắt buộc' }, { status: 400 });
        const code = await generateCode('customer', 'KH');
        const customer = await prisma.customer.create({
            data: {
                code,
                name: data.name.trim(),
                phone: data.phone.trim(),
                email: data.email || '',
                address: data.address || '',
                type: data.type || 'Cá nhân',
                status: data.status || 'Lead',
                taxCode: data.taxCode || '',
                representative: data.representative || '',
                birthday: data.birthday ? new Date(data.birthday) : null,
                source: data.source || '',
                notes: data.notes || '',
                gender: data.gender || 'Nam',
                projectAddress: data.projectAddress || '',
                projectName: data.projectName || '',
                salesPerson: data.salesPerson || '',
                designer: data.designer || '',
                contactPerson2: data.contactPerson2 || '',
                phone2: data.phone2 || '',
                pipelineStage: data.pipelineStage || 'Lead',
                estimatedValue: data.estimatedValue || 0,
                nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : null,
            },
        });
        return NextResponse.json(customer, { status: 201 });
    } catch (e) {
        console.error('Create customer error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
