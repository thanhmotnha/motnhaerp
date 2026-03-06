// Default budget templates for material plan quick-add
// These can be overridden by settings stored in SystemSetting (key: budget_templates)

export const BUDGET_TEMPLATES_DEFAULT = {
    'Nhà phố 3 tầng': [
        { name: 'Xi măng', unit: 'bao', qty: 800, category: 'Vật liệu thô', costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Cát xây', unit: 'm³', qty: 40, category: 'Vật liệu thô', costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Đá 1x2', unit: 'm³', qty: 30, category: 'Vật liệu thô', costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Thép Ø10', unit: 'kg', qty: 2000, category: 'Sắt thép', costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Thép Ø12', unit: 'kg', qty: 1500, category: 'Sắt thép', costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Thép Ø16', unit: 'kg', qty: 800, category: 'Sắt thép', costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Gạch xây', unit: 'viên', qty: 25000, category: 'Vật liệu thô', costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Nhân công xây thô', unit: 'm²', qty: 350, costType: 'Nhân công', group1: 'Phần thô', supplierTag: 'Thầu phụ cấp' },
        { name: 'Gạch ốp lát 60x60', unit: 'm²', qty: 200, category: 'Hoàn thiện', costType: 'Vật tư', group1: 'Phần hoàn thiện' },
        { name: 'Sơn nước ngoại thất', unit: 'thùng', qty: 15, category: 'Hoàn thiện', costType: 'Vật tư', group1: 'Phần hoàn thiện' },
        { name: 'Sơn nước nội thất', unit: 'thùng', qty: 20, category: 'Hoàn thiện', costType: 'Vật tư', group1: 'Phần hoàn thiện' },
        { name: 'Nhân công hoàn thiện', unit: 'm²', qty: 350, costType: 'Nhân công', group1: 'Phần hoàn thiện', supplierTag: 'Thầu phụ cấp' },
        { name: 'Ống nước PPR Ø25', unit: 'm', qty: 100, category: 'M&E', costType: 'Vật tư', group1: 'M&E (Điện nước)' },
        { name: 'Dây điện 2.5mm²', unit: 'm', qty: 500, category: 'M&E', costType: 'Vật tư', group1: 'M&E (Điện nước)' },
        { name: 'CB 2P 20A', unit: 'cái', qty: 15, category: 'M&E', costType: 'Vật tư', group1: 'M&E (Điện nước)' },
        { name: 'Nhân công M&E', unit: 'công', qty: 60, costType: 'Nhân công', group1: 'M&E (Điện nước)', supplierTag: 'Thầu phụ cấp' },
    ],
    'Biệt thự 2 tầng': [
        { name: 'Xi măng', unit: 'bao', qty: 1200, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Cát xây', unit: 'm³', qty: 60, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Đá 1x2', unit: 'm³', qty: 45, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Thép Ø10', unit: 'kg', qty: 3000, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Thép Ø12', unit: 'kg', qty: 2000, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Thép Ø16', unit: 'kg', qty: 1200, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Thép Ø20', unit: 'kg', qty: 600, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Gạch xây', unit: 'viên', qty: 35000, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Nhân công thô', unit: 'm²', qty: 500, costType: 'Nhân công', group1: 'Phần thô', supplierTag: 'Thầu phụ cấp' },
        { name: 'Gạch ốp lát 80x80', unit: 'm²', qty: 350, costType: 'Vật tư', group1: 'Phần hoàn thiện' },
        { name: 'Đá granite mặt tiền', unit: 'm²', qty: 60, costType: 'Vật tư', group1: 'Phần hoàn thiện' },
        { name: 'Sơn nước ngoại thất', unit: 'thùng', qty: 25, costType: 'Vật tư', group1: 'Phần hoàn thiện' },
        { name: 'Sơn nước nội thất', unit: 'thùng', qty: 30, costType: 'Vật tư', group1: 'Phần hoàn thiện' },
        { name: 'Ống nước PPR Ø25', unit: 'm', qty: 200, costType: 'Vật tư', group1: 'M&E (Điện nước)' },
        { name: 'Dây điện 2.5mm²', unit: 'm', qty: 800, costType: 'Vật tư', group1: 'M&E (Điện nước)' },
    ],
    'Nội thất căn hộ': [
        { name: 'Gỗ MDF chống ẩm', unit: 'm²', qty: 80, costType: 'Vật tư', group1: 'Nội thất gỗ', group2: 'Phòng khách' },
        { name: 'Vách phẳng MDF', unit: 'm²', qty: 40, costType: 'Vật tư', group1: 'Nội thất gỗ', group2: 'Phòng ngủ 01' },
        { name: 'Bản lề giảm chấn', unit: 'bộ', qty: 30, costType: 'Vật tư', group1: 'Nội thất gỗ' },
        { name: 'Ray trượt ngăn kéo', unit: 'bộ', qty: 20, costType: 'Vật tư', group1: 'Nội thất gỗ' },
        { name: 'Đèn LED panel', unit: 'cái', qty: 15, costType: 'Vật tư', group1: 'M&E (Điện nước)' },
        { name: 'Đèn downlight spotlight', unit: 'cái', qty: 25, costType: 'Vật tư', group1: 'M&E (Điện nước)' },
        { name: 'Đá thạch anh countertop', unit: 'm dài', qty: 6, costType: 'Vật tư', group1: 'Nội thất gỗ', group2: 'Phòng bếp' },
        { name: 'Kính cường lực 10mm', unit: 'm²', qty: 10, costType: 'Vật tư', group1: 'Nội thất gỗ' },
        { name: 'Nhân công lắp đặt', unit: 'công', qty: 40, costType: 'Nhân công', group1: 'Nội thất gỗ', supplierTag: 'Thầu phụ cấp' },
    ],
};

export const COST_TYPES = ['Vật tư', 'Nhân công', 'Thầu phụ', 'Khác'];
export const GROUP1_PRESETS = ['Phần thô', 'Phần hoàn thiện', 'Nội thất gỗ', 'M&E (Điện nước)', 'Ngoại thất'];
