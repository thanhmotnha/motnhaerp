/**
 * Shared formatting utilities — dedup from individual screens
 */

export function formatCurrency(n?: number | null): string {
    if (n == null) return '-';
    return n.toLocaleString('vi-VN') + 'đ';
}

export function formatCurrencyShort(n: number): string {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + ' tỷ';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + ' tr';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
    return String(n);
}

export function formatDate(d?: string | null): string {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('vi-VN');
}
