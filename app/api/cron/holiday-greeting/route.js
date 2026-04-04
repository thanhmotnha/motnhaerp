/**
 * GET /api/cron/holiday-greeting?holiday=tet
 * Gửi lời chúc ngày lễ cho khách hàng qua OpenClaw → Zalo
 *
 * Các ngày lễ được cấu hình sẵn, chạy thủ công hoặc qua cron
 * Env: CRON_SECRET, OPENCLAW_WEBHOOK_URL
 *
 * Cron ví dụ (Tết Dương lịch 01/01):
 * 0 7 1 1 * curl "https://erp.motnha.vn/api/cron/holiday-greeting?secret=SECRET&holiday=new-year"
 *
 * Tết Nguyên Đán (ngày âm lịch, cần chạy thủ công hoặc set ngày dương mỗi năm):
 * Chạy thủ công: POST /api/cron/holiday-greeting?holiday=tet&secret=SECRET
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendToCustomer, isOpenClawConfigured } from '@/lib/openclaw';

const HOLIDAY_TEMPLATES = {
    'tet': {
        name: 'Tết Nguyên Đán',
        icon: '🧧',
        buildMessage: (name, gender) => {
            const t = gender === 'Nữ' ? 'chị' : 'anh';
            return `🧧 Chúc mừng năm mới ${t} ${name}!\n\nNhân dịp Tết Nguyên Đán, Beetify kính chúc ${t} và gia đình một năm mới An Khang Thịnh Vượng, Vạn Sự Như Ý!\n\nCảm ơn ${t} đã tin tưởng đồng hành cùng Beetify trong suốt thời gian qua. Rất mong được tiếp tục phục vụ ${t} trong năm mới!\n\nTrân trọng,\nCông ty TNHH Đầu tư và Thương Mại Beetify Việt Nam`;
        },
    },
    'new-year': {
        name: 'Tết Dương lịch',
        icon: '🎉',
        buildMessage: (name, gender) => {
            const t = gender === 'Nữ' ? 'chị' : 'anh';
            return `🎉 Chúc mừng năm mới ${t} ${name}!\n\nBeetify kính chúc ${t} và gia đình năm mới 2026 tràn đầy sức khỏe, niềm vui và thành công!\n\nTrân trọng,\nCông ty TNHH Đầu tư và Thương Mại Beetify Việt Nam`;
        },
    },
    'women-day-3-8': {
        name: 'Ngày Quốc tế Phụ nữ 8/3',
        icon: '🌸',
        buildMessage: (name) => `🌸 Chúc mừng ngày 8/3, chị ${name}!\n\nNhân ngày Quốc tế Phụ nữ, Beetify kính chúc chị luôn xinh đẹp, hạnh phúc và thành công trong cuộc sống!\n\nTrân trọng,\nCông ty TNHH Đầu tư và Thương Mại Beetify Việt Nam`,
        genderFilter: 'Nữ',
    },
    'women-day-20-10': {
        name: 'Ngày Phụ nữ Việt Nam 20/10',
        icon: '🌺',
        buildMessage: (name) => `🌺 Chúc mừng ngày Phụ nữ Việt Nam 20/10, chị ${name}!\n\nBeetify kính chúc chị luôn rạng rỡ, hạnh phúc và thành đạt!\n\nTrân trọng,\nCông ty TNHH Đầu tư và Thương Mại Beetify Việt Nam`,
        genderFilter: 'Nữ',
    },
    'national-day': {
        name: 'Ngày Quốc khánh 2/9',
        icon: '🇻🇳',
        buildMessage: (name, gender) => {
            const t = gender === 'Nữ' ? 'chị' : 'anh';
            return `🇻🇳 Chúc mừng Quốc khánh 2/9, ${t} ${name}!\n\nNhân dịp kỷ niệm Ngày Quốc khánh Việt Nam, Beetify kính chúc ${t} và gia đình sức khỏe, bình an và hạnh phúc!\n\nTrân trọng,\nCông ty TNHH Đầu tư và Thương Mại Beetify Việt Nam`;
        },
    },
    'mid-autumn': {
        name: 'Tết Trung Thu',
        icon: '🏮',
        buildMessage: (name, gender) => {
            const t = gender === 'Nữ' ? 'chị' : 'anh';
            return `🏮 Chúc mừng Tết Trung Thu, ${t} ${name}!\n\nBeetify kính chúc ${t} và gia đình một mùa Trung Thu vui vẻ, sum vầy và hạnh phúc!\n\nTrân trọng,\nCông ty TNHH Đầu tư và Thương Mại Beetify Việt Nam`;
        },
    },
};

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const secret = request.headers.get('x-cron-secret') || searchParams.get('secret');
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const holiday = searchParams.get('holiday');
    const limitStr = searchParams.get('limit'); // optional: limit batch size
    const limit = limitStr ? parseInt(limitStr) : 1000;

    if (!holiday || !HOLIDAY_TEMPLATES[holiday]) {
        return NextResponse.json({
            error: 'Thiếu hoặc sai tham số holiday',
            available: Object.keys(HOLIDAY_TEMPLATES),
        }, { status: 400 });
    }

    const tpl = HOLIDAY_TEMPLATES[holiday];
    const today = new Date().toISOString().split('T')[0];

    // Query customers
    const where = {
        phone: { not: '' },
        deletedAt: null,
        status: { not: 'Đã mất' },
    };
    if (tpl.genderFilter) where.gender = tpl.genderFilter;

    const customers = await prisma.customer.findMany({
        where,
        select: { id: true, code: true, name: true, phone: true, gender: true },
        take: limit,
        orderBy: { createdAt: 'desc' },
    });

    if (!isOpenClawConfigured) {
        return NextResponse.json({
            message: 'OpenClaw not configured — would have sent to ' + customers.length + ' customers',
            holiday: tpl.name,
            count: customers.length,
        });
    }

    let sent = 0, failed = 0;
    // Send in batches of 10 to avoid overwhelming webhook
    for (let i = 0; i < customers.length; i += 10) {
        const batch = customers.slice(i, i + 10);
        await Promise.all(batch.map(async c => {
            const message = tpl.buildMessage(c.name, c.gender);
            const r = await sendToCustomer({
                event: 'holiday_greeting',
                phone: c.phone,
                toName: c.name,
                content: message,
            });
            if (r.ok) sent++; else failed++;
        }));
        // Small delay between batches
        if (i + 10 < customers.length) await new Promise(r => setTimeout(r, 500));
    }

    // In-app notification
    await prisma.notification.create({
        data: {
            type: 'info',
            icon: tpl.icon,
            title: `${tpl.name}: đã gửi lời chúc cho ${sent} khách`,
            message: failed > 0 ? `${failed} tin thất bại` : 'Tất cả gửi thành công',
            link: '/customers',
            source: 'holiday-cron',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });

    return NextResponse.json({ holiday: tpl.name, sent, failed, total: customers.length });
}
