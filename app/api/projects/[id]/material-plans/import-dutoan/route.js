import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * POST /api/projects/[id]/material-plans/import-dutoan
 *
 * Import file dự toán chuẩn G8/G9 (.xls) có 55 sheets. Chỉ đọc 3 sheet:
 *   - "Dự thầu"      → hạng mục thi công (costType='Thi công')
 *   - "Tổng hợp VT"  → vật tư cần mua    (costType='Vật tư')
 *   - "Giá tháng"    → map tên vật tư → Mã chuẩn + Giá sau VAT
 *
 * Body (multipart):
 *   file       — File .xls/.xlsx
 *   mode       — 'preview' (parse + trả summary) | 'commit' (parse + save DB)
 *   replaceAll — 'true' = xóa MaterialPlan chưa khóa trước khi insert
 *
 * Response (preview): { materials: [...], scheduleItems: [...], summary: {...} }
 * Response (commit):  { imported: { materials, scheduleItems }, summary: {...} }
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

/** Parse sheet "Giá tháng" → map { nameLower: { maSo, maChuan, giaThang, unit } } */
function parseGiaThang(wb) {
    const rows = readSheet(wb, 'Giá tháng');
    if (!rows) return new Map();
    const headerRow = findHeaderRow(rows, ['Mã số', 'Tên vật tư', 'Mã chuẩn']);
    if (headerRow < 0) return new Map();

    const headers = rows[headerRow].map(clean);
    let giaCol = headers.findIndex(h => /giá sau vat/i.test(h));
    if (giaCol < 0) giaCol = headers.findIndex(h => /giá tháng/i.test(h));
    const idx = {
        maSo: headers.findIndex(h => /mã số/i.test(h)),
        name: headers.findIndex(h => /tên vật tư|tên$/i.test(h)),
        unit: headers.findIndex(h => /^đơn vị|^đv/i.test(h)),
        giaThang: giaCol,
        maChuan: headers.findIndex(h => /mã chuẩn/i.test(h)),
    };
    if (idx.name < 0) return new Map();

    const map = new Map();
    for (let i = headerRow + 1; i < rows.length; i++) {
        const r = rows[i];
        const name = clean(r[idx.name]);
        if (!name) continue;
        const maSo = clean(r[idx.maSo]);
        const maChuan = clean(r[idx.maChuan]);
        const giaThang = toNumber(r[idx.giaThang]);
        const unit = clean(r[idx.unit]);
        if (!maSo && !maChuan) continue; // skip section rows
        map.set(name.toLowerCase(), { maSo, maChuan, giaThang, unit, name });
    }
    return map;
}

/** Parse sheet "Tổng hợp VT" → list vật tư */
function parseTongHopVT(wb, priceMap) {
    const rows = readSheet(wb, 'Tổng hợp VT');
    if (!rows) return [];
    const headerRow = findHeaderRow(rows, ['Tên vật tư', 'Khối lượng']);
    if (headerRow < 0) return [];

    const headers = rows[headerRow].map(clean);
    const idx = {
        stt: headers.findIndex(h => /^stt$/i.test(h)),
        name: headers.findIndex(h => /tên vật tư|tên$/i.test(h)),
        unit: headers.findIndex(h => /^đơn vị|^đv/i.test(h)),
        qty: headers.findIndex(h => /khối lượng|số lượng/i.test(h)),
    };
    if (idx.name < 0 || idx.qty < 0) return [];

    const items = [];
    for (let i = headerRow + 1; i < rows.length; i++) {
        const r = rows[i];
        const stt = clean(r[idx.stt]);
        const name = clean(r[idx.name]);
        const qty = toNumber(r[idx.qty]);
        // Skip section rows: STT is roman (I, II) or empty with no qty
        if (!name) continue;
        if (!/^\d+$/.test(stt)) continue; // only numeric STT = data row
        if (qty <= 0) continue;

        const priceInfo = priceMap.get(name.toLowerCase()) || {};
        items.push({
            rowIdx: i + 1,
            stt: Number(stt),
            name,
            unit: clean(r[idx.unit]) || priceInfo.unit || 'cái',
            quantity: qty,
            unitPrice: priceInfo.giaThang || 0,
            maSo: priceInfo.maSo || '',
            maChuan: priceInfo.maChuan || '',
        });
    }
    return items;
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

/** Match vật tư với Product có sẵn */
async function matchProducts(materials) {
    const codes = [...new Set(materials.flatMap(m => [m.maSo, m.maChuan].filter(Boolean)))];
    const names = [...new Set(materials.map(m => m.name).filter(Boolean))];

    const byCode = codes.length > 0
        ? await prisma.product.findMany({
            where: { code: { in: codes } },
            select: { id: true, code: true, name: true, unit: true, importPrice: true },
        })
        : [];
    const byName = names.length > 0
        ? await prisma.product.findMany({
            where: { name: { in: names, mode: 'insensitive' } },
            select: { id: true, code: true, name: true, unit: true, importPrice: true },
        })
        : [];

    const codeMap = new Map(byCode.map(p => [p.code, p]));
    const nameMap = new Map(byName.map(p => [p.name.toLowerCase(), p]));

    return materials.map(m => {
        const matched = codeMap.get(m.maChuan) || codeMap.get(m.maSo) || nameMap.get(m.name.toLowerCase()) || null;
        return { ...m, matchedProduct: matched };
    });
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
    const hasDuThau = sheetNames.includes('Dự thầu');
    const hasTongHopVT = sheetNames.includes('Tổng hợp VT');
    if (!hasDuThau && !hasTongHopVT) {
        return NextResponse.json({
            error: 'File không có sheet "Dự thầu" hoặc "Tổng hợp VT". Kiểm tra đây có phải file dự toán G8/G9 không.',
            sheets: sheetNames,
        }, { status: 400 });
    }

    const priceMap = parseGiaThang(wb);
    const rawMaterials = hasTongHopVT ? parseTongHopVT(wb, priceMap) : [];
    const scheduleItems = hasDuThau ? parseDuThau(wb) : [];
    const materials = await matchProducts(rawMaterials);

    const summary = {
        project: project.name,
        sheets: { duThau: hasDuThau, tongHopVT: hasTongHopVT, giaThang: priceMap.size > 0 },
        materials: {
            total: materials.length,
            matched: materials.filter(m => m.matchedProduct).length,
            new: materials.filter(m => !m.matchedProduct).length,
            totalValue: materials.reduce((s, m) => s + m.quantity * m.unitPrice, 0),
        },
        scheduleItems: {
            total: scheduleItems.length,
            totalValue: scheduleItems.reduce((s, it) => s + it.totalAmount, 0),
        },
    };

    if (mode === 'preview') {
        return NextResponse.json({ success: true, summary, materials, scheduleItems });
    }

    // ── COMMIT MODE ──
    const result = await prisma.$transaction(async (tx) => {
        if (replaceAll) {
            await tx.materialPlan.deleteMany({
                where: { projectId, isLocked: false },
            });
        }

        let matCount = 0;
        for (const m of materials) {
            let product = m.matchedProduct;
            if (!product) {
                const code = m.maChuan || m.maSo || await nextProductCode(tx);
                product = await tx.product.upsert({
                    where: { code },
                    update: {},
                    create: {
                        code,
                        name: m.name,
                        unit: m.unit,
                        category: 'Vật tư xây dựng',
                        importPrice: m.unitPrice,
                    },
                });
            }
            const totalAmount = m.quantity * m.unitPrice;
            await tx.materialPlan.create({
                data: {
                    projectId,
                    productId: product.id,
                    quantity: m.quantity,
                    unitPrice: m.unitPrice,
                    budgetUnitPrice: m.unitPrice,
                    totalAmount,
                    category: '',
                    wastePercent: 5,
                    notes: m.maChuan ? `Mã chuẩn: ${m.maChuan}` : (m.maSo ? `Mã số: ${m.maSo}` : ''),
                    status: 'Chưa đặt',
                    costType: 'Vật tư',
                    type: 'Chính',
                },
            });
            matCount++;
        }

        let schedCount = 0;
        for (const it of scheduleItems) {
            // Tạo "product ảo" cho hạng mục thi công để lưu vào MaterialPlan với costType='Thi công'
            const code = `HM-${projectId.slice(-6)}-${it.stt}`;
            const product = await tx.product.upsert({
                where: { code },
                update: { name: it.name, unit: it.unit, importPrice: it.unitPrice },
                create: {
                    code,
                    name: it.name,
                    unit: it.unit,
                    category: 'Hạng mục thi công',
                    importPrice: it.unitPrice,
                    supplyType: 'Dịch vụ',
                },
            });
            await tx.materialPlan.create({
                data: {
                    projectId,
                    productId: product.id,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    budgetUnitPrice: it.unitPrice,
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

        return { materials: matCount, scheduleItems: schedCount };
    }, { timeout: 60000 });

    return NextResponse.json({ success: true, summary, imported: result });
});

async function nextProductCode(tx) {
    const maxResult = await tx.$queryRawUnsafe(
        `SELECT COALESCE(MAX(CAST(REPLACE(code, $1, '') AS INTEGER)), 0) as max_num
         FROM "Product" WHERE code LIKE $2 AND REPLACE(code, $1, '') ~ '^[0-9]+$'`,
        'SP', 'SP%'
    );
    const nextNum = Number(maxResult?.[0]?.max_num ?? 0) + 1;
    return `SP${String(nextNum).padStart(3, '0')}`;
}
