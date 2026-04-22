import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * GET /api/projects/[id]/material-plans/import-excel/template
 * Trả file mẫu Excel cho user tải về điền rồi upload.
 */
export const GET = withAuth(async () => {
    const data = [
        ['STT', 'Mã SP', 'Tên vật tư', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Nhóm', 'Hao phí %', 'Ghi chú'],
        [1, 'SP001', 'Xi măng Hà Tiên PC40', 'bao', 50, 85000, 4250000, 'Xi măng - vữa', 5, 'Bao 50kg'],
        [2, 'SP002', 'Thép phi 10 Hòa Phát', 'kg', 500, 18000, 9000000, 'Thép - sắt', 3, ''],
        [3, '', 'Cát vàng xây dựng', 'm3', 10, 350000, 3500000, 'Cát - đá', 10, 'Cát khô'],
        [4, '', 'Gạch thẻ 8×19', 'viên', 2000, 1800, 3600000, 'Gạch', 5, ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
        { wch: 5 }, { wch: 10 }, { wch: 35 }, { wch: 8 }, { wch: 10 },
        { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 24 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dự toán vật tư');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="mau-du-toan-vat-tu.xlsx"',
        },
    });
});
