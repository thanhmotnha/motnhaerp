'use client';

/**
 * EmptyState — Hiển thị khi không có dữ liệu.
 * Dùng cho tất cả list pages thay vì "Không có dữ liệu" text.
 */
export default function EmptyState({
    icon = '📋',
    title = 'Chưa có dữ liệu',
    description = '',
    actionLabel,
    onAction,
    actionHref,
    style = {},
}) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '48px 24px', textAlign: 'center', ...style,
        }}>
            <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, marginBottom: 16,
            }}>
                {icon}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                {title}
            </div>
            {description && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320, marginBottom: 16, lineHeight: 1.5 }}>
                    {description}
                </div>
            )}
            {(actionLabel && (onAction || actionHref)) && (
                actionHref ? (
                    <a href={actionHref} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                        {actionLabel}
                    </a>
                ) : (
                    <button className="btn btn-primary" onClick={onAction}>
                        {actionLabel}
                    </button>
                )
            )}
        </div>
    );
}

// Preset empty states for common pages
export const EMPTY_STATES = {
    projects: { icon: '🏗️', title: 'Chưa có dự án', description: 'Tạo dự án đầu tiên để bắt đầu quản lý', actionLabel: '+ Tạo dự án' },
    customers: { icon: '👥', title: 'Chưa có khách hàng', description: 'Thêm khách hàng để quản lý thông tin và dự án', actionLabel: '+ Thêm khách hàng' },
    quotations: { icon: '📝', title: 'Chưa có báo giá', description: 'Tạo báo giá cho khách hàng', actionLabel: '+ Tạo báo giá' },
    contracts: { icon: '📄', title: 'Chưa có hợp đồng', description: 'Hợp đồng sẽ hiển thị tại đây sau khi tạo' },
    workOrders: { icon: '🔧', title: 'Chưa có phiếu CV', description: 'Tạo phiếu công việc để theo dõi tiến độ', actionLabel: '+ Tạo phiếu CV' },
    expenses: { icon: '🧾', title: 'Chưa có chi phí', description: 'Ghi nhận chi phí phát sinh của dự án', actionLabel: '+ Ghi chi phí' },
    products: { icon: '📦', title: 'Chưa có sản phẩm', description: 'Thêm sản phẩm và vật tư để quản lý', actionLabel: '+ Thêm sản phẩm' },
    acceptance: { icon: '📋', title: 'Chưa có biên bản', description: 'Tạo biên bản nghiệm thu cho dự án', actionLabel: '+ Tạo biên bản' },
    payroll: { icon: '💰', title: 'Chưa có bảng lương', description: 'Nhấn "Tính lương" để tạo bảng lương tháng này' },
    search: { icon: '🔍', title: 'Không tìm thấy', description: 'Thử tìm với từ khóa khác' },
    noPermission: { icon: '🔒', title: 'Không có quyền', description: 'Bạn không có quyền truy cập chức năng này' },
};
