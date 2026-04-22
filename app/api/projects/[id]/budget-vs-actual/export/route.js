import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

/**
 * GET /api/projects/[id]/budget-vs-actual/export
 * Export Excel 2 sheets so sánh Dự toán vs Thực tế:
 *   - Sheet 1 "Hạng mục thi công": MaterialPlan có costType = 'Thi công'
 *   - Sheet 2 "Vật tư": MaterialPlan có costType = 'Vật tư'
 *
 * Tất cả role đều xem được (không filter theo roles trong withAuth).
 */

// Apply number format #,##0 on a specific column letter for all data rows.
function applyNumberFormat(ws, colLetter, startRow, endRow) {
    for (let r = startRow; r <= endRow; r++) {
        const ref = `${colLetter}${r}`;
        const cell = ws[ref];
        if (cell && (cell.t === 'n' || typeof cell.v === 'number')) {
            cell.z = '#,##0';
        }
    }
}

function setBoldRow(ws, rowNumber, colCount) {
    for (let c = 0; c < colCount; c++) {
        const ref = XLSX.utils.encode_cell({ r: rowNumber - 1, c });
        if (ws[ref]) {
            ws[ref].s = { ...(ws[ref].s || {}), font: { ...((ws[ref].s && ws[ref].s.font) || {}), bold: true } };
        }
    }
}

function todayIso() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export const GET = withAuth(async (_request, { params }) => {
    const { id } = await params;

    // Projects có thể tham chiếu bằng id hoặc code (DA-001)
    const project = await prisma.project.findFirst({
        where: { OR: [{ id }, { code: id }] },
        select: { id: true, code: true, name: true },
    });
    if (!project) {
        return NextResponse.json({ error: 'Dự án không tồn tại' }, { status: 404 });
    }

    const plans = await prisma.materialPlan.findMany({
        where: { projectId: project.id },
        include: {
            product: { select: { id: true, code: true, name: true, unit: true } },
        },
        orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    });

    const thiCongPlans = plans.filter(p => p.costType === 'Thi công');
    const vatTuPlans = plans.filter(p => p.costType === 'Vật tư');

    // ============ Sheet 1: Hạng mục thi công ============
    const sheet1Header = [
        'STT', 'Hạng mục', 'Tên công tác', 'ĐV', 'Khối lượng',
        'Đơn giá dự toán', 'Đơn giá thực tế', 'Chênh lệch/đv', 'Chênh lệch %',
        'Thành tiền dự toán', 'Thành tiền thực tế', 'Chênh lệch tổng', 'Trạng thái',
    ];

    const sheet1Rows = thiCongPlans.map((p, i) => {
        const qty = Number(p.quantity || 0);
        const budgetUnit = Number(p.budgetUnitPrice || 0);
        const actualUnit = Number(p.unitPrice || 0);
        const diffUnit = actualUnit - budgetUnit;
        const diffPct = budgetUnit > 0 ? ((actualUnit - budgetUnit) / budgetUnit) * 100 : null;

        // Thành tiền đồng, round lên (ceil)
        const totalBudget = Math.ceil(qty * budgetUnit);
        const totalActual = actualUnit > 0 ? Math.ceil(qty * actualUnit) : 0;
        const diffTotal = totalActual - totalBudget;

        let status;
        if (actualUnit === 0) status = 'Chưa có thực tế';
        else if (diffTotal > 0) status = 'Vượt dự toán';
        else if (diffTotal < 0) status = 'Tiết kiệm';
        else status = 'Đúng dự toán';

        return {
            'STT': i + 1,
            'Hạng mục': p.category || '',
            'Tên công tác': p.product?.name || '',
            'ĐV': p.product?.unit || '',
            'Khối lượng': qty,
            'Đơn giá dự toán': budgetUnit,
            'Đơn giá thực tế': actualUnit,
            'Chênh lệch/đv': diffUnit,
            'Chênh lệch %': diffPct === null ? '—' : Math.round(diffPct * 100) / 100,
            'Thành tiền dự toán': totalBudget,
            'Thành tiền thực tế': totalActual,
            'Chênh lệch tổng': diffTotal,
            'Trạng thái': status,
        };
    });

    // Row tổng cộng
    const sum1Budget = sheet1Rows.reduce((s, r) => s + (Number(r['Thành tiền dự toán']) || 0), 0);
    const sum1Actual = sheet1Rows.reduce((s, r) => s + (Number(r['Thành tiền thực tế']) || 0), 0);
    const sum1Diff = sum1Actual - sum1Budget;

    const sheet1Total = {
        'STT': '',
        'Hạng mục': '',
        'Tên công tác': 'TỔNG CỘNG',
        'ĐV': '',
        'Khối lượng': '',
        'Đơn giá dự toán': '',
        'Đơn giá thực tế': '',
        'Chênh lệch/đv': '',
        'Chênh lệch %': '',
        'Thành tiền dự toán': sum1Budget,
        'Thành tiền thực tế': sum1Actual,
        'Chênh lệch tổng': sum1Diff,
        'Trạng thái': '',
    };

    const sheet1Data = [...sheet1Rows, sheet1Total];

    const ws1 = XLSX.utils.json_to_sheet(sheet1Data, { header: sheet1Header });

    ws1['!cols'] = [
        { wch: 5 },   // STT
        { wch: 20 },  // Hạng mục
        { wch: 32 },  // Tên công tác
        { wch: 8 },   // ĐV
        { wch: 12 },  // Khối lượng
        { wch: 16 },  // Đơn giá dự toán
        { wch: 16 },  // Đơn giá thực tế
        { wch: 15 },  // Chênh lệch/đv
        { wch: 12 },  // Chênh lệch %
        { wch: 18 },  // Thành tiền dự toán
        { wch: 18 },  // Thành tiền thực tế
        { wch: 18 },  // Chênh lệch tổng
        { wch: 16 },  // Trạng thái
    ];

    // Row 1 = header; data rows 2..(sheet1Data.length + 1)
    const s1LastRow = sheet1Data.length + 1;
    // Cột tiền: E (Khối lượng), F, G, H, J, K, L
    applyNumberFormat(ws1, 'E', 2, s1LastRow);
    applyNumberFormat(ws1, 'F', 2, s1LastRow);
    applyNumberFormat(ws1, 'G', 2, s1LastRow);
    applyNumberFormat(ws1, 'H', 2, s1LastRow);
    applyNumberFormat(ws1, 'J', 2, s1LastRow);
    applyNumberFormat(ws1, 'K', 2, s1LastRow);
    applyNumberFormat(ws1, 'L', 2, s1LastRow);

    // Bold header + bold row tổng cộng
    setBoldRow(ws1, 1, sheet1Header.length);
    setBoldRow(ws1, s1LastRow, sheet1Header.length);

    // ============ Sheet 2: Vật tư ============
    const sheet2Header = [
        'STT', 'Tên vật tư', 'ĐV', 'Khối lượng',
        'Đơn giá dự toán', 'Đơn giá đặt mua', 'Chênh lệch',
        'Thành tiền dự toán', 'Thành tiền đặt mua', 'Trạng thái đặt',
    ];

    const sheet2Rows = vatTuPlans.map((p, i) => {
        const qty = Number(p.quantity || 0);
        const budgetUnit = Number(p.budgetUnitPrice || 0);
        const actualUnit = Number(p.unitPrice || 0);
        const diffUnit = actualUnit - budgetUnit;

        const totalBudget = qty * budgetUnit;
        const totalActual = actualUnit > 0 ? qty * actualUnit : 0;

        return {
            'STT': i + 1,
            'Tên vật tư': p.product?.name || '',
            'ĐV': p.product?.unit || '',
            'Khối lượng': qty,
            'Đơn giá dự toán': budgetUnit,
            'Đơn giá đặt mua': actualUnit,
            'Chênh lệch': diffUnit,
            'Thành tiền dự toán': totalBudget,
            'Thành tiền đặt mua': totalActual,
            'Trạng thái đặt': p.status || 'Chưa đặt',
        };
    });

    const sum2Budget = sheet2Rows.reduce((s, r) => s + (Number(r['Thành tiền dự toán']) || 0), 0);
    const sum2Actual = sheet2Rows.reduce((s, r) => s + (Number(r['Thành tiền đặt mua']) || 0), 0);
    const sum2Diff = sum2Actual - sum2Budget;

    const sheet2Total = {
        'STT': '',
        'Tên vật tư': 'TỔNG CỘNG',
        'ĐV': '',
        'Khối lượng': '',
        'Đơn giá dự toán': '',
        'Đơn giá đặt mua': '',
        'Chênh lệch': sum2Diff,
        'Thành tiền dự toán': sum2Budget,
        'Thành tiền đặt mua': sum2Actual,
        'Trạng thái đặt': '',
    };

    const sheet2Data = [...sheet2Rows, sheet2Total];

    const ws2 = XLSX.utils.json_to_sheet(sheet2Data, { header: sheet2Header });

    ws2['!cols'] = [
        { wch: 5 },   // STT
        { wch: 32 },  // Tên vật tư
        { wch: 8 },   // ĐV
        { wch: 12 },  // Khối lượng
        { wch: 16 },  // Đơn giá dự toán
        { wch: 16 },  // Đơn giá đặt mua
        { wch: 14 },  // Chênh lệch
        { wch: 18 },  // Thành tiền dự toán
        { wch: 18 },  // Thành tiền đặt mua
        { wch: 16 },  // Trạng thái đặt
    ];

    const s2LastRow = sheet2Data.length + 1;
    // Cột số: D..I
    applyNumberFormat(ws2, 'D', 2, s2LastRow);
    applyNumberFormat(ws2, 'E', 2, s2LastRow);
    applyNumberFormat(ws2, 'F', 2, s2LastRow);
    applyNumberFormat(ws2, 'G', 2, s2LastRow);
    applyNumberFormat(ws2, 'H', 2, s2LastRow);
    applyNumberFormat(ws2, 'I', 2, s2LastRow);

    setBoldRow(ws2, 1, sheet2Header.length);
    setBoldRow(ws2, s2LastRow, sheet2Header.length);

    // ============ Build workbook ============
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Hạng mục thi công');
    XLSX.utils.book_append_sheet(wb, ws2, 'Vật tư');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });

    const filename = `so-sanh-du-toan-thuc-te-${project.code || project.id}-${todayIso()}.xlsx`;

    return new NextResponse(buf, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-store',
        },
    });
});
