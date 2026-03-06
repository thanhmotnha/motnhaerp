import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // 1. Sync category text to match categoryRef.name for all products that have categoryId
    const prods = await prisma.product.findMany({
        where: { deletedAt: null, categoryId: { not: null } },
        select: { id: true, name: true, category: true, categoryId: true, categoryRef: { select: { id: true, name: true } } },
    });

    let synced = 0;
    for (const p of prods) {
        if (p.categoryRef && p.category !== p.categoryRef.name) {
            await prisma.product.update({
                where: { id: p.id },
                data: { category: p.categoryRef.name },
            });
            synced++;
        }
    }
    console.log(`✅ Synced ${synced} products' category text to match categoryRef.name`);

    // 2. For products without categoryId, try to find matching category by name
    const noCatId = await prisma.product.findMany({
        where: { deletedAt: null, categoryId: null, category: { not: '' } },
        select: { id: true, name: true, category: true },
    });

    const allCats = await prisma.productCategory.findMany({ select: { id: true, name: true } });
    const catNameToId = {};
    allCats.forEach(c => { catNameToId[c.name] = c.id; });

    let linked = 0;
    for (const p of noCatId) {
        const catId = catNameToId[p.category];
        if (catId) {
            await prisma.product.update({
                where: { id: p.id },
                data: { categoryId: catId },
            });
            linked++;
            console.log(`  🔗 ${p.name.substring(0, 50)} → ${p.category}`);
        } else {
            console.log(`  ❌ No category found for: ${p.name.substring(0, 50)} (cat="${p.category}")`);
        }
    }
    console.log(`✅ Linked ${linked}/${noCatId.length} orphaned products to categories`);

    // 3. Final check
    const remaining = await prisma.product.count({
        where: { deletedAt: null, categoryId: null },
    });
    console.log(`\n📊 Products still without categoryId: ${remaining}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
