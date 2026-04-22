import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

/**
 * GET /api/service-debts/export
 * Export Excel 2 sheets: "Công nợ dịch vụ" + "Chi phí đã chi".
 *
 * Query params:
 *  - status: 'pending' | 'paid' | 'all' (default 'all')
 *  - from, to: ISO date filter theo debt.date
 */

const STATUS_LABEL = {
    open: 'Còn nợ',
    partial: 'Trả 1 phần',
    paid: 'Đã trả',
};

function parseDateParam(v) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

function fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = dt.getFullYear();
    return `${dd}/${mm}/${yy}`;
}

// Apply number format #,##0 on a specific column letter for all data rows.
function applyNumberFormat(ws, colLetter, rowCount) {
    for (let r = 2; r <= rowCount + 1; r++) {
        const ref = `${colLetter}${r}`;
        const cell = ws[ref];
        if (cell && (cell.t === 'n' || typeof cell.v === 'number')) {
            cell.z = '#,##0';
        }
    }
}

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const from = parseDateParam(searchParams.get('from'));
    const to = parseDateParam(searchParams.get('to'));

    const debtWhere = { allocationPlan: { not: null } };
    if (status === 'pending') debtWhere.status = { in: ['open', 'partial'] };
    else if (status === 'paid') debtWhere.status = 'paid';

    if (from || to) {
        debtWhere.date = {};
        if (from) debtWhere.date.gte = from;
        if (to) debtWhere.date.lte = to;
    }

    const expenseWhere = { expenseType: 'Dịch vụ', deletedAt: null };
    if (from || to) {
        expenseWhere.date = {};
        if (from) expenseWhere.date.gte = from;
        if (to) expenseWhere.date.lte = to;
    }

    const [supplierDebts, contractorDebts, expenses] = await Promise.all([
        prisma.supplierDebt.findMany({
            where: debtWhere,
            include: { supplier: { select: { id: true, name: true } } },
            orderBy: { date: 'desc' },
        }),
        prisma.contractorDebt.findMany({
            where: debtWhere,
            include: { contractor: { select: { id: true, name: true } } },
            orderBy: { date: 'desc' },
        }),
        prisma.projectExpense.findMany({
            where: expenseWhere,
            include: {
                allocations: {
                    include: { project: { select: { id: true, name: true, code: true } } },
                },
            },
            orderBy: { date: 'desc' },
        }),
    ]);

    // Lookup Project names for allocationPlan rendering
    const allPlanProjectIds = new Set();
    for (const d of [...supplierDebts, ...contractorDebts]) {
        const plan = Array.isArray(d.allocationPlan) ? d.allocationPlan : [];
        for (const p of plan) if (p?.projectId) allPlanProjectIds.add(p.projectId);
    }
    const projects = allPlanProjectIds.size
        ? await prisma.project.findMany({
              where: { id: { in: Array.from(allPlanProjectIds) } },
              select: { id: true, name: true, code: true },
          })
        : [];
    const projectMap = new Map(projects.map(p => [p.id, p]));

    function renderAllocationPlan(plan) {
        if (!Array.isArray(plan) || plan.length === 0) return '';
        return plan
            .map(p => {
                const proj = projectMap.get(p.projectId);
                const name = proj?.name || proj?.code || p.projectId;
                const pct = Math.round((Number(p.ratio) || 0) * 100);
                return `${name} (${pct}%)`;
            })
            .join(' · ');
    }

    // ======= Sheet 1: Công nợ dịch vụ =======
    const combinedDebts = [
        ...supplierDebts.map(d => ({ ...d, _type: 'NCC', _name: d.supplier?.name || '' })),
        ...contractorDebts.map(d => ({ ...d, _type: 'Thầu phụ', _name: d.contractor?.name || '' })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const debtRows = combinedDebts.map(d => {
        const total = Number(d.totalAmount) || 0;
        const paid = Number(d.paidAmount) || 0;
        const remaining = total - paid;
        return {
            'Mã': d.code || '',
            'Ngày': fmtDate(d.date),
            'Loại dịch vụ': d.serviceCategory || '',
            'Loại bên': d._type,
            'Tên NCC/Thầu phụ': d._name,
            'Số tiền tổng': total,
            'Đã trả': paid,
            'Còn nợ': remaining,
            'Trạng thái': STATUS_LABEL[d.status] || d.status || '',
            'Phân bổ dự án': renderAllocationPlan(d.allocationPlan),
            'Số HĐ': d.invoiceNo || '',
            'Ghi chú': d.notes || '',
        };
    });

    const ws1 = XLSX.utils.json_to_sheet(debtRows, {
        header: [
            'Mã', 'Ngày', 'Loại dịch vụ', 'Loại bên', 'Tên NCC/Thầu phụ',
            'Số tiền tổng', 'Đã trả', 'Còn nợ', 'Trạng thái',
            'Phân bổ dự án', 'Số HĐ', 'Ghi chú',
        ],
    });

    ws1['!cols'] = [
        { wch: 12 }, // Mã
        { wch: 11 }, // Ngày
        { wch: 20 }, // Loại dịch vụ
        { wch: 10 }, // Loại bên
        { wch: 28 }, // Tên NCC/Thầu phụ
        { wch: 15 }, // Số tiền tổng
        { wch: 15 }, // Đã trả
        { wch: 15 }, // Còn nợ
        { wch: 14 }, // Trạng thái
        { wch: 42 }, // Phân bổ dự án
        { wch: 14 }, // Số HĐ
        { wch: 30 }, // Ghi chú
    ];
    // Number format cho F/G/H (Số tiền tổng, Đã trả, Còn nợ)
    applyNumberFormat(ws1, 'F', debtRows.length);
    applyNumberFormat(ws1, 'G', debtRows.length);
    applyNumberFormat(ws1, 'H', debtRows.length);

    // Bold header (best-effort; free xlsx có thể không render nhưng không gây lỗi)
    const debtHeaders = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1', 'J1', 'K1', 'L1'];
    for (const ref of debtHeaders) {
        if (ws1[ref]) {
            ws1[ref].s = { font: { bold: true } };
        }
    }

    // ======= Sheet 2: Chi phí đã chi =======
    // 1 row per ExpenseAllocation (expense × project)
    const expenseRows = [];
    for (const exp of expenses) {
        const allocs = Array.isArray(exp.allocations) ? exp.allocations : [];
        if (allocs.length === 0) {
            // Expense không có allocation (fallback) → 1 row không có dự án
            expenseRows.push({
                'Mã CP': exp.code || '',
                'Ngày trả': fmtDate(exp.date),
                'Loại dịch vụ': exp.category || '',
                'Tên NCC/Thầu phụ': exp.recipientName || '',
                'Số tiền': Number(exp.amount) || 0,
                'Dự án': '',
                'Số tiền dự án': 0,
                'Ghi chú': exp.notes || '',
            });
        } else {
            for (const a of allocs) {
                expenseRows.push({
                    'Mã CP': exp.code || '',
                    'Ngày trả': fmtDate(exp.date),
                    'Loại dịch vụ': exp.category || '',
                    'Tên NCC/Thầu phụ': exp.recipientName || '',
                    'Số tiền': Number(exp.amount) || 0,
                    'Dự án': a.project?.name || a.project?.code || '',
                    'Số tiền dự án': Number(a.amount) || 0,
                    'Ghi chú': exp.notes || '',
                });
            }
        }
    }

    const ws2 = XLSX.utils.json_to_sheet(expenseRows, {
        header: [
            'Mã CP', 'Ngày trả', 'Loại dịch vụ', 'Tên NCC/Thầu phụ',
            'Số tiền', 'Dự án', 'Số tiền dự án', 'Ghi chú',
        ],
    });

    ws2['!cols'] = [
        { wch: 12 }, // Mã CP
        { wch: 11 }, // Ngày trả
        { wch: 20 }, // Loại dịch vụ
        { wch: 28 }, // Tên NCC/Thầu phụ
        { wch: 15 }, // Số tiền
        { wch: 28 }, // Dự án
        { wch: 15 }, // Số tiền dự án
        { wch: 30 }, // Ghi chú
    ];
    // Number format cho E (Số tiền), G (Số tiền dự án)
    applyNumberFormat(ws2, 'E', expenseRows.length);
    applyNumberFormat(ws2, 'G', expenseRows.length);

    const expenseHeaders = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1'];
    for (const ref of expenseHeaders) {
        if (ws2[ref]) {
            ws2[ref].s = { font: { bold: true } };
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Công nợ dịch vụ');
    XLSX.utils.book_append_sheet(wb, ws2, 'Chi phí đã chi');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const filename = `cong-no-dich-vu-${yyyy}-${mm}-${dd}.xlsx`;

    return new NextResponse(buf, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-store',
        },
    });
}, { roles: ['giam_doc', 'ke_toan'] });
