// Shared constants and utilities for furniture module
export const STATUS_LABEL = {
    draft: 'Nháp', confirmed: 'Đã xác nhận', design_review: 'Chờ duyệt TK',
    design_approved: 'TK đã duyệt', material_confirmed: 'Đã chốt VL',
    in_production: 'Đang SX', qc_done: 'Đã QC', installing: 'Đang lắp',
    completed: 'Hoàn thành', cancelled: 'Đã hủy',
};
export const STATUS_COLOR = {
    draft: 'muted', confirmed: 'info', design_review: 'warning',
    design_approved: 'info', material_confirmed: 'info',
    in_production: 'warning', qc_done: 'success', installing: 'warning',
    completed: 'success', cancelled: 'danger',
};
export const STATUS_NEXT = {
    draft: 'confirmed', confirmed: 'design_review',
    design_approved: 'material_confirmed', material_confirmed: 'in_production',
    in_production: 'qc_done', qc_done: 'installing', installing: 'completed',
};
export const STATUS_NEXT_LABEL = {
    draft: 'Xác nhận đơn', confirmed: 'Gửi duyệt TK',
    design_approved: 'Chốt vật liệu', material_confirmed: 'Mở lệnh SX',
    in_production: 'Chuyển QC', qc_done: 'Bắt đầu lắp',
    installing: 'Hoàn thành',
};

export const fmtMoney = (v) => v?.toLocaleString('vi-VN') || '0';
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
export const fmtDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';
