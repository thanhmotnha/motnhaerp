import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * POST /api/projects/[id]/material-plans/import-excel
 * Body: multipart/form-data với field 'file' (.xlsx / .xls / .csv)
 *
 * Excel columns (khớp theo tên, case-insensitive):
 *  - STT (optional)
 *  - Mã SP / Code (optional — dùng match với Product có sẵn)
 *  - Tên vật tư / Description *
 *  - Đơn vị / Unit
 *  - Số lượng / Qty *
 *  - Đơn giá dự toán / Unit Price (optional)
 *  - Thành tiền / Total (optional — tự tính nếu thiếu)
 *  - Nhóm / Category (optional)
 *  - Hao phí % / Waste (default 5)
 *  - Ghi chú / Notes
 *
 * Skip nếu thiếu Tên hoặc Số lượng. Tạo Product ngắn gọn nếu chưa tồn tại.
 */
export const POST = withAuth(async (request, { params }, session) => {
    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'Thiếu file' }, { status: 400 });

    const replaceAll = formData.get('replaceAll') === 'true';

    const buf = Buffer.from(await file.arrayBuffer());
    let workbook;
    try {
        workbook = XLSX.read(buf, { type: 'buffer' });
    } catch (e) {
        return NextResponse.json({ error: 'Không đọc được file: ' + e.message }, { status: 400 });
    }

    // Auto-detect format: nếu có sheet "Tổng hợp VT" → file dự toán G8/G9 → parse section VẬT LIỆU
    // Ngược lại → flat format (sheet đầu tiên)
    const hasG8G9 = workbook.SheetNames.includes('Tổng hợp VT');
    const sheet = hasG8G9 ? workbook.Sheets['Tổng hợp VT'] : workbook.Sheets[workbook.SheetNames[0]];

    // Load price map từ "Giá tháng" nếu có (file G8/G9) để auto-fill đơn giá
    const priceMap = new Map();
    if (hasG8G9 && workbook.SheetNames.includes('Giá tháng')) {
        const gtRows = XLSX.utils.sheet_to_json(workbook.Sheets['Giá tháng'], { header: 1, defval: '' });
        let gtHdr = -1;
        for (let i = 0; i < Math.min(10, gtRows.length); i++) {
            const joined = gtRows[i].map(c => String(c || '').toLowerCase()).join('|');
            if (joined.includes('mã chuẩn') || joined.includes('mã số')) { gtHdr = i; break; }
        }
        if (gtHdr >= 0) {
            const h = gtRows[gtHdr].map(c => String(c || '').trim());
            const findCol = (regex) => h.findIndex(x => regex.test(x));
            const nameCol = findCol(/tên vật tư|^tên$/i);
            const maSoCol = findCol(/mã số/i);
            const maChuanCol = findCol(/mã chuẩn/i);
            let giaCol = findCol(/giá sau vat/i);
            if (giaCol < 0) giaCol = findCol(/giá tháng/i);
            if (nameCol >= 0) {
                for (let i = gtHdr + 1; i < gtRows.length; i++) {
                    const r = gtRows[i];
                    const name = String(r[nameCol] || '').replace(/\s+/g, ' ').trim();
                    if (!name) continue;
                    const maSo = maSoCol >= 0 ? String(r[maSoCol] || '').trim() : '';
                    const maChuan = maChuanCol >= 0 ? String(r[maChuanCol] || '').trim() : '';
                    if (!maSo && !maChuan) continue;
                    const gia = giaCol >= 0 ? Number(r[giaCol]) || 0 : 0;
                    priceMap.set(name.toLowerCase(), { maSo, maChuan, gia });
                }
            }
        }
    }

    // Auto-detect header row: tìm row trong 10 row đầu có "tên vật tư"/"tên"/"name"
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (raw.length === 0) return NextResponse.json({ error: 'File trống' }, { status: 400 });
    const NAME_ALIASES = ['tên vật tư', 'tên', 'ten', 'ten vat tu', 'name', 'mô tả', 'mo ta', 'description', 'sản phẩm', 'san pham'];
    let headerIdx = -1;
    for (let i = 0; i < Math.min(10, raw.length); i++) {
        const cells = raw[i].map(c => String(c || '').toLowerCase().trim());
        if (cells.some(c => NAME_ALIASES.includes(c))) { headerIdx = i; break; }
    }
    if (headerIdx < 0) {
        const firstRowCells = raw[0].map(c => String(c || '').trim()).filter(Boolean);
        return NextResponse.json({
            error: 'Không tìm thấy cột "Tên vật tư" trong file. Cần có 1 cột với header là một trong: Tên vật tư, Tên, Name, Mô tả, Sản phẩm.',
            details: [
                'Header file của bạn: ' + (firstRowCells.length ? firstRowCells.join(' | ') : '(trống)'),
                'Tải "📥 File mẫu" ở trên bảng để xem format chuẩn.',
            ],
        }, { status: 400 });
    }

    // Convert to object array với header row đã detect
    const headers = raw[headerIdx].map(c => String(c || '').trim());

    // Với G8/G9: giới hạn row trong section "VẬT LIỆU" (skip NHÂN CÔNG + MÁY THI CÔNG)
    let sliceStart = headerIdx + 1;
    let sliceEnd = raw.length;
    if (hasG8G9) {
        const ROMAN = /^[IVX]+$/i;
        const SECTION_VATLIEU = /v[ậa]t li[ệe]u/i;
        const SECTION_OTHER = /nh[âa]n c[ôo]ng|m[áa]y thi c[ôo]ng|^m[áa]y$/i;
        let vatLieuStart = -1;
        for (let i = headerIdx + 1; i < raw.length; i++) {
            const r = raw[i];
            const stt = String(r[0] || '').trim();
            if (!ROMAN.test(stt)) continue;
            const text = r.slice(1).map(c => String(c || '').trim()).join(' ').toUpperCase();
            if (vatLieuStart < 0 && SECTION_VATLIEU.test(text)) vatLieuStart = i;
            else if (vatLieuStart >= 0 && SECTION_OTHER.test(text)) { sliceEnd = i; break; }
        }
        if (vatLieuStart >= 0) sliceStart = vatLieuStart + 1;
    }

    const rows = raw.slice(sliceStart, sliceEnd).map((row, k) => {
        const obj = { __rowNum: sliceStart + k };
        headers.forEach((h, j) => { if (h) obj[h] = row[j] ?? ''; });
        return obj;
    }).filter(r => {
        const stt = r['STT'] !== undefined ? String(r['STT']).trim() : '';
        // G8/G9: chỉ giữ row STT số (bỏ section header / tổng)
        if (hasG8G9 && !/^\d+$/.test(stt)) return false;
        return Object.keys(r).some(k => k !== '__rowNum' && r[k] !== '' && r[k] != null);
    });

    if (rows.length === 0) return NextResponse.json({ error: 'File không có dòng data sau header' }, { status: 400 });

    // Map column aliases → canonical keys
    function pick(row, aliases) {
        for (const a of aliases) {
            const keys = Object.keys(row);
            const k = keys.find(key => key.toLowerCase().trim() === a.toLowerCase());
            if (k && row[k] !== '' && row[k] != null) return row[k];
        }
        return '';
    }

    const toNumber = v => {
        if (v == null || v === '') return 0;
        if (typeof v === 'number') return v;
        const s = String(v).replace(/[^\d.,-]/g, '').replace(/,/g, '');
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    };

    const parsed = rows.map((row) => {
        let code = String(pick(row, ['mã', 'mã sp', 'ma', 'code', 'product code', 'mã số'])).trim();
        const name = String(pick(row, ['tên vật tư', 'tên', 'ten', 'name', 'mô tả', 'description'])).trim();
        // G8/G9: "khối lượng" = số lượng
        const unit = String(pick(row, ['đơn vị', 'don vi', 'unit', 'đvt', 'dvt'])).trim() || 'cái';
        const quantity = toNumber(pick(row, ['số lượng', 'so luong', 'qty', 'quantity', 'sl', 'khối lượng', 'khoi luong']));
        let unitPrice = toNumber(pick(row, ['đơn giá', 'don gia', 'unit price', 'dg', 'đơn giá dự toán']));
        const totalAmount = toNumber(pick(row, ['thành tiền', 'thanh tien', 'total', 'thành tiền dự toán']));
        const category = String(pick(row, ['nhóm', 'nhom', 'category', 'loại', 'loai'])).trim();
        const wastePercent = toNumber(pick(row, ['hao phí', 'hao phi', 'waste', 'hao phí %'])) || 5;
        const notes = String(pick(row, ['ghi chú', 'ghi chu', 'notes', 'note'])).trim();

        // G8/G9: tra priceMap theo tên → auto-fill đơn giá + mã chuẩn làm code
        if (hasG8G9 && priceMap.size > 0) {
            const info = priceMap.get(name.toLowerCase());
            if (info) {
                if (!unitPrice && info.gia) unitPrice = info.gia;
                if (!code) code = info.maChuan || info.maSo || '';
            }
        }

        return { idx: (row.__rowNum ?? 0) + 1, code, name, unit, quantity, unitPrice, totalAmount, category, wastePercent, notes };
    });

    const errors = [];
    const valid = [];
    for (const row of parsed) {
        if (!row.name) {
            errors.push(`Dòng ${row.idx}: thiếu tên vật tư (cột "Tên vật tư")`);
            continue;
        }
        if (row.quantity <= 0) {
            errors.push(`Dòng ${row.idx}: "${row.name}" — thiếu hoặc sai số lượng (cột "Số lượng")`);
            continue;
        }
        valid.push(row);
    }
    if (valid.length === 0) {
        return NextResponse.json({
            error: `Không có dòng hợp lệ trong ${parsed.length} dòng đọc được. Kiểm tra header: cần cột "Tên vật tư" + "Số lượng" > 0.`,
            details: errors.slice(0, 10),
            headerFound: headers.filter(Boolean).join(' | '),
        }, { status: 400 });
    }

    // Create/lookup products + create MaterialPlan
    const result = await prisma.$transaction(async (tx) => {
        if (replaceAll) {
            await tx.materialPlan.deleteMany({
                where: { projectId, isLocked: false },
            });
        }

        let created = 0;
        for (const row of valid) {
            // Find or create product
            let product = null;
            if (row.code) {
                product = await tx.product.findUnique({ where: { code: row.code } });
            }
            if (!product) {
                product = await tx.product.findFirst({
                    where: { name: { equals: row.name, mode: 'insensitive' } },
                });
            }
            if (!product) {
                // Auto-create lightweight product
                const nextCode = await (async () => {
                    const maxResult = await tx.$queryRawUnsafe(
                        `SELECT COALESCE(MAX(CAST(REPLACE(code, $1, '') AS INTEGER)), 0) as max_num
                         FROM "Product" WHERE code LIKE $2 AND REPLACE(code, $1, '') ~ '^[0-9]+$'`,
                        'SP', 'SP%'
                    );
                    const nextNum = Number(maxResult?.[0]?.max_num ?? 0) + 1;
                    return `SP${String(nextNum).padStart(3, '0')}`;
                })();
                product = await tx.product.create({
                    data: {
                        code: nextCode,
                        name: row.name,
                        unit: row.unit,
                        category: row.category || 'Vật tư xây dựng',
                        importPrice: row.unitPrice,
                    },
                });
            }

            const totalAmount = row.totalAmount || (row.quantity * row.unitPrice);
            await tx.materialPlan.create({
                data: {
                    projectId,
                    productId: product.id,
                    quantity: row.quantity,
                    unitPrice: row.unitPrice,
                    budgetUnitPrice: row.unitPrice,
                    totalAmount,
                    category: row.category,
                    wastePercent: row.wastePercent,
                    notes: row.notes,
                    status: 'Chưa đặt',
                    costType: 'Vật tư',
                    type: 'Chính',
                },
            });
            created++;
        }

        return { created };
    });

    return NextResponse.json({
        imported: result.created,
        total: rows.length,
        errors,
        success: true,
    });
});
