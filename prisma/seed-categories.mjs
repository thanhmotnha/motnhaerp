/**
 * Seed ProductCategory with predefined tree structure.
 * Run: node prisma/seed-categories.mjs
 *
 * This script:
 * 1. Deletes all existing ProductCategory records
 * 2. Creates the new 2-level tree structure
 * 3. Maps existing products to new categories based on old category string
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const CATEGORY_TREE = [
    {
        name: 'Vật tư thô & Hoàn thiện cơ bản',
        order: 0,
        children: [
            { name: 'Vật liệu xây dựng', order: 0 },
            { name: 'Đá & Gạch ốp lát', order: 1 },
            { name: 'Sơn, Keo & Hóa chất', order: 2 },
        ],
    },
    {
        name: 'Đồ gỗ nội thất',
        order: 1,
        children: [
            { name: 'Gỗ công nghiệp', order: 0 },
            { name: 'Nội thất liền tường', order: 1 },
            { name: 'Nội thất rời (Sản xuất)', order: 2 },
        ],
    },
    {
        name: 'Hệ cửa & Vách',
        order: 2,
        children: [
            { name: 'Cửa gỗ', order: 0 },
            { name: 'Cửa nhôm kính & Vách kính', order: 1 },
            { name: 'Cửa cuốn & Cửa chống cháy', order: 2 },
        ],
    },
    {
        name: 'Thiết bị & Phụ kiện',
        order: 3,
        children: [
            { name: 'Phụ kiện mộc', order: 0 },
            { name: 'Thiết bị Điện & Chiếu sáng', order: 1 },
            { name: 'Thiết bị Nước & Vệ sinh', order: 2 },
            { name: 'Thiết bị bếp & Điều hòa', order: 3 },
        ],
    },
    {
        name: 'Đồ rời & Decor',
        order: 4,
        children: [
            { name: 'Sofa & Ghế rời', order: 0 },
            { name: 'Rèm cửa', order: 1 },
            { name: 'Đồ Decor & Mỹ thuật', order: 2 },
        ],
    },
    {
        name: 'Dịch vụ',
        order: 5,
        children: [
            { name: 'Phí thiết kế', order: 0 },
            { name: 'Nhân công lắp đặt/Thi công', order: 1 },
            { name: 'Phí vận chuyển', order: 2 },
        ],
    },
];

// Mapping: old category string → new subcategory name
// Adjust this based on your actual data
const CATEGORY_MAP = {
    // Level 1 group names (for products that only have group-level category)
    'Vật liệu xây dựng': 'Vật liệu xây dựng',
    'Xi măng': 'Vật liệu xây dựng',
    'Cát': 'Vật liệu xây dựng',
    'Đá': 'Đá & Gạch ốp lát',
    'Gạch': 'Đá & Gạch ốp lát',
    'Gạch ốp lát': 'Đá & Gạch ốp lát',
    'Sơn': 'Sơn, Keo & Hóa chất',
    'Keo': 'Sơn, Keo & Hóa chất',
    'Hóa chất': 'Sơn, Keo & Hóa chất',

    'Gỗ công nghiệp': 'Gỗ công nghiệp',
    'Ván': 'Gỗ công nghiệp',
    'Nội thất': 'Nội thất liền tường',
    'Tủ bếp': 'Nội thất liền tường',
    'Tủ áo': 'Nội thất liền tường',
    'Nội thất rời': 'Nội thất rời (Sản xuất)',
    'Giường': 'Nội thất rời (Sản xuất)',
    'Bàn': 'Nội thất rời (Sản xuất)',

    'Cửa gỗ': 'Cửa gỗ',
    'Cửa': 'Cửa gỗ',
    'Cửa nhôm': 'Cửa nhôm kính & Vách kính',
    'Cửa kính': 'Cửa nhôm kính & Vách kính',
    'Vách kính': 'Cửa nhôm kính & Vách kính',
    'Cửa cuốn': 'Cửa cuốn & Cửa chống cháy',

    'Phụ kiện': 'Phụ kiện mộc',
    'Phụ kiện mộc': 'Phụ kiện mộc',
    'Bản lề': 'Phụ kiện mộc',
    'Ray trượt': 'Phụ kiện mộc',
    'Thiết bị điện': 'Thiết bị Điện & Chiếu sáng',
    'Đèn': 'Thiết bị Điện & Chiếu sáng',
    'Thiết bị nước': 'Thiết bị Nước & Vệ sinh',
    'Vệ sinh': 'Thiết bị Nước & Vệ sinh',
    'Thiết bị bếp': 'Thiết bị bếp & Điều hòa',
    'Điều hòa': 'Thiết bị bếp & Điều hòa',

    'Sofa': 'Sofa & Ghế rời',
    'Ghế': 'Sofa & Ghế rời',
    'Rèm': 'Rèm cửa',
    'Rèm cửa': 'Rèm cửa',
    'Decor': 'Đồ Decor & Mỹ thuật',
    'Tranh': 'Đồ Decor & Mỹ thuật',

    'Dịch vụ': 'Phí thiết kế',
    'Nhân công': 'Nhân công lắp đặt/Thi công',
    'Vận chuyển': 'Phí vận chuyển',
};

function slugify(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

async function main() {
    console.log('🗑️  Clearing existing categories...');

    // Unlink all products from categories first
    await prisma.product.updateMany({
        where: { categoryId: { not: null } },
        data: { categoryId: null },
    });

    // Delete all categories (children first due to FK)
    await prisma.productCategory.deleteMany({ where: { parentId: { not: null } } });
    await prisma.productCategory.deleteMany({});

    console.log('🌳 Creating category tree...');

    // Build a flat lookup: subcategory name → id
    const subCatLookup = {};

    for (const group of CATEGORY_TREE) {
        const parent = await prisma.productCategory.create({
            data: {
                name: group.name,
                slug: slugify(group.name),
                order: group.order,
            },
        });
        console.log(`  📁 ${group.name} (${parent.id})`);

        for (const child of group.children) {
            const sub = await prisma.productCategory.create({
                data: {
                    name: child.name,
                    slug: slugify(child.name),
                    order: child.order,
                    parentId: parent.id,
                },
            });
            subCatLookup[child.name] = sub.id;
            console.log(`    └─ ${child.name} (${sub.id})`);
        }
    }

    // Map existing products
    console.log('\n🔗 Mapping existing products...');
    const products = await prisma.product.findMany({
        select: { id: true, category: true },
        where: { deletedAt: null },
    });

    let mapped = 0;
    let unmapped = 0;
    const unmappedCategories = new Set();

    for (const p of products) {
        if (!p.category) {
            unmapped++;
            continue;
        }

        const targetName = CATEGORY_MAP[p.category];
        if (targetName && subCatLookup[targetName]) {
            await prisma.product.update({
                where: { id: p.id },
                data: { categoryId: subCatLookup[targetName] },
            });
            mapped++;
        } else {
            unmapped++;
            unmappedCategories.add(p.category);
        }
    }

    console.log(`\n✅ Done! Mapped ${mapped}/${products.length} products`);
    if (unmappedCategories.size > 0) {
        console.log(`⚠️  Unmapped categories (${unmappedCategories.size}):`);
        for (const c of unmappedCategories) {
            console.log(`    - "${c}"`);
        }
        console.log('\n💡 Add these to CATEGORY_MAP in this script and re-run to map them.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
