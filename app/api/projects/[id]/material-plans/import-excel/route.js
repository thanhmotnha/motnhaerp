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

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (rows.length === 0) return NextResponse.json({ error: 'File trống' }, { status: 400 });

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

    const parsed = rows.map((row, idx) => {
        const code = String(pick(row, ['mã', 'mã sp', 'ma', 'code', 'product code'])).trim();
        const name = String(pick(row, ['tên vật tư', 'tên', 'ten', 'name', 'mô tả', 'description'])).trim();
        const unit = String(pick(row, ['đơn vị', 'don vi', 'unit', 'đvt', 'dvt'])).trim() || 'cái';
        const quantity = toNumber(pick(row, ['số lượng', 'so luong', 'qty', 'quantity', 'sl']));
        const unitPrice = toNumber(pick(row, ['đơn giá', 'don gia', 'unit price', 'dg', 'đơn giá dự toán']));
        const totalAmount = toNumber(pick(row, ['thành tiền', 'thanh tien', 'total', 'thành tiền dự toán']));
        const category = String(pick(row, ['nhóm', 'nhom', 'category', 'loại', 'loai'])).trim();
        const wastePercent = toNumber(pick(row, ['hao phí', 'hao phi', 'waste', 'hao phí %'])) || 5;
        const notes = String(pick(row, ['ghi chú', 'ghi chu', 'notes', 'note'])).trim();

        return { idx: idx + 2, code, name, unit, quantity, unitPrice, totalAmount, category, wastePercent, notes };
    });

    const errors = [];
    const valid = [];
    for (const row of parsed) {
        if (!row.name || row.quantity <= 0) {
            errors.push(`Dòng ${row.idx}: thiếu tên vật tư hoặc số lượng`);
            continue;
        }
        valid.push(row);
    }
    if (valid.length === 0) {
        return NextResponse.json({ error: 'Không có dòng hợp lệ', details: errors }, { status: 400 });
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
