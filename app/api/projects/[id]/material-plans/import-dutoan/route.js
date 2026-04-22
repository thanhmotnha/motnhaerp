import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * POST /api/projects/[id]/material-plans/import-dutoan
 *
 * Import file dự toán G8/G9 (.xls) — 1 file sinh 2 phần độc lập:
 *   - "Dự thầu"      → hạng mục thi công (MaterialPlan costType='Thi công')
 *   - "Tổng hợp VT" section VẬT LIỆU → vật tư (MaterialPlan costType='Vật tư')
 *   - "Giá tháng"    → enrich giá + mã chuẩn cho vật tư
 *
 * Vật tư tự match với Product DB (theo code / mã chuẩn / tên). Chưa match → tạo mới.
 *
 * Body (multipart):
 *   file          — File .xls/.xlsx
 *   mode          — 'preview' | 'commit'
 *   replaceAll    — 'true' = xóa MaterialPlan chưa khóa trước khi insert
 *   dupeStrategy  — 'both' (default) | 'schedule' | 'material'
 *                   'schedule': bỏ vật tư trùng tên với hạng mục thi công
 *                   'material': bỏ hạng mục trùng tên với vật tư
 *                   'both': giữ cả 2 (phản ánh BÁN vs MUA)
 *
 * Response (preview): { scheduleItems, materials, duplicates, summary }
 * Response (commit):  { imported: { scheduleItems, materials }, summary }
 */

const toNumber = (v) => {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/[^\d.,-]/g, '').replace(/,/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
};

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

function readSheet(wb, name) {
    const ws = wb.Sheets[name];
    if (!ws) return null;
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
}

function findHeaderRow(rows, keywords) {
    for (let i = 0; i < Math.min(10, rows.length); i++) {
        const joined = rows[i].map(clean).join('|').toLowerCase();
        const hits = keywords.filter(k => joined.includes(k.toLowerCase())).length;
        if (hits >= 2) return i;
    }
    return -1;
}

/** Parse "Giá tháng" → Map<nameLower, {maSo, maChuan, gia, unit}> */
function parseGiaThang(wb) {
    const rows = readSheet(wb, 'Giá tháng');
    if (!rows) return new Map();
    const headerRow = findHeaderRow(rows, ['Mã số', 'Tên vật tư']);
    if (headerRow < 0) return new Map();

    const h = rows[headerRow].map(clean);
    const find = (re) => h.findIndex(x => re.test(x));
    let giaCol = find(/giá sau vat/i);
    if (giaCol < 0) giaCol = find(/giá tháng/i);
    const idx = {
        maSo: find(/mã số/i),
        name: find(/tên vật tư|^tên$/i),
        unit: find(/^đơn vị|^đv/i),
        gia: giaCol,
        maChuan: find(/mã chuẩn/i),
    };
    if (idx.name < 0) return new Map();

    const map = new Map();
    for (let i = headerRow + 1; i < rows.length; i++) {
        const r = rows[i];
        const name = clean(r[idx.name]);
        if (!name) continue;
        const maSo = idx.maSo >= 0 ? clean(r[idx.maSo]) : '';
        const maChuan = idx.maChuan >= 0 ? clean(r[idx.maChuan]) : '';
        if (!maSo && !maChuan) continue;
        map.set(name.toLowerCase(), {
            maSo, maChuan,
            gia: idx.gia >= 0 ? toNumber(r[idx.gia]) : 0,
            unit: idx.unit >= 0 ? clean(r[idx.unit]) : '',
        });
    }
    return map;
}

/** Parse "Dự thầu" → hạng mục thi công */
function parseDuThau(wb) {
    const rows = readSheet(wb, 'Dự thầu');
    if (!rows) return [];
    const headerRow = findHeaderRow(rows, ['Tên công tác', 'Thành tiền']);
    if (headerRow < 0) return [];

    const h = rows[headerRow].map(clean);
    const idx = {
        stt: h.findIndex(x => /^stt$/i.test(x)),
        name: h.findIndex(x => /tên công tác|tên công việc/i.test(x)),
        unit: h.findIndex(x => /^đơn vị|^đv/i.test(x)),
        qty: h.findIndex(x => /khối lượng/i.test(x)),
        price: h.findIndex(x => /^đơn giá/i.test(x)),
        total: h.findIndex(x => /thành tiền/i.test(x)),
    };
    if (idx.name < 0) return [];

    let currentSection = '';
    const items = [];
    for (let i = headerRow + 1; i < rows.length; i++) {
        const r = rows[i];
        const stt = clean(r[idx.stt]);
        const name = clean(r[idx.name]);
        if (!name) continue;
        if (!stt || !/^\d+$/.test(stt)) {
            if (/^(TỔNG|CỘNG)/i.test(name)) continue;
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

/** Parse "Tổng hợp VT" section VẬT LIỆU (bỏ NHÂN CÔNG + MÁY THI CÔNG) */
function parseVatTu(wb, priceMap) {
    const rows = readSheet(wb, 'Tổng hợp VT');
    if (!rows) return [];
    const headerRow = findHeaderRow(rows, ['Tên vật tư', 'Khối lượng']);
    if (headerRow < 0) return [];

    const h = rows[headerRow].map(clean);
    const idx = {
        stt: h.findIndex(x => /^stt$/i.test(x)),
        name: h.findIndex(x => /tên vật tư|^tên$/i.test(x)),
        unit: h.findIndex(x => /^đơn vị|^đv/i.test(x)),
        qty: h.findIndex(x => /khối lượng|số lượng/i.test(x)),
    };
    if (idx.name < 0 || idx.qty < 0) return [];

    // Giới hạn section: tìm "VẬT LIỆU" (start) và section khác (NHÂN CÔNG/MÁY) để dừng
    const ROMAN = /^[IVX]+$/i;
    const SEC_VL = /v[ậa]t li[ệe]u/i;
    const SEC_OTHER = /nh[âa]n c[ôo]ng|m[áa]y thi c[ôo]ng|^m[áa]y$/i;
    let start = -1, end = rows.length;
    for (let i = headerRow + 1; i < rows.length; i++) {
        const stt = clean(rows[i][idx.stt]);
        if (!ROMAN.test(stt)) continue;
        const text = rows[i].slice(idx.stt + 1).map(clean).join(' ').toUpperCase();
        if (start < 0 && SEC_VL.test(text)) start = i;
        else if (start >= 0 && SEC_OTHER.test(text)) { end = i; break; }
    }
    if (start < 0) start = headerRow;

    const items = [];
    for (let i = start + 1; i < end; i++) {
        const r = rows[i];
        const stt = clean(r[idx.stt]);
        const name = clean(r[idx.name]);
        const qty = toNumber(r[idx.qty]);
        if (!name || !/^\d+$/.test(stt) || qty <= 0) continue;
        const info = priceMap.get(name.toLowerCase()) || {};
        items.push({
            rowIdx: i + 1,
            stt: Number(stt),
            name,
            unit: clean(r[idx.unit]) || info.unit || 'cái',
            quantity: qty,
            unitPrice: info.gia || 0,
            maSo: info.maSo || '',
            maChuan: info.maChuan || '',
        });
    }
    return items;
}

/** Match vật tư với Product (theo mã chuẩn → mã số → name) */
async function matchProducts(materials) {
    const codes = [...new Set(materials.flatMap(m => [m.maChuan, m.maSo].filter(Boolean)))];
    const names = [...new Set(materials.map(m => m.name).filter(Boolean))];

    const [byCode, byName] = await Promise.all([
        codes.length > 0
            ? prisma.product.findMany({
                where: { code: { in: codes } },
                select: { id: true, code: true, name: true, unit: true, importPrice: true },
            })
            : [],
        names.length > 0
            ? prisma.product.findMany({
                where: { name: { in: names, mode: 'insensitive' } },
                select: { id: true, code: true, name: true, unit: true, importPrice: true },
            })
            : [],
    ]);

    const codeMap = new Map(byCode.map(p => [p.code, p]));
    const nameMap = new Map(byName.map(p => [p.name.toLowerCase(), p]));

    return materials.map(m => ({
        ...m,
        matchedProduct: codeMap.get(m.maChuan) || codeMap.get(m.maSo) || nameMap.get(m.name.toLowerCase()) || null,
    }));
}

async function nextProductCode(tx) {
    const res = await tx.$queryRawUnsafe(
        `SELECT COALESCE(MAX(CAST(REPLACE(code, $1, '') AS INTEGER)), 0) as max_num
         FROM "Product" WHERE code LIKE $2 AND REPLACE(code, $1, '') ~ '^[0-9]+$'`,
        'SP', 'SP%'
    );
    return `SP${String(Number(res?.[0]?.max_num ?? 0) + 1).padStart(3, '0')}`;
}

export const POST = withAuth(async (request, { params }) => {
    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } });
    if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file');
    const mode = formData.get('mode') || 'preview';
    const replaceAll = formData.get('replaceAll') === 'true';
    const dupeStrategy = formData.get('dupeStrategy') || 'both'; // both | schedule | material
    if (!file) return NextResponse.json({ error: 'Thiếu file' }, { status: 400 });

    let wb;
    try {
        const buf = Buffer.from(await file.arrayBuffer());
        wb = XLSX.read(buf, { type: 'buffer' });
    } catch (e) {
        return NextResponse.json({ error: 'Không đọc được file: ' + e.message }, { status: 400 });
    }

    if (!wb.SheetNames.includes('Dự thầu') && !wb.SheetNames.includes('Tổng hợp VT')) {
        return NextResponse.json({
            error: 'File không có sheet "Dự thầu" hoặc "Tổng hợp VT". Kiểm tra đây có phải file dự toán G8/G9 không.',
            sheets: wb.SheetNames,
        }, { status: 400 });
    }

    const priceMap = parseGiaThang(wb);
    const scheduleItems = parseDuThau(wb);
    const rawMaterials = parseVatTu(wb, priceMap);
    const materials = await matchProducts(rawMaterials);

    // Tính duplicates: item name trùng giữa scheduleItems và materials (case-insensitive)
    const scheduleNames = new Set(scheduleItems.map(s => s.name.toLowerCase()));
    const materialNames = new Set(materials.map(m => m.name.toLowerCase()));
    const dupeNames = [...materialNames].filter(n => scheduleNames.has(n));
    const duplicates = dupeNames.map(n => {
        const sched = scheduleItems.find(s => s.name.toLowerCase() === n);
        const mat = materials.find(m => m.name.toLowerCase() === n);
        return {
            name: sched?.name || mat?.name,
            schedule: sched ? { stt: sched.stt, quantity: sched.quantity, unitPrice: sched.unitPrice, totalAmount: sched.totalAmount } : null,
            material: mat ? { stt: mat.stt, quantity: mat.quantity, unitPrice: mat.unitPrice, matched: !!mat.matchedProduct, productCode: mat.matchedProduct?.code || null } : null,
        };
    });

    const summary = {
        project: project.name,
        scheduleItems: {
            total: scheduleItems.length,
            totalBudget: scheduleItems.reduce((s, it) => s + it.totalAmount, 0),
        },
        materials: {
            total: materials.length,
            matched: materials.filter(m => m.matchedProduct).length,
            newToCreate: materials.filter(m => !m.matchedProduct).length,
            totalValue: materials.reduce((s, m) => s + m.quantity * m.unitPrice, 0),
        },
        duplicates: duplicates.length,
    };

    if (mode === 'preview') {
        return NextResponse.json({ success: true, summary, scheduleItems, materials, duplicates });
    }

    // ── COMMIT MODE ──
    const dupeLower = new Set(dupeNames);
    const finalScheduleItems = dupeStrategy === 'material'
        ? scheduleItems.filter(s => !dupeLower.has(s.name.toLowerCase()))
        : scheduleItems;
    const finalMaterials = dupeStrategy === 'schedule'
        ? materials.filter(m => !dupeLower.has(m.name.toLowerCase()))
        : materials;

    const result = await prisma.$transaction(async (tx) => {
        if (replaceAll) {
            await tx.materialPlan.deleteMany({
                where: { projectId, isLocked: false, costType: { in: ['Thi công', 'Vật tư'] } },
            });
        }

        // Hạng mục thi công
        let schedCount = 0;
        for (const it of finalScheduleItems) {
            const code = `HM-${projectId.slice(-6)}-${it.stt}`;
            const product = await tx.product.upsert({
                where: { code },
                update: { name: it.name, unit: it.unit },
                create: {
                    code, name: it.name, unit: it.unit,
                    category: 'Hạng mục thi công',
                    importPrice: 0,
                    supplyType: 'Dịch vụ',
                },
            });
            await tx.materialPlan.create({
                data: {
                    projectId, productId: product.id,
                    quantity: it.quantity,
                    unitPrice: 0,
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

        // Vật tư — match Product hoặc tạo mới
        let matCount = 0;
        for (const m of finalMaterials) {
            let product = m.matchedProduct;
            if (!product) {
                const code = m.maChuan || m.maSo || await nextProductCode(tx);
                product = await tx.product.upsert({
                    where: { code },
                    update: {},
                    create: {
                        code, name: m.name, unit: m.unit,
                        category: 'Vật tư xây dựng',
                        importPrice: m.unitPrice,
                    },
                });
            }
            await tx.materialPlan.create({
                data: {
                    projectId, productId: product.id,
                    quantity: m.quantity,
                    unitPrice: m.unitPrice,
                    budgetUnitPrice: m.unitPrice,
                    totalAmount: m.quantity * m.unitPrice,
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

        return { scheduleItems: schedCount, materials: matCount };
    }, { timeout: 90000 });

    return NextResponse.json({ success: true, summary, imported: result });
});
