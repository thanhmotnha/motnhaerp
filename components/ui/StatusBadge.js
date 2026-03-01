'use client';

const defaultColors = {
    'Lead': { bg: '#EFF6FF', text: '#2563EB' },
    'Đang thi công': { bg: '#FEF3C7', text: '#D97706' },
    'Hoàn thành': { bg: '#D1FAE5', text: '#059669' },
    'Thiết kế': { bg: '#EDE9FE', text: '#7C3AED' },
    'Báo giá': { bg: '#FCE7F3', text: '#DB2777' },
    'Bảo hành': { bg: '#F3E8FF', text: '#9333EA' },
    'Ký hợp đồng': { bg: '#DBEAFE', text: '#2563EB' },
    'Chuẩn bị thi công': { bg: '#FEF9C3', text: '#CA8A04' },
    'Khảo sát': { bg: '#F1F5F9', text: '#475569' },
    'Nháp': { bg: '#F1F5F9', text: '#64748B' },
    'Chờ duyệt': { bg: '#FFF7ED', text: '#EA580C' },
    'Đã duyệt': { bg: '#D1FAE5', text: '#059669' },
    'Đang thực hiện': { bg: '#FEF3C7', text: '#D97706' },
    'Đã ký': { bg: '#DBEAFE', text: '#2563EB' },
    'Chưa thu': { bg: '#FEE2E2', text: '#DC2626' },
    'Đã thu': { bg: '#D1FAE5', text: '#059669' },
    'Thu một phần': { bg: '#FEF3C7', text: '#D97706' },
    'Chờ xử lý': { bg: '#FFF7ED', text: '#EA580C' },
    'Đang xử lý': { bg: '#FEF3C7', text: '#D97706' },
    'Đã thanh toán': { bg: '#D1FAE5', text: '#059669' },
    'Cao': { bg: '#FEE2E2', text: '#DC2626' },
    'Trung bình': { bg: '#FEF3C7', text: '#D97706' },
    'Thấp': { bg: '#D1FAE5', text: '#059669' },
};

export default function StatusBadge({ status, colorMap = {} }) {
    const merged = { ...defaultColors, ...colorMap };
    const c = merged[status] || { bg: '#F1F5F9', text: '#64748B' };

    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '3px 10px', borderRadius: 20,
            background: c.bg, color: c.text,
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
        }}>
            {status}
        </span>
    );
}
