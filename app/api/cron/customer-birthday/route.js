/**
 * GET /api/cron/customer-birthday
 * Chạy hàng ngày lúc 8:00 — chúc mừng sinh nhật khách hàng qua OpenClaw
 *
 * Cron: 0 8 * * * curl "https://erp.motnha.vn/api/cron/customer-birthday?secret=YOUR_CRON_SECRET"
 * Env: CRON_SECRET, OPENCLAW_WEBHOOK_URL
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendToCustomer, isOpenClawConfigured } from '@/lib/openclaw';

function buildMessage(name, gender) {
    const title = gender === 'Nữ' ? 'chị' : 'anh';
    return `🎂 Chúc mừng sinh nhật ${title} ${name}!\n\nNhân dịp sinh nhật, Beetify kính chúc ${title} và gia đình thật nhiều sức khỏe, hạnh phúc và thành công. Rất vui được đồng hành cùng ${title} trong thời gian qua!\n\nTrân trọng,\nCông ty TNHH Đầu tư và Thương Mại Beetify Việt Nam`;
}

export async function GET(request) {
    const secret = request.headers.get('x-cron-secret') || new URL(request.url).searchParams.get('secret');
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Find customers with birthday today and a phone number
    const customers = await prisma.customer.findMany({
        where: {
            birthday: { not: null },
            phone: { not: '' },
            deletedAt: null,
            status: { not: 'Đã mất' },
        },
        select: { id: true, code: true, name: true, phone: true, gender: true, birthday: true, salesPersonNote: true, salesPerson: { select: { id: true, name: true } } },
    });

    const birthdayCustomers = customers.filter(c => {
        if (!c.birthday) return false;
        const dob = new Date(c.birthday);
        return dob.getMonth() + 1 === month && dob.getDate() === day;
    });

    if (birthdayCustomers.length === 0) {
        return NextResponse.json({ message: 'No customer birthdays today', count: 0 });
    }

    const results = [];

    for (const c of birthdayCustomers) {
        const message = buildMessage(c.name, c.gender);

        if (isOpenClawConfigured) {
            const r = await sendToCustomer({
                event: 'customer_birthday',
                phone: c.phone,
                toName: c.name,
                content: message,
            });
            results.push({ customer: c.name, phone: c.phone, sent: r.ok, status: r.status });
        } else {
            results.push({ customer: c.name, phone: c.phone, sent: false, reason: 'OpenClaw not configured' });
        }
    }

    // Also create in-app notification for the team
    const names = birthdayCustomers.map(c => c.name).join(', ');
    await prisma.notification.create({
        data: {
            type: 'info',
            icon: '🎂',
            title: `Sinh nhật khách hàng hôm nay: ${names}`,
            message: `Đã gửi lời chúc qua Zalo cho ${birthdayCustomers.length} khách hàng`,
            link: '/customers',
            source: 'customer-birthday-cron',
            expiresAt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
    });

    return NextResponse.json({
        message: 'Customer birthday greetings sent',
        count: birthdayCustomers.length,
        results,
    });
}
