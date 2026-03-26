'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard, TrendingUp, Users, Building2, FileText,
    Package, ClipboardList, Wrench, CreditCard, Receipt,
    ShoppingCart, Truck, Warehouse, Wallet, UserCog,
    BarChart3, ChevronRight, ChevronDown, X, Factory,
    Activity, ClipboardCheck, Banknote, Settings, ShieldCheck,
    Shield, Plus, ArrowRightLeft, Calculator,
    CheckCircle, BookOpen, HardHat, PiggyBank, DollarSign, CalendarDays
} from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';

const menuItems = [
    {
        section: 'Tổng quan', collapsible: false, items: [
            { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { href: '/pipeline', icon: TrendingUp, label: 'Pipeline' },
            { href: '/reports', icon: BarChart3, label: 'Báo cáo', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
        ]
    },
    {
        section: 'Kinh doanh', items: [
            { href: '/customers', icon: Users, label: 'Khách hàng', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/quotations', icon: ClipboardList, label: 'Báo giá', roles: ['giam_doc', 'pho_gd', 'ke_toan'], quick: '/quotations/create' },
            { href: '/contracts', icon: FileText, label: 'Hợp đồng', roles: ['giam_doc', 'pho_gd', 'ke_toan'], quick: '/contracts/create' },
            { href: '/warranty', icon: ShieldCheck, label: 'Bảo hành', roles: ['giam_doc', 'pho_gd', 'quan_ly_du_an'] },
        ]
    },
    {
        section: 'Dự án', items: [
            { href: '/projects', icon: Building2, label: 'Dự án' },
            { href: '/gantt', icon: CalendarDays, label: 'Gantt Chart' },
            { href: '/work-orders', icon: ClipboardCheck, label: 'Lệnh công việc' },
            { href: '/daily-logs', icon: BookOpen, label: 'Nhật ký' },
            { href: '/acceptance', icon: CheckCircle, label: 'Nghiệm thu' },
        ]
    },
    {
        section: 'Vật tư & Sản xuất', items: [
            { href: '/products', icon: Package, label: 'Sản phẩm' },
            { href: '/material-plans', icon: ClipboardList, label: 'KH Vật tư' },
            { href: '/purchasing', icon: ShoppingCart, label: 'Mua sắm', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/inventory', icon: Warehouse, label: 'Kho', roles: ['giam_doc', 'pho_gd', 'ke_toan', 'quan_ly_du_an'] },
            { href: '/warehouse-transfers', icon: ArrowRightLeft, label: 'Chuyển kho' },
            { href: '/furniture-orders', icon: Wrench, label: 'Đơn nội thất' },
            { href: '/production-batches', icon: Activity, label: 'Lô sản xuất' },
        ]
    },
    {
        section: 'Tài chính', items: [
            { href: '/finance', icon: Wallet, label: 'Tổng quan', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/payment-schedule', icon: CalendarDays, label: 'Lịch Thu Chi', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/cashflow-forecast', icon: Banknote, label: 'Dự báo dòng tiền', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/expenses', icon: DollarSign, label: 'Chi phí DA', roles: ['giam_doc', 'pho_gd', 'ke_toan', 'quan_ly_du_an'] },
            { href: '/budget', icon: PiggyBank, label: 'Ngân sách', roles: ['giam_doc', 'pho_gd', 'ke_toan', 'quan_ly_du_an'] },
            { href: '/accounting', icon: Calculator, label: 'Kế toán', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
        ]
    },
    {
        section: 'Quản lý', items: [
            { href: '/partners', icon: Truck, label: 'Đối tác & NCC', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/contractors', icon: HardHat, label: 'Nhà thầu phụ' },
            { href: '/hr', icon: UserCog, label: 'Nhân sự', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/workshops', icon: Factory, label: 'Xưởng SX', roles: ['giam_doc', 'pho_gd', 'quan_ly_du_an'] },
            { href: '/admin/settings', icon: Settings, label: 'Cài đặt', roles: ['giam_doc'] },
        ]
    },
];

export default function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { role, roleInfo } = useRole();

    // Collapsed sections — persist in localStorage
    const [collapsed, setCollapsed] = useState({});
    useEffect(() => {
        try {
            const saved = localStorage.getItem('sidebar_collapsed');
            if (saved) setCollapsed(JSON.parse(saved));
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
                    const hasActiveChild = visibleItems.some(item =>
                        item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                    );

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
                                    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
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
