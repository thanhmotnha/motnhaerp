import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const products = await p.product.findMany({
    where: { category: 'Ván AC', name: { contains: ' MS ' } },
    select: { id: true, name: true, surfaceCode: true },
});

console.log(`Found ${products.length} products with "MS" in name`);

let updated = 0;
for (const prod of products) {
    const newName = prod.name.replace(' MS ', ' ');
    const newCode = prod.surfaceCode?.replace(/^MS /, '') || prod.surfaceCode;
    await p.product.update({
        where: { id: prod.id },
        data: { name: newName, surfaceCode: newCode },
    });
    updated++;
}

console.log(`✅ Updated ${updated} products`);
// Show sample
const samples = await p.product.findMany({ where: { category: 'Ván AC' }, select: { name: true }, take: 5, orderBy: { name: 'asc' } });
samples.forEach(s => console.log(`  ${s.name}`));
await p.$disconnect();
