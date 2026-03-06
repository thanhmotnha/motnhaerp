import './globals.css';
import Providers from '@/components/Providers';
import AppShell from '@/components/AppShell';

export const metadata = {
    title: 'MỘT NHÀ ERP - Quản lý Nội thất & Xây dựng',
    description: 'Hệ thống ERP quản lý công ty nội thất và xây nhà trọn gói',
    manifest: '/manifest.json',
    themeColor: '#234093',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'MỘT NHÀ ERP',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="vi">
            <head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#234093" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <link rel="apple-touch-icon" href="/icon-192.png" />
            </head>
            <body>
                <Providers>
                    <AppShell>{children}</AppShell>
                </Providers>
            </body>
        </html>
    );
}
