// Run: node scripts/rename-category.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const result = await prisma.product.updateMany({
        where: { category: 'Nội thất thành phẩm' },
        data: { category: 'Nội thất' },
    });
    console.log(`✅ Đã đổi ${result.count} sản phẩm: "Nội thất thành phẩm" → "Nội thất"`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
