import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const IMAGES = [
    { name: 'Thanh suốt treo quần áo bọc da OVAL BV', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/thanh_suot_treo_quan_ao_bv_1.jpg' },
    { name: 'Gương xoay toàn thân BV 2.0', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/guong_xoay_toan_than_loai2_4.jpg' },
    { name: 'Ngăn kéo đựng đồ trang điểm BV 2.0', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/1_ngan_keo_do_trang_diem.jpg' },
    { name: 'Ngăn kéo đựng đồ nội y Higold', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/z6403036799290_654d91505a42bb333e9867ee4a959cf3_copy.jpg' },
    { name: 'Góc xoay treo quần áo Series A', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/goc_xoay_treo_quan_ao_series_a.jpg' },
    { name: 'Thanh suốt - Bas treo quần áo Series A', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/thanh_suot_treo_quan_ao.jpg' },
    { name: 'Gương xoay toàn thân Series A', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/guong_xoay_toan_than_1.jpg' },
    { name: 'Ngăn kéo cao đựng đồ đa năng Series A', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/ngan_keo_cao_de_do_series_a.jpg' },
    { name: 'Giá đựng đồ ba tầng bắt hông Series BV', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/gia_3_tang_2.jpg' },
    { name: 'Giá treo quần áo nâng hạ Series BV', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/gia_treo_quan_ao_nang_ha_1.jpg' },
    { name: 'Giá treo cà vạt Series BV', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/treo_ca_vat_1.jpg' },
    { name: 'Hộp xoay đồng hồ cơ Series BV', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/hop_xoay_dong_ho_co_1.jpg' },
    { name: 'Két sắt bảo hiểm Series BV', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/ket-sat-bao_ve.jpg' },
    { name: 'Giá treo quần áo góc tủ Series BV', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/goc_tu_bv_1.jpg' },
    { name: 'Kệ xoay đựng giày Series BV', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/ke_giay_xoay_1.jpg' },
    { name: 'Giá treo quần gắn trên Series BV', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/moc_treo_quan_tay.jpg' },
    { name: 'Kệ xoay đựng giày Series A', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/3._gia_xoay_giay_series_a_1.jpg' },
    { name: 'Ngăn kéo treo quần Series A', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/ngan_keo_treo_quan_au_1.jpg' },
    { name: 'Ngăn kéo đựng đồ trang sức Series A', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/1._ngan_keo_dung_do_trang_suc_higold_series_a_4.jpg' },
    { name: 'Ngăn kéo cao đựng quần áo Series BV 2.0', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/gio_cao_do_de_2.0_1.jpg' },
    { name: 'Ngăn kéo thấp đựng quần áo Series BV 2.0', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/gio_thap_do_de_2.0_2.jpg' },
    { name: 'Ngăn kéo đựng đồ nội y Series BV 2.0', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/ngan_keo_dung_do_noi_y_bv2.0_1_1.jpg' },
    { name: 'Ngăn kéo treo quần âu Series BV 2.0', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/ngen_keo_trao_quan_bv_2.0_1.jpg' },
    { name: 'Ngăn kéo đựng đồ trang sức Series BV 2.0', image: 'https://higold.vn/sites/default/files/styles/style_400x400/public/ngan_keo_do_trang_suc_bv_2.0_1.jpg' },
];

async function main() {
    let updated = 0, notFound = 0;
    for (const p of IMAGES) {
        const product = await prisma.product.findFirst({ where: { name: p.name } });
        if (!product) { notFound++; console.log(`  ❌ ${p.name}`); continue; }
        await prisma.product.update({ where: { id: product.id }, data: { image: p.image } });
        updated++;
        console.log(`  ✅ ${p.name}`);
    }
    console.log(`\n🎯 Done: ${updated} updated, ${notFound} not found`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
