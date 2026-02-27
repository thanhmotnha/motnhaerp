/**
 * Re-import WorkItemLibrary từ LKS file
 * Xóa data cũ trước, sau đó import lại với column mapping đúng từng sheet
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Parse từng loại sheet
function parseSheet(sheetName, rows) {
    const items = [];
    const cat = sheetName.replace(/^HM\.\s*/i, '').replace(/^Hm\.\s*/i, '').trim();

    // Bỏ qua sheet không có tên item rõ ràng
    const SKIP_SHEETS = ['Chống thấm', 'Chống thấm - phát sinh', 'Đặt hàng LKS', 'Tổng hợp', 'Vật liệu ', 'Đặt hàng', 'KL bổ sung', 'BS đá ốp lát', 'Tổng hợp（Sao chép）'];
    if (SKIP_SHEETS.some(s => cat.includes(s) || sheetName.includes(s))) return items;

    // Tìm header row để xác định cột
    let headerRow = -1;
    let nameCol = -1, unitCol = -1, priceCol = -1, descCol = -1, dimCol = -1;

    for (let i = 0; i < Math.min(rows.length, 8); i++) {
        const row = rows[i];
        const rowStr = row.map(c => String(c).toLowerCase());
        const hasStt = rowStr.some(c => c === 'stt' || c === 'no' || c === 'tt');
        const hasName = rowStr.some(c => c.includes('tên') || c.includes('chi tiết') || c.includes('items') || c.includes('sản phẩm') || c.includes('hạng mục') || c.includes('nội dung'));
        if (hasStt && hasName) {
            headerRow = i;
            // Tìm index từng cột
            row.forEach((h, idx) => {
                const hs = String(h).toLowerCase();
                if (hs.includes('tên') || hs.includes('chi tiết') || hs.includes('item') || hs.includes('sản phẩm') || hs.includes('hạng mục') || hs.includes('nội dung')) nameCol = idx;
                else if (hs.includes('đơn vị') || hs.includes('unit') || hs === 'đvt' || hs === 'm2' || hs === 'cái') unitCol = idx;
                else if (hs.includes('đơn giá') || hs.includes('unit price') || hs.includes('price') || hs.includes('giá')) priceCol = idx;
                else if (hs.includes('ghi chú') || hs.includes('mô tả') || hs.includes('quy cách') || hs.includes('note') || hs.includes('desc') || hs.includes('vật liệu') || hs.includes('loại')) descCol = idx;
                else if (hs.includes('kích thước') || hs.includes('dim')) dimCol = idx;
            });
            break;
        }
    }

    // Nếu không tìm được header, thử fallback
    if (nameCol < 0) {
        // Thử lấy cột 1 (sau STT) nếu có string
        nameCol = 1;
        unitCol = 2;
        priceCol = 4;
        descCol = 5;
    }

    // Parse data rows
    for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const stt = row[0];
        if (typeof stt !== 'number' || stt <= 0) continue; // chỉ lấy row có STT số

        const name = String(row[nameCol] || '').trim();
        if (!name || name.length < 2) continue;
        // Bỏ qua nếu tên là "Tổng cộng", "Cộng" etc
        if (/^(t[oổ]ng|c[oộ]ng|sub)/i.test(name)) continue;

        const unit = String(row[unitCol] || 'cái').trim() || 'cái';
        let unitPrice = 0;
        if (priceCol >= 0 && row[priceCol]) unitPrice = Number(row[priceCol]) || 0;
        // Nếu unitPrice nhỏ hơn 1000, có thể đang là kích thước, skip
        if (unitPrice > 0 && unitPrice < 1000) unitPrice = 0;

        const description = descCol >= 0 ? String(row[descCol] || '').trim() : '';
        const dim = dimCol >= 0 ? String(row[dimCol] || '').trim() : '';
        const finalDesc = [description, dim].filter(Boolean).join(' - ').substring(0, 500);

        // Subcategory: thử lấy từ tên nhóm trong sheet (row có stt là chữ như "I", "II")
        let subcategory = 'Chung';

        items.push({
            name: name.substring(0, 255),
            category: cat,
            subcategory,
            unit: unit.substring(0, 50),
            mainMaterial: unitPrice,
            auxMaterial: 0,
            labor: 0,
            unitPrice,
            description: finalDesc,
            image: '',
        });
    }

    return items;
}

async function main() {
    // Xóa toàn bộ data cũ
    const deleted = await prisma.workItemLibrary.deleteMany({});
    console.log(`🗑️  Đã xóa ${deleted.count} items cũ`);

    const data = require(require('path').join(__dirname, '../lks_data.json'));
    const allItems = [];
    const PROCESS_SHEETS = [
        'HM. Rèm',
        'HM. Điện nước',
        'HM. Trần thạch cao & Trần gỗ nh',
        'HM. PA 1 Sàn gỗ & Ốp Lát',
        'HM. PA 1 Cửa nhôm Kính',
        'HM. Cửa thông phòng',
        'HM. Hệ thống điện',
        'HM. Sơn',
        'HM. Lan can-Mái kính-Mái Kính',
        'HM. Thiết bị vệ sinh',
        'HM. Thiết bị vệ sinh PA2',
        'HM. Vách kính phòng tắm',
        'HM. Điều hoà',
        'HM. Đá ốp lát',
        'HM. Thiết bị khác',
        'HM. Nội Thất Chốt ',
        'HM. Nội thất ',
        'HM. Đồ Rời',
        'HM. Decor',
        'Hm. Phòng thờ',
    ];

    for (const sheetName of PROCESS_SHEETS) {
        const rows = data.data[sheetName];
        if (!rows) { console.log(`  ⚠ Sheet not found: ${sheetName}`); continue; }
        const items = parseSheet(sheetName, rows);
        console.log(`  ${sheetName}: ${items.length} items`);
        allItems.push(...items);
    }

    console.log(`\n📦 Tổng: ${allItems.length} items`);
    const sanitized = allItems.map(item => ({
        name: String(item.name || '').trim().substring(0, 200),
        category: String(item.category || '').trim().substring(0, 100),
        subcategory: String(item.subcategory || 'Chung').trim().substring(0, 100),
        unit: String(item.unit || 'cái').trim().substring(0, 30) || 'cái',
        mainMaterial: isFinite(Number(item.mainMaterial)) ? Number(item.mainMaterial) : 0,
        auxMaterial: 0,
        labor: 0,
        unitPrice: isFinite(Number(item.unitPrice)) ? Number(item.unitPrice) : 0,
        description: String(item.description || '').trim().substring(0, 500),
        image: '',
    }));
    let total = 0;
    let failed = 0;
    for (const item of sanitized) {
        try {
            await prisma.workItemLibrary.create({ data: item });
            total++;
        } catch (e) {
            failed++;
            if (failed <= 3) console.error(`  ❌ "${item.name}":`, e.message.substring(0, 200));
        }
    }
    console.log(`✅ Import ${total} items, lỗi ${failed}`);
    const stats = await prisma.workItemLibrary.groupBy({ by: ['category'], _count: { id: true } });
    stats.sort((a, b) => b._count.id - a._count.id).forEach(s => console.log(`  ${s.category}: ${s._count.id}`));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
