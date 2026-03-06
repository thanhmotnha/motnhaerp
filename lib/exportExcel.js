/**
 * Export data to CSV/Excel file (client-side).
 * Usage: exportToExcel(data, columns, 'filename')
 */

/**
 * @param {Object[]} data - array of objects
 * @param {Array<{key: string, label: string, format?: function}>} columns
 * @param {string} filename - without extension
 */
export function exportToExcel(data, columns, filename = 'export') {
    if (!data || data.length === 0) return;

    const BOM = '\uFEFF'; // UTF-8 BOM for Excel to recognize Vietnamese
    const separator = ',';

    // Header
    const header = columns.map(c => `"${c.label}"`).join(separator);

    // Rows
    const rows = data.map(row =>
        columns.map(col => {
            let val = col.key.split('.').reduce((o, k) => o?.[k], row);
            if (col.format) val = col.format(val, row);
            if (val === null || val === undefined) val = '';
            // Escape quotes
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        }).join(separator)
    );

    const csv = BOM + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// Preset column configs for common exports
export const EXPORT_COLUMNS = {
    projects: [
        { key: 'code', label: 'Mã DA' },
        { key: 'name', label: 'Tên dự án' },
        { key: 'customer.name', label: 'Khách hàng' },
        { key: 'status', label: 'Trạng thái' },
        { key: 'type', label: 'Loại' },
        { key: 'contractValue', label: 'Giá trị HĐ', format: v => v || 0 },
        { key: 'totalExpense', label: 'Chi phí', format: v => v || 0 },
        { key: 'progress', label: '% Tiến độ', format: v => `${v || 0}%` },
        { key: 'createdAt', label: 'Ngày tạo', format: v => v ? new Date(v).toLocaleDateString('vi') : '' },
    ],
    customers: [
        { key: 'code', label: 'Mã KH' },
        { key: 'name', label: 'Tên khách hàng' },
        { key: 'phone', label: 'SĐT' },
        { key: 'email', label: 'Email' },
        { key: 'address', label: 'Địa chỉ' },
        { key: 'type', label: 'Loại' },
        { key: 'status', label: 'Trạng thái' },
        { key: 'source', label: 'Nguồn' },
        { key: 'projects', label: 'Số DA', format: (v) => Array.isArray(v) ? v.length : 0 },
    ],
    employees: [
        { key: 'code', label: 'Mã NV' },
        { key: 'name', label: 'Họ tên' },
        { key: 'phone', label: 'SĐT' },
        { key: 'email', label: 'Email' },
        { key: 'position', label: 'Chức vụ' },
        { key: 'department.name', label: 'Phòng ban' },
        { key: 'baseSalary', label: 'Lương cơ bản', format: v => v || 0 },
        { key: 'status', label: 'Trạng thái' },
    ],
    payroll: [
        { key: 'employee.code', label: 'Mã NV' },
        { key: 'employee.name', label: 'Họ tên' },
        { key: 'baseSalary', label: 'Lương CB' },
        { key: 'daysWorked', label: 'Ngày công' },
        { key: 'overtimeHours', label: 'Giờ TC' },
        { key: 'grossSalary', label: 'Lương gộp' },
        { key: 'bhxhEmployee', label: 'BHXH NV' },
        { key: 'personalTax', label: 'Thuế TNCN' },
        { key: 'netSalary', label: 'Thực lĩnh' },
    ],
};
