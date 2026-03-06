import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const prods = await prisma.product.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, category: true, categoryId: true, categoryRef: { select: { name: true } } },
    });

    console.log('Total products:', prods.length);
    console.log('With categoryId:', prods.filter(x => x.categoryId).length);
    console.log('Without categoryId:', prods.filter(x => !x.categoryId).length);

    const mismatched = prods.filter(x => x.categoryRef && x.category !== x.categoryRef.name);
    console.log('\nMismatched category text vs categoryRef.name:', mismatched.length);
    mismatched.forEach(x => console.log(`  ${x.name.substring(0, 50)} | cat="${x.category}" | ref="${x.categoryRef?.name}"`));

    const noCatId = prods.filter(x => !x.categoryId && x.category);
    console.log('\nHas category text but no categoryId:', noCatId.length);
    noCatId.slice(0, 10).forEach(x => console.log(`  ${x.name.substring(0, 50)} | cat="${x.category}"`));

    // Check SXNT specifically
    const sxnt = prods.filter(x => x.category === 'SXNT' || x.categoryRef?.name === 'SXNT');
    console.log('\nSXNT products (by text or ref):', sxnt.length);
    console.log('  By category text:', sxnt.filter(x => x.category === 'SXNT').length);
    console.log('  By categoryRef.name:', sxnt.filter(x => x.categoryRef?.name === 'SXNT').length);
    console.log('  Both match:', sxnt.filter(x => x.category === 'SXNT' && x.categoryRef?.name === 'SXNT').length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
