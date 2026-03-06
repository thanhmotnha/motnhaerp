import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Prices scraped from higold.vn (lowest/base size price) — 2026-03-06
const PRICES = [
    { name: "Giá gia vị nâng hạ điện Starmove 2.0", price: 18000000 },
    { name: "Giá bát đĩa nâng hạ điện Starmove 2.0", price: 20800000 },
    { name: "Ngăn kéo âm tích hợp hệ khay chia thìa dĩa Shearer 4.0", price: 1900000 },
    { name: "Giá để dao thớt gia vị đa năng Diamond 2.0", price: 3250000 },
    { name: "Thùng gạo mặt gương cao cấp Higold", price: 2750000 },
    { name: "Giá đựng bát đĩa 3 mặt Shearer 4.0 Max", price: 7300000 },
    { name: "Kệ góc mở toàn phần dạng hộp Shearer", price: 15000000 },
    { name: "Ngăn kéo ba mặt Shearer cao cấp", price: 1900000 },
    { name: "Hệ khay chia ngăn kéo nhôm hàng không cao cấp JR", price: 1950000 },
    { name: "Tủ đồ khô cánh mở Diamond 2.0", price: 9000000 },
    { name: "Giá đựng bát đĩa 3 mặt Shearer 4.0 Pro", price: 7300000 },
    { name: "Tủ đồ khô cánh kéo Diamond 2.0", price: 10500000 },
    { name: "Giá bát đĩa nâng hạ Diamond 2.0", price: 9850000 },
    { name: "Kệ góc xoay liên hoàn Diamond 2.0", price: 10450000 },
    { name: "Kệ góc mở toàn phần Diamond 2.0", price: 10450000 },
    { name: "Thùng rác gắn cánh", price: 760000 },
    { name: "Thùng gạo âm tủ cao cấp", price: 2750000 },
    { name: "Thùng gạo mặt gương màu đen cao cấp", price: 2750000 },
    { name: "Thùng rác đôi âm tủ cao cấp", price: 2500000 },
    { name: "Giá gia vị nâng hạ điện Higold Starmove", price: 18000000 },
    { name: "Giá gia vị điện Higold Star Move Pro", price: 23500000 },
    { name: "Giá bát đĩa nâng hạ điện Higold Inox 304", price: 20800000 },
    { name: "Kệ mở góc toàn phần Diamond", price: 10450000 },
    { name: "Giá đựng bát đĩa cố định", price: 2350000 },
    { name: "Giá đựng xoong nồi Diamond 2.0", price: 3200000 },
    { name: "Giá đựng bát đĩa nan dẹt Diamond 2.0", price: 3430000 },
    { name: "Kệ góc liên hoàn Diamond", price: 10450000 },
    { name: "Mâm xoay góc hình lá nan dẹt Diamond", price: 10450000 },
    { name: "Góc xoay liên hoàn nan tròn", price: 10450000 },
    { name: "Kệ dao thớt gia vị Martin 2.0", price: 3350000 },
    { name: "Giá xoong nồi Martin 2.0", price: 3250000 },
    { name: "Giá bát đĩa Martin 2.0", price: 4400000 },
    { name: "Tủ đồ khô giỏ nan tròn cánh kéo", price: 10000000 },
    { name: "Tủ đồ khô giỏ nan tròn cánh mở", price: 9000000 },
    { name: "Kệ gia vị hộp nhôm cao cấp Shearer 4.0", price: 5600000 },
    { name: "Giá xoong nồi hộp nhôm cao cấp Shearer 4.0", price: 4800000 },
    { name: "Giá bát đĩa hộp nhôm cao cấp Shearer 4.0", price: 7300000 },
    { name: "Giá góc xoay liên hoàn dạng hộp", price: 11550000 },
    { name: "Mâm xoay góc hình lá 3.0", price: 11550000 },
    { name: "Giá đựng gia vị nâng hạ Nebula", price: 9850000 },
    { name: "Tủ đồ khô dạng hộp cánh mở Shearer", price: 9900000 },
    { name: "Tủ đựng đồ khô dạng hộp cánh kéo Shearer", price: 12100000 },
    { name: "Tủ đựng đồ khô xoay 360° Shearer", price: 15000000 },
];

let updated = 0;
let notFound = 0;

for (const item of PRICES) {
    const product = await prisma.product.findFirst({
        where: { name: item.name, brand: 'Higold' },
    });

    if (!product) {
        console.log(`❌ NOT FOUND: ${item.name}`);
        notFound++;
        continue;
    }

    await prisma.product.update({
        where: { id: product.id },
        data: { salePrice: item.price },
    });

    console.log(`✅ [${product.code}] ${product.name} → ${item.price.toLocaleString('vi-VN')}đ`);
    updated++;
}

console.log(`\nDone! Updated ${updated} products. Not found: ${notFound}.`);
await prisma.$disconnect();
