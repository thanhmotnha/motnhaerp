import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const r1 = await p.product.updateMany({ where: { category: 'Ván AC' }, data: { supplyType: 'Vật tư sản xuất' } });
const r2 = await p.product.updateMany({ where: { category: 'Acrylic' }, data: { supplyType: 'Vật tư sản xuất' } });
console.log('Ván AC:', r1.count, '| Acrylic:', r2.count, '→ Vật tư sản xuất');
await p.$disconnect();
