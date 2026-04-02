'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import GlobalSearch from '@/components/ui/GlobalSearch';
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function AppShell({ children }) {
    const pathname = usePathname();
    const { status } = useSession();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('sidebarCollapsed') === 'true';
    });
    const [searchOpen, setSearchOpen] = useState(false);

    // Reset collapsed state when viewport drops to mobile (≤768px)
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e) => { if (e.matches) setSidebarCollapsed(false); };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);
    const toggleSidebarCollapsed = useCallback(() => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sidebarCollapsed', String(next));
            return next;
        });
    }, []);

    // Login page and public pages: no shell
    const noShellPaths = ['/login'];
    const isNoShell = noShellPaths.some(p => pathname.startsWith(p)) || pathname.includes('/pdf');

    if (isNoShell || status === 'unauthenticated') {
        return children;
    }

    // Loading state
    if (status === 'loading') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #1C3A6B, #2A5298)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#C9A84C', fontSize: 20, fontWeight: 700 }}>H</div>
                    <p style={{ color: '#666' }}>Đang tải...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`app-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
            <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
            <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={closeSidebar} />
            <div className="main-content">
                <Header
                    onMenuToggle={toggleSidebar}
                    onSearchOpen={() => setSearchOpen(true)}
                    onSidebarToggle={toggleSidebarCollapsed}
                    sidebarCollapsed={sidebarCollapsed}
                />
                <main className="page-content">
                    <Breadcrumbs />
                    <ErrorBoundary>{children}</ErrorBoundary>
                </main>
            </div>
            <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
            <KeyboardShortcuts />
        </div>
    );
}
