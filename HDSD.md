# 📘 HƯỚNG DẪN SỬ DỤNG — HomeERP
## Phần mềm quản lý dự án Nội thất & Xây dựng

> **Phiên bản:** 1.0 — Cập nhật: 18/02/2026
> **Đối tượng:** Nhân viên kinh doanh, thiết kế, quản lý dự án, kế toán

---

## MỤC LỤC

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Khởi động & Đăng nhập](#2-khởi-động--đăng-nhập)
3. [Dashboard — Bảng điều khiển](#3-dashboard--bảng-điều-khiển)
4. [Pipeline — Theo dõi cơ hội](#4-pipeline--theo-dõi-cơ-hội)
5. [Quản lý Khách hàng](#5-quản-lý-khách-hàng)
6. [Quản lý Dự án](#6-quản-lý-dự-án)
7. [Thu tiền — Thanh toán hợp đồng](#7-thu-tiền--thanh-toán-hợp-đồng)
8. [Chi phí phát sinh](#8-chi-phí-phát-sinh)
9. [Mua sắm vật tư](#9-mua-sắm-vật-tư)
10. [Quy trình nghiệp vụ chuẩn](#10-quy-trình-nghiệp-vụ-chuẩn)

---

## 1. Tổng quan hệ thống

### Sơ đồ quy trình

```
CRM/Pipeline → Khách hàng → Dự án → Hợp đồng → Thi công → Quyết toán
                   ↓            ↓         ↓          ↓
              Nhật ký       Phiếu CV   Thu tiền    Chi phí
              Tài liệu     Vật tư     Thầu phụ   Mua sắm
```

### Menu điều hướng (Sidebar)

| Mục | Icon | Chức năng |
|-----|------|-----------|
| Dashboard | 📊 | Tổng quan KPI toàn công ty |
| Pipeline | 🔄 | Theo dõi cơ hội kinh doanh theo 6 giai đoạn |
| Khách hàng | 👥 | Quản lý danh sách khách hàng |
| Dự án | 🏗️ | Quản lý dự án thi công |
| Sản phẩm | 📦 | Danh mục sản phẩm, vật tư |
| Báo giá | 📋 | Lập & quản lý báo giá |
| Thu tiền | 💳 | Theo dõi thu tiền theo HĐ |
| Chi phí | 📑 | Chi phí phát sinh toàn công ty |
| Mua sắm VT | 🛒 | Đơn mua hàng & nhà cung cấp |

---

## 2. Khởi động & Đăng nhập

### Bước 1: Chạy ứng dụng
```
Mở trình duyệt → Truy cập: http://localhost:3000
```

### Giao diện chính
- **Sidebar trái:** Điều hướng giữa các module
- **Header trên:** Thanh tìm kiếm + thông tin người dùng
- **Vùng nội dung:** Hiển thị trang đang xem

> 💡 **Mẹo:** Mục nào đang chọn sẽ được highlight màu tím trên sidebar

---

## 3. Dashboard — Bảng điều khiển

### Mục đích
Cung cấp cái nhìn tổng quan nhanh về tình hình kinh doanh.

### Các thẻ KPI hiển thị

| Thẻ | Ý nghĩa |
|-----|---------|
| 💰 Doanh thu | Tổng doanh thu (từ giao dịch) |
| 🏗️ Dự án | Số dự án đang hoạt động |
| 👥 Khách hàng | Tổng số khách hàng |
| 📦 Sản phẩm | Số sản phẩm trong danh mục |
| 📝 Hợp đồng | Tổng số + giá trị hợp đồng |
| 📋 Phiếu CV | Số phiếu công việc đang chờ |

### Phần tài chính
- **Biểu đồ thu/chi:** So sánh doanh thu và chi phí
- **Tiến độ thu tiền HĐ:** Thanh progress bar % đã thu

### Thao tác
- Click vào bất kỳ dự án nào → mở trang chi tiết dự án

---

## 4. Pipeline — Theo dõi cơ hội

### Truy cập
Sidebar → **Pipeline**

### 6 giai đoạn Pipeline

| # | Giai đoạn | Mô tả |
|---|-----------|-------|
| 1 | 📊 CRM / Khảo sát | Khách hàng mới, đang tìm hiểu nhu cầu |
| 2 | 🎨 Thiết kế | Đang làm phương án thiết kế |
| 3 | 📝 Ký HĐ | Đang thương thảo / chuẩn bị ký hợp đồng |
| 4 | 🔨 Thi công | Đang thi công thực tế |
| 5 | 🛡️ Bảo hành | Dự án hoàn thành, đang bảo hành |
| 6 | ✅ Hoàn thành | Kết thúc hoàn toàn |

### Thao tác
1. **Click vào 1 giai đoạn** → Lọc danh sách dự án theo giai đoạn đó
2. **Click lại** → Bỏ lọc, hiển thị tất cả
3. **Click vào dòng dự án** → Mở trang chi tiết dự án

---

## 5. Quản lý Khách hàng

### Truy cập
Sidebar → **Khách hàng**

### 5.1 Xem danh sách
- Thống kê nhanh: Tổng KH, VIP, Doanh nghiệp, Tiềm năng, Doanh thu
- **Tìm kiếm:** Gõ tên hoặc mã KH
- **Lọc:** Theo loại (Cá nhân / Doanh nghiệp) hoặc trạng thái (Lead / Prospect / KH / VIP)

### 5.2 Thêm khách hàng mới
1. Nhấn **"+ Thêm KH"**
2. Điền thông tin theo 3 phần:

**👤 Thông tin cơ bản (bắt buộc):**

| Trường | Bắt buộc | Ghi chú |
|--------|----------|---------|
| Tên KH | ✅ | Tên đầy đủ |
| SĐT | ✅ | Số điện thoại chính |
| Email | | Email liên lạc |
| Giới tính | | Nam / Nữ |
| Ngày sinh | | Để theo dõi sinh nhật |
| Địa chỉ | | Địa chỉ nhà |
| Loại | | Cá nhân / Doanh nghiệp |
| Trạng thái | | Lead → Prospect → KH → VIP |
| MST | | Mã số thuế (cho DN) |
| Nguồn | | Facebook, Zalo, Giới thiệu... |
| Người đại diện | | Cho khách DN |

**🏠 Thông tin dự án:**

| Trường | Ghi chú |
|--------|---------|
| NV kinh doanh | Nhân viên sales phụ trách |
| NV thiết kế | Designer được giao |
| Tên dự án | VD: "Biệt thự anh Minh" |
| Địa chỉ dự án | Địa chỉ công trình |

**📞 Liên hệ phụ:**

| Trường | Ghi chú |
|--------|---------|
| Người liên hệ 2 | Vợ/chồng, người thân... |
| SĐT 2 | Số phụ |

3. Nhấn **"Lưu"**

### 5.3 Xem chi tiết khách hàng
Click vào dòng KH → Mở trang chi tiết với **6 tab:**

| Tab | Nội dung |
|-----|----------|
| 🏠 Tổng quan | Thông tin KH + dự án liên quan |
| 🏗️ Dự án | Danh sách dự án của KH |
| 📝 Hợp đồng | Các hợp đồng + tiến độ thanh toán |
| 📋 Báo giá | Các bảng báo giá đã gửi |
| 📒 Nhật ký | Lịch sử giao tiếp (gọi điện, gặp mặt, Zalo...) |
| 💰 Giao dịch | Lịch sử thu/chi |

### 5.4 Ghi nhật ký theo dõi
1. Vào chi tiết KH → Tab **Nhật ký**
2. Nhấn **"+ Ghi chú"**
3. Chọn loại: Điện thoại / Gặp mặt / Email / Zalo
4. Nhập nội dung → **Lưu**

> ⚠️ **QUY ĐỊNH:** Mỗi lần liên hệ KH phải ghi nhật ký. Quản lý sẽ kiểm tra lịch sử này.

---

## 6. Quản lý Dự án

### Truy cập
Sidebar → **Dự án**

### 6.1 Danh sách dự án
- Lọc theo trạng thái, tìm kiếm theo tên/mã
- Click vào dự án → Mở trang chi tiết

### 6.2 Trang chi tiết dự án

**Header dự án hiển thị:**
- Mã dự án, tên, trạng thái, giai đoạn pipeline
- Tiến độ tổng (%), diện tích, số tầng
- Giá trị HĐ, đã thu, công nợ

**Pipeline visual:** Thanh tiến trình 6 bước

### 6.3 Các tab trong chi tiết dự án

#### Tab 1: 🏠 Tổng quan
- Danh sách nhân sự dự án
- Tiến độ milestone (kéo thanh % để cập nhật)

#### Tab 2: 📒 Nhật ký
- Lịch sử giao tiếp liên quan đến dự án
- Nhấn **"+"** → Thêm nhật ký mới

#### Tab 3: ⏱️ Tiến độ
- Bảng milestone với trạng thái & tiến độ
- Cập nhật % bằng dropdown

#### Tab 4: 📝 Hợp đồng
- Danh sách hợp đồng thuộc dự án
- Nhấn **"+ Thêm HĐ"** → Điền: Tên HĐ, Loại, Giá trị, Ngày ký → **Lưu**

#### Tab 5: 💵 Thu tiền
- Tiến độ thu tiền theo từng hợp đồng
- Thêm đợt thanh toán: Nhấn **"+ Thêm đợt TT"** → Nhập số tiền, ngày → **Lưu**

#### Tab 6: 📋 Phiếu công việc
- Danh sách lệnh sản xuất / thi công
- Nhấn **"+ Thêm phiếu CV"** → Điền: Tiêu đề, Loại, Ưu tiên, Người thực hiện, Hạn → **Lưu**
- Cập nhật trạng thái: Click dropdown trên mỗi dòng

#### Tab 7: 🧱 Vật tư
- Kế hoạch vật tư theo dự án

#### Tab 8: 🛒 Mua hàng
- Đơn mua hàng liên quan

#### Tab 9: 💸 Chi phí
- Chi phí phát sinh dự án
- Nhấn **"+ Thêm CP"** → Điền: Mô tả, Hạng mục, Số tiền, Người nộp → **Lưu**

#### Tab 10: 👷 Thầu phụ
- Công nợ thầu phụ, tiến độ thanh toán

#### Tab 11: 📁 Tài liệu
- Danh sách tài liệu dự án (bản vẽ, ảnh, HĐ...)
- Nhấn **"+ Thêm tài liệu"** → Điền: Tên, Danh mục, Tên file, Người upload → **Lưu**

#### Tab 12: 🧮 Quyết toán
- **Bên A (Doanh thu):** Giá trị HĐ + phát sinh → Đã thu → Còn phải thu
- **Bên B (Chi phí):** Mua sắm + phí + thầu phụ → Tổng chi → Còn phải trả
- **Lợi nhuận = Bên A - Bên B** (hiển thị % tỷ lệ lãi/lỗ)

---

## 7. Thu tiền — Thanh toán hợp đồng

### Truy cập
Sidebar → **Thu tiền** (mục Vận hành)

### Nội dung
- Thống kê: Tổng HĐ, Tổng giá trị, Đã thu, Còn nợ, Phát sinh
- **Thanh progress bar** tổng % thu tiền toàn công ty
- Bảng chi tiết theo từng hợp đồng
- **Lọc:** Đã TT đủ / Đang thu / Chưa thu

### Thao tác
- Click dòng HĐ → Chuyển đến dự án liên quan

---

## 8. Chi phí phát sinh

### Truy cập
Sidebar → **Chi phí** (mục Vận hành)

### Nội dung
- Thống kê: Tổng phiếu, Tổng tiền, Chờ duyệt, Đã duyệt, Đã TT
- Bảng chi tiết tất cả chi phí phát sinh toàn công ty
- **Lọc:** Theo trạng thái (Chờ duyệt / Đã duyệt / Đã TT / Từ chối) + Hạng mục

### Quy trình duyệt chi phí
```
Nhân viên tạo CP → Chờ duyệt → Quản lý duyệt/từ chối → Đã thanh toán
```

---

## 9. Mua sắm vật tư

### Truy cập
Sidebar → **Mua sắm VT** (mục Vận hành)

### Nội dung
- Thống kê: Tổng đơn, Tổng giá trị, Đã TT, Đang giao, Đang đặt
- Bảng đơn mua hàng với progress bar thanh toán
- **Lọc:** Theo trạng thái đơn hàng

### Quy trình mua sắm
```
Đang đặt → Đã xác nhận → Đang giao → Đã giao → Đã thanh toán
```

---

## 10. Quy trình nghiệp vụ chuẩn

### 10.1 Quy trình từ Lead đến Hoàn thành

```
Bước 1: NV Kinh doanh tiếp nhận lead
    → Thêm Khách hàng (trạng thái: Lead, nguồn: Facebook/Zalo/...)
    → Ghi nhật ký lần liên hệ đầu tiên

Bước 2: Khảo sát & Lên phương án
    → Cập nhật KH thành Prospect
    → Tạo Dự án, liên kết KH
    → Upload tài liệu khảo sát

Bước 3: Báo giá & Thương thảo
    → Tạo Báo giá trong module Báo giá
    → Ghi nhật ký mỗi lần thương thảo

Bước 4: Ký hợp đồng
    → Tạo Hợp đồng trong dự án
    → Cập nhật KH thành "Khách hàng"
    → Ghi nhận đợt thanh toán đầu tiên (thu tiền)

Bước 5: Thi công
    → Tạo Phiếu công việc phân công nhân sự
    → Tạo đơn Mua sắm vật tư
    → Ghi nhận Chi phí phát sinh
    → Cập nhật tiến độ Milestone hàng tuần

Bước 6: Nghiệm thu & Bàn giao
    → Upload tài liệu nghiệm thu
    → Thu các đợt thanh toán còn lại
    → Kiểm tra tab Quyết toán (lãi/lỗ)

Bước 7: Bảo hành & Hậu mãi
    → Cập nhật trạng thái DA → Bảo hành
    → Ghi nhật ký các lần CSKH
```

### 10.2 Checklist hàng ngày cho nhân viên

| Vai trò | Việc cần làm mỗi ngày |
|---------|------------------------|
| **Kinh doanh** | Kiểm tra Pipeline, ghi nhật ký liên hệ KH, cập nhật trạng thái lead |
| **Thiết kế** | Kiểm tra phiếu CV được giao, upload bản vẽ mới, cập nhật tiến độ |
| **Quản lý DA** | Kiểm tra Dashboard, cập nhật milestone, duyệt chi phí |
| **Kế toán** | Kiểm tra Thu tiền, duyệt chi phí, đối soát mua sắm VT |

---

## 📌 QUY ĐỊNH SỬ DỤNG

1. ✅ **BẮT BUỘC** ghi nhật ký mỗi lần tương tác với khách hàng
2. ✅ **BẮT BUỘC** upload tài liệu quan trọng (HĐ, bản vẽ, biên bản) lên hệ thống
3. ✅ **BẮT BUỘC** cập nhật tiến độ dự án ít nhất 1 lần/tuần
4. ✅ **BẮT BUỘC** tạo phiếu chi phí ngay khi phát sinh (không gộp cuối tháng)
5. ⛔ **CẤM** chia sẻ tài khoản đăng nhập với người khác
6. ⛔ **CẤM** xóa dữ liệu khách hàng/dự án khi chưa được phê duyệt

---

> 📞 **Hỗ trợ kỹ thuật:** Liên hệ bộ phận IT khi gặp sự cố
> 📧 **Góp ý cải tiến:** Gửi về quản lý trực tiếp để phản hồi nhà phát triển
