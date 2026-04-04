import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function sendLarkMessage(text) {
    const webhookUrl = process.env.LARK_WEBHOOK_URL;
    if (!webhookUrl) return;
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg_type: 'text', content: { text } }),
        });
    } catch { /* silent fail */ }
}

export async function GET(request) {
    const secret = request.headers.get('x-cron-secret') || new URL(request.url).searchParams.get('secret');
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const employees = await prisma.employee.findMany({
        where: { dateOfBirth: { not: null }, status: 'Đang làm' },
        select: { id: true, name: true, dateOfBirth: true, position: true },
    });

    const birthdayEmployees = employees.filter(emp => {
        if (!emp.dateOfBirth) return false;
        const dob = new Date(emp.dateOfBirth);
        return dob.getMonth() + 1 === month && dob.getDate() === day;
    });

    if (birthdayEmployees.length === 0) {
        return NextResponse.json({ message: 'No birthdays today', count: 0 });
    }

    const names = birthdayEmployees.map(e => e.name).join(', ');
    const title = `🎂 Sinh nhật hôm nay: ${names}`;
    const message = `Chúc mừng sinh nhật ${names}! Chúc bạn một ngày tuyệt vời và nhiều sức khỏe, hạnh phúc!`;

    await prisma.notification.create({
        data: {
            type: 'info',
            icon: '🎂',
            title,
            message,
            link: '/hr',
            source: 'birthday-cron',
            expiresAt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
    });

    const larkText = `🎂 Sinh nhật hôm nay!\n${birthdayEmployees.map(e => `• ${e.name}${e.position ? ` (${e.position})` : ''}`).join('\n')}\n\nChúc mừng sinh nhật các bạn! 🎉`;
    await sendLarkMessage(larkText);

    return NextResponse.json({ message: 'Birthday notifications sent', count: birthdayEmployees.length, employees: birthdayEmployees.map(e => e.name) });
}
