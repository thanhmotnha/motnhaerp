import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * POST /api/service-debts/import-excel
 * Body: multipart/form-data với field 'file' (.xlsx / .xls)
 *
 * Excel columns (tên cột khớp case-insensitive, hỗ trợ alias):
 *  - Loại dịch vụ / Category                         *
 *  - Loại bên / Recipient type  (NCC | Thầu phụ)     *
 *  - Tên NCC/Thầu phụ / Recipient name               *
 *  - Số tiền / Amount                                *
 *  - Ngày / Date                                     (optional, default now)
 *  - Số hóa đơn / Invoice                            (optional)
 *  - Ghi chú / Notes                                 (optional)
 *  - Mã dự án 1 / Project 1       + Tỷ lệ 1 / Ratio 1 %
 *  - Mã dự án 2 / Project 2       + Tỷ lệ 2 / Ratio 2 %
 *  - ... tối đa đến 5 dự án
 *
 * Tạo SupplierDebt (NCC) hoặc ContractorDebt (Thầu phụ) với allocationPlan.
 * KHÔNG sinh ProjectExpense — chi phí chỉ phát sinh khi thanh toán (cash basis).
 *
 * Response: { imported, total, errors: string[] }
 */

const VALID_CATEGORIES = ['Thiết kế công năng', 'Thiết kế KT-KC', 'Thiết kế 3D', 'Tư vấn thuê ngoài'];

function pick(row, aliases) {
    const keys = Object.keys(row);
    for (const a of aliases) {
        const k = keys.find(key => key.toLowerCase().trim() === a.toLowerCase().trim());
        if (k && row[k] !== '' && row[k] != null) return row[k];
    }
    return '';
}

function toNumber(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/[^\d.,-]/g, '').replace(/,/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

function toStr(v) {
    if (v == null) return '';
    return String(v).trim();
}

function parseDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v) ? null : v;
    // Excel serial date
    if (typeof v === 'number') {
        const d = XLSX.SSF?.parse_date_code
            ? (() => {
                const p = XLSX.SSF.parse_date_code(v);
                if (!p) return null;
                return new Date(Date.UTC(p.y, p.m - 1, p.d, p.H || 0, p.M || 0, p.S || 0));
            })()
            : null;
        if (d) return d;
    }
    const s = String(v).trim();
    if (!s) return null;
    // dd/mm/yyyy
    const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) {
        const dd = parseInt(m[1], 10);
        const mm = parseInt(m[2], 10);
        let yy = parseInt(m[3], 10);
        if (yy < 100) yy += 2000;
        const d = new Date(yy, mm - 1, dd);
        return isNaN(d) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d) ? null : d;
}

function normalizeRecipientType(v) {
    const s = toStr(v).toLowerCase();
    if (!s) return '';
    if (s === 'ncc' || s.includes('nhà cung') || s.includes('nha cung') || s.includes('supplier')) return 'NCC';
    if (s.includes('thầu') || s.includes('thau') || s.includes('contractor')) return 'Thầu phụ';
    return '';
}

function normalizeCategory(v) {
    const s = toStr(v);
    if (!s) return '';
    const found = VALID_CATEGORIES.find(c => c.toLowerCase() === s.toLowerCase());
    return found || s;
}

export const POST = withAuth(async (request, _ctx, session) => {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'Thiếu file' }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    let workbook;
    try {
        workbook = XLSX.read(buf, { type: 'buffer', cellDates: true });
    } catch (e) {
        return NextResponse.json({ error: 'Không đọc được file: ' + e.message }, { status: 400 });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return NextResponse.json({ error: 'Không tìm thấy sheet nào trong file' }, { status: 400 });

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (rows.length === 0) return NextResponse.json({ error: 'File trống' }, { status: 400 });

    // Pre-load supplier + contractor + project maps for fast lookup (case-insensitive)
    const [suppliers, contractors, projects] = await Promise.all([
        prisma.supplier.findMany({ select: { id: true, name: true } }),
        prisma.contractor.findMany({ select: { id: true, name: true } }),
        prisma.project.findMany({
            where: { deletedAt: null },
            select: { id: true, code: true, name: true },
        }),
    ]);
    const supplierByName = new Map(suppliers.map(s => [s.name.trim().toLowerCase(), s]));
    const contractorByName = new Map(contractors.map(c => [c.name.trim().toLowerCase(), c]));
    const projectByCode = new Map(projects.map(p => [p.code.trim().toLowerCase(), p]));
    const projectById = new Map(projects.map(p => [p.id, p]));

    const errors = [];
    const valid = []; // { idx, recipientType, recipientId, recipientName, category, amount, date, invoiceNo, notes, allocations }

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2: header row = 1, 0-index offset

        const category = normalizeCategory(pick(row, ['Loại dịch vụ', 'Loai dich vu', 'Category']));
        const recipientTypeRaw = pick(row, ['Loại bên', 'Loai ben', 'Recipient type', 'Loại đối tác']);
        const recipientType = normalizeRecipientType(recipientTypeRaw);
        const recipientName = toStr(pick(row, ['Tên NCC/Thầu phụ', 'Ten NCC/Thau phu', 'Tên NCC', 'Tên Thầu phụ', 'Recipient name', 'Recipient']));
        const amount = toNumber(pick(row, ['Số tiền', 'So tien', 'Amount']));
        const dateRaw = pick(row, ['Ngày', 'Ngay', 'Date']);
        const invoiceNo = toStr(pick(row, ['Số hóa đơn', 'So hoa don', 'Invoice', 'Invoice No']));
        const notes = toStr(pick(row, ['Ghi chú', 'Ghi chu', 'Notes', 'Note']));

        // Skip completely empty row
        const isEmpty = !category && !recipientTypeRaw && !recipientName && !amount;
        if (isEmpty) continue;

        // Validate category
        if (!category) {
            errors.push(`Dòng ${rowNum}: thiếu "Loại dịch vụ"`);
            continue;
        }
        if (!VALID_CATEGORIES.includes(category)) {
            errors.push(`Dòng ${rowNum}: "Loại dịch vụ" không hợp lệ (${category}). Cho phép: ${VALID_CATEGORIES.join(', ')}`);
            continue;
        }
        // Validate recipientType
        if (!recipientType) {
            errors.push(`Dòng ${rowNum}: "Loại bên" phải là "NCC" hoặc "Thầu phụ" (nhận: "${toStr(recipientTypeRaw)}")`);
            continue;
        }
        if (!recipientName) {
            errors.push(`Dòng ${rowNum}: thiếu "Tên NCC/Thầu phụ"`);
            continue;
        }
        // Validate amount
        if (!(amount > 0)) {
            errors.push(`Dòng ${rowNum}: "Số tiền" phải > 0`);
            continue;
        }

        // Match recipient
        const nameKey = recipientName.toLowerCase();
        let recipientId = '';
        if (recipientType === 'NCC') {
            const sup = supplierByName.get(nameKey);
            if (!sup) {
                errors.push(`Dòng ${rowNum}: không tìm thấy NCC "${recipientName}" trong hệ thống`);
                continue;
            }
            recipientId = sup.id;
        } else {
            const con = contractorByName.get(nameKey);
            if (!con) {
                errors.push(`Dòng ${rowNum}: không tìm thấy Thầu phụ "${recipientName}" trong hệ thống`);
                continue;
            }
            recipientId = con.id;
        }

        // Parse allocations (up to 5 projects)
        const allocations = [];
        let allocError = null;
        for (let k = 1; k <= 5; k++) {
            const projCodeRaw = pick(row, [
                `Mã dự án ${k}`, `Ma du an ${k}`, `Project ${k}`, `Project code ${k}`,
                `Dự án ${k}`, `Du an ${k}`,
            ]);
            const ratioRaw = pick(row, [
                `Tỷ lệ ${k} %`, `Tỷ lệ ${k}`, `Ty le ${k} %`, `Ty le ${k}`,
                `Ratio ${k} %`, `Ratio ${k}`,
            ]);
            const projCode = toStr(projCodeRaw);
            const ratioPct = toNumber(ratioRaw);
            if (!projCode && !ratioPct) continue;
            if (!projCode) {
                allocError = `thiếu "Mã dự án ${k}" (đã có tỷ lệ)`;
                break;
            }
            if (!(ratioPct > 0)) {
                allocError = `tỷ lệ dự án ${k} phải > 0`;
                break;
            }
            const proj = projectByCode.get(projCode.toLowerCase());
            if (!proj) {
                allocError = `không tìm thấy dự án mã "${projCode}"`;
                break;
            }
            allocations.push({ projectId: proj.id, ratio: ratioPct / 100, pct: ratioPct });
        }
        if (allocError) {
            errors.push(`Dòng ${rowNum}: ${allocError}`);
            continue;
        }
        if (allocations.length === 0) {
            errors.push(`Dòng ${rowNum}: phải có ít nhất 1 dự án + tỷ lệ phân bổ`);
            continue;
        }
        // Unique projectId
        const idSet = new Set(allocations.map(a => a.projectId));
        if (idSet.size !== allocations.length) {
            errors.push(`Dòng ${rowNum}: mỗi dự án chỉ được xuất hiện 1 lần`);
            continue;
        }
        // Sum check: 100 ± 1
        const sumPct = allocations.reduce((s, a) => s + a.pct, 0);
        if (Math.abs(sumPct - 100) > 1) {
            errors.push(`Dòng ${rowNum}: tổng tỷ lệ phân bổ phải = 100% (hiện ${Math.round(sumPct * 100) / 100}%)`);
            continue;
        }

        const date = parseDate(dateRaw) || new Date();

        valid.push({
            idx: rowNum,
            recipientType,
            recipientId,
            recipientName,
            category,
            amount,
            date,
            invoiceNo,
            notes,
            allocations: allocations.map(a => ({ projectId: a.projectId, ratio: a.ratio })),
        });
    }

    if (valid.length === 0) {
        return NextResponse.json({
            imported: 0,
            total: rows.length,
            errors: errors.length ? errors : ['Không có dòng hợp lệ'],
        }, { status: 400 });
    }

    let imported = 0;
    for (const v of valid) {
        try {
            const description = `${v.category} — ${v.recipientName}`;
            if (v.recipientType === 'NCC') {
                const code = await generateCode('supplierDebt', 'CN');
                await prisma.supplierDebt.create({
                    data: {
                        code,
                        supplierId: v.recipientId,
                        projectId: null,
                        description,
                        totalAmount: v.amount,
                        paidAmount: 0,
                        status: 'open',
                        date: v.date,
                        invoiceNo: v.invoiceNo,
                        notes: v.notes,
                        createdById: session.user.id,
                        serviceCategory: v.category,
                        allocationPlan: v.allocations,
                    },
                });
            } else {
                const code = await generateCode('contractorDebt', 'CNT');
                await prisma.contractorDebt.create({
                    data: {
                        code,
                        contractorId: v.recipientId,
                        projectId: v.allocations[0].projectId,
                        description,
                        totalAmount: v.amount,
                        paidAmount: 0,
                        status: 'open',
                        date: v.date,
                        notes: v.notes,
                        createdById: session.user.id,
                        serviceCategory: v.category,
                        allocationPlan: v.allocations,
                    },
                });
            }
            imported++;
        } catch (e) {
            errors.push(`Dòng ${v.idx}: lỗi khi tạo công nợ (${e.message || 'unknown'})`);
        }
    }

    return NextResponse.json({
        imported,
        total: rows.length,
        errors,
        success: imported > 0,
    });
}, { roles: ['giam_doc', 'ke_toan'] });
