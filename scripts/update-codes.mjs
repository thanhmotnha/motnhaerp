import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const products = await p.product.findMany({
    where: { category: { in: ['Ván AC', 'Acrylic'] } },
    select: { id: true, code: true, name: true, surfaceCode: true, category: true },
});

console.log(`${products.length} products to update`);
let updated = 0;
for (const prod of products) {
    const newCode = prod.code.replace(/\s+/g, '');
    const newSurface = prod.surfaceCode?.replace(/\s+/g, '') || prod.surfaceCode;
    const newName = prod.category === 'Ván AC'
        ? `Ván gỗ MDF An Cường ${newCode}`
        : `Acrylic An Cường ${newCode}`;
    if (newCode === prod.code && newName === prod.name) continue;
    try {
        await p.product.update({ where: { id: prod.id }, data: { code: newCode, name: newName, surfaceCode: newSurface } });
        updated++;
    } catch (e) {
        console.error(`  ❌ ${prod.code} → ${newCode}: ${e.message.slice(0, 60)}`);
    }
}
console.log(`✅ ${updated} updated`);
const s = await p.product.findMany({ where: { category: { in: ['Ván AC', 'Acrylic'] } }, select: { code: true, name: true }, take: 5, orderBy: { code: 'asc' } });
s.forEach(x => console.log(`  [${x.code}] ${x.name}`));
await p.$disconnect();
