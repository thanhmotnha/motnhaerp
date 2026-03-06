import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const samples = await p.product.findMany({
    where: { category: 'Ván AC' },
    select: { code: true, name: true, image: true, surfaceCode: true },
    take: 5,
    orderBy: { createdAt: 'desc' },
});
console.log('Sample products:');
samples.forEach(s => console.log(`  ${s.code} | ${s.name} | ${s.image}`));
const total = await p.product.count({ where: { category: 'Ván AC' } });
console.log(`\nTotal Ván AC: ${total}`);
await p.$disconnect();
