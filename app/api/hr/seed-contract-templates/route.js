// app/api/hr/seed-contract-templates/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/apiHandler';

const PROBATION_TEMPLATE = `<div style="font-family:Times New Roman,serif;font-size:14pt;line-height:1.8;padding:40px">
<p style="text-align:center;font-weight:bold;font-size:16pt">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
<p style="text-align:center;font-weight:bold">Độc lập – Tự do – Hạnh phúc</p>
<p style="text-align:center">———————</p>
<p style="text-align:center;font-weight:bold;font-size:15pt;margin-top:20px">HỢP ĐỒNG THỬ VIỆC</p>
<p style="text-align:center;font-style:italic">Số: {{Ma_HD_LD}}</p>
<p>Hôm nay, ngày {{Ngay_Ky_HD_So}} tháng {{Thang_Ky_HD}} năm {{Nam_Ky_HD}}, tại {{DC_Cong_Ty}}</p>
<p>Chúng tôi gồm:</p>
<p><strong>BÊN A (NGƯỜI SỬ DỤNG LAO ĐỘNG):</strong></p>
<p>Tên đơn vị: {{Ten_Cong_Ty}}</p>
<p>Địa chỉ: {{DC_Cong_Ty}}</p>
<p>Đại diện: Ông/Bà {{Nguoi_DD_CT}} — Chức vụ: {{Chuc_Vu_DD}}</p>
<p><strong>BÊN B (NGƯỜI LAO ĐỘNG):</strong></p>
<p>Họ và tên: {{Ten_NV}}</p>
<p>Ngày sinh: {{Ngay_Sinh_NV}}</p>
<p>CMND/CCCD: {{CCCD_NV}}</p>
<p>Địa chỉ thường trú: {{Dia_Chi_NV}}</p>
<p>Số điện thoại: {{SDT_NV}}</p>
<p><strong>ĐIỀU 1: CÔNG VIỆC VÀ ĐỊA ĐIỂM LÀM VIỆC</strong></p>
<p>1.1. Chức danh công việc: {{Chuc_Vu_HD}}</p>
<p>1.2. Phòng/Ban: {{Phong_Ban_HD}}</p>
<p>1.3. Địa điểm làm việc: {{DC_Cong_Ty}}</p>
<p><strong>ĐIỀU 2: THỜI HẠN THỬ VIỆC</strong></p>
<p>Thời gian thử việc: 02 (hai) tháng, kể từ ngày {{Ngay_BD_HD}} đến ngày {{Ngay_KT_HD}}.</p>
<p><strong>ĐIỀU 3: TIỀN LƯƠNG VÀ CHẾ ĐỘ</strong></p>
<p>3.1. Lương thử việc: {{Luong_HD}} đồng/tháng (bằng chữ: {{Luong_HD_Chu}}).</p>
<p>3.2. Hình thức trả lương: Chuyển khoản ngân hàng, ngày 05 hàng tháng.</p>
<p>3.3. Trong thời gian thử việc, Bên B không tham gia bảo hiểm xã hội bắt buộc theo quy định của pháp luật.</p>
<p><strong>ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B</strong></p>
<p>4.1. Thực hiện đầy đủ các công việc được giao đúng tiến độ và chất lượng yêu cầu.</p>
<p>4.2. Tuân thủ nội quy, quy chế của Công ty.</p>
<p>4.3. Giữ bí mật thông tin, tài liệu liên quan đến hoạt động kinh doanh của Công ty.</p>
<p>4.4. Được hưởng lương và các chế độ đã thỏa thuận tại Điều 3.</p>
<p><strong>ĐIỀU 5: KẾT THÚC THỬ VIỆC</strong></p>
<p>Khi kết thúc thời gian thử việc, Bên A sẽ thông báo kết quả cho Bên B:</p>
<p>- Nếu đạt yêu cầu: Hai bên tiến hành ký kết Hợp đồng lao động chính thức.</p>
<p>- Nếu không đạt: Bên A có quyền chấm dứt hợp đồng thử việc mà không cần báo trước.</p>
<p><strong>ĐIỀU 6: ĐIỀU KHOẢN CHUNG</strong></p>
<p>Hợp đồng này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản.</p>
<div style="display:flex;justify-content:space-between;margin-top:60px;text-align:center">
  <div><p><strong>BÊN B</strong></p><p style="font-style:italic">(Ký và ghi rõ họ tên)</p><br/><br/><br/><p>{{Ten_NV}}</p></div>
  <div><p><strong>BÊN A</strong></p><p style="font-style:italic">(Ký, đóng dấu)</p><br/><br/><br/><p>{{Nguoi_DD_CT}}</p></div>
</div>
</div>`;

const OFFICIAL_TEMPLATE = `<div style="font-family:Times New Roman,serif;font-size:14pt;line-height:1.8;padding:40px">
<p style="text-align:center;font-weight:bold;font-size:16pt">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
<p style="text-align:center;font-weight:bold">Độc lập – Tự do – Hạnh phúc</p>
<p style="text-align:center">———————</p>
<p style="text-align:center;font-weight:bold;font-size:15pt;margin-top:20px">HỢP ĐỒNG LAO ĐỘNG</p>
<p style="text-align:center;font-style:italic">Số: {{Ma_HD_LD}}</p>
<p>Hôm nay, ngày {{Ngay_Ky_HD_So}} tháng {{Thang_Ky_HD}} năm {{Nam_Ky_HD}}, tại {{DC_Cong_Ty}}</p>
<p>Chúng tôi gồm:</p>
<p><strong>BÊN A (NGƯỜI SỬ DỤNG LAO ĐỘNG):</strong></p>
<p>Tên đơn vị: {{Ten_Cong_Ty}}</p>
<p>Địa chỉ: {{DC_Cong_Ty}}</p>
<p>Đại diện: Ông/Bà {{Nguoi_DD_CT}} — Chức vụ: {{Chuc_Vu_DD}}</p>
<p><strong>BÊN B (NGƯỜI LAO ĐỘNG):</strong></p>
<p>Họ và tên: {{Ten_NV}}</p>
<p>Ngày sinh: {{Ngay_Sinh_NV}}</p>
<p>CMND/CCCD: {{CCCD_NV}}</p>
<p>Địa chỉ thường trú: {{Dia_Chi_NV}}</p>
<p>Số điện thoại: {{SDT_NV}}</p>
<p><strong>ĐIỀU 1: LOẠI HỢP ĐỒNG VÀ THỜI HẠN</strong></p>
<p>1.1. Loại hợp đồng: {{Loai_HD_LD}}</p>
<p>1.2. Thời hạn: từ ngày {{Ngay_BD_HD}} đến ngày {{Ngay_KT_HD}}.</p>
<p>1.3. Địa điểm làm việc: {{DC_Cong_Ty}}</p>
<p><strong>ĐIỀU 2: CÔNG VIỆC</strong></p>
<p>2.1. Chức danh: {{Chuc_Vu_HD}}</p>
<p>2.2. Phòng/Ban: {{Phong_Ban_HD}}</p>
<p>2.3. Bên B thực hiện đầy đủ các công việc được Bên A giao, đảm bảo đúng tiến độ và chất lượng.</p>
<p><strong>ĐIỀU 3: TIỀN LƯƠNG VÀ CHẾ ĐỘ</strong></p>
<p>3.1. Mức lương: {{Luong_HD}} đồng/tháng (bằng chữ: {{Luong_HD_Chu}}).</p>
<p>3.2. Mức lương đóng bảo hiểm xã hội: {{Luong_BH}} đồng/tháng.</p>
<p>3.3. Hình thức trả lương: Chuyển khoản ngân hàng, ngày 05 hàng tháng.</p>
<p>3.4. Bên B được tham gia BHXH, BHYT, BHTN theo quy định của pháp luật hiện hành.</p>
<p>3.5. Chế độ nghỉ phép: 12 ngày/năm theo quy định Bộ luật Lao động.</p>
<p><strong>ĐIỀU 4: NGHĨA VỤ VÀ QUYỀN LỢI</strong></p>
<p>4.1. Bên B tuân thủ nội quy, quy chế và các quy định của Công ty.</p>
<p>4.2. Bên B bảo mật thông tin, tài liệu và không tiết lộ bí mật kinh doanh.</p>
<p>4.3. Bên A thanh toán lương và đóng bảo hiểm xã hội đầy đủ, đúng hạn.</p>
<p>4.4. Bên A cung cấp điều kiện làm việc và trang thiết bị cần thiết cho Bên B.</p>
<p><strong>ĐIỀU 5: CHẤM DỨT HỢP ĐỒNG</strong></p>
<p>5.1. Hợp đồng chấm dứt khi hết thời hạn hoặc theo thỏa thuận của hai bên.</p>
<p>5.2. Một trong hai bên muốn chấm dứt trước thời hạn phải thông báo trước 30 ngày.</p>
<p><strong>ĐIỀU 6: ĐIỀU KHOẢN CHUNG</strong></p>
<p>Hợp đồng này có hiệu lực kể từ ngày ký và được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản. Mọi tranh chấp giải quyết theo quy định của pháp luật lao động Việt Nam.</p>
<div style="display:flex;justify-content:space-between;margin-top:60px;text-align:center">
  <div><p><strong>BÊN B (NGƯỜI LAO ĐỘNG)</strong></p><p style="font-style:italic">(Ký và ghi rõ họ tên)</p><br/><br/><br/><p>{{Ten_NV}}</p></div>
  <div><p><strong>BÊN A (NGƯỜI SỬ DỤNG LAO ĐỘNG)</strong></p><p style="font-style:italic">(Ký tên, đóng dấu)</p><br/><br/><br/><p>{{Nguoi_DD_CT}}</p></div>
</div>
</div>`;

export const POST = withAuth(async () => {
    const existing1 = await prisma.contractTemplate.findFirst({ where: { name: 'Hợp đồng thử việc', type: 'Lao động' } });
    if (!existing1) {
        await prisma.contractTemplate.create({
            data: { name: 'Hợp đồng thử việc', type: 'Lao động', body: PROBATION_TEMPLATE, isDefault: false },
        });
    }
    const existing2 = await prisma.contractTemplate.findFirst({ where: { name: 'Hợp đồng lao động chính thức', type: 'Lao động' } });
    if (!existing2) {
        await prisma.contractTemplate.create({
            data: { name: 'Hợp đồng lao động chính thức', type: 'Lao động', body: OFFICIAL_TEMPLATE, isDefault: true },
        });
    }
    return NextResponse.json({ success: true, message: 'Templates seeded' });
}, { roles: ['giam_doc', 'ke_toan'] });
