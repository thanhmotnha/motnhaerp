'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onPageChange }) {
    if (!pagination || pagination.totalPages <= 1) return null;

    const { page, totalPages, total, hasNext, hasPrev } = pagination;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0', fontSize: 14, color: 'var(--text-muted)',
        }}>
            <span>Tổng {total} bản ghi</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={!hasPrev}
                    aria-label="Trang trước"
                    style={{
                        padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'transparent', cursor: hasPrev ? 'pointer' : 'not-allowed',
                        opacity: hasPrev ? 1 : 0.5, display: 'flex', alignItems: 'center',
                    }}
                >
                    <ChevronLeft size={16} />
                </button>
                <span>Trang {page} / {totalPages}</span>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={!hasNext}
                    aria-label="Trang sau"
                    style={{
                        padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'transparent', cursor: hasNext ? 'pointer' : 'not-allowed',
                        opacity: hasNext ? 1 : 0.5, display: 'flex', alignItems: 'center',
                    }}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
