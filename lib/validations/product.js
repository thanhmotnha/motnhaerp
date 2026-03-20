import { z } from 'zod';
import { optStr, optFloat, optInt, safePartial } from './common';

const SUPPLY_TYPES = ['Mua ngoài', 'Vật tư đặt hàng', 'Vật tư sản xuất', 'Sản xuất nội bộ', 'Dịch vụ'];
const PRODUCT_STATUSES = ['Đang bán', 'Ngừng kinh doanh', 'Hết hàng'];

export const productCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên sản phẩm bắt buộc').max(500),
    category: z.string().trim().min(1, 'Danh mục bắt buộc'),
    unit: z.string().trim().min(1, 'Đơn vị bắt buộc'),
    importPrice: optFloat,
    salePrice: optFloat,
    stock: optInt,
    minStock: optInt,
    supplier: optStr,
    description: optStr,
    dimensions: optStr,
    weight: optFloat,
    color: optStr,
    material: optStr,
    origin: optStr,
    warranty: optStr,
    brand: optStr,
    status: z.enum(PRODUCT_STATUSES).optional().default('Đang bán'),
    supplyType: z.enum(SUPPLY_TYPES).optional().default('Mua ngoài'),
    leadTimeDays: optInt,
    location: optStr,
    image: optStr,
    coreBoard: optStr,
    surfaceCode: optStr,
    categoryId: z.string().optional().nullable().default(null),
}).strict();

export const productUpdateSchema = safePartial(productCreateSchema);

export { SUPPLY_TYPES, PRODUCT_STATUSES };
