/**
 * Exports an array of objects to a CSV file download.
 * @param {Object[]} rows - Array of plain objects
 * @param {string[]} columns - Array of { key, label } or just key strings
 * @param {string} filename - Download filename (without .csv)
 */
export function exportToCsv(rows, columns, filename = 'export') {
    if (!rows.length) return;

    // Normalize columns to { key, label }
    const cols = columns.map(c => typeof c === 'string' ? { key: c, label: c } : c);

    const escape = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const header = cols.map(c => escape(c.label)).join(',');
    const dataRows = rows.map(row =>
        cols.map(c => {
            const val = c.key.split('.').reduce((o, k) => o?.[k], row);
            return escape(val);
        }).join(',')
    );

    // BOM for Vietnamese characters in Excel
    const bom = '\uFEFF';
    const csv = bom + [header, ...dataRows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
