'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import {
    LayoutDashboard, TrendingUp, Users, Building2, FileText,
    Package, ClipboardList, Wrench, CreditCard, Receipt,
    ShoppingCart, Truck, Warehouse, Wallet, UserCog,
    BarChart3, ChevronRight, ChevronDown, X, Factory,
    Activity, ClipboardCheck, Banknote, Settings, ShieldCheck,
    Shield, Plus, ArrowRightLeft,
    CheckCircle, BookOpen, HardHat, PiggyBank, CalendarDays, Landmark,
    ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';

const menuItems = [
    {
        section: 'Tổng quan', collapsible: false, items: [
            { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
        ]
    },
    {
        section: 'Kinh doanh', items: [
            { href: '/customers', icon: Users, label: 'Khách hàng', roles: ['giam_doc', 'ke_toan', 'kinh_doanh'] },
            { href: '/quotations', icon: ClipboardList, label: 'Báo giá', roles: ['giam_doc', 'ke_toan', 'kinh_doanh', 'ky_thuat'], quick: '/quotations/create' },
            { href: '/contracts', icon: FileText, label: 'Hợp đồng', roles: ['giam_doc', 'ke_toan', 'kinh_doanh'], quick: '/contracts/create' },
            { href: '/warranty', icon: ShieldCheck, label: 'Bảo hành', roles: ['giam_doc', 'quan_ly_du_an'] },
        ]
    },
    {
        section: 'Dự án', items: [
            { href: '/projects', icon: Building2, label: 'Dự án' },
            { href: '/gantt', icon: CalendarDays, label: 'Gantt Chart' },
        ]
    },
    {
        section: 'Vật tư', items: [
            { href: '/products', icon: Package, label: 'Sản phẩm' },
            { href: '/purchasing', icon: ShoppingCart, label: 'Mua sắm', roles: ['giam_doc', 'ke_toan', 'kinh_doanh', 'kho', 'ky_thuat'] },
            { href: '/inventory', icon: Warehouse, label: 'Kho', roles: ['giam_doc', 'ke_toan', 'kho', 'quan_ly_du_an'] },
        ]
    },
    {
        section: 'Tài chính', items: [
            { href: '/finance', icon: Wallet, label: 'Tổng quan', roles: ['giam_doc', 'ke_toan'], exactMatch: true },
            { href: '/finance?tab=thu_tien', icon: ArrowDownLeft, label: 'Thu tiền', roles: ['giam_doc', 'ke_toan'], tab: 'thu_tien' },
            { href: '/finance?tab=chi_phi', icon: ArrowUpRight, label: 'Chi phí', roles: ['giam_doc', 'ke_toan'], tab: 'chi_phi' },
            { href: '/accounting', icon: BookOpen, label: 'Sổ cái', roles: ['giam_doc', 'ke_toan'] },
            { href: '/cashflow-forecast', icon: Banknote, label: 'Dự báo dòng tiền', roles: ['giam_doc', 'ke_toan'] },
            { href: '/budget', icon: PiggyBank, label: 'Ngân sách', roles: ['giam_doc', 'ke_toan', 'quan_ly_du_an'] },
            { href: '/cong-no', icon: Landmark, label: 'Công nợ', roles: ['giam_doc', 'ke_toan'] },
            { href: '/overhead', icon: Building2, label: 'Chi phí chung', roles: ['giam_doc', 'ke_toan'] },
        ]
    },
    {
        section: 'Quản lý', items: [
            { href: '/hr', icon: UserCog, label: 'Nhân sự', roles: ['giam_doc', 'ke_toan'] },
            { href: '/admin/settings', icon: Settings, label: 'Cài đặt', roles: ['giam_doc', 'ke_toan'] },
        ]
    },
    {
        section: 'Báo cáo chi tiết', defaultCollapsed: true, items: [
            { href: '/pipeline', icon: TrendingUp, label: 'Pipeline' },
            { href: '/reports', icon: BarChart3, label: 'Báo cáo', roles: ['giam_doc', 'ke_toan'] },
            { href: '/reports/pl-by-project', icon: TrendingUp, label: 'P&L Dự án', roles: ['giam_doc', 'ke_toan'] },
        ]
    },
];

function SidebarInner({ isOpen, onClose }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('tab');
    const { role, roleInfo } = useRole();

    // Collapsed sections — persist in localStorage
    const [collapsed, setCollapsed] = useState({});
    useEffect(() => {
        try {
            const saved = localStorage.getItem('sidebar_collapsed');
            const parsed = saved ? JSON.parse(saved) : {};
            const defaults = {};
            menuItems.forEach(s => { if (s.defaultCollapsed) defaults[s.section] = true; });
            setCollapsed({ ...defaults, ...parsed });
        } catch { }
    }, []);

    const toggleSection = (section) => {
        setCollapsed(prev => {
            const next = { ...prev, [section]: !prev[section] };
            try { localStorage.setItem('sidebar_collapsed', JSON.stringify(next)); } catch { }
            return next;
        });
    };

    const handleNavClick = () => {
        if (window.innerWidth <= 768) onClose();
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`} role="navigation" aria-label="Menu chính">
            <div className="sidebar-brand">
                <div className="brand-icon">H</div>
                <div className="brand-text">
                    <span className="brand-name">HomeERP</span>
                    <span className="brand-sub">Nội thất & Xây dựng</span>
                </div>
                <button
                    className="mobile-menu-btn"
                    onClick={onClose}
                    aria-label="Đóng menu"
                    style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)' }}
                >
                    <X size={20} />
                </button>
            </div>
            <nav className="sidebar-nav">
                {menuItems.map((section) => {
                    const visibleItems = section.items.filter(item => !item.roles || item.roles.includes(role));
                    if (visibleItems.length === 0) return null;
                    const isCollapsed = collapsed[section.section] && section.collapsible !== false;
                    const hasActiveChild = visibleItems.some(item => {
                        if (item.tab) return pathname === '/finance' && currentTab === item.tab;
                        if (item.exactMatch) return pathname === item.href && !currentTab;
                        return item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                    });

                    return (
                        <div className="nav-section" key={section.section}>
                            <div
                                className="nav-section-title"
                                onClick={() => section.collapsible !== false && toggleSection(section.section)}
                                style={{
                                    cursor: section.collapsible !== false ? 'pointer' : 'default',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    userSelect: 'none',
                                }}
                            >
                                <span>{section.section}</span>
                                {section.collapsible !== false && (
                                    <ChevronDown
                                        size={12}
                                        style={{
                                            transition: 'transform 0.2s ease',
                                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)',
                                            opacity: 0.5,
                                        }}
                                    />
                                )}
                            </div>
                            <div style={{
                                overflow: 'hidden',
                                maxHeight: isCollapsed ? 0 : `${visibleItems.length * 40}px`,
                                transition: 'max-height 0.25s ease',
                                opacity: isCollapsed ? 0 : 1,
                            }}>
                                {visibleItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = item.tab
                                        ? pathname === '/finance' && currentTab === item.tab
                                        : item.exactMatch
                                            ? pathname === item.href && !currentTab
                                            : item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                                    return (
                                        <div key={item.href} style={{ display: 'flex', alignItems: 'center' }}>
                                            <Link
                                                href={item.href}
                                                className={`nav-item ${isActive ? 'active' : ''}`}
                                                aria-current={isActive ? 'page' : undefined}
                                                onClick={handleNavClick}
                                                style={{ flex: 1 }}
                                            >
                                                <span className="nav-icon">
                                                    <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                                                </span>
                                                <span>{item.label}</span>
                                                {item.badge && <span className="nav-badge">{item.badge}</span>}
                                                {isActive && <ChevronRight size={14} className="nav-arrow" />}
                                            </Link>
                                            {item.quick && (
                                                <Link
                                                    href={item.quick}
                                                    onClick={(e) => { e.stopPropagation(); handleNavClick(); }}
                                                    style={{
                                                        padding: '4px 6px', marginRight: 8, borderRadius: 4,
                                                        color: 'rgba(255,255,255,0.35)', transition: 'all 0.15s',
                                                        display: 'flex', alignItems: 'center',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                                                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
                                                    title={`Tạo ${item.label} mới`}
                                                >
                                                    <Plus size={14} />
                                                </Link>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 'auto' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Shield size={12} /> Vai trò
                </div>
                <div style={{
                    padding: '8px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    color: roleInfo.color, fontWeight: 600, fontSize: 12,
                }}>
                    {roleInfo.icon} {roleInfo.label}
                </div>
            </div>
        </aside>
    );
}

export default function Sidebar({ isOpen, onClose }) {
    return (
        <Suspense fallback={null}>
            <SidebarInner isOpen={isOpen} onClose={onClose} />
        </Suspense>
    );
}
