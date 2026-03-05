import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const id = process.argv[2] || 'cmmagizcm0001ll01r8q27aet';

const items = await prisma.quotationItem.findMany({
    where: { quotationId: id },
    select: { id: true, name: true, parentItemId: true, quantity: true, unitPrice: true, amount: true, order: true },
    orderBy: { order: 'asc' },
});

console.log(`\n📋 Items for quotation ${id}:`);
items.forEach(i => {
    const prefix = i.parentItemId ? '  ↳ ' : '';
    console.log(`${prefix}[${i.order}] ${i.name} | qty=${i.quantity} | price=${i.unitPrice} | amt=${i.amount} | parent=${i.parentItemId || 'null'}`);
});
console.log(`\nTotal items: ${items.length} (${items.filter(i => !i.parentItemId).length} top-level, ${items.filter(i => i.parentItemId).length} sub-items)`);

await prisma.$disconnect();
