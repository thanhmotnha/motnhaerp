import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/customer/gallery — Ảnh công trường cho khách hàng
export const GET = withAuth(async (request, context, session) => {
    const user = session.user;

    const customer = await prisma.customer.findFirst({
        where: {
            OR: [
                { email: user.email },
                { phone: user.phone || '_none_' },
            ],
            deletedAt: null,
        },
        select: { id: true },
    });

    if (!customer) {
        return NextResponse.json({ photos: [] });
    }

    const project = await prisma.project.findFirst({
        where: { customerId: customer.id, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
    });

    if (!project) {
        return NextResponse.json({ photos: [] });
    }

    // Lấy ảnh từ ProgressReport
    const reports = await prisma.progressReport.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            photos: true,
            description: true,
            createdAt: true,
        },
        take: 50,
    });

    // Lấy ảnh từ SiteLog
    const siteLogs = await prisma.siteLog.findMany({
        where: { projectId: project.id },
        orderBy: { date: 'desc' },
        select: {
            id: true,
            images: true,
            date: true,
        },
        take: 50,
    }).catch(() => []);

    // Flatten photos
    const allPhotos = [];

    for (const report of reports) {
        const photos = typeof report.photos === 'string'
            ? JSON.parse(report.photos || '[]')
            : (report.photos || []);

        for (const url of photos) {
            allPhotos.push({
                url: typeof url === 'string' ? url : url.url,
                caption: report.description,
                date: report.createdAt.toISOString(),
                type: 'progress',
            });
        }
    }

    for (const log of siteLogs) {
        const imgs = typeof log.images === 'string'
            ? JSON.parse(log.images || '[]')
            : (log.images || []);

        for (const url of imgs) {
            allPhotos.push({
                url: typeof url === 'string' ? url : url.url,
                date: log.date?.toISOString(),
                type: 'site_log',
            });
        }
    }

    // Group by date
    const grouped = {};
    for (const photo of allPhotos) {
        const dateKey = photo.date ? photo.date.split('T')[0] : 'unknown';
        if (!grouped[dateKey]) {
            grouped[dateKey] = { date: dateKey, photos: [] };
        }
        grouped[dateKey].photos.push(photo);
    }

    const groups = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({ groups, photos: allPhotos });
});
