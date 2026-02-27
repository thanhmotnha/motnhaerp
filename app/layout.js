import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Providers from '@/components/Providers';

export const metadata = {
  title: 'HomeERP - Quản lý Nội thất & Xây dựng',
  description: 'Hệ thống ERP quản lý công ty nội thất và xây nhà trọn gói',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <Providers>
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <Header />
              <main className="page-content">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
