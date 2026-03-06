'use client';
import { useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Keyboard shortcuts:
 * Ctrl+N → Tạo mới (context-based)
 * Ctrl+K → Global search (handled in Header)
 * Esc    → Close modals (handled per component)
 */

const CREATE_ROUTES = {
    '/projects': '/projects/create',
    '/customers': '/customers/create',
    '/quotations': '/quotations/create',
    '/contracts': '/contracts/create',
    '/work-orders': '/work-orders/create',
    '/expenses': '/expenses/create',
    '/purchasing': '/purchasing/create',
    '/products': '/products/create',
    '/acceptance': null, // handled by page's own form
    '/hr/payroll': null,
};

export default function KeyboardShortcuts() {
    const pathname = usePathname();
    const router = useRouter();

    const handleKeyDown = useCallback((e) => {
        // Don't trigger when typing in inputs
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        if (e.target.isContentEditable) return;

        // Ctrl+N → Create new
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            const route = Object.keys(CREATE_ROUTES).find(r =>
                r === pathname || pathname.startsWith(r + '/')
            );
            if (route && CREATE_ROUTES[route]) {
                e.preventDefault();
                router.push(CREATE_ROUTES[route]);
            }
        }
    }, [pathname, router]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return null; // render nothing, just hooks
}
