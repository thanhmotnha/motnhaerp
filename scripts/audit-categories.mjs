import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// 1. Show category tree
const cats = await p.productCategory.findMany({
    where: { parentId: null },
    include: {
        _count: { select: { products: true } },
        children: {
            include: {
                _count: { select: { products: true } },
                children: { include: { _count: { select: { products: true } } } }
            }
        }
    },
    orderBy: { order: 'asc' }
});

console.log('=== CATEGORY TREE ===');
const show = (cats, indent = 0) => {
    cats.forEach(c => {
        console.log(' '.repeat(indent) + c.name + ' (' + c._count.products + ' products)');
        if (c.children) show(c.children, indent + 2);
    });
};
show(cats);

// 2. Product category string distribution
console.log('\n=== PRODUCT CATEGORY STRINGS ===');
const groups = await p.product.groupBy({ by: ['category'], _count: true, orderBy: { _count: { category: 'desc' } } });
groups.forEach(r => console.log(r.category + ': ' + r._count));

// 3. categoryId stats
const total = await p.product.count();
const withCatId = await p.product.count({ where: { categoryId: { not: null } } });
console.log('\n=== STATS ===');
console.log('Total products:', total);
console.log('With categoryId:', withCatId);
console.log('Without categoryId:', total - withCatId);

// 4. Check name mismatches
const allCatNames = [];
const collect = (cats) => { cats.forEach(c => { allCatNames.push(c.name); if (c.children) collect(c.children); }); };
collect(cats);
const unmatchedCategories = groups.filter(g => g.category && !allCatNames.includes(g.category));
if (unmatchedCategories.length > 0) {
    console.log('\n=== UNMATCHED CATEGORY STRINGS (no ProductCategory match) ===');
    unmatchedCategories.forEach(r => console.log('  "' + r.category + '": ' + r._count + ' products'));
}

await p.$disconnect();
