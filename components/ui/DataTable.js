'use client';
import { Loader2 } from 'lucide-react';

export default function DataTable({ columns, data, onRowClick, loading, emptyMessage = 'Không có dữ liệu' }) {
    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text-muted)' }}>
                <Loader2 size={24} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ marginLeft: 8 }}>Đang tải...</span>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table className="data-table" role="table">
                <thead>
                    <tr>
                        {columns.map((col, i) => (
                            <th key={i} style={{ width: col.width, textAlign: col.align || 'left' }}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIdx) => (
                        <tr
                            key={row.id || rowIdx}
                            onClick={() => onRowClick?.(row)}
                            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                            role={onRowClick ? 'button' : undefined}
                            tabIndex={onRowClick ? 0 : undefined}
                            onKeyDown={(e) => { if (e.key === 'Enter' && onRowClick) onRowClick(row); }}
                        >
                            {columns.map((col, colIdx) => (
                                <td key={colIdx} style={{ textAlign: col.align || 'left' }}>
                                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
