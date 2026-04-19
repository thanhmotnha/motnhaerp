# BA: Zalo Mini App cho Mot Nha ERP

**Ngày:** 2026-04-19  
**Trạng thái:** Research draft  
**Phạm vi:** Nghiên cứu bài toán nghiệp vụ và đề xuất phạm vi cho giao diện Zalo Mini App, bám theo codebase `motnha`

## 1. Kết luận ngắn

Zalo Mini App cho Mot Nha **không nên được định nghĩa là một “mobile app ERP thu nhỏ”**. Dựa trên hiện trạng codebase, hướng phù hợp nhất là:

- Xem Mini App như một **lớp self-service cho khách hàng** nằm phía trước ERP.
- Tận dụng các năng lực đã có trong repo: xem tiến độ công trình, xem báo giá/hợp đồng public, xác nhận vật liệu, ký nghiệm thu, thông báo qua Zalo OA.
- Giữ toàn bộ backoffice ERP nặng như mua hàng, kế toán, nhân sự, kho, sản xuất ở web ERP hiện tại.

Nói cách khác: **Mini App là cửa sổ tương tác khách hàng trên Zalo, còn ERP web vẫn là hệ thống vận hành nội bộ**.

## 2. Căn cứ từ codebase hiện tại

### 2.1. Năng lực có thể tái sử dụng ngay

| Năng lực | Hiện trạng trong repo | Nhận xét BA |
|---|---|---|
| Theo dõi tiến độ công trình | `app/progress/[code]/page.js`, `app/api/progress/[code]/route.js` | Đây là lõi phù hợp nhất cho Mini App khách hàng |
| Dashboard khách hàng | `app/customer/index/page.js` | Có ý tưởng đúng nhưng implementation chưa ổn định |
| Xem báo giá public | `app/public/baogia/[id]/[token]/page.js`, `app/api/public/quotations/[id]/route.js` | Có thể tái dùng làm màn hình chi tiết báo giá |
| Chấp nhận báo giá | `app/api/public/quotations/[id]/accept/route.js` | Đã có action xác nhận + lưu chữ ký/IP |
| Xem hợp đồng public | `app/api/public/contracts/[id]/route.js` | Có dữ liệu để dựng contract viewer |
| Ký hợp đồng | `app/api/public/contracts/[id]/accept/route.js` | Có backend nhận xác nhận/ký |
| Xác nhận vật liệu | `app/public/material-confirmation/[token]/page.js`, `app/api/public/material-confirmation/[token]/route.js` | Rất hợp với luồng từ Zalo OA deep link |
| Ký nghiệm thu | `app/public/acceptance/[token]/page.js`, `app/api/public/acceptance/[token]/route.js` | Có thể map thành luồng ký biên bản trên Zalo |
| Token portal khách hàng | `model ClientPortalToken`, `app/api/client-portal/route.js` | Có nền tảng chia sẻ quyền truy cập theo dự án |
| Zalo OA notification | `lib/zaloNotify.js`, `components/settings/IntegrationTab.js` | Repo đã có tư duy vận hành qua OA |

### 2.2. Gaps quan trọng

| Gap | Bằng chứng | Ý nghĩa BA |
|---|---|---|
| Chưa có Zalo Mini App thực thụ | Không có route, config, auth flow hay capability riêng cho Mini App trong repo | Cần coi đây là sản phẩm mới, không phải “đã có sẵn rồi” |
| Chưa có đăng nhập/liên kết tài khoản Zalo | Auth hiện tại là NextAuth credentials + Bearer token mobile (`app/api/auth/mobile/route.js`, `lib/apiHandler.js`) | Thiếu lớp identity mapping giữa user Zalo và customer trong ERP |
| Customer dashboard hiện có không đồng bộ với API | `app/customer/index/page.js` gọi `/api/customer/project`, `/quotation`, `/gallery` nhưng shape dữ liệu lệch với response thực tế | Không thể bê nguyên customer portal hiện tại sang Zalo |
| Chưa có warranty portal cho khách hàng | Có `model WarrantyTicket`, API và trang nội bộ `/warranty`, nhưng chưa có public/customer flow | Đây là gap lớn sau bàn giao |
| Chưa có notification center / deep link orchestration cho khách hàng | Có OA helper nhưng chưa có flow theo trạng thái dự án/hồ sơ | Chưa tận dụng được lợi thế re-engagement của Zalo |
| Chưa có multi-project selector / family access | Hầu hết flow đang assume 1 customer - 1 project gần nhất | Không đủ cho khách có nhiều công trình hoặc người thân cùng theo dõi |

### 2.3. Gaps kỹ thuật cụ thể ở customer portal hiện tại

Các điểm dưới đây cho thấy phần “customer portal” trong repo mới ở mức ý tưởng/prototype:

1. `app/customer/index/page.js` kỳ vọng `project.name`, `project.milestones`, `project.payments`, nhưng `app/api/customer/project/route.js` trả về `{ project: {...}, milestones: [...] }` và không trả `payments`.
2. `app/customer/index/page.js` đọc `g?.data` cho gallery, nhưng `app/api/customer/gallery/route.js` trả `{ groups, photos }`.
3. `app/customer/index/page.js` dùng `quotation.type`, `quotation.vat`, `quotation.managementFeeRate`, nhưng `app/api/customer/quotation/route.js` không trả các field này.

Kết luận: **Mini App nên tái thiết kế từ data contract/API contract rõ ràng**, không dựng tiếp trên customer dashboard hiện tại.

## 3. Bài toán nghiệp vụ cần giải

### 3.1. Vấn đề hiện tại

- Khách hàng của Mot Nha trao đổi nhiều qua Zalo nhưng thông tin dự án lại nằm trong ERP web/public link rời rạc.
- Các mốc quan trọng như gửi báo giá, duyệt vật liệu, ký hợp đồng, nghiệm thu, bảo hành đang thiếu một kênh tương tác thống nhất trong môi trường khách hàng dùng hằng ngày.
- Việc mở link web ngoài Zalo gây đứt mạch trải nghiệm, khó re-engage, khó chuẩn hóa thông báo theo trạng thái dự án.

### 3.2. Cơ hội

- Zalo là kênh giao tiếp quen thuộc của khách hàng nhà ở/nội thất tại Việt Nam.
- ERP đã có phần lớn backend cho các touchpoint khách hàng.
- Mini App có thể trở thành một lớp trải nghiệm thống nhất cho:
  - xem tiến độ,
  - xem hồ sơ thương mại,
  - xác nhận/ ký số nhẹ,
  - gửi yêu cầu bảo hành,
  - nhận nhắc việc qua OA.

## 4. Định nghĩa sản phẩm

### 4.1. Product statement

Zalo Mini App của Mot Nha là **cổng khách hàng trên Zalo** giúp khách:

- theo dõi tình trạng dự án,
- nhận và xử lý các yêu cầu phê duyệt,
- xem các mốc thanh toán/hồ sơ,
- gửi yêu cầu hỗ trợ sau bàn giao.

### 4.2. Không phải là gì

- Không phải bản clone của app mobile nội bộ.
- Không phải kênh thao tác cho mua hàng, kho, nhân sự, kế toán.
- Không phải CMS/public website thay thế ERP.

## 5. Personas và nhu cầu

| Persona | Mô tả | Nhu cầu chính |
|---|---|---|
| Chủ nhà / khách hàng chính | Người ký hợp đồng, quyết định vật liệu, theo dõi tiến độ | Muốn xem tiến độ minh bạch, hồ sơ rõ ràng, ký/xác nhận nhanh |
| Người đồng quyết định | Vợ/chồng/con hoặc người được ủy quyền | Muốn xem thông tin chọn lọc, nhất là ảnh, vật liệu, lịch bàn giao |
| CSKH / PM nội bộ | Người gửi hồ sơ, nhắc khách, theo dõi phản hồi | Muốn gửi link đúng ngữ cảnh, theo dõi khách đã xem/chưa xem/xác nhận |
| Ban giám đốc | Không dùng Mini App thường xuyên | Muốn tỷ lệ khách tương tác cao, giảm thao tác thủ công qua chat |

## 6. JTBD

1. Khi tôi đang thi công nhà, tôi muốn mở Zalo là xem ngay công trình của mình đang tới đâu để không phải hỏi từng lần.
2. Khi Mot Nha gửi vật liệu/báo giá/hợp đồng, tôi muốn xác nhận ngay trong Zalo để thao tác nhanh, ít rủi ro bỏ sót.
3. Sau bàn giao, tôi muốn báo bảo hành và theo dõi xử lý trong cùng một kênh.
4. Khi có thông báo quan trọng, tôi muốn được dẫn thẳng vào đúng màn hình cần xem/chấp thuận thay vì đọc tin nhắn chung chung.

## 7. Phạm vi nghiệp vụ đề xuất

### 7.1. In-scope cho Zalo Mini App

1. Liên kết tài khoản Zalo với khách hàng/dự án trong ERP.
2. Trang chủ khách hàng: tổng quan dự án, tiến độ, công việc tuần này, số tiền đã thanh toán/còn lại.
3. Tiến độ chi tiết: milestone, task, ảnh hiện trường, nhật ký gần đây.
4. Báo giá: xem chi tiết và xác nhận báo giá.
5. Hợp đồng: xem hợp đồng và ký xác nhận.
6. Xác nhận vật liệu nội thất.
7. Ký biên bản nghiệm thu.
8. Lịch thanh toán và lịch sử thanh toán.
9. Bảo hành: tạo ticket, xem trạng thái, xem SLA.
10. Kênh hỗ trợ: gọi hotline, chat OA, liên hệ PM/CSKH.
11. OA notification + deep link đến đúng màn hình.

### 7.2. Out-of-scope cho Mini App giai đoạn đầu

1. CRM lead management nội bộ.
2. Tạo/chỉnh sửa báo giá từ phía khách.
3. Quản lý mua hàng, nhà cung cấp, kho, sản xuất, nhân sự, kế toán.
4. Workflow phê duyệt nội bộ nhiều bước.
5. Dashboard điều hành cho ban giám đốc.

## 8. Định hướng kiến trúc nghiệp vụ

### 8.1. Bounded context

- **ERP web**: hệ thống vận hành nội bộ.
- **Public token flows**: báo giá, hợp đồng, vật liệu, nghiệm thu.
- **Zalo Mini App**: lớp orchestration khách hàng, gom các luồng public/customer thành một trải nghiệm thống nhất.
- **Zalo OA**: kênh thông báo và entry point.

### 8.2. Đề xuất mô hình truy cập

Có 2 lớp truy cập:

1. **Session-linked access**  
   Dùng khi khách đã liên kết tài khoản Zalo với hồ sơ khách hàng trong ERP. Cho phép xem tổng quan, tiến độ, thanh toán, warranty.

2. **Action token access**  
   Dùng cho từng nghiệp vụ có tính ràng buộc như:
   - xác nhận vật liệu,
   - chấp nhận báo giá,
   - ký hợp đồng,
   - ký nghiệm thu.

Mô hình này phù hợp với hiện trạng repo vì phần token-based action đã có sẵn.

## 9. Ràng buộc đặc thù Zalo Mini App

Các điểm dưới đây là ràng buộc nền tảng, không nên thiết kế như app web/mobile thông thường:

1. **Mini App và OA là hai lớp khác nhau nhưng nên đi cùng nhau**. Zalo mô tả OA là tài khoản chính thức để giao tiếp/nhận thông báo, còn Mini App là ứng dụng chạy trên nền tảng Zalo để cung cấp dịch vụ. Vì vậy kiến trúc sản phẩm cần ghép cặp OA + Mini App, không chỉ có Mini App đơn lẻ.  
   Nguồn: Zalo Mini App For Business FAQ.

2. **Nếu đã có Web App/Native App thì có thể rút ngắn thời gian phát triển Mini App nhờ backend và giao diện sẵn có**. Điều này ủng hộ chiến lược reuse API/flow hiện có của `motnha`.  
   Nguồn: Zalo Mini App For Business FAQ.

3. **Next.js SSR/SSG không được hỗ trợ trong Mini App** theo hướng dẫn chuyển đổi dự án Next.js sang Zalo Mini App được Zalo giới thiệu trong bản tin tháng 06/2023. Điều này có nghĩa Mini App không thể bê nguyên App Router hiện tại.  
   Hệ quả BA: cần tách một frontend Mini App riêng, thiên về client-rendered/static assets.

4. **Quyền riêng tư phải được xin theo ngữ cảnh sử dụng**. Zalo nêu rõ API cá nhân như số điện thoại/vị trí/follow OA chỉ nên gọi khi phát sinh hành động từ người dùng, không tự động vô cớ.  
   Hệ quả BA: không được thiết kế màn hình onboarding kiểu “vào app là xin hết quyền”.

5. **Deep link và chia sẻ là capability cốt lõi của Mini App**. Zalo đã cập nhật `openShareSheet` hỗ trợ deep link và có `minimizeApp`, `openChat`, `getPhoneNumber`, v.v.  
   Hệ quả BA: mọi thông báo quan trọng nên có deep link tới đúng màn hình/ngữ cảnh.

6. **Thông báo tới người dùng có thể đi qua OA/ZNS**. Điều này rất hợp với các trạng thái như “đã có vật liệu cần duyệt”, “đến hạn thanh toán”, “có ticket bảo hành mới cập nhật”.  
   Hệ quả BA: notification không chỉ là nice-to-have mà là năng lực chính của Mini App.

7. **Từ 15/10/2025, Zalo Mini App áp dụng cơ chế xác thực mới (KYB)** cho toàn bộ Mini App.  
   Hệ quả BA: phát hành chính thức cần chuẩn bị tài khoản OA/chủ sở hữu pháp lý và hồ sơ xác thực từ đầu.

## 10. Năng lực nên ưu tiên theo tần suất và giá trị

| Ưu tiên | Năng lực | Lý do |
|---|---|---|
| P0 | Liên kết tài khoản + trang chủ + tiến độ dự án | Tần suất cao nhất, giá trị minh bạch lớn nhất |
| P0 | OA notification + deep link | Là khác biệt cốt lõi của Zalo Mini App |
| P0 | Xác nhận vật liệu | Có sẵn backend, hành vi khách hàng rõ ràng |
| P1 | Xem/chấp nhận báo giá | Có sẵn nền tảng public flow |
| P1 | Xem/ký hợp đồng | Giá trị cao nhưng cần UX ký chắc chắn |
| P1 | Thanh toán / lịch thanh toán | Khách cần xem nhiều nhưng repo hiện chưa có customer-ready contract chuẩn |
| P2 | Ký nghiệm thu | Có sẵn backend, tần suất thấp hơn |
| P2 | Warranty portal | Rất quan trọng hậu bàn giao nhưng cần bổ sung backend/customer UI |

## 11. Đề xuất MVP nghiệp vụ

### MVP nên có

1. Ghép OA + Mini App + tài khoản khách hàng.
2. Trang chủ dự án.
3. Tiến độ + gallery + nhật ký gần đây.
4. Quotation viewer + accept.
5. Material confirmation.
6. Contract viewer + accept/sign.
7. Payment summary cơ bản.
8. Nút liên hệ PM/CSKH/OA.

### Chưa nên đưa vào MVP

1. Upload hồ sơ phức tạp từ khách.
2. Online payment nhiều cổng.
3. Multi-project phức tạp.
4. Family member delegation phức tạp.
5. Warranty workflow đầy đủ nếu backend chưa hoàn chỉnh.

## 12. Backlog BA bắt buộc trước khi build

1. Quy định rõ cơ chế map `Zalo user <-> Customer <-> Project`.
2. Chốt mô hình 1 khách có nhiều dự án hay 1 dự án tại một thời điểm.
3. Xác định ai được ký/xác nhận: chỉ người ký hợp đồng hay cả người được ủy quyền.
4. Chốt pháp lý cho chữ ký trên báo giá/hợp đồng/nghiệm thu.
5. Chốt loại thông báo nào đi qua OA/ZNS và tần suất gửi.
6. Chuẩn hóa data contract customer-facing thay vì tái dùng API nội bộ lệch shape.

## 13. Roadmap đề xuất

### Phase 1: Foundation

- OA + KYB + Mini App registration
- account linking
- project home
- progress
- gallery
- OA deep link

### Phase 2: Transactional flows

- quotation accept
- material confirmation
- contract sign
- payment summary

### Phase 3: After-sales

- acceptance sign
- warranty create/list/detail
- satisfaction feedback

## 14. Kết luận BA

Nếu nhìn theo codebase `motnha`, hướng đi đúng cho Zalo Mini App là:

- **customer-facing**, không phải internal ERP;
- **lightweight, action-driven**, không phải app nhập liệu nặng;
- **deep-link + notification first**, không phải menu-first như app thông thường;
- **reuse backend hiện có nhưng phải tái định nghĩa data contract và auth**.

Về mặt nghiệp vụ, đây là một sản phẩm rất khả thi vì repo đã có lõi backend cho phần lớn customer touchpoints. Điểm cần làm trước là chuẩn hóa identity, data contract customer-facing, và luồng riêng cho nền tảng Zalo.

## 15. Nguồn tham chiếu

- Zalo Mini App For Business FAQ: https://miniforbusiness.zalo.me/home
- Zalo Mini App - Bản tin Tháng 04, 2023 (flow xin quyền, notification, QR): https://miniforbusiness.zalo.me/blog/zalo-mini-app-ban-tin-thang-04-2023
- Platform Updates - Tháng 05, 2023 (deep link share, minimizeApp, notification): https://miniforbusiness.zalo.me/blog/platform-updates-thang-05-2023
- Zalo Mini App - Bản tin Tháng 06, 2023 (Next.js to Mini App, SSR/SSG not supported): https://miniforbusiness.zalo.me/blog/zalo-mini-app-ban-tin-thang-06-2023
- Zalo Mini App triển khai cơ chế xác thực mới từ 15/10/2025: https://miniforbusiness.zalo.me/case-study/zalo-mini-app-trien-khai-co-che-xac-thuc-moi-tu-15-10-2025
