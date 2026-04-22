import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * POST /api/projects/[id]/material-plans/import-dutoan
 *
 * Import file dự toán chuẩn G8/G9 (.xls) — chỉ đọc sheet "Dự thầu" để tạo
 * hạng mục thi công theo dõi tiến độ/budget. KHÔNG import vật tư từ file này
 * (sheet "Tổng hợp VT" chứa hỗn hợp Vật liệu + Nhân công + Máy thi công, không
 * phải danh sách vật tư đặt hàng). Vật tư dùng endpoint /import-excel với file
 * vật tư riêng format 10 cột.
 *
 * Body (multipart):
 *   file       — File .xls/.xlsx
 *   mode       — 'preview' (parse + trả summary) | 'commit' (parse + save DB)
 *   replaceAll — 'true' = xóa MaterialPlan chưa khóa (costType='Thi công') trước khi insert
 *
 * Response (preview): { scheduleItems: [...], summary: {...} }
 * Response (commit):  { imported: { scheduleItems }, summary: {...} }
 */

const toNumber = (v) => {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/[^\d.,-]/g, '').replace(/,/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
};

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** Đọc sheet thành rows[][], tìm header row theo các keyword */
function readSheet(wb, name) {
    const ws = wb.Sheets[name];
    if (!ws) return null;
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
}

/** Tìm row chứa header (có ≥2 keyword) trong 10 row đầu */
function findHeaderRow(rows, keywords) {
    for (let i = 0; i < Math.min(10, rows.length); i++) {
        const joined = rows[i].map(clean).join('|').toLowerCase();
        const hits = keywords.filter(k => joined.includes(k.toLowerCase())).length;
        if (hits >= 2) return i;
    }
    return -1;
}

/** Parse sheet "Dự thầu" → list hạng mục thi công */
function parseDuThau(wb) {
    const rows = readSheet(wb, 'Dự thầu');
    if (!rows) return [];
    const headerRow = findHeaderRow(rows, ['Tên công tác', 'Thành tiền']);
    if (headerRow < 0) return [];

    const headers = rows[headerRow].map(clean);
    const idx = {
        stt: headers.findIndex(h => /^stt$/i.test(h)),
        name: headers.findIndex(h => /tên công tác|tên công việc/i.test(h)),
        unit: headers.findIndex(h => /^đơn vị|^đv/i.test(h)),
        qty: headers.findIndex(h => /khối lượng/i.test(h)),
        price: headers.findIndex(h => /^đơn giá/i.test(h)),
        total: headers.findIndex(h => /thành tiền/i.test(h)),
    };
    if (idx.name < 0) return [];

    let currentSection = '';
    const items = [];
    for (let i = headerRow + 1; i < rows.length; i++) {
        const r = rows[i];
        const stt = clean(r[idx.stt]);
        const name = clean(r[idx.name]);
        if (!name) continue;

        // Section header: STT rỗng và tên viết HOA hoặc chứa "TỔNG"
        if (!stt || !/^\d+$/.test(stt)) {
            if (/^(TỔNG|CỘNG)/i.test(name)) continue;
            // Treat as section marker
            currentSection = name;
            continue;
        }

        const qty = toNumber(r[idx.qty]);
        const unitPrice = toNumber(r[idx.price]);
        const totalAmount = toNumber(r[idx.total]) || (qty * unitPrice);
        if (qty <= 0 && totalAmount <= 0) continue;

        items.push({
            rowIdx: i + 1,
            stt: Number(stt),
            section: currentSection,
            name,
            unit: clean(r[idx.unit]) || 'công',
            quantity: qty,
            unitPrice,
            totalAmount,
        });
    }
    return items;
}

export const POST = withAuth(async (request, { params }, session) => {
    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } });
    if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file');
    const mode = formData.get('mode') || 'preview';
    const replaceAll = formData.get('replaceAll') === 'true';
    if (!file) return NextResponse.json({ error: 'Thiếu file' }, { status: 400 });

    let wb;
    try {
        const buf = Buffer.from(await file.arrayBuffer());
        wb = XLSX.read(buf, { type: 'buffer' });
    } catch (e) {
        return NextResponse.json({ error: 'Không đọc được file: ' + e.message }, { status: 400 });
    }

    const sheetNames = wb.SheetNames;
    if (!sheetNames.includes('Dự thầu')) {
        return NextResponse.json({
            error: 'File không có sheet "Dự thầu". Kiểm tra đây có phải file dự toán G8/G9 không.',
            sheets: sheetNames,
        }, { status: 400 });
    }

    const scheduleItems = parseDuThau(wb);

    const summary = {
        project: project.name,
        scheduleItems: {
            total: scheduleItems.length,
            totalBudget: scheduleItems.reduce((s, it) => s + it.totalAmount, 0),
        },
    };

    if (mode === 'preview') {
        return NextResponse.json({ success: true, summary, scheduleItems });
    }

    // ── COMMIT MODE ──
    const result = await prisma.$transaction(async (tx) => {
        if (replaceAll) {
            // Chỉ xóa hạng mục thi công chưa khóa, giữ nguyên MaterialPlan vật tư (costType='Vật tư')
            await tx.materialPlan.deleteMany({
                where: { projectId, isLocked: false, costType: 'Thi công' },
            });
        }

        let schedCount = 0;
        for (const it of scheduleItems) {
            // Tạo "product ảo" cho hạng mục thi công để lưu vào MaterialPlan với costType='Thi công'
            const code = `HM-${projectId.slice(-6)}-${it.stt}`;
            const product = await tx.product.upsert({
                where: { code },
                update: { name: it.name, unit: it.unit },
                create: {
                    code,
                    name: it.name,
                    unit: it.unit,
                    category: 'Hạng mục thi công',
                    importPrice: 0,
                    supplyType: 'Dịch vụ',
                },
            });
            await tx.materialPlan.create({
                data: {
                    projectId,
                    productId: product.id,
                    quantity: it.quantity,
                    unitPrice: 0, // đơn giá thực tế — user cập nhật sau khi thi công để so chênh lệch
                    budgetUnitPrice: it.unitPrice, // đơn giá dự toán từ Excel
                    totalAmount: it.totalAmount,
                    category: it.section || 'Thi công',
                    wastePercent: 0,
                    notes: `Hạng mục từ Dự thầu — Row ${it.rowIdx}`,
                    status: 'Chưa đặt',
                    costType: 'Thi công',
                    type: 'Chính',
                },
            });
            schedCount++;
        }

        return { scheduleItems: schedCount };
    }, { timeout: 60000 });

    return NextResponse.json({ success: true, summary, imported: result });
});
