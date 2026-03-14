import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/apiHandler';
import { sendEmail, buildContractEmailHtml } from '@/lib/emailService';

// POST /api/contracts/[id]/send — Send contract to customer via email
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { email, message } = body;

    const contract = await prisma.contract.findUnique({
        where: { id },
        include: { customer: true, project: true },
    });
    if (!contract) return NextResponse.json({ error: 'Hợp đồng không tồn tại' }, { status: 404 });

    const toEmail = email || contract.customer?.email;
    if (!toEmail) return NextResponse.json({ error: 'Không có email khách hàng. Vui lòng nhập email.' }, { status: 400 });

    // Build public URL
    const origin = request.headers.get('origin') || request.headers.get('x-forwarded-host') || 'https://erp.motnha.vn';
    const publicUrl = `${origin.startsWith('http') ? origin : 'https://' + origin}/public/hopdong/${id}`;

    const html = buildContractEmailHtml({
        contract,
        customer: contract.customer,
        publicUrl,
    });

    try {
        await sendEmail({
            to: toEmail,
            subject: `[Một Nhà] Hợp đồng ${contract.code} - ${contract.name || contract.type}`,
            html,
            text: `Một Nhà gửi quý khách hợp đồng ${contract.code}. Xem tại: ${publicUrl}`,
        });

        // Update contract with sent info
        await prisma.contract.update({
            where: { id },
            data: {
                sentAt: new Date(),
                sentTo: toEmail,
                status: contract.status === 'Nháp' ? 'Chờ ký' : contract.status,
            },
        });

        // Create tracking log
        if (contract.customer) {
            await prisma.trackingLog.create({
                data: {
                    content: `Gửi hợp đồng ${contract.code} tới ${toEmail}`,
                    type: 'Email',
                    contactMethod: 'Email',
                    createdBy: 'Hệ thống',
                    customerId: contract.customerId,
                    projectId: contract.projectId,
                },
            });
        }

        return NextResponse.json({ success: true, sentTo: toEmail, sentAt: new Date() });
    } catch (e) {
        return NextResponse.json({ error: 'Gửi email thất bại: ' + e.message }, { status: 500 });
    }
});
