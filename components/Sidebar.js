'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, GitBranch, Users, Building2, FileText,
    Package, ClipboardList, Wrench, CreditCard, Receipt,
    ShoppingCart, HardHat, Warehouse, Wallet, UserCog,
    BarChart3, ChevronRight, Truck, Shield
} from 'lucide-react';
import { useRole, ROLES } from '@/contexts/RoleContext';

const menuConfig = [
    {
        section: 'Tổng quan', items: [
            { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { href: '/pipeline', icon: GitBranch, label: 'Pipeline' },
        ]
    },
    {
        section: 'Quản lý', items: [
            { href: '/customers', icon: Users, label: 'Khách hàng', badgeKey: 'customers', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/projects', icon: Building2, label: 'Dự án', badgeKey: 'projects' },
            { href: '/contracts', icon: FileText, label: 'Hợp đồng', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/products', icon: Package, label: 'Sản phẩm & Vật tư' },
            { href: '/quotations', icon: ClipboardList, label: 'Báo giá', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/work-orders', icon: Wrench, label: 'Phiếu công việc' },
        ]
    },
    {
        section: 'Vận hành', items: [
            { href: '/payments', icon: CreditCard, label: 'Thu tiền', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/expenses', icon: Receipt, label: 'Chi phí', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/purchasing', icon: ShoppingCart, label: 'Mua sắm VT', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/partners', icon: Truck, label: 'Đối tác (NCC/TP)', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/inventory', icon: Warehouse, label: 'Kho & Tồn kho' },
            { href: '/finance', icon: Wallet, label: 'Tài chính', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/hr', icon: UserCog, label: 'Nhân sự', roles: ['giam_doc', 'pho_gd'] },
        ]
    },
    {
        section: 'Phân tích', items: [
            { href: '/reports', icon: BarChart3, label: 'Báo cáo', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
        ]
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { role, roleInfo, switchRole } = useRole();
    const [counts, setCounts] = useState({});

    useEffect(() => {
        fetch('/api/dashboard')
            .then(r => r.json())
            .then(d => {
                if (d.stats) setCounts({ customers: d.stats.customers, projects: d.stats.projects });
            })
            .catch(() => { });
    }, [pathname]);

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-icon">H</div>
                <div className="brand-text">
                    <span className="brand-name">HomeERP</span>
                    <span className="brand-sub">Nội thất & Xây dựng</span>
                </div>
            </div>
            <nav className="sidebar-nav">
                {menuConfig.map((section) => {
                    const visibleItems = section.items.filter(item => !item.roles || item.roles.includes(role));
                    if (visibleItems.length === 0) return null;
                    return (
                        <div className="nav-section" key={section.section}>
                            <div className="nav-section-title">{section.section}</div>
                            {visibleItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                                const badge = item.badgeKey ? counts[item.badgeKey] : null;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`nav-item ${isActive ? 'active' : ''}`}
                                    >
                                        <span className="nav-icon">
                                            <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                                        </span>
                                        <span>{item.label}</span>
                                        {badge > 0 && <span className="nav-badge">{badge}</span>}
                                        {isActive && <ChevronRight size={14} className="nav-arrow" />}
                                    </Link>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>

            {/* Role Switcher */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Shield size={12} /> Vai trò
                </div>
                <select
                    value={role}
                    onChange={e => switchRole(e.target.value)}
                    style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8,
                        border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                        color: roleInfo.color, fontWeight: 600, fontSize: 12,
                        cursor: 'pointer', outline: 'none',
                    }}
                >
                    {ROLES.map(r => <option key={r.key} value={r.key}>{r.icon} {r.label}</option>)}
                </select>
            </div>
        </aside>
    );
}
