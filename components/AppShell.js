'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function AppShell({ children }) {
    const pathname = usePathname();
    const { status } = useSession();

    // Login page and public pages: no shell
    const noShellPaths = ['/login'];
    const isNoShell = noShellPaths.some(p => pathname.startsWith(p));

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
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Header />
                <main className="page-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
