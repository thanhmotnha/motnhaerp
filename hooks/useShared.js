import { useState, useEffect } from 'react';

/**
 * Debounce a value by delay ms.
 * Usage: const debouncedSearch = useDebounce(search, 300);
 */
export function useDebounce(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

/**
 * Debounced callback — fires after delay ms of inactivity.
 * Usage: const debouncedFetch = useDebouncedCallback(fetchData, 500);
 */
export function useDebouncedCallback(callback, delay = 300) {
    const [timer, setTimer] = useState(null);
    return (...args) => {
        if (timer) clearTimeout(timer);
        setTimer(setTimeout(() => callback(...args), delay));
    };
}

/**
 * Format number as Vietnamese currency.
 */
export function useFormatters() {
    return {
        fmt: (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0),
        fmtShort: (n) => {
            if (!n) return '0';
            if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}tỷ`;
            if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(0)}tr`;
            return new Intl.NumberFormat('vi-VN').format(n);
        },
        fmtDate: (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—',
        fmtDateTime: (d) => d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
        fmtPercent: (n) => `${Math.round(n || 0)}%`,
    };
}
