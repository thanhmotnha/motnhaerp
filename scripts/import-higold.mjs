import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const PRODUCTS = [
    { name: "Giá gia vị nâng hạ điện Starmove 2.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/gia_gia_vi_dien_starmover_2.0_5.jpg", cat: "Giá gia vị" },
    { name: "Giá bát đĩa nâng hạ điện Starmove 2.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/gia_bat_dia_nang_ha_starmove_2.0_2.jpg", cat: "Giá bát đĩa" },
    { name: "Ngăn kéo âm tích hợp hệ khay chia thìa dĩa Shearer 4.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/ngan_keo_khay_chia_thia_dia_12.jpg", cat: "Khay chia thìa dĩa" },
    { name: "Giá để dao thớt gia vị đa năng Diamond 2.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/gia_gia_vi_dao_thot_diamond_2.0_450_0.jpg", cat: "Giá dao thớt gia vị" },
    { name: "Thùng gạo mặt gương cao cấp Higold", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/thung_gao_mau_guong_mau_5.jpg", cat: "Thùng rác & Thùng gạo" },
    { name: "Giá đựng bát đĩa 3 mặt Shearer 4.0 Max", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/ngan_keo_bat_dia_1.jpg", cat: "Giá bát đĩa" },
    { name: "Kệ góc mở toàn phần dạng hộp Shearer", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/ke_goc_mo_toan_phan_1_1.jpg", cat: "Kệ góc tủ" },
    { name: "Ngăn kéo ba mặt Shearer cao cấp", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/khay_chia_ngan_keo_0.jpg", cat: "Khay chia thìa dĩa" },
    { name: "Hệ khay chia ngăn kéo nhôm hàng không cao cấp JR", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/khay_chia_7_resize.jpg", cat: "Khay chia thìa dĩa" },
    { name: "Tủ đồ khô cánh mở Diamond 2.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/03_jiao_du_1lian_dong_kao_bei_copy.jpg", cat: "Tủ đồ khô" },
    { name: "Giá đựng bát đĩa 3 mặt Shearer 4.0 Pro", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/ad7e3d08bb57b884d5cd0a4281297fd5_copy.jpg", cat: "Giá bát đĩa" },
    { name: "Tủ đồ khô cánh kéo Diamond 2.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/01_jiao_du_1dai_dao_ju_kao_bei_copy.jpg", cat: "Tủ đồ khô" },
    { name: "Giá bát đĩa nâng hạ Diamond 2.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/gia_bat_dia_nang_ha_diamond_20.jpg", cat: "Giá bát đĩa" },
    { name: "Kệ góc xoay liên hoàn Diamond 2.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/ke_goc_xoay_lien_hoan_diamond_20.jpg", cat: "Kệ góc tủ" },
    { name: "Kệ góc mở toàn phần Diamond 2.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/ke_goc_mo_toan_phan_diamond_20.jpg", cat: "Kệ góc tủ" },
    { name: "Thùng rác gắn cánh", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/thung_rac_gan_canh.jpg", cat: "Thùng rác & Thùng gạo" },
    { name: "Thùng gạo âm tủ cao cấp", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/anh-thung-gao-am-tu-higold-307042_copy.jpg", cat: "Thùng rác & Thùng gạo" },
    { name: "Thùng gạo mặt gương màu đen cao cấp", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/thung_gao_mat_guong_mau_den_2.jpg", cat: "Thùng rác & Thùng gạo" },
    { name: "Thùng rác đôi âm tủ cao cấp", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/thung_rac_doi_mau_trang_2_0.jpg", cat: "Thùng rác & Thùng gạo" },
    { name: "Giá gia vị nâng hạ điện Higold Starmove", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/gia_gia_vi_dien_4.jpg", cat: "Giá gia vị" },
    { name: "Giá gia vị điện Higold Star Move Pro", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/gia_star_move_pro_2_1.jpg", cat: "Giá gia vị" },
    { name: "Giá bát đĩa nâng hạ điện Higold Inox 304", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/gia_bat_dia_nang_ha_dien_higold_1.jpg", cat: "Giá bát đĩa" },
    { name: "Kệ mở góc toàn phần Diamond", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/ke_goc_mo_toan_phan_1.jpg", cat: "Kệ góc tủ" },
    { name: "Giá đựng bát đĩa cố định", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/gia_bat_dia_co_dinh_4.jpg", cat: "Giá bát đĩa" },
    { name: "Giá đựng xoong nồi Diamond 2.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/ngan_keo_xoong_noi_diamond.jpg", cat: "Giá xoong nồi" },
    { name: "Giá đựng bát đĩa nan dẹt Diamond 2.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/ngan_keo_bat_dia_diamond_2.0_copy.jpg", cat: "Giá bát đĩa" },
    { name: "Kệ góc liên hoàn Diamond", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/goc_xoay_lien_hoan_2.jpg", cat: "Kệ góc tủ" },
    { name: "Mâm xoay góc hình lá nan dẹt Diamond", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/mam_xoay_hinh_la_nan_det_2.jpg", cat: "Kệ góc tủ" },
    { name: "Góc xoay liên hoàn nan tròn", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/goc_xoay_lien_hoan_nan_tron.jpg", cat: "Kệ góc tủ" },
    { name: "Kệ dao thớt gia vị Martin 2.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/image_20240926101956-recovered_copy.jpg", cat: "Giá dao thớt gia vị" },
    { name: "Giá xoong nồi Martin 2.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/image_20240926102001-recovered_copy_1.jpg", cat: "Giá xoong nồi" },
    { name: "Giá bát đĩa Martin 2.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/image_20240926102010_copy.jpg", cat: "Giá bát đĩa" },
    { name: "Tủ đồ khô giỏ nan tròn cánh kéo", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/tu_do_kho_canh_kao_nan_tron_2.jpg", cat: "Tủ đồ khô" },
    { name: "Tủ đồ khô giỏ nan tròn cánh mở", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/tu_do_kho_canh_mo_nan_tron3.jpg", cat: "Tủ đồ khô" },
    { name: "Kệ gia vị hộp nhôm cao cấp Shearer 4.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/gia_gia_vi_hop_nhom_cao_cap_4.0_1.jpg", cat: "Giá gia vị" },
    { name: "Giá xoong nồi hộp nhôm cao cấp Shearer 4.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/gia_dung_xoong_noi_hop_nhom_cao_cap_4.0_1.jpg", cat: "Giá xoong nồi" },
    { name: "Giá bát đĩa hộp nhôm cao cấp Shearer 4.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/gia_dung_bat_dia_hop_nhom_cao_cap_4.0_3.jpg", cat: "Giá bát đĩa" },
    { name: "Giá góc xoay liên hoàn dạng hộp", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/2.1_copy_2.jpg", cat: "Kệ góc tủ" },
    { name: "Mâm xoay góc hình lá 3.0", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/1_copy_3.jpg", cat: "Kệ góc tủ" },
    { name: "Giá đựng gia vị nâng hạ Nebula", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/1_copy_1.jpg", cat: "Giá gia vị" },
    { name: "Tủ đồ khô dạng hộp cánh mở Shearer", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/d43d2a42eb668b282539c030ccf13d72_copy.jpg", cat: "Tủ đồ khô" },
    { name: "Tủ đựng đồ khô dạng hộp cánh kéo Shearer", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/tu_dung_do_kho_canh_keo_shearer_2_0.jpg", cat: "Tủ đồ khô" },
    { name: "Tủ đựng đồ khô xoay 360° Shearer", image: "https://higold.vn/sites/default/files/styles/style_400x400/public/2bc666df313bd93b3416f11652e944bb.png", cat: "Tủ đồ khô" },
];

// Find parent "Phụ kiện tủ bếp" category or create it
let parent = await p.productCategory.findFirst({ where: { name: 'Phụ kiện tủ bếp' } });
if (!parent) {
    parent = await p.productCategory.create({ data: { name: 'Phụ kiện tủ bếp' } });
    console.log('Created parent category: Phụ kiện tủ bếp', parent.id);
}

// Create sub-categories under "Phụ kiện tủ bếp"
const subCatNames = [...new Set(PRODUCTS.map(p => p.cat))];
const catMap = {};
for (const name of subCatNames) {
    let cat = await p.productCategory.findFirst({ where: { name, parentId: parent.id } });
    if (!cat) {
        cat = await p.productCategory.create({ data: { name, parentId: parent.id } });
        console.log('Created sub-category:', name, cat.id);
    }
    catMap[name] = cat;
}

// Generate product code
const lastProduct = await p.product.findFirst({ where: { code: { startsWith: 'HG' } }, orderBy: { code: 'desc' } });
let nextNum = 1;
if (lastProduct?.code) {
    const num = parseInt(lastProduct.code.replace('HG', ''));
    if (!isNaN(num)) nextNum = num + 1;
}

let created = 0;
for (const item of PRODUCTS) {
    // Check if product already exists
    const exists = await p.product.findFirst({ where: { name: item.name } });
    if (exists) {
        console.log('SKIP (exists):', item.name);
        continue;
    }

    const cat = catMap[item.cat];
    const code = `HG${String(nextNum++).padStart(3, '0')}`;

    await p.product.create({
        data: {
            name: item.name,
            code,
            category: item.cat,
            categoryId: cat.id,
            unit: 'bộ',
            brand: 'Higold',
            supplyType: 'Vật tư đặt hàng',
            image: item.image,
            salePrice: 0,
            importPrice: 0,
            stock: 0,
            minStock: 0,
            status: 'Đang bán',
        },
    });
    created++;
    console.log(`[${code}] ${item.name} → ${item.cat}`);
}

console.log(`\nDone! Created ${created} products. Skipped ${PRODUCTS.length - created}.`);
await p.$disconnect();
