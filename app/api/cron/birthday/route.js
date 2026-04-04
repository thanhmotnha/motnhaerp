/**
 * GET /api/cron/birthday
 * Chạy hàng ngày lúc 8:00 — chúc mừng sinh nhật nhân viên
 * Kênh: in-app notification + Lark group webhook + OpenClaw (nhắn riêng qua Zalo/Lark)
 *
 * Cron: 0 8 * * * curl "https://erp.motnha.vn/api/cron/birthday?secret=YOUR_CRON_SECRET"
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendToEmployee, isOpenClawConfigured } from '@/lib/openclaw';

async function sendLarkGroupMessage(text) {
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
        select: { id: true, name: true, dateOfBirth: true, position: true, larkId: true },
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

    // 1. In-app notification
    await prisma.notification.create({
        data: {
            type: 'info',
            icon: '🎂',
            title: `🎂 Sinh nhật hôm nay: ${names}`,
            message: `Chúc mừng sinh nhật ${names}! Chúc bạn một ngày tuyệt vời và nhiều sức khỏe, hạnh phúc!`,
            link: '/hr',
            source: 'birthday-cron',
            expiresAt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
    });

    // 2. Lark group webhook — thông báo chung cho cả nhóm
    const larkText = `🎂 Sinh nhật hôm nay!\n${birthdayEmployees.map(e => `• ${e.name}${e.position ? ` (${e.position})` : ''}`).join('\n')}\n\nChúc mừng sinh nhật các bạn! 🎉`;
    await sendLarkGroupMessage(larkText);

    // 3. OpenClaw — nhắn riêng từng người qua Lark (nếu có larkId)
    const openclawResults = [];
    if (isOpenClawConfigured) {
        for (const emp of birthdayEmployees) {
            if (!emp.larkId) continue;
            const personalMsg = `🎂 Chúc mừng sinh nhật ${emp.name}!\n\nCông ty Beetify kính chúc bạn một ngày sinh nhật thật vui vẻ, hạnh phúc và tràn đầy năng lượng! Cảm ơn bạn đã cống hiến cho công ty trong thời gian qua!\n\n🎉 Chúc bạn luôn khỏe mạnh và thành công!`;
            const r = await sendToEmployee({
                event: 'employee_birthday',
                larkId: emp.larkId,
                toName: emp.name,
                content: personalMsg,
            });
            openclawResults.push({ name: emp.name, sent: r.ok });
        }
    }

    return NextResponse.json({
        message: 'Birthday notifications sent',
        count: birthdayEmployees.length,
        employees: birthdayEmployees.map(e => e.name),
        openclaw: openclawResults,
    });
}
