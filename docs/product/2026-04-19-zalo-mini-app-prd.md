# PRD: Giao diện Zalo Mini App cho Mot Nha ERP

**Ngày:** 2026-04-19  
**Trạng thái:** Draft for review  
**Sản phẩm:** Zalo Mini App khách hàng cho hệ thống ERP Mot Nha

## 1. Mục tiêu sản phẩm

Xây dựng một Zalo Mini App giúp khách hàng của Mot Nha:

1. Xem nhanh trạng thái dự án ngay trong Zalo.
2. Nhận và xử lý các tác vụ cần phản hồi như duyệt vật liệu, duyệt báo giá, ký hợp đồng, ký nghiệm thu.
3. Theo dõi thanh toán và gửi yêu cầu hỗ trợ sau bàn giao.

## 2. Product principles

1. **Action-first**: người dùng vào từ thông báo hoặc deep link, không phải đi menu nhiều lớp.
2. **Customer-first**: chỉ hiển thị dữ liệu khách cần hiểu và hành động.
3. **Lightweight**: ít nhập liệu, ít form dài, ưu tiên tap-confirm.
4. **Trust-first**: mọi hành động xác nhận/ký đều có timestamp, người thực hiện, IP/device context nếu có.
5. **Zalo-native**: tận dụng OA, deep link, chia sẻ, chat, permission flow đúng ngữ cảnh.

## 3. Phạm vi release

### 3.1. MVP

1. Account linking.
2. Home dashboard.
3. Progress detail.
4. Photo timeline/gallery.
5. Quotation detail + accept.
6. Contract detail + sign.
7. Material confirmation.
8. Payment summary.
9. Support contact.

### 3.2. Phase 2

1. Acceptance sign-off.
2. Warranty module.
3. Notification center in-app.
4. Multiple projects / family delegation.

## 4. Success metrics

| Metric | Target MVP |
|---|---|
| Tỷ lệ khách mở Mini App từ OA message | >= 45% |
| Tỷ lệ khách hoàn tất action sau khi mở deep link | >= 60% |
| Tỷ lệ khách xem tiến độ ít nhất 1 lần/tuần trong giai đoạn thi công | >= 50% |
| Tỷ lệ xác nhận vật liệu qua Mini App thay cho chat tay | >= 70% |
| Giảm số lượt CSKH phải gửi lại link/tóm tắt tiến độ thủ công | >= 40% |

## 5. Assumptions

1. Mini App sẽ được phát hành dưới pháp nhân/OA của Mot Nha theo cơ chế KYB hiện hành của Zalo.
2. ERP vẫn là source of truth cho project, quotation, contract, payment, warranty.
3. Mini App frontend được triển khai riêng, không dùng nguyên App Router hiện tại của `motnha`.
4. Kênh vào chính là OA message/deep link, không phải search tự do trong Mini App store.

## 6. Kiến trúc trải nghiệm

## 6.1. Entry points

| Entry point | Mô tả |
|---|---|
| OA notification deep link | Vào đúng màn hình cần hành động |
| Menu OA / shortcut | Vào Home dashboard |
| QR tại công trình / hồ sơ bàn giao | Vào đúng dự án |
| Link chia sẻ từ sales/PM | Vào Mini App hoặc fallback public page |

## 6.2. Sitemap

1. Home
2. Progress
3. Photos
4. Quotation
5. Contract
6. Materials
7. Payments
8. Support
9. Warranty (Phase 2)
10. Acceptance (Phase 2 hoặc P1.5 nếu cần)

## 7. User flows

## 7.1. Flow A - Link tài khoản

1. User mở Mini App từ OA/menu.
2. App hiển thị onboarding ngắn giải thích lợi ích.
3. App xin quyền cần thiết theo ngữ cảnh, không xin dồn.
4. User nhập OTP hoặc xác nhận thông tin để map với khách hàng trong ERP.
5. App gắn Zalo user với customer/project.
6. User vào Home.

## 7.2. Flow B - Theo dõi tiến độ

1. User mở Home.
2. Chọn dự án hoặc vào dự án mặc định.
3. Xem progress %, milestone, việc tuần này.
4. Chạm vào hạng mục để xem ảnh và nhật ký cập nhật.

## 7.3. Flow C - Duyệt vật liệu

1. OA gửi thông báo “Có vật liệu cần xác nhận”.
2. User vào thẳng màn hình Materials.
3. Xem từng vật liệu, mã màu, khu vực ứng dụng, ảnh swatch.
4. Chọn xác nhận.
5. Hệ thống lưu người xác nhận + thời gian.

## 7.4. Flow D - Duyệt báo giá / ký hợp đồng

1. OA gửi thông báo có báo giá/hợp đồng mới.
2. User mở deep link.
3. Xem chi tiết.
4. Nhập tên + ký xác nhận.
5. Hệ thống cập nhật ERP và phản hồi thành công.

## 7.5. Flow E - Theo dõi thanh toán

1. User mở Home hoặc Payments.
2. Xem đã thanh toán, còn lại, kỳ tiếp theo.
3. Chạm vào từng đợt để xem hạn và trạng thái.
4. Từ đây có thể liên hệ CSKH nếu cần.

## 8. Màn hình chi tiết

## 8.1. Screen 01 - Onboarding & Account Linking

**Mục tiêu**  
Giải thích Mini App dùng để làm gì và gắn tài khoản Zalo với hồ sơ khách hàng.

**Thành phần UI**

- Logo Mot Nha + tagline
- 3 benefit cards ngắn:
  - xem tiến độ,
  - nhận thông báo,
  - ký/xác nhận ngay trên Zalo
- CTA chính: `Kết nối dự án của tôi`
- CTA phụ: `Tôi chỉ muốn xem thử`

**Dữ liệu**

- OA / app config
- customer linking status

**Hành động**

- xin quyền số điện thoại khi user bấm link account
- fallback nhập số điện thoại / mã dự án / OTP nếu không cấp quyền

**Acceptance criteria**

1. Không xin quyền cá nhân khi chưa có giải thích/ngữ cảnh.
2. Nếu user từ chối quyền, vẫn có fallback nhập tay.
3. Sau linking thành công, user vào đúng project home.

## 8.2. Screen 02 - Home Dashboard

**Mục tiêu**  
Cho khách cái nhìn 10 giây về dự án.

**UI blocks**

- Tên dự án, địa chỉ rút gọn
- Progress hero card: `% hoàn thành`
- 3 quick stats:
  - đã thanh toán
  - còn lại
  - mốc tiếp theo
- Section `Việc tuần này`
- Section `Cần bạn phản hồi`
- 4 quick actions:
  - Xem tiến độ
  - Xem vật liệu
  - Xem thanh toán
  - Liên hệ PM

**Dữ liệu nguồn**

- Có thể tái dùng logic từ `app/api/progress/[code]/route.js`
- Cần API tổng hợp mới cho Mini App home

**Acceptance criteria**

1. Load trong <= 2.5 giây trên 4G phổ thông.
2. Nếu chưa có dự án đã link, hiển thị empty state rõ ràng.
3. Nếu có action pending, block này phải nằm trên fold đầu tiên.

## 8.3. Screen 03 - Progress Detail

**Mục tiêu**  
Cho khách xem tiến độ chi tiết theo hạng mục.

**UI blocks**

- Header dự án + status
- Big progress bar
- Tab/segmented switch:
  - Hạng mục
  - Milestones
  - Nhật ký
- Danh sách task/hạng mục dạng accordion
- Photo preview trong từng task

**Dữ liệu nguồn**

- `app/api/progress/[code]/route.js`
- UI tham chiếu từ `app/progress/[code]/page.js`

**Acceptance criteria**

1. User có thể mở/đóng từng hạng mục.
2. Nếu có ảnh, ảnh mở được lightbox hoặc gallery fullscreen.
3. Phải có dấu hiệu “quá hạn / hoàn thành / đang làm”.

## 8.4. Screen 04 - Photo Timeline / Gallery

**Mục tiêu**  
Tách trải nghiệm ảnh ra khỏi tiến độ để khách xem nhanh.

**UI blocks**

- Filter theo ngày / hạng mục
- Timeline ảnh
- Card ảnh: thumbnail, caption, ngày cập nhật
- Fullscreen preview

**Dữ liệu nguồn**

- `app/api/customer/gallery/route.js` có logic tổng hợp từ `ProgressReport` và `SiteLog`

**Lưu ý**

- API hiện trả `{ groups, photos }`, cần Mini App data contract rõ ràng.
- Không dùng lại trực tiếp customer dashboard cũ vì UI/API đang lệch.

## 8.5. Screen 05 - Quotation Detail

**Mục tiêu**  
Cho khách xem báo giá ở dạng mobile-first, dễ hiểu hơn file PDF đầy đủ.

**UI blocks**

- Header: mã báo giá, trạng thái, ngày hiệu lực
- Summary card:
  - tổng giá trị
  - loại báo giá
  - ghi chú chính
- Danh mục hạng mục theo accordion
- Payment schedule preview
- CTA:
  - `Chấp nhận báo giá`
  - `Tải bản đầy đủ`
  - `Liên hệ tư vấn`

**Dữ liệu nguồn**

- `app/api/public/quotations/[id]/route.js`
- `app/api/public/quotations/[id]/accept/route.js`
- Public viewer hiện tại ở `app/public/baogia/[id]/[token]/page.js`

**Acceptance criteria**

1. Bản tóm tắt phải đọc được trên màn hình điện thoại mà không cần zoom như PDF.
2. CTA chấp nhận chỉ mở khi trạng thái hợp lệ.
3. Sau khi chấp nhận, ERP đổi trạng thái và trả màn hình success rõ ràng.

## 8.6. Screen 06 - Contract Detail & Sign

**Mục tiêu**  
Cho khách xem hợp đồng và ký xác nhận trong Mini App.

**UI blocks**

- Header: số hợp đồng, trạng thái
- Sections:
  - thông tin các bên
  - giá trị hợp đồng
  - thời gian
  - phụ lục / đợt thanh toán
- CTA `Ký xác nhận`
- Modal / stepper ký:
  - nhập tên
  - ghi chú
  - ký tay hoặc xác nhận điện tử theo chính sách

**Dữ liệu nguồn**

- `app/api/public/contracts/[id]/route.js`
- `app/api/public/contracts/[id]/accept/route.js`

**Acceptance criteria**

1. Có cảnh báo pháp lý trước khi ký.
2. Không cho ký lặp khi status đã signed/completed.
3. Lưu `signedAt`, `signedByName`, `signatureData`, `signatureIp`.

## 8.7. Screen 07 - Material Confirmation

**Mục tiêu**  
Cho khách xác nhận vật liệu/chất liệu/mã màu đúng ngữ cảnh.

**UI blocks**

- Header đợt chọn vật liệu
- List item:
  - loại vật liệu
  - mã màu / tên màu
  - khu vực áp dụng
  - số lượng
  - ảnh mẫu nếu có
- CTA `Tôi đồng ý với danh sách này`

**Dữ liệu nguồn**

- `app/public/material-confirmation/[token]/page.js`
- `app/api/public/material-confirmation/[token]/route.js`

**Acceptance criteria**

1. Luồng xác nhận hoàn tất trong <= 3 tap sau khi đã đọc nội dung.
2. Action phải idempotent, không xác nhận lặp.
3. Sau xác nhận phải khóa token hoặc đánh dấu đã hoàn tất.

## 8.8. Screen 08 - Payment Summary

**Mục tiêu**  
Cho khách nắm được đã thu bao nhiêu, còn bao nhiêu, kỳ tiếp theo khi nào.

**UI blocks**

- Summary card:
  - giá trị hợp đồng
  - đã thanh toán
  - còn lại
- Timeline các đợt thanh toán
- Status badge: `Đã thanh toán`, `Sắp đến hạn`, `Quá hạn`
- CTA:
  - `Liên hệ kế toán`
  - `Xem hợp đồng`

**Dữ liệu nguồn**

- Cần API customer-facing mới hoặc mở rộng từ contract payment data
- `app/api/customer/quotation/route.js` đã có logic đọc payment schedule từ contract nhưng response chưa đủ ổn định cho UI hiện tại

**Acceptance criteria**

1. Khách không cần hiểu thuật ngữ ERP vẫn đọc được.
2. Đợt gần nhất/sắp đến hạn phải nằm đầu danh sách.
3. Nếu chưa có hợp đồng, hiển thị trạng thái phù hợp.

## 8.9. Screen 09 - Support

**Mục tiêu**  
Biến Mini App thành điểm liên hệ chính thức với Mot Nha.

**UI blocks**

- PM card: tên, số điện thoại, vai trò
- CSKH card
- Nút:
  - `Chat OA`
  - `Gọi hotline`
  - `Để lại yêu cầu`
- FAQ ngắn

**Dữ liệu nguồn**

- manager / supervisor từ project
- OA open chat capability

**Acceptance criteria**

1. Có thể mở chat OA nhanh.
2. Nếu PM chưa có đủ dữ liệu, fallback về hotline/CSKH.
3. Mọi yêu cầu mới phải được ghi nhận về ERP hoặc hệ thống ticket tương ứng.

## 8.10. Screen 10 - Warranty (Phase 2)

**Mục tiêu**  
Cho khách tạo và theo dõi phiếu bảo hành.

**UI blocks**

- Danh sách ticket
- Trạng thái SLA
- Tạo mới ticket:
  - vấn đề
  - mô tả
  - ảnh đính kèm
  - khu vực/sản phẩm liên quan

**Dữ liệu nguồn**

- `model WarrantyTicket`
- API warranty nội bộ hiện có

**Acceptance criteria**

1. Khách tạo ticket được từ điện thoại trong <= 2 phút.
2. Ticket có timeline trạng thái.
3. Có thông báo khi ticket được cập nhật.

## 8.11. Screen 11 - Acceptance Sign-Off (Phase 2 hoặc P1.5)

**Mục tiêu**  
Cho khách ký nghiệm thu hạng mục/nội thất sau khi bàn giao.

**Dữ liệu nguồn**

- `app/public/acceptance/[token]/page.js`
- `app/api/public/acceptance/[token]/route.js`

**Acceptance criteria**

1. Có xem trước danh sách hạng mục nghiệm thu.
2. Có tên người ký + chữ ký.
3. Không ký lại được khi đã signed.

## 9. API mapping

| Capability | API hiện có | Trạng thái | Ghi chú |
|---|---|---|---|
| Progress detail | `/api/progress/[code]` | Reuse tốt | Có thể dùng gần như nguyên trạng |
| Customer dashboard | `/api/customer/project`, `/api/customer/quotation`, `/api/customer/gallery` | Không nên reuse trực tiếp | Contract response đang lệch UI |
| Public quotation detail | `/api/public/quotations/[id]` | Reuse tốt | Cần wrapper cho Mini App |
| Accept quotation | `/api/public/quotations/[id]/accept` | Reuse tốt | Cần UX ký/xác nhận chuẩn hơn |
| Public contract detail | `/api/public/contracts/[id]` | Reuse tốt | Cần Mini App viewer |
| Accept contract | `/api/public/contracts/[id]/accept` | Reuse tốt | Cần cảnh báo pháp lý/UX ký |
| Material confirmation | `/api/public/material-confirmation/[token]` | Reuse rất tốt | Phù hợp deep link |
| Acceptance sign | `/api/public/acceptance/[token]` | Reuse tốt | Có thể đưa Phase 2 |
| OA notification | `lib/zaloNotify.js` | Reuse một phần | Hiện mới dùng cho lead notification |
| Account linking | Chưa có | New | Bắt buộc |
| Customer home aggregate | Chưa có | New | Bắt buộc |
| Warranty customer API | Chưa có customer-facing contract rõ | New/extend | Phase 2 |

## 10. Quyền hạn và phân vai

| Role | Quyền |
|---|---|
| Guest có token action | Chỉ xem và xác nhận đúng action được cấp |
| Customer đã link tài khoản | Xem dự án, thanh toán, tiến độ, materials, contract, support |
| Customer delegate | Phase 2 |
| Internal staff | Không phải persona chính của Mini App; dùng ERP web/mobile |

## 11. Trạng thái và empty states

Tất cả màn hình phải có ít nhất 4 trạng thái:

1. Loading
2. Empty
3. Error
4. Completed / success

Các empty state quan trọng:

- Chưa link dự án
- Chưa có báo giá/hợp đồng
- Chưa có ảnh tiến độ
- Chưa có đợt thanh toán
- Chưa có ticket bảo hành

## 12. Phi chức năng

## 12.1. Performance

1. First meaningful content <= 2.5s trên 4G.
2. Mọi danh sách ảnh phải lazy-load.
3. Tài nguyên nặng cần đẩy lên CDN.

## 12.2. Security

1. Không dựa hoàn toàn vào hidden client state.
2. Mọi action xác nhận/ký phải kiểm tra token/session ở server.
3. Token action phải có expiry hoặc invalidation sau khi dùng.
4. Log audit gồm thời gian, actor, IP/device khi khả dụng.

## 12.3. Platform compliance

1. Permission chỉ được xin theo ngữ cảnh.
2. Không phụ thuộc SSR/SSG của Next.js trong Mini App runtime.
3. Thiết kế hành vi chia sẻ/quay lại theo deep link và OA.

## 12.4. UX

1. Font size cơ bản >= 14px.
2. Nút action chính luôn nằm trong tầm ngón tay.
3. Nội dung tài chính phải có phiên bản “dễ hiểu”, không lộ thuật ngữ ERP thô.

## 13. Analytics events

| Event | Ý nghĩa |
|---|---|
| `miniapp_opened` | User vào app |
| `project_home_viewed` | Xem trang chủ dự án |
| `progress_task_expanded` | Mở hạng mục chi tiết |
| `quotation_viewed` | Xem báo giá |
| `quotation_accepted` | Chấp nhận báo giá |
| `contract_viewed` | Xem hợp đồng |
| `contract_signed` | Ký hợp đồng |
| `materials_viewed` | Xem đợt vật liệu |
| `materials_confirmed` | Xác nhận vật liệu |
| `payment_schedule_viewed` | Xem lịch thanh toán |
| `support_contact_clicked` | Chạm liên hệ |
| `warranty_ticket_created` | Tạo ticket bảo hành |

## 14. Dependencies

1. Zalo OA và KYB hoàn tất.
2. Quy hoạch Mini App frontend riêng.
3. Backend account-linking.
4. Backend aggregate API cho Home.
5. Chuẩn hóa customer-facing response contract.
6. Chính sách chữ ký/pháp lý được duyệt nội bộ.

## 15. Những việc không nên làm

1. Không bê nguyên web ERP vào webview Zalo rồi gọi đó là Mini App.
2. Không đưa sidebar/module nội bộ đầy đủ vào Mini App.
3. Không ép user cấp phone/location ngay lúc mở app lần đầu.
4. Không dùng PDF là trải nghiệm chính cho tất cả hồ sơ.
5. Không để OA message chỉ dẫn về Home chung chung nếu có deep link ngữ cảnh.

## 16. Đề xuất thứ tự build

1. Account linking + project home
2. Progress + gallery
3. OA deep link orchestration
4. Material confirmation
5. Quotation detail + accept
6. Contract detail + sign
7. Payment summary
8. Warranty
9. Acceptance sign-off

## 17. Quyết định sản phẩm cần chốt với business

1. Khách có được xem toàn bộ hợp đồng hay chỉ bản rút gọn trong Mini App?
2. Một tài khoản Zalo có thể gắn nhiều công trình không?
3. Có cho đồng sở hữu/người thân cùng truy cập không?
4. Mức độ pháp lý của chữ ký trong Mini App là xác nhận nội bộ hay chữ ký điện tử chính thức?
5. Có cần thanh toán online ngay trong Mini App hay chỉ xem lịch thanh toán và liên hệ?

## 18. References

- Codebase `motnha`
- `app/progress/[code]/page.js`
- `app/api/progress/[code]/route.js`
- `app/public/material-confirmation/[token]/page.js`
- `app/api/public/material-confirmation/[token]/route.js`
- `app/public/acceptance/[token]/page.js`
- `app/api/public/acceptance/[token]/route.js`
- `app/api/public/quotations/[id]/route.js`
- `app/api/public/quotations/[id]/accept/route.js`
- `app/api/public/contracts/[id]/route.js`
- `app/api/public/contracts/[id]/accept/route.js`
- `app/api/customer/project/route.js`
- `app/api/customer/quotation/route.js`
- `app/api/customer/gallery/route.js`
- `components/settings/IntegrationTab.js`
- `lib/zaloNotify.js`
