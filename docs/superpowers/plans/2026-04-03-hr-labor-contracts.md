# HR Labor Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add labor contract management to HR module — create/view contracts per employee from templates (Thử việc + Chính thức), with Word export.

**Architecture:** Reuse existing `ContractTemplate` model (type = "Lao động") and `EmployeeContract` model. Add employee-specific variables to `lib/contractVariables.js`. New `EmployeeContractsTab` component for HR page.

**Tech Stack:** Next.js App Router, Prisma, html-to-docx, existing withAuth/apiFetch patterns

**Company info (for templates):**
- Tên: Công ty TNHH Đầu tư và Thương Mại Beetify Việt Nam
- Địa chỉ: 105C Tô Hiệu, Phường Tô Hiệu, tỉnh Sơn La
- Đại diện: Nguyễn Hữu Thanh — Chức vụ: Giám đốc

---

### Task 1: Add employee contract variables to `lib/contractVariables.js`

**Files:**
- Modify: `lib/contractVariables.js`

- [ ] **Step 1: Read current file**

Read `lib/contractVariables.js` to understand the current structure (fillVariables function, CONTRACT_VARIABLES array).

- [ ] **Step 2: Add employee variables export**

Append after the existing `CONTRACT_VARIABLES` array and `fillVariables` function:

```javascript
// === Employee Contract Variables ===
export const EMPLOYEE_CONTRACT_VARIABLES = [
    { key: 'Ma_HD_LD', label: 'Mã hợp đồng lao động', source: 'contract.code' },
    { key: 'Loai_HD_LD', label: 'Loại hợp đồng', source: 'contract.type' },
    { key: 'Ten_NV', label: 'Tên nhân viên', source: 'employee.name' },
    { key: 'Ngay_Sinh_NV', label: 'Ngày sinh NV', source: 'employee.dateOfBirth' },
    { key: 'CCCD_NV', label: 'CMND/CCCD NV', source: 'employee.idNumber' },
    { key: 'Dia_Chi_NV', label: 'Địa chỉ NV', source: 'employee.address' },
    { key: 'SDT_NV', label: 'SĐT nhân viên', source: 'employee.phone' },
    { key: 'Chuc_Vu_HD', label: 'Chức vụ (hợp đồng)', source: 'contract.position' },
    { key: 'Phong_Ban_HD', label: 'Phòng ban (hợp đồng)', source: 'contract.department' },
    { key: 'Luong_HD', label: 'Lương hợp đồng (số)', source: 'fmt(contract.salary)' },
    { key: 'Luong_HD_Chu', label: 'Lương hợp đồng (chữ)', source: 'numberToWords' },
    { key: 'Luong_BH', label: 'Lương đóng BH (số)', source: 'fmt(contract.insuranceSalary)' },
    { key: 'Ngay_BD_HD', label: 'Ngày bắt đầu HĐ', source: 'contract.startDate' },
    { key: 'Ngay_KT_HD', label: 'Ngày kết thúc HĐ', source: 'contract.endDate' },
    { key: 'Ngay_Ky_HD', label: 'Ngày ký HĐ', source: 'contract.signedAt' },
    { key: 'Ngay_Ky_HD_So', label: 'Ngày ký (số)', source: 'day of signedAt' },
    { key: 'Thang_Ky_HD', label: 'Tháng ký', source: 'month of signedAt' },
    { key: 'Nam_Ky_HD', label: 'Năm ký', source: 'year of signedAt' },
    { key: 'Ten_Cong_Ty', label: 'Tên công ty', source: 'static' },
    { key: 'DC_Cong_Ty', label: 'Địa chỉ công ty', source: 'static' },
    { key: 'Nguoi_DD_CT', label: 'Người đại diện công ty', source: 'static' },
    { key: 'Chuc_Vu_DD', label: 'Chức vụ người đại diện', source: 'static' },
];

export function fillEmployeeVariables(html, { contract = {}, employee = {} } = {}) {
    if (!html) return '';
    const today = new Date();

    const signDate = contract.signedAt ? new Date(contract.signedAt) : today;

    const vars = {
        Ma_HD_LD: contract.code || '...',
        Loai_HD_LD: contract.type || '...',
        Ten_NV: employee.name || '...',
        Ngay_Sinh_NV: fmtDate(employee.dateOfBirth),
        CCCD_NV: employee.idNumber || '...',
        Dia_Chi_NV: employee.address || '...',
        SDT_NV: employee.phone || '...',
        Chuc_Vu_HD: contract.position || employee.position || '...',
        Phong_Ban_HD: contract.department || '...',
        Luong_HD: fmt(contract.salary),
        Luong_HD_Chu: numberToVietnameseWords(contract.salary),
        Luong_BH: fmt(contract.insuranceSalary),
        Ngay_BD_HD: fmtDate(contract.startDate),
        Ngay_KT_HD: contract.endDate ? fmtDate(contract.endDate) : 'Không xác định',
        Ngay_Ky_HD: fmtDate(contract.signedAt),
        Ngay_Ky_HD_So: getDay(contract.signedAt),
        Thang_Ky_HD: getMonth(contract.signedAt),
        Nam_Ky_HD: getYear(contract.signedAt),
        Ngay_Hien_Tai: today.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        Ngay_HT_So: today.getDate().toString(),
        Thang_HT: (today.getMonth() + 1).toString(),
        Nam_HT: today.getFullYear().toString(),
        Ten_Cong_Ty: 'Công ty TNHH Đầu tư và Thương Mại Beetify Việt Nam',
        DC_Cong_Ty: '105C Tô Hiệu, Phường Tô Hiệu, tỉnh Sơn La',
        Nguoi_DD_CT: 'Nguyễn Hữu Thanh',
        Chuc_Vu_DD: 'Giám đốc',
    };

    let result = html;
    for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '');
    }
    return result;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/contractVariables.js
git commit -m "feat(hr): add employee contract variables and fillEmployeeVariables()"
```

---

### Task 2: Update employee contracts API route

**Files:**
- Modify: `app/api/employees/[id]/contracts/route.js`

- [ ] **Step 1: Read current file**

Read `app/api/employees/[id]/contracts/route.js`. Currently it has GET + POST but no withAuth wrapper.

- [ ] **Step 2: Rewrite with withAuth + PATCH + DELETE**

```javascript
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/apiHandler';

export const GET = withAuth(async (req, { params }) => {
    const { id } = await params;
    const contracts = await prisma.employeeContract.findMany({
        where: { employeeId: id },
        orderBy: { startDate: 'desc' },
    });
    return NextResponse.json(contracts);
});

export const POST = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();

    const last = await prisma.employeeContract.findFirst({ orderBy: { code: 'desc' } });
    const num = last ? parseInt(last.code.replace('HDLD-', '')) + 1 : 1;
    const code = `HDLD-${String(num).padStart(3, '0')}`;

    const contract = await prisma.employeeContract.create({
        data: {
            code,
            employeeId: id,
            type: body.type || 'Chính thức',
            startDate: new Date(body.startDate),
            endDate: body.endDate ? new Date(body.endDate) : null,
            salary: parseFloat(body.salary) || 0,
            insuranceSalary: parseFloat(body.insuranceSalary) || 0,
            position: body.position || '',
            department: body.department || '',
            notes: body.notes || '',
            signedAt: body.signedAt ? new Date(body.signedAt) : null,
            status: body.status || 'Hiệu lực',
        },
    });

    return NextResponse.json(contract, { status: 201 });
});

export const PATCH = withAuth(async (req, { params }) => {
    const { id } = await params;
    const { contractId, status } = await req.json();
    const updated = await prisma.employeeContract.update({
        where: { id: contractId, employeeId: id },
        data: { status },
    });
    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const contractId = searchParams.get('contractId');
    await prisma.employeeContract.delete({ where: { id: contractId, employeeId: id } });
    return NextResponse.json({ success: true });
});
```

- [ ] **Step 3: Commit**

```bash
git add app/api/employees/[id]/contracts/route.js
git commit -m "feat(hr): add withAuth + PATCH + DELETE to employee contracts API"
```

---

### Task 3: Seed 2 default labor contract templates

**Files:**
- Create: `app/api/hr/seed-contract-templates/route.js`

This is a one-time seed endpoint. After running it once, it can be deleted.

- [ ] **Step 1: Create seed route**

```javascript
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
<p>5.2. Một trong hai bên muốn chấm dứt trước thời hạn phải thông báo trước 30 ngày (đối với HĐLĐ xác định thời hạn) hoặc 45 ngày (đối với HĐLĐ không xác định thời hạn).</p>

<p><strong>ĐIỀU 6: ĐIỀU KHOẢN CHUNG</strong></p>
<p>Hợp đồng này có hiệu lực kể từ ngày ký và được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản. Mọi tranh chấp giải quyết theo quy định của pháp luật lao động Việt Nam.</p>

<div style="display:flex;justify-content:space-between;margin-top:60px;text-align:center">
  <div><p><strong>BÊN B (NGƯỜI LAO ĐỘNG)</strong></p><p style="font-style:italic">(Ký và ghi rõ họ tên)</p><br/><br/><br/><p>{{Ten_NV}}</p></div>
  <div><p><strong>BÊN A (NGƯỜI SỬ DỤNG LAO ĐỘNG)</strong></p><p style="font-style:italic">(Ký tên, đóng dấu)</p><br/><br/><br/><p>{{Nguoi_DD_CT}}</p></div>
</div>
</div>`;

export const POST = withAuth(async () => {
    // Upsert Thử việc template
    const existing1 = await prisma.contractTemplate.findFirst({ where: { name: 'Hợp đồng thử việc', type: 'Lao động' } });
    if (!existing1) {
        await prisma.contractTemplate.create({
            data: { name: 'Hợp đồng thử việc', type: 'Lao động', body: PROBATION_TEMPLATE, isDefault: false },
        });
    }

    // Upsert Chính thức template
    const existing2 = await prisma.contractTemplate.findFirst({ where: { name: 'Hợp đồng lao động chính thức', type: 'Lao động' } });
    if (!existing2) {
        await prisma.contractTemplate.create({
            data: { name: 'Hợp đồng lao động chính thức', type: 'Lao động', body: OFFICIAL_TEMPLATE, isDefault: true },
        });
    }

    return NextResponse.json({ success: true, message: 'Templates seeded' });
}, { roles: ['giam_doc'] });
```

- [ ] **Step 2: Commit**

```bash
git add app/api/hr/seed-contract-templates/route.js
git commit -m "feat(hr): add labor contract template seed endpoint"
```

---

### Task 4: Create `EmployeeContractsTab` component

**Files:**
- Create: `components/hr/EmployeeContractsTab.js`

- [ ] **Step 1: Create component**

```javascript
'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const CONTRACT_TYPES = ['Thử việc', 'Chính thức 1 năm', 'Chính thức không thời hạn', 'Thời vụ'];
const STATUS_COLORS = { 'Hiệu lực': '#10b981', 'Hết hạn': '#6b7280', 'Đã ký': '#3b82f6', 'Chờ ký': '#f59e0b', 'Đã hủy': '#ef4444' };

const EMPTY_FORM = { type: 'Chính thức 1 năm', startDate: '', endDate: '', salary: '', insuranceSalary: '', position: '', department: '', notes: '', signedAt: '', templateId: '' };

export default function EmployeeContractsTab() {
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [empData, setEmpData] = useState(null);
    const [contracts, setContracts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [preview, setPreview] = useState(null); // { html, contractId? }
    const [exporting, setExporting] = useState(false);
    const toast = useToast();

    useEffect(() => {
        apiFetch('/api/employees?limit=500').then(d => setEmployees(d.data || [])).catch(() => {});
        apiFetch('/api/contract-templates?type=Lao+động').then(d => setTemplates(Array.isArray(d) ? d : [])).catch(() => {});
    }, []);

    const loadContracts = async (empId) => {
        if (!empId) return;
        setLoading(true);
        try {
            const [cs, emp] = await Promise.all([
                apiFetch(`/api/employees/${empId}/contracts`),
                apiFetch(`/api/employees/${empId}`),
            ]);
            setContracts(Array.isArray(cs) ? cs : []);
            setEmpData(emp);
        } catch { toast.error('Lỗi tải hợp đồng'); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (selectedEmp) loadContracts(selectedEmp); }, [selectedEmp]);

    const handlePreview = (contract) => {
        if (!empData) return;
        const tpl = templates.find(t => t.id === (contract.templateId || form.templateId));
        if (!tpl && !contract.templateId) return toast.error('Chọn mẫu hợp đồng để xem trước');
        // Use inline import for the variable filler
        import('@/lib/contractVariables').then(({ fillEmployeeVariables }) => {
            const html = fillEmployeeVariables(tpl?.body || '', { contract, employee: empData });
            setPreview({ html, contractId: contract.id });
        });
    };

    const handleSubmit = async () => {
        if (!selectedEmp) return toast.error('Chọn nhân viên');
        if (!form.startDate) return toast.error('Nhập ngày bắt đầu');
        if (!form.salary) return toast.error('Nhập mức lương');
        try {
            const emp = employees.find(e => e.id === selectedEmp);
            await apiFetch(`/api/employees/${selectedEmp}/contracts`, {
                method: 'POST',
                body: {
                    ...form,
                    salary: parseFloat(form.salary),
                    insuranceSalary: parseFloat(form.insuranceSalary) || 0,
                    position: form.position || emp?.position || '',
                    department: form.department || '',
                },
            });
            toast.success('Đã tạo hợp đồng');
            setShowForm(false);
            setForm(EMPTY_FORM);
            loadContracts(selectedEmp);
        } catch (e) { toast.error(e.message || 'Lỗi tạo hợp đồng'); }
    };

    const updateStatus = async (contractId, status) => {
        try {
            await apiFetch(`/api/employees/${selectedEmp}/contracts`, {
                method: 'PATCH',
                body: { contractId, status },
            });
            toast.success('Đã cập nhật trạng thái');
            loadContracts(selectedEmp);
        } catch (e) { toast.error(e.message || 'Lỗi cập nhật'); }
    };

    const handleExportWord = async (contract) => {
        if (!empData) return;
        const tpl = templates.find(t => t.name.includes(contract.type === 'Thử việc' ? 'thử việc' : 'chính thức'));
        if (!tpl) return toast.error('Không tìm thấy mẫu hợp đồng tương ứng');
        setExporting(true);
        try {
            const { fillEmployeeVariables } = await import('@/lib/contractVariables');
            const html = fillEmployeeVariables(tpl.body, { contract, employee: empData });
            const htmlToDocx = (await import('html-to-docx')).default;
            const docxBuffer = await htmlToDocx(html, null, { orientation: 'portrait', margins: { top: 720, right: 720, bottom: 720, left: 1080 } });
            const blob = new Blob([docxBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${contract.code}-${empData.name}.docx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) { toast.error('Lỗi xuất Word: ' + e.message); }
        finally { setExporting(false); }
    };

    return (
        <div>
            <div className="card-header" style={{ marginBottom: 16 }}>
                <span className="card-title">📄 Hợp đồng lao động</span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                        if (!confirm('Seed 2 mẫu hợp đồng mặc định?')) return;
                        await apiFetch('/api/hr/seed-contract-templates', { method: 'POST' });
                        const d = await apiFetch('/api/contract-templates?type=Lao+động');
                        setTemplates(Array.isArray(d) ? d : []);
                        toast.success('Đã tạo mẫu hợp đồng');
                    }}>📋 Tạo mẫu mặc định</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Tạo hợp đồng</button>
                </div>
            </div>

            {/* Employee selector */}
            <div style={{ marginBottom: 16 }}>
                <select className="form-select" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} style={{ maxWidth: 320 }}>
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.position || 'N/A'}</option>)}
                </select>
            </div>

            {/* Create form */}
            {showForm && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid var(--border-light)' }}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Loại hợp đồng</label>
                            <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mẫu hợp đồng</label>
                            <select className="form-select" value={form.templateId} onChange={e => setForm({ ...form, templateId: e.target.value })}>
                                <option value="">-- Chọn mẫu --</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Ngày bắt đầu *</label>
                            <input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ngày kết thúc</label>
                            <input className="form-input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ngày ký</label>
                            <input className="form-input" type="date" value={form.signedAt} onChange={e => setForm({ ...form, signedAt: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Lương hợp đồng (VND) *</label>
                            <input className="form-input" type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Lương đóng BH (VND)</label>
                            <input className="form-input" type="number" value={form.insuranceSalary} onChange={e => setForm({ ...form, insuranceSalary: e.target.value })} placeholder="0" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Chức vụ</label>
                            <input className="form-input" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="Để trống = theo hồ sơ NV" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phòng ban</label>
                            <input className="form-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Phòng ban" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Ghi chú</label>
                        <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Hủy</button>
                        <button className="btn btn-primary btn-sm" onClick={handleSubmit}>Tạo hợp đồng</button>
                    </div>
                </div>
            )}

            {/* Preview modal */}
            {preview && (
                <div className="modal-overlay" onClick={() => setPreview(null)}>
                    <div className="modal" style={{ maxWidth: 800, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Xem trước hợp đồng</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setPreview(null)}>✕</button>
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: preview.html }} style={{ padding: 16, background: '#fff', color: '#000' }} />
                    </div>
                </div>
            )}

            {/* Contracts list */}
            {!selectedEmp ? (
                <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chọn nhân viên để xem hợp đồng</div>
            ) : loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
            ) : contracts.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chưa có hợp đồng nào</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {contracts.map(c => (
                        <div key={c.id} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16, border: '1px solid var(--border-light)', borderLeft: `4px solid ${STATUS_COLORS[c.status] || '#6b7280'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                        <strong style={{ fontSize: 14 }}>{c.code}</strong>
                                        <span className="badge" style={{ background: `${STATUS_COLORS[c.status] || '#6b7280'}22`, color: STATUS_COLORS[c.status] || '#6b7280' }}>{c.status}</span>
                                        <span className="badge muted">{c.type}</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                                        <span>📅 {fmtDate(c.startDate)} → {c.endDate ? fmtDate(c.endDate) : 'Không xác định'}</span>
                                        <span>💰 {fmt(c.salary)}</span>
                                        {c.position && <span>🏷️ {c.position}</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => handlePreview(c)}>👁 Xem</button>
                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => handleExportWord(c)} disabled={exporting}>⬇ Word</button>
                                    {c.status === 'Chờ ký' && <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => updateStatus(c.id, 'Đã ký')}>✅ Đã ký</button>}
                                    {c.status === 'Hiệu lực' && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: '#ef4444' }} onClick={() => updateStatus(c.id, 'Đã hủy')}>Hủy HĐ</button>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/hr/EmployeeContractsTab.js
git commit -m "feat(hr): add EmployeeContractsTab component with preview and Word export"
```

---

### Task 5: Add Contracts tab to HR page

**Files:**
- Modify: `app/hr/page.js`

- [ ] **Step 1: Read current tab list**

Read `app/hr/page.js` and find where tabs are defined and where dynamic imports are set up.

- [ ] **Step 2: Add dynamic import**

Find existing dynamic imports for HR tabs (like OfficePayrollTab, WorkshopPayrollTab) and add:

```javascript
const EmployeeContractsTab = dynamic(() => import('@/components/hr/EmployeeContractsTab'), { ssr: false });
```

- [ ] **Step 3: Add tab to TABS array**

Find the TABS array or tab switcher buttons and add:

```javascript
{ key: 'contracts', label: '📄 Hợp đồng' },
```

- [ ] **Step 4: Add render case**

Find the section rendering tab content and add:

```javascript
{activeTab === 'contracts' && <EmployeeContractsTab />}
```

- [ ] **Step 5: Commit**

```bash
git add app/hr/page.js
git commit -m "feat(hr): add Contracts tab to HR page"
```
