import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * GET /api/service-debts/import-excel/template
 * Trả file mẫu Excel để user tải về điền rồi upload.
 *
 * Cấu trúc cột khớp với endpoint POST /api/service-debts/import-excel.
 * Hỗ trợ tối đa 5 dự án phân bổ (Mã dự án 1..5 + Tỷ lệ 1..5 %).
 */
export const GET = withAuth(async () => {
    const header = [
        'Loại dịch vụ',
        'Loại bên',
        'Tên NCC/Thầu phụ',
        'Số tiền',
        'Ngày',
        'Số hóa đơn',
        'Ghi chú',
        'Mã dự án 1', 'Tỷ lệ 1 %',
        'Mã dự án 2', 'Tỷ lệ 2 %',
        'Mã dự án 3', 'Tỷ lệ 3 %',
        'Mã dự án 4', 'Tỷ lệ 4 %',
        'Mã dự án 5', 'Tỷ lệ 5 %',
    ];

    const sampleRows = [
        [
            'Thiết kế KT-KC',
            'NCC',
            'Công ty TNHH Thiết kế ABC',
            20000000,
            '01/04/2026',
            'HD-2026-001',
            'Phí thiết kế kết cấu 2 dự án',
            'DA-001', 60,
            'DA-002', 40,
            '', '',
            '', '',
            '', '',
        ],
        [
            'Tư vấn thuê ngoài',
            'Thầu phụ',
            'Nguyễn Văn A',
            8000000,
            '05/04/2026',
            '',
            'Tư vấn giám sát công trình',
            'DA-003', 100,
            '', '',
            '', '',
            '', '',
            '', '',
        ],
    ];

    const data = [header, ...sampleRows];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
        { wch: 22 }, // Loại dịch vụ
        { wch: 12 }, // Loại bên
        { wch: 30 }, // Tên NCC/Thầu phụ
        { wch: 14 }, // Số tiền
        { wch: 12 }, // Ngày
        { wch: 16 }, // Số hóa đơn
        { wch: 28 }, // Ghi chú
        { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 10 },
    ];

    // Thêm sheet hướng dẫn
    const guide = [
        ['HƯỚNG DẪN NHẬP LIỆU — CÔNG NỢ DỊCH VỤ (CASH-BASIS)'],
        [],
        ['Cột', 'Bắt buộc', 'Ghi chú'],
        ['Loại dịch vụ', 'Có', 'Thiết kế công năng | Thiết kế KT-KC | Thiết kế 3D | Tư vấn thuê ngoài'],
        ['Loại bên', 'Có', 'NCC hoặc Thầu phụ'],
        ['Tên NCC/Thầu phụ', 'Có', 'Phải khớp chính xác với danh sách NCC / Thầu phụ đã có'],
        ['Số tiền', 'Có', 'Số tiền dương, không chứa ký tự'],
        ['Ngày', 'Không', 'Định dạng dd/mm/yyyy. Bỏ trống = hôm nay'],
        ['Số hóa đơn', 'Không', 'Tuỳ chọn'],
        ['Ghi chú', 'Không', 'Tuỳ chọn'],
        ['Mã dự án 1..5', 'Ít nhất 1', 'Mã dự án (vd: DA-001). Tối đa 5 dự án mỗi dòng'],
        ['Tỷ lệ 1..5 %', 'Có nếu có Mã dự án', 'Tổng tất cả các tỷ lệ = 100 (±1)'],
        [],
        ['Lưu ý: Không sinh chi phí dự án tại thời điểm nhập. Chi phí chỉ phát sinh khi thanh toán.'],
    ];
    const wsGuide = XLSX.utils.aoa_to_sheet(guide);
    wsGuide['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 60 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Công nợ dịch vụ');
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Hướng dẫn');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="mau-cong-no-dich-vu.xlsx"',
        },
    });
}, { roles: ['giam_doc', 'ke_toan'] });
