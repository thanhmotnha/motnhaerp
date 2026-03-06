'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels = {
    '': 'Dashboard',
    'customers': 'Khách hàng',
    'projects': 'Dự án',
    'products': 'Sản phẩm & VT',
    'quotations': 'Báo giá',
    'inventory': 'Kho & Tồn kho',
    'finance': 'Tài chính',
    'hr': 'Nhân sự',
    'payroll': 'Bảng lương',
    'reports': 'Báo cáo',
    'pipeline': 'Pipeline',
    'payments': 'Thu tiền',
    'expenses': 'Chi phí',
    'purchasing': 'Mua sắm',
    'contracts': 'Hợp đồng',
    'work-orders': 'Phiếu CV',
    'partners': 'Đối tác',
    'suppliers': 'NCC',
    'contractors': 'Thầu phụ',
    'furniture': 'Nội thất',
    'workshops': 'Xưởng SX',
    'schedule-templates': 'Mẫu tiến độ',
    'acceptance': 'Nghiệm thu',
    'admin': 'Quản trị',
    'users': 'Tài khoản',
    'activity-log': 'Nhật ký',
    'system-health': 'Sức khỏe HT',
    'login': 'Đăng nhập',
    'create': 'Tạo mới',
    'edit': 'Chỉnh sửa',
};

export default function Breadcrumbs() {
    const pathname = usePathname();
    if (pathname === '/' || pathname === '/login') return null;

    const segments = pathname.split('/').filter(Boolean);
    const crumbs = segments.map((seg, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/');
        const label = routeLabels[seg] || decodeURIComponent(seg);
        const isLast = i === segments.length - 1;
        return { href, label, isLast, isId: /^[a-z0-9]{20,}$/i.test(seg) };
    });

    return (
        <nav aria-label="Breadcrumb" style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: 'var(--text-muted)',
            marginBottom: 12, flexWrap: 'wrap',
        }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', textDecoration: 'none' }}>
                <Home size={14} />
            </Link>
            {crumbs.map((c, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ChevronRight size={12} style={{ opacity: 0.5 }} />
                    {c.isLast ? (
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            {c.isId ? '...' + c.label.slice(-6) : c.label}
                        </span>
                    ) : (
                        <Link href={c.href} style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                            onMouseEnter={e => e.target.style.color = 'var(--accent-primary)'}
                            onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                        >
                            {c.isId ? '...' + c.label.slice(-6) : c.label}
                        </Link>
                    )}
                </span>
            ))}
        </nav>
    );
}
