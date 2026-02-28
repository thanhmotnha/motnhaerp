import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const products = [
    { code: 'CUA-D2', name: 'Cửa Composite (Cửa thông phòng)', category: 'Cửa', unit: 'bộ', salePrice: 5900000, description: 'Khoá Kinlong liền thể', brand: 'Composite', material: 'Composite' },
    { code: 'CUA-D7', name: 'Cửa Composite (Cửa P kho, vệ sinh)', category: 'Cửa', unit: 'bộ', salePrice: 4900000, description: 'Khoá Kinlong liền thể', brand: 'Composite', material: 'Composite' },
    { code: 'CUA-CC1', name: 'Cửa cuốn tự động KT: 4380x3060', category: 'Cửa cuốn', unit: 'm2', salePrice: 1990000, description: 'Cửa cuốn matesdoor giảm chấn 2 chiều dày 1.2>1.4 bao gồm trục và ray dẫn hướng', brand: 'Matesdoor', dimensions: '4380x3060' },
    { code: 'CUA-CC1-TOI', name: 'Bộ Tời MasterDoor M400', category: 'Cửa cuốn', unit: 'bộ', salePrice: 9300000, description: 'Sức nâng 400kg, gồm bộ 1 hộp nhận và 2 điều khiển từ xa', brand: 'MasterDoor' },
    { code: 'LCK-01', name: 'Lan can kính cường lực ban công', category: 'Lan can kính', unit: 'md', salePrice: 2450000, description: 'Lan can kính cường lực không trụ âm sàn, tay vịn lan can ban công nhôm Maxpro', brand: 'Maxpro', material: 'Kính cường lực + nhôm' },
    { code: 'LCK-02', name: 'Lan can kính âm sàn cầu thang', category: 'Lan can kính', unit: 'md', salePrice: 4500000, description: 'Lan can kính âm sàn kết hợp từ máng nhôm Cover', brand: 'Cover', material: 'Kính cường lực + nhôm Cover' },
    { code: 'DEN-BL-SP01', name: 'Đèn Bridgelux Mỹ spotlight 4000K & 3500K', category: 'Đèn LED', unit: 'cái', salePrice: 289000, description: 'Bridgelux LED hàng đầu của Mỹ, chất lượng cao và hiệu suất cao', brand: 'Bridgelux', origin: 'Mỹ' },
    { code: 'DEN-BL-SP02', name: 'Đèn Bridgelux Mỹ spotlight 3500K loại chống ẩm', category: 'Đèn LED', unit: 'cái', salePrice: 220000, description: 'Bridgelux spotlight chống ẩm, phù hợp khu vực ẩm ướt', brand: 'Bridgelux', origin: 'Mỹ' },
];

export async function GET() {
    const results = [];
    for (const p of products) {
        try {
            const product = await prisma.product.upsert({
                where: { code: p.code },
                update: { ...p },
                create: { ...p },
            });
            results.push({ ok: true, code: p.code, name: p.name, id: product.id });
        } catch (e) {
            results.push({ ok: false, code: p.code, error: e.message });
        }
    }
    return NextResponse.json({ results, total: results.length, success: results.filter(r => r.ok).length });
}
