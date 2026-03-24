// Centralized payment templates for contract module
// Used by: contract create/detail pages, API create route

export const CONTRACT_TYPES = [
    'Thiết kế kiến trúc',
    'Thiết kế nội thất',
    'Thi công thô',
    'Thi công hoàn thiện',
    'Thi công nội thất',
];

export const PAYMENT_TEMPLATES = {
    'Thiết kế kiến trúc': [
        { phase: 'Đặt cọc thiết kế', pct: 50, category: 'Thiết kế' },
        { phase: 'Nghiệm thu bản vẽ', pct: 50, category: 'Thiết kế' },
    ],
    'Thiết kế nội thất': [
        { phase: 'Đặt cọc thiết kế nội thất', pct: 50, category: 'Thiết kế' },
        { phase: 'Nghiệm thu phối cảnh 3D', pct: 30, category: 'Thiết kế' },
        { phase: 'Nghiệm thu bản vẽ triển khai', pct: 20, category: 'Thiết kế' },
    ],
    'Thi công thô': [
        { phase: 'Đặt cọc thi công', pct: 30, category: 'Thi công' },
        { phase: 'Hoàn thiện móng + khung', pct: 30, category: 'Thi công' },
        { phase: 'Hoàn thiện xây thô', pct: 30, category: 'Thi công' },
        { phase: 'Nghiệm thu bàn giao thô', pct: 10, category: 'Thi công', retentionRate: 5 },
    ],
    'Thi công hoàn thiện': [
        { phase: 'Đặt cọc hoàn thiện', pct: 30, category: 'Hoàn thiện' },
        { phase: 'Hoàn thiện trát + ốp lát', pct: 25, category: 'Hoàn thiện' },
        { phase: 'Hoàn thiện sơn + điện nước', pct: 25, category: 'Hoàn thiện' },
        { phase: 'Nghiệm thu bàn giao', pct: 20, category: 'Hoàn thiện', retentionRate: 5 },
    ],
    'Thi công nội thất': [
        { phase: 'Đặt cọc nội thất', pct: 50, category: 'Nội thất' },
        { phase: 'Giao hàng + lắp đặt', pct: 40, category: 'Nội thất' },
        { phase: 'Nghiệm thu hoàn thiện', pct: 10, category: 'Nội thất', retentionRate: 5 },
    ],
};

export const CONTRACT_STATUSES = ['Nháp', 'Đã ký', 'Đang thực hiện', 'Hoàn thành', 'Hủy'];

export const TYPE_COLORS = {
    'Thiết kế kiến trúc': 'info',
    'Thiết kế nội thất': 'purple',
    'Thi công thô': 'warning',
    'Thi công hoàn thiện': 'success',
    'Thi công nội thất': 'accent',
};

export const TYPE_ICONS = {
    'Thiết kế kiến trúc': '📐',
    'Thiết kế nội thất': '🎨',
    'Thi công thô': '🧱',
    'Thi công hoàn thiện': '🏠',
    'Thi công nội thất': '🪑',
};
