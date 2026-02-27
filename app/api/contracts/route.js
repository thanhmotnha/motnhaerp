import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

export async function GET() {
    const contracts = await prisma.contract.findMany({
        include: {
            customer: { select: { name: true, code: true } },
            project: { select: { name: true, code: true, status: true } },
            quotation: { select: { code: true } },
            payments: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(contracts);
}

// Preset payment phases per contract type
const PAYMENT_TEMPLATES = {
    'Thiết kế': [
        { phase: 'Đặt cọc thiết kế', pct: 50, category: 'Thiết kế' },
        { phase: 'Nghiệm thu bản vẽ', pct: 50, category: 'Thiết kế' },
    ],
    'Thi công thô': [
        { phase: 'Đặt cọc thi công', pct: 30, category: 'Thi công' },
        { phase: 'Hoàn thiện móng + khung', pct: 30, category: 'Thi công' },
        { phase: 'Hoàn thiện xây thô', pct: 30, category: 'Thi công' },
        { phase: 'Nghiệm thu bàn giao thô', pct: 10, category: 'Thi công' },
    ],
    'Thi công hoàn thiện': [
        { phase: 'Đặt cọc hoàn thiện', pct: 30, category: 'Hoàn thiện' },
        { phase: 'Hoàn thiện trát + ốp lát', pct: 25, category: 'Hoàn thiện' },
        { phase: 'Hoàn thiện sơn + điện nước', pct: 25, category: 'Hoàn thiện' },
        { phase: 'Nghiệm thu bàn giao', pct: 20, category: 'Hoàn thiện' },
    ],
    'Nội thất': [
        { phase: 'Đặt cọc nội thất', pct: 50, category: 'Nội thất' },
        { phase: 'Giao hàng + lắp đặt', pct: 40, category: 'Nội thất' },
        { phase: 'Nghiệm thu hoàn thiện', pct: 10, category: 'Nội thất' },
    ],
};

export async function POST(request) {
    try {
        const data = await request.json();
        if (!data.name?.trim()) return NextResponse.json({ error: 'Tên HĐ bắt buộc' }, { status: 400 });
        if (!data.projectId) return NextResponse.json({ error: 'Dự án bắt buộc' }, { status: 400 });
        if (!data.customerId) return NextResponse.json({ error: 'Khách hàng bắt buộc' }, { status: 400 });

        const code = await generateCode('contract', 'HD');
        const contractValue = Number(data.contractValue) || 0;

        const contract = await prisma.contract.create({
            data: {
                code,
                name: data.name.trim(),
                type: data.type || 'Thi công thô',
                contractValue,
                status: data.signDate ? 'Đã ký' : 'Nháp',
                signDate: data.signDate ? new Date(data.signDate) : null,
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
                paymentTerms: data.paymentTerms || '',
                notes: data.notes || '',
                customerId: data.customerId,
                projectId: data.projectId,
                quotationId: data.quotationId || null,
            },
        });

        // Create payment phases: use client-sent phases if available, else fall back to template
        const phases = data.paymentPhases?.length > 0
            ? data.paymentPhases
            : (PAYMENT_TEMPLATES[data.type] || []).map(t => ({
                phase: t.phase, pct: t.pct, category: t.category,
                amount: Math.round(contractValue * t.pct / 100),
            }));

        if (phases.length > 0) {
            const paymentData = phases.map(t => ({
                contractId: contract.id,
                phase: t.phase,
                amount: Number(t.amount) || Math.round(contractValue * Number(t.pct || 0) / 100),
                paidAmount: 0,
                category: t.category || data.type || 'Hợp đồng',
                status: 'Chưa thu',
            }));
            await prisma.contractPayment.createMany({ data: paymentData });
        }

        // Return with payments included
        const result = await prisma.contract.findUnique({
            where: { id: contract.id },
            include: { payments: true },
        });

        return NextResponse.json(result, { status: 201 });
    } catch (e) {
        console.error('Create contract error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
