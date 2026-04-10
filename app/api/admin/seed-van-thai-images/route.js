import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { isR2Configured, uploadToR2 } from '@/lib/r2';
import { NextResponse } from 'next/server';

// POST /api/admin/seed-van-thai-images
// Tải ảnh từ truongsonmelamine.com → upload R2 → cập nhật DB
// Chỉ dành cho admin (giam_doc)
export const POST = withAuth(async (request, context, session) => {
    if (session.user.role !== 'giam_doc') {
        return NextResponse.json({ error: 'Chỉ Giám đốc mới được dùng chức năng này' }, { status: 403 });
    }
    if (!isR2Configured) {
        return NextResponse.json({ error: 'R2 chưa được cấu hình trên server này' }, { status: 400 });
    }

    const products = await prisma.product.findMany({
        where: { name: { startsWith: 'Ván Melamin Thái Lan' }, deletedAt: null },
        select: { id: true, name: true, color: true, image: true },
    });

    if (products.length === 0) {
        return NextResponse.json({ error: 'Không tìm thấy sản phẩm Ván Thái' }, { status: 404 });
    }

    let uploaded = 0, skipped = 0, failed = 0;
    const errors = [];

    for (const product of products) {
        // Bỏ qua nếu đã là R2 URL
        if (product.image && !product.image.includes('truongsonmelamine.com') && product.image.startsWith('http')) {
            skipped++;
            continue;
        }
        if (!product.image) {
            failed++;
            errors.push(`${product.name}: không có ảnh nguồn`);
            continue;
        }

        const slug = 'van-thai-' + product.color.replace(/\s+/g, '-').toLowerCase();
        const key = `products/${slug}.jpg`;

        try {
            const res = await fetch(product.image, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; motnha-erp/1.0)' },
                signal: AbortSignal.timeout(15000),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = Buffer.from(await res.arrayBuffer());

            const r2Url = await uploadToR2(buf, key, 'image/jpeg');

            await prisma.product.update({
                where: { id: product.id },
                data: { image: r2Url },
            });
            uploaded++;
        } catch (e) {
            failed++;
            errors.push(`${product.name}: ${e.message}`);
        }
    }

    return NextResponse.json({
        total: products.length,
        uploaded,
        skipped,
        failed,
        errors: errors.slice(0, 10),
    });
});
