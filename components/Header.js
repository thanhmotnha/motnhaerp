'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

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
};

export default function Header() {
    const pathname = usePathname();
    const title = pageTitles[pathname] || 'HomeERP';
    const [dark, setDark] = useState(false);

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

    return (
        <header className="header">
            <div className="header-left">
                <h2 className="header-title">{title}</h2>
                <div className="header-search">
                    <span className="search-icon">🔍</span>
                    <input type="text" placeholder="Tìm kiếm dự án, khách hàng, vật tư..." />
                </div>
            </div>
            <div className="header-right">
                <button className="header-btn" title={dark ? 'Chuyển sang sáng' : 'Chuyển sang tối'} onClick={toggleTheme} style={{ fontSize: 20 }}>
                    {dark ? '☀️' : '🌙'}
                </button>
                <button className="header-btn" title="Thông báo">
                    🔔
                    <span className="badge-dot"></span>
                </button>
                <button className="header-btn" title="Cài đặt">
                    ⚙️
                </button>
                <div className="header-user">
                    <div className="avatar">AD</div>
                    <div className="user-info">
                        <span className="user-name">Admin</span>
                        <span className="user-role">Quản trị viên</span>
                    </div>
                </div>
            </div>
        </header>
    );
}

