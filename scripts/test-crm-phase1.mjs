import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

console.log('=== USERS role=kinh_doanh ===');
const nvkd = await p.user.findMany({
    where: { role: 'kinh_doanh', active: true },
    select: { id: true, name: true, email: true },
});
console.log(nvkd.length ? nvkd : '(none)');

console.log('\n=== USERS role=giam_doc ===');
const gd = await p.user.findMany({
    where: { role: 'giam_doc', active: true },
    select: { id: true, name: true, email: true },
});
console.log(gd.length ? gd : '(none)');

console.log('\n=== CUSTOMER SUMMARY ===');
const total = await p.customer.count({ where: { deletedAt: null } });
const assigned = await p.customer.count({ where: { deletedAt: null, salesPersonId: { not: null } } });
const unassigned = await p.customer.count({ where: { deletedAt: null, salesPersonId: null } });
console.log(`Total: ${total} | Assigned: ${assigned} | Unassigned (pool): ${unassigned}`);

console.log('\n=== CUSTOMERS BY OWNER ===');
const byOwner = await p.customer.groupBy({
    by: ['salesPersonId'],
    where: { deletedAt: null },
    _count: true,
});
for (const row of byOwner) {
    if (row.salesPersonId) {
        const u = await p.user.findUnique({ where: { id: row.salesPersonId }, select: { name: true, role: true } });
        console.log(`  ${u?.name ?? '?'} (${u?.role}): ${row._count}`);
    } else {
        console.log(`  <CHƯA CHỦ>: ${row._count}`);
    }
}

console.log('\n=== SAMPLE UNASSIGNED (first 5) ===');
const pool = await p.customer.findMany({
    where: { deletedAt: null, salesPersonId: null },
    select: { code: true, name: true, salesPersonNote: true },
    take: 5,
});
console.table(pool);

await p.$disconnect();
