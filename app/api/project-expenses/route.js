import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const expenses = await prisma.projectExpense.findMany({
            include: { project: { select: { name: true, code: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(expenses);
    } catch (e) {
        console.error('ProjectExpense GET error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        const count = await prisma.projectExpense.count();
        const expense = await prisma.projectExpense.create({
            data: {
                code: `CP${String(count + 1).padStart(3, '0')}`,
                expenseType: data.expenseType || 'Dự án',
                description: data.description || '',
                amount: Number(data.amount) || 0,
                category: data.category || 'Khác',
                status: 'Chờ duyệt',
                submittedBy: data.submittedBy || '',
                recipientType: data.recipientType || '',
                recipientId: data.recipientId || '',
                recipientName: data.recipientName || '',
                date: data.date ? new Date(data.date) : new Date(),
                notes: data.notes || '',
                ...(data.projectId ? { projectId: data.projectId } : {}),
            },
        });
        return NextResponse.json(expense, { status: 201 });
    } catch (e) {
        console.error('ProjectExpense POST error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const data = await request.json();
        const { id, ...raw } = data;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        const allowed = ['description', 'amount', 'paidAmount', 'category', 'status', 'submittedBy', 'approvedBy', 'proofUrl', 'recipientType', 'recipientId', 'recipientName', 'expenseType', 'date', 'notes', 'projectId'];
        const update = {};
        for (const key of allowed) {
            if (key in raw) {
                if (key === 'amount' || key === 'paidAmount') update[key] = Number(raw[key]) || 0;
                else if (key === 'projectId') update[key] = raw[key] || null;
                else if (key === 'date' && raw[key]) update[key] = new Date(raw[key]);
                else update[key] = raw[key];
            }
        }
        const expense = await prisma.projectExpense.update({ where: { id }, data: update });
        return NextResponse.json(expense);
    } catch (e) {
        console.error('ProjectExpense PUT error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        await prisma.projectExpense.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('ProjectExpense DELETE error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
