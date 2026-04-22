'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Sun, Moon, Settings, LogOut, Search, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import NotificationBell from '@/components/ui/NotificationBell';
import RoleSwitcher from '@/components/RoleSwitcher';

const pageTitles = {
    '/': 'Dashboard',
    '/customers': 'Quản lý Khách hàng',
    '/projects': 'Quản lý Dự án',
    '/products': 'Sản phẩm & Vật tư',
    '/quotations': 'Báo giá & Hợp đồng',
    '/inventory': 'Kho & Tồn kho',
    '/finance': 'Tài chính',
    '/hr': 'Nhân sự',
    '/reports': 'Báo cáo & Thống kê',
    '/pipeline': 'Pipeline',
    '/payments': 'Thu tiền',
    '/expenses': 'Chi phí',
    '/purchasing': 'Mua sắm vật tư',
    '/contracts': 'Hợp đồng',
    '/work-orders': 'Phiếu công việc',
    '/partners': 'Đối tác',
    '/acceptance': 'Biên bản Nghiệm thu',
    '/hr/payroll': 'Bảng lương',
    '/cong-no': 'Công nợ',
    '/cong-no/bao-cao': 'Báo cáo công nợ',
    '/overhead': 'Chi phí chung',
    '/noi-that': 'Đơn hàng Nội thất',
};

export default function Header({ onMenuToggle, onSearchOpen, onSidebarToggle, sidebarCollapsed }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const title = pageTitles[pathname] || pageTitles[Object.keys(pageTitles).find(k => k !== '/' && pathname.startsWith(k))] || 'HomeERP';
    const [dark, setDark] = useState(false);

    // Ctrl+K shortcut
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                onSearchOpen?.();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onSearchOpen]);

    useEffect(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') {
            setDark(true);
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, []);

    const toggleTheme = () => {
        const next = !dark;
        setDark(next);
        if (next) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    };

    const userName = session?.user?.name || 'User';
    const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <header className="header">
            <div className="header-left">
                <button className="mobile-menu-btn" onClick={onMenuToggle} aria-label="Mở menu">
                    <Menu size={22} />
                </button>
                <button
                    className="header-btn sidebar-toggle-btn"
                    onClick={onSidebarToggle}
                    title={sidebarCollapsed ? 'Mở sidebar' : 'Ẩn sidebar'}
                    aria-label={sidebarCollapsed ? 'Mở sidebar' : 'Ẩn sidebar'}
                >
                    {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                </button>
                <h2 className="header-title">{title}</h2>
                <div className="header-search" onClick={() => onSearchOpen?.()}
                    style={{ cursor: 'pointer' }}>
                    <span className="search-icon"><Search size={16} /></span>
                    <input type="text" placeholder="Tìm kiếm... (Ctrl+K)" readOnly
                        style={{ cursor: 'pointer' }}
                        aria-label="Tìm kiếm" />
                </div>
            </div>
            <div className="header-right">
                <RoleSwitcher />
                <button className="header-btn" title={dark ? 'Chuyển sang sáng' : 'Chuyển sang tối'} onClick={toggleTheme} aria-label="Chuyển đổi giao diện">
                    {dark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <NotificationBell />
                <button className="header-btn" title="Cài đặt" aria-label="Cài đặt">
                    <Settings size={20} />
                </button>
                <div className="header-user">
                    <div className="avatar">{initials}</div>
                    <div className="user-info">
                        <span className="user-name">{userName}</span>
                        <span className="user-role">{session?.user?.role || ''}</span>
                    </div>
                </div>
                <button
                    className="header-btn"
                    title="Đăng xuất"
                    aria-label="Đăng xuất"
                    onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
                >
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
}
