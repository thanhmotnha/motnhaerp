# Payroll Upgrade — Implementation Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Nâng cấp phân hệ nhân sự với 2 bảng lương riêng biệt (Văn phòng và Nhà xưởng), phụ cấp, hoa hồng kinh doanh tự động từ hợp đồng, và export Excel.

**Architecture:** Tách nhân viên theo `payrollType` (office/workshop). Mỗi loại có model payroll record riêng, công thức tính riêng, UI tab riêng. Hoa hồng KD liên kết với bảng `Contract` sẵn có.

**Tech Stack:** Next.js App Router, Prisma 6, PostgreSQL, React 19, `xlsx` (export Excel)

---

## Tổng quan nghiệp vụ

### Bảng lương Văn phòng
- Lương tháng, tính theo ngày thực tế (÷ 26 ngày chuẩn)
- Phụ cấp: điện thoại, xăng xe, chuyên cần, chức vụ (cố định/tháng, gán theo nhân viên)
- Hoa hồng KD: tính tự động từ hợp đồng được gán (`ContractCommission`)
- Bảo hiểm NLĐ: BHXH 8% + BHYT 1.5% + BHTN 1% = 10.5% trên lương đóng BH
- Bảo hiểm NSDLĐ: 21.5%
- Khấu trừ: phạt vi phạm, tạm ứng
- **Không có tiền ăn**

### Bảng lương Nhà xưởng
- Lương theo ngày công thực tế (lương/ngày × số ngày)
- Tăng ca: giờ OT × (lương/ngày ÷ 8) × 1.5
- Tiền ăn: số ngày thực tế × mức tiền ăn/ngày (gán theo nhân viên)
- Phụ cấp: điện thoại, xăng xe, chuyên cần (cố định/tháng)
- **Không có bảo hiểm**
- Khấu trừ: phạt vi phạm, tạm ứng

---

## Data Model

### Thay đổi `Employee`
Thêm các field:
```prisma
payrollType       String   @default("office")  // "office" | "workshop"
positionAllowance Int      @default(0)          // phụ cấp chức vụ
phoneAllowance    Int      @default(0)          // phụ cấp điện thoại
transportAllowance Int     @default(0)          // phụ cấp xăng xe
diligenceAllowance Int     @default(0)          // phụ cấp chuyên cần
mealAllowanceRate Int      @default(0)          // tiền ăn/ngày (xưởng)
dailyWage         Int?                          // lương ngày (xưởng, nếu khác salary/26)
```

### Model mới `OfficePayrollRecord`
```prisma
model OfficePayrollRecord {
  id                String   @id @default(cuid())
  employeeId        String
  month             Int
  year              Int
  // Công
  standardDays      Int      @default(26)
  actualDays        Float
  holidayDays       Float    @default(0)
  paidLeaveDays     Float    @default(0)
  // Lương
  baseSalary        Float
  proratedSalary    Float    // baseSalary × actualDays / standardDays
  // Phụ cấp
  positionAllowance Float    @default(0)
  phoneAllowance    Float    @default(0)
  transportAllowance Float   @default(0)
  diligenceAllowance Float   @default(0)
  // Hoa hồng
  commissionAmount  Float    @default(0)
  // Thu nhập khác
  bonus             Float    @default(0)
  grossIncome       Float    // sum of above
  // Bảo hiểm NLĐ
  bhxhEmployee      Float
  bhytEmployee      Float
  bhtnEmployee      Float
  bhxhCompany       Float    // 21.5%
  // Khấu trừ
  disciplinaryFine  Float    @default(0)
  salaryAdvance     Float    @default(0)
  totalDeductions   Float
  // Kết quả
  totalCompanyPays  Float    // grossIncome + bhxhCompany
  netSalary         Float    // grossIncome - totalDeductions
  notes             String?

  employee          Employee @relation(fields: [employeeId], references: [id])
  @@unique([employeeId, month, year])
}
```

### Model mới `WorkshopPayrollRecord`
```prisma
model WorkshopPayrollRecord {
  id                String   @id @default(cuid())
  employeeId        String
  month             Int
  year              Int
  // Công & lương
  dailyWage         Float
  actualDays        Float
  basePay           Float    // dailyWage × actualDays
  // Tăng ca
  overtimeHours     Float    @default(0)
  overtimePay       Float    @default(0)  // hours × dailyWage/8 × 1.5
  // Tiền ăn & phụ cấp
  mealAllowance     Float    @default(0)  // actualDays × mealAllowanceRate
  phoneAllowance    Float    @default(0)
  transportAllowance Float   @default(0)
  diligenceAllowance Float   @default(0)
  // Thu nhập khác
  bonus             Float    @default(0)
  grossIncome       Float    // sum of above
  // Khấu trừ (không có BH)
  disciplinaryFine  Float    @default(0)
  salaryAdvance     Float    @default(0)
  totalDeductions   Float
  // Kết quả
  netSalary         Float
  notes             String?

  employee          Employee @relation(fields: [employeeId], references: [id])
  @@unique([employeeId, month, year])
}
```

### Model mới `ContractCommission`
```prisma
model ContractCommission {
  id          String   @id @default(cuid())
  employeeId  String
  contractId  String
  rate        Float    // % hoa hồng (VD: 2.5)
  createdAt   DateTime @default(now())

  employee    Employee @relation(fields: [employeeId], references: [id])
  contract    Contract @relation(fields: [contractId], references: [id])
  @@unique([employeeId, contractId])
}
```

---

## API Routes

| Method | Route | Mô tả |
|--------|-------|--------|
| GET | `/api/hr/office-payroll?month=&year=` | Lấy bảng lương VP |
| POST | `/api/hr/office-payroll` | Tạo/cập nhật bảng lương VP |
| PATCH | `/api/hr/office-payroll/[id]` | Sửa 1 record (thưởng, phạt, chuyên cần) |
| GET | `/api/hr/office-payroll/export?month=&year=` | Export Excel bảng lương VP |
| GET | `/api/hr/workshop-payroll?month=&year=` | Lấy bảng lương Xưởng |
| POST | `/api/hr/workshop-payroll` | Tạo/cập nhật bảng lương Xưởng |
| PATCH | `/api/hr/workshop-payroll/[id]` | Sửa 1 record |
| GET | `/api/hr/workshop-payroll/export?month=&year=` | Export Excel bảng lương Xưởng |
| GET | `/api/hr/contract-commissions` | Danh sách gán hoa hồng |
| POST | `/api/hr/contract-commissions` | Gán nhân viên + HĐ + % |
| DELETE | `/api/hr/contract-commissions/[id]` | Xóa gán |

### Logic tính hoa hồng
Khi tạo bảng lương VP tháng M/Y, với mỗi nhân viên có `ContractCommission`:
```
commissionAmount = SUM(
  contract.contractValue × commission.rate / 100
  WHERE contract.createdAt trong tháng M/Y
  AND commission.employeeId = emp.id
)
```

---

## Giao diện (UI)

### Tabs HR (thứ tự mới)
```
[Nhân viên VP] [Nhân viên Xưởng] [Bảng lương VP] [Bảng lương Xưởng]
[Hoa hồng KD] [Chấm công] [Nghỉ phép] [Tạm ứng] [...]
```

### Tab "Nhân viên VP" & "Nhân viên Xưởng"
- Filter `payrollType` từ danh sách nhân viên hiện có
- Thêm/sửa các field phụ cấp mới inline

### Tab "Bảng lương VP"
- Chọn tháng/năm → nút **"Tạo bảng lương"**
- Bảng dạng spreadsheet, các cột:

| Tên | Lương CB | Ngày TT | Lương ngày | ĐT | Xăng | CC | CV | HH KD | Thưởng | Gross | BHXH | BHYT | BHTN | Phạt | TU | Còn lĩnh | Ghi chú |

- Các ô **thưởng, phạt, chuyên cần** edit trực tiếp → auto-save PATCH
- Dòng tổng cộng ở cuối
- Nút **Export Excel**

### Tab "Bảng lương Xưởng"
- Cùng pattern, cột khác:

| Tên | Lương/ngày | Ngày TT | OT giờ | OT tiền | Tiền ăn | ĐT | Xăng | CC | Thưởng | Gross | Phạt | TU | Còn lĩnh | Ghi chú |

### Tab "Hoa hồng KD"
- Danh sách gán: Nhân viên | Hợp đồng | % | Tháng | Số tiền ước tính
- Form thêm: chọn nhân viên + chọn HĐ + nhập %
- Tổng hoa hồng theo tháng

---

## Export Excel

Dùng thư viện `xlsx`. Mỗi file có:
- Sheet 1: Bảng lương đầy đủ tất cả cột
- Sheet 2: Tổng hợp (tên, gross, net, BH)
- Header: "BẢNG LƯƠNG THÁNG MM/YYYY"
- Footer: Người lập biểu / Giám đốc

---

## Phạm vi KHÔNG làm (YAGNI)
- Không tính thuế TNCN tự động (nhân viên xưởng không có, VP tính thủ công sau)
- Không tích hợp máy chấm công (chấm công nhập tay)
- Không workflow duyệt bảng lương
- Không tính chuyên cần theo số lần đi muộn
