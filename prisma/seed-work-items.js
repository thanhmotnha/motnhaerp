const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Chỉ là các đầu mục nhanh để tạo category trong báo giá
// Sản phẩm chi tiết sẽ kéo từ tab Sản phẩm sang
const quickCategories = [
    { name: 'Phòng khách', category: 'Khu vực', subcategory: 'Phòng', unit: 'phòng' },
    { name: 'Phòng ngủ master', category: 'Khu vực', subcategory: 'Phòng', unit: 'phòng' },
    { name: 'Phòng ngủ', category: 'Khu vực', subcategory: 'Phòng', unit: 'phòng' },
    { name: 'Phòng bếp & ăn', category: 'Khu vực', subcategory: 'Phòng', unit: 'phòng' },
    { name: 'Phòng tắm & WC', category: 'Khu vực', subcategory: 'Phòng', unit: 'phòng' },
    { name: 'Phòng làm việc', category: 'Khu vực', subcategory: 'Phòng', unit: 'phòng' },
    { name: 'Phòng thờ', category: 'Khu vực', subcategory: 'Phòng', unit: 'phòng' },
    { name: 'Sảnh & Hành lang', category: 'Khu vực', subcategory: 'Phòng', unit: 'phòng' },
    { name: 'Nội thất', category: 'Hạng mục', subcategory: 'Nội thất', unit: 'bộ' },
    { name: 'Chiếu sáng', category: 'Hạng mục', subcategory: 'Điện', unit: 'bộ' },
    { name: 'Rèm cửa', category: 'Hạng mục', subcategory: 'Rèm', unit: 'm²' },
    { name: 'Điều hoà', category: 'Hạng mục', subcategory: 'Điện lạnh', unit: 'bộ' },
    { name: 'Thiết bị vệ sinh', category: 'Hạng mục', subcategory: 'Thiết bị', unit: 'bộ' },
    { name: 'Decor & Phụ kiện', category: 'Hạng mục', subcategory: 'Decor', unit: 'bộ' },
].map(item => ({
    ...item,
    mainMaterial: 0, auxMaterial: 0, labor: 0, unitPrice: 0, description: '', image: '',
}));

async function main() {
    // Xoá toàn bộ data cũ và seed lại
    await prisma.workItemLibrary.deleteMany({});
    const result = await prisma.workItemLibrary.createMany({ data: quickCategories });
    console.log(`✅ Seeded ${result.count} quick categories.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
