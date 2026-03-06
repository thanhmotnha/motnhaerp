import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const r = await p.product.updateMany({
    where: { name: { contains: 'MS 01012 T' } },
    data: { image: '/api/image-proxy?url=https://ancuong.com/products/products-webp/30300005400100361053.webp' }
});
console.log('Updated', r.count, 'products to use proxy URL');
await p.$disconnect();
