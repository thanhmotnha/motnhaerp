/**
 * Load supplier/contractor types từ DB settings.
 * Fallback về default nếu chưa cấu hình.
 */
export const DEFAULT_SUPPLIER_TYPES = ['Vật tư xây dựng', 'Thiết bị vệ sinh', 'Thiết bị điện', 'Nội thất', 'Sắt thép', 'Gạch ốp lát', 'Sơn', 'Nhôm kính', 'Cơ khí', 'Khác'];
export const DEFAULT_CONTRACTOR_TYPES = ['Thầu xây dựng', 'CTV thiết kế kiến trúc', 'CTV Kết cấu', 'CTV 3D', 'Thầu mộc', 'Thầu điện', 'Thầu nước', 'Thầu sơn', 'Thầu đá', 'Thầu cơ khí', 'Thầu nhôm kính', 'Thầu trần thạch cao', 'Khác'];

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000; // 1 phút

export async function fetchPartnerTypes() {
    const now = Date.now();
    if (_cache && now - _cacheTime < CACHE_TTL) return _cache;

    try {
        const res = await fetch('/api/admin/settings');
        if (!res.ok) throw new Error('failed');
        const d = await res.json();
        const supplierTypes = d.supplier_types ? JSON.parse(d.supplier_types) : DEFAULT_SUPPLIER_TYPES;
        const contractorTypes = d.contractor_types ? JSON.parse(d.contractor_types) : DEFAULT_CONTRACTOR_TYPES;
        _cache = { supplierTypes, contractorTypes };
        _cacheTime = now;
        return _cache;
    } catch {
        return { supplierTypes: DEFAULT_SUPPLIER_TYPES, contractorTypes: DEFAULT_CONTRACTOR_TYPES };
    }
}
