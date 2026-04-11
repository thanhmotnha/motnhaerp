# Role Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xóa role `pho_gd`, thêm `kinh_doanh` và `kho`, cập nhật quyền `ky_thuat` (thêm báo giá + mua sắm) và `ke_toan` (thêm kho + mua sắm).

**Architecture:** Thay đổi trải rộng trên 3 lớp: (1) constants (`lib/roles.js`, `contexts/RoleContext.js`), (2) UI gating (Sidebar, trang admin users, các trang dùng `role` trực tiếp), (3) API route guards (withAuth options.roles). Không thay đổi schema DB hay API logic — chỉ thay đổi ai được làm gì.

**Tech Stack:** Next.js 16 App Router, React 19, NextAuth (role stored in JWT session)

---

**Role roster sau khi xong:**

| Key | Label | Quyền |
|-----|-------|-------|
| `giam_doc` | Giám đốc | Toàn quyền |
| `ke_toan` | Kế toán | Tài chính + chi phí + NCC + Kho + Mua sắm |
| `kinh_doanh` | Kinh doanh | Khách hàng + Báo giá + Hợp đồng + Mua sắm + Dự án (đọc) |
| `kho` | Kho | Sản phẩm + Kho + Mua sắm + Dự án (đọc) + Tạo phiếu nhập/xuất |
| `ky_thuat` | Kỹ thuật | Dự án + Báo giá + Mua sắm (full CRUD) |

---

### Task 1: lib/roles.js — cập nhật constants và groups

**Files:**
- Modify: `lib/roles.js`

- [ ] **Step 1: Thay toàn bộ nội dung file**

```javascript
/**
 * Role constants & helpers for RBAC
 * Used by apiHandler.js (options.roles) and frontend UI gating.
 *
 * Single source of truth — keep in sync with UsersTab.js role list.
 */

// ── Role constants ──
export const ROLES = {
  GIAM_DOC: 'giam_doc',
  KE_TOAN: 'ke_toan',
  KINH_DOANH: 'kinh_doanh',
  KHO: 'kho',
  KY_THUAT: 'ky_thuat',
};

// ── Preset groups (used in withAuth options.roles) ──
export const ROLE_GROUPS = {
  /** Chỉ Giám đốc — xóa master data, quản lý users */
  MANAGERS: [ROLES.GIAM_DOC],

  /** Giám đốc + Kế toán — financial routes */
  FINANCE: [ROLES.GIAM_DOC, ROLES.KE_TOAN],

  /** Finance + Kho — purchasing & inventory */
  PURCHASING: [ROLES.GIAM_DOC, ROLES.KE_TOAN, ROLES.KINH_DOANH, ROLES.KHO, ROLES.KY_THUAT],

  /** All roles */
  ALL: Object.values({
    GIAM_DOC: 'giam_doc', KE_TOAN: 'ke_toan',
    KINH_DOANH: 'kinh_doanh', KHO: 'kho', KY_THUAT: 'ky_thuat',
  }),
};

// ── Helpers ──
export const isManager = (role) => ROLE_GROUPS.MANAGERS.includes(role);
export const canAccessFinance = (role) => ROLE_GROUPS.FINANCE.includes(role);

// ── UI labels ──
export const ROLE_LABELS = {
  [ROLES.GIAM_DOC]: 'Giám đốc',
  [ROLES.KE_TOAN]: 'Kế toán',
  [ROLES.KINH_DOANH]: 'Kinh doanh',
  [ROLES.KHO]: 'Kho',
  [ROLES.KY_THUAT]: 'Kỹ thuật',
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/roles.js
git commit -m "feat(roles): remove pho_gd, add kinh_doanh + kho to role constants"
```

---

### Task 2: contexts/RoleContext.js — cập nhật ROLES array và PERMISSIONS

**Files:**
- Modify: `contexts/RoleContext.js`

- [ ] **Step 1: Thay toàn bộ nội dung file**

```javascript
'use client';
import { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';

export const ROLES = [
    { key: 'giam_doc',    label: 'Giám đốc',   icon: '👑', color: '#c0392b' },
    { key: 'ke_toan',     label: 'Kế toán',     icon: '📊', color: '#2980b9' },
    { key: 'kinh_doanh',  label: 'Kinh doanh',  icon: '💼', color: '#8e44ad' },
    { key: 'kho',         label: 'Kho',         icon: '📦', color: '#16a085' },
    { key: 'ky_thuat',    label: 'Kỹ thuật',    icon: '🔧', color: '#27ae60' },
];

const PERMISSIONS = {
    giam_doc: {
        canApprove: true,  canReject: true,  canCreateExpense: true,
        canPayExpense: true, canCompleteExpense: true, canDeleteExpense: true,
        canCollectPayment: true, canPrintReceipt: true, canViewFinance: true,
        canViewProjects: true, canViewAll: true,
        canManageContractors: true, canManageSuppliers: true,
        filterProject: null,
    },
    ke_toan: {
        canApprove: false, canReject: false, canCreateExpense: true,
        canPayExpense: true, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: true, canPrintReceipt: true, canViewFinance: true,
        canViewProjects: true, canViewAll: true,
        canManageContractors: false, canManageSuppliers: true,
        filterProject: null,
    },
    kinh_doanh: {
        canApprove: false, canReject: false, canCreateExpense: false,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: false,
        canViewProjects: true, canViewAll: false,
        canManageContractors: false, canManageSuppliers: false,
        filterProject: null,
    },
    kho: {
        canApprove: false, canReject: false, canCreateExpense: false,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: false,
        canViewProjects: true, canViewAll: false,
        canManageContractors: false, canManageSuppliers: false,
        filterProject: null,
    },
    ky_thuat: {
        canApprove: false, canReject: false, canCreateExpense: false,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: false,
        canViewProjects: true, canViewAll: false,
        canManageContractors: false, canManageSuppliers: false,
        filterProject: null,
    },
};

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
    const { data: session } = useSession();
    const role = session?.user?.role || 'ky_thuat';
    const permissions = PERMISSIONS[role] || PERMISSIONS.ky_thuat;
    const roleInfo = ROLES.find(r => r.key === role) || ROLES[4];

    return (
        <RoleContext.Provider value={{ role, roleInfo, permissions }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    const ctx = useContext(RoleContext);
    if (!ctx) return { role: 'ky_thuat', roleInfo: ROLES[4], permissions: PERMISSIONS.ky_thuat };
    return ctx;
}

export { PERMISSIONS };
```

- [ ] **Step 2: Commit**

```bash
git add contexts/RoleContext.js
git commit -m "feat(roles): update RoleContext — add kinh_doanh, kho; remove pho_gd"
```

---

### Task 3: User management UI — cập nhật dropdown roles

**Files:**
- Modify: `components/settings/UsersTab.js` (dòng 6-18)
- Modify: `app/admin/users/page.js` (dòng 5-18)

- [ ] **Step 1: Sửa `components/settings/UsersTab.js`**

Tìm đoạn:
```javascript
const ROLES = [
    { value: 'giam_doc', label: 'Giám đốc' },
    { value: 'pho_gd', label: 'Phó GĐ' },
    { value: 'ke_toan', label: 'Kế toán' },
    { value: 'quan_ly_du_an', label: 'Quản lý DA' },
    { value: 'nhan_vien', label: 'Nhân viên' },
    { value: 'ky_thuat', label: 'Kỹ thuật' },
];

const ROLE_BADGE = {
    giam_doc: 'success', pho_gd: 'info', ke_toan: 'warning',
    quan_ly_du_an: 'primary', nhan_vien: 'muted', ky_thuat: 'muted',
};
```

Thay bằng:
```javascript
const ROLES = [
    { value: 'giam_doc',   label: 'Giám đốc' },
    { value: 'ke_toan',    label: 'Kế toán' },
    { value: 'kinh_doanh', label: 'Kinh doanh' },
    { value: 'kho',        label: 'Kho' },
    { value: 'ky_thuat',   label: 'Kỹ thuật' },
];

const ROLE_BADGE = {
    giam_doc: 'success', ke_toan: 'warning',
    kinh_doanh: 'primary', kho: 'info', ky_thuat: 'muted',
};
```

- [ ] **Step 2: Sửa `app/admin/users/page.js`**

Tìm đoạn:
```javascript
    { value: 'pho_gd', label: 'Phó GĐ' },
    { value: 'ke_toan', label: 'Kế toán' },
    { value: 'quan_ly_du_an', label: 'Quản lý DA' },
    { value: 'nhan_vien', label: 'Nhân viên' },
    { value: 'ky_thuat', label: 'Kỹ thuật' },
```

Đọc file `app/admin/users/page.js` để lấy đúng context, sau đó thay cả block ROLES và ROLE_BADGE tương tự Step 1.

- [ ] **Step 3: Commit**

```bash
git add components/settings/UsersTab.js app/admin/users/page.js
git commit -m "feat(roles): update user management dropdowns — remove pho_gd, add kinh_doanh + kho"
```

---

### Task 4: Sidebar — cập nhật roles arrays cho từng menu item

**Files:**
- Modify: `components/Sidebar.js` (dòng 26-67)

Sidebar dùng `roles: [...]` để ẩn/hiện menu item theo role. Nếu không có `roles`, item hiển thị cho tất cả.

- [ ] **Step 1: Thay toàn bộ block `menuItems`**

Tìm:
```javascript
const menuItems = [
```

Thay toàn bộ array `menuItems` bằng:

```javascript
const menuItems = [
    {
        section: 'Tổng quan', collapsible: false, items: [
            { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
        ]
    },
    {
        section: 'Kinh doanh', items: [
            { href: '/customers', icon: Users, label: 'Khách hàng', roles: ['giam_doc', 'ke_toan', 'kinh_doanh'] },
            { href: '/quotations', icon: ClipboardList, label: 'Báo giá', roles: ['giam_doc', 'ke_toan', 'kinh_doanh', 'ky_thuat'], quick: '/quotations/create' },
            { href: '/contracts', icon: FileText, label: 'Hợp đồng', roles: ['giam_doc', 'ke_toan', 'kinh_doanh'], quick: '/contracts/create' },
            { href: '/warranty', icon: ShieldCheck, label: 'Bảo hành', roles: ['giam_doc', 'quan_ly_du_an'] },
        ]
    },
    {
        section: 'Dự án', items: [
            { href: '/projects', icon: Building2, label: 'Dự án' },
            { href: '/gantt', icon: CalendarDays, label: 'Gantt Chart' },
        ]
    },
    {
        section: 'Vật tư', items: [
            { href: '/products', icon: Package, label: 'Sản phẩm' },
            { href: '/purchasing', icon: ShoppingCart, label: 'Mua sắm', roles: ['giam_doc', 'ke_toan', 'kinh_doanh', 'kho', 'ky_thuat'] },
            { href: '/inventory', icon: Warehouse, label: 'Kho', roles: ['giam_doc', 'ke_toan', 'kho', 'quan_ly_du_an'] },
        ]
    },
    {
        section: 'Tài chính', items: [
            { href: '/finance', icon: Wallet, label: 'Tổng quan', roles: ['giam_doc', 'ke_toan'], exactMatch: true },
            { href: '/finance?tab=thu_tien', icon: ArrowDownLeft, label: 'Thu tiền', roles: ['giam_doc', 'ke_toan'], tab: 'thu_tien' },
            { href: '/finance?tab=chi_phi', icon: ArrowUpRight, label: 'Chi phí', roles: ['giam_doc', 'ke_toan'], tab: 'chi_phi' },
            { href: '/accounting', icon: BookOpen, label: 'Sổ cái', roles: ['giam_doc', 'ke_toan'] },
            { href: '/cashflow-forecast', icon: Banknote, label: 'Dự báo dòng tiền', roles: ['giam_doc', 'ke_toan'] },
            { href: '/budget', icon: PiggyBank, label: 'Ngân sách', roles: ['giam_doc', 'ke_toan', 'quan_ly_du_an'] },
            { href: '/cong-no', icon: Landmark, label: 'Công nợ', roles: ['giam_doc', 'ke_toan'] },
            { href: '/overhead', icon: Building2, label: 'Chi phí chung', roles: ['giam_doc', 'ke_toan'] },
        ]
    },
    {
        section: 'Quản lý', items: [
            { href: '/hr', icon: UserCog, label: 'Nhân sự', roles: ['giam_doc', 'ke_toan'] },
            { href: '/admin/settings', icon: Settings, label: 'Cài đặt', roles: ['giam_doc', 'ke_toan'] },
        ]
    },
    {
        section: 'Báo cáo chi tiết', defaultCollapsed: true, items: [
            { href: '/pipeline', icon: TrendingUp, label: 'Pipeline' },
            { href: '/reports', icon: BarChart3, label: 'Báo cáo', roles: ['giam_doc', 'ke_toan'] },
            { href: '/reports/pl-by-project', icon: TrendingUp, label: 'P&L Dự án', roles: ['giam_doc', 'ke_toan'] },
        ]
    },
];
```

- [ ] **Step 2: Commit**

```bash
git add components/Sidebar.js
git commit -m "feat(roles): update Sidebar menu visibility for new roles"
```

---

### Task 5: Frontend pages — xóa pho_gd khỏi hardcoded role checks

**Files:**
- Modify: `app/workshops/page.js`
- Modify: `app/reports/page.js`
- Modify: `app/expenses/page.js`
- Modify: `components/products/ProductDrawer.js`
- Modify: `app/expenses/categories/page.js`
- Modify: `app/daily-logs/page.js`
- Modify: `app/acceptance/[id]/page.js`
- Modify: `components/finance/ReceivablesTab.js`
- Modify: `app/acceptance/page.js`
- Modify: `components/finance/ExpensesTab.js`
- Modify: `app/admin/activity-log/page.js`
- Modify: `app/contractors/page.js`
- Modify: `app/partners/suppliers/[id]/page.js`
- Modify: `app/partners/page.js`
- Modify: `app/pipeline/page.js`
- Modify: `app/overhead/page.js`

- [ ] **Step 1: `app/workshops/page.js` dòng 14**

Tìm:
```javascript
const canManage = ['giam_doc', 'pho_gd'].includes(role);
```
Thay bằng:
```javascript
const canManage = role === 'giam_doc';
```

- [ ] **Step 2: `app/reports/page.js` dòng 15**

Tìm:
```javascript
const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];
```
Thay bằng:
```javascript
const FINANCE_ROLES = ['giam_doc', 'ke_toan'];
```

- [ ] **Step 3: `app/expenses/page.js` dòng 22**

Tìm:
```javascript
const canManage = ['giam_doc', 'pho_gd', 'ke_toan', 'quan_ly_du_an'].includes(role);
```
Thay bằng:
```javascript
const canManage = ['giam_doc', 'ke_toan'].includes(role);
```

- [ ] **Step 4: `components/products/ProductDrawer.js` dòng 24**

Tìm:
```javascript
const canSeeFinance = !role || ['giam_doc', 'pho_gd', 'ke_toan'].includes(role);
```
Thay bằng:
```javascript
const canSeeFinance = !role || ['giam_doc', 'ke_toan'].includes(role);
```

- [ ] **Step 5: `app/expenses/categories/page.js` dòng 13**

Tìm:
```javascript
const canManage = ['giam_doc', 'pho_gd', 'ke_toan'].includes(role);
```
Thay bằng:
```javascript
const canManage = ['giam_doc', 'ke_toan'].includes(role);
```

- [ ] **Step 6: `app/daily-logs/page.js` dòng 15**

Tìm:
```javascript
const canLog = ['giam_doc', 'pho_gd', 'quan_ly_du_an', 'giam_sat'].includes(role);
```
Thay bằng:
```javascript
const canLog = ['giam_doc', 'quan_ly_du_an', 'giam_sat'].includes(role);
```

- [ ] **Step 7: `app/acceptance/[id]/page.js` dòng 32**

Tìm:
```javascript
const canApprove = ['giam_doc', 'pho_gd'].includes(role);
```
Thay bằng:
```javascript
const canApprove = role === 'giam_doc';
```

- [ ] **Step 8: `components/finance/ReceivablesTab.js` dòng 28**

Tìm:
```javascript
const canReview = role === 'giam_doc' || role === 'pho_gd';
```
Thay bằng:
```javascript
const canReview = role === 'giam_doc';
```

- [ ] **Step 9: `app/acceptance/page.js` dòng 16**

Tìm:
```javascript
const canManage = ['giam_doc', 'pho_gd', 'quan_ly_du_an'].includes(role);
```
Thay bằng:
```javascript
const canManage = ['giam_doc', 'quan_ly_du_an'].includes(role);
```

- [ ] **Step 10: `components/finance/ExpensesTab.js` — 3 chỗ**

Tìm (dòng 140):
```javascript
const canEdit = ['Chờ duyệt', 'Từ chối'].includes(e.status) || ['ke_toan', 'giam_doc', 'pho_gd'].includes(role);
```
Thay bằng:
```javascript
const canEdit = ['Chờ duyệt', 'Từ chối'].includes(e.status) || ['ke_toan', 'giam_doc'].includes(role);
```

Tìm (dòng 394):
```javascript
style={{ cursor: (['Chờ duyệt', 'Từ chối'].includes(e.status) || ['ke_toan', 'giam_doc', 'pho_gd'].includes(role)) ? 'pointer' : 'default',
```
Thay bằng:
```javascript
style={{ cursor: (['Chờ duyệt', 'Từ chối'].includes(e.status) || ['ke_toan', 'giam_doc'].includes(role)) ? 'pointer' : 'default',
```

Tìm (dòng 440):
```javascript
{['ke_toan', 'giam_doc', 'pho_gd'].includes(role) && <button title="Sửa"
```
Thay bằng:
```javascript
{['ke_toan', 'giam_doc'].includes(role) && <button title="Sửa"
```

Tìm (dòng 441):
```javascript
{(['Chờ duyệt', 'Từ chối'].includes(e.status) || ['ke_toan', 'giam_doc', 'pho_gd'].includes(role)) && <button title="Xóa"
```
Thay bằng:
```javascript
{(['Chờ duyệt', 'Từ chối'].includes(e.status) || ['ke_toan', 'giam_doc'].includes(role)) && <button title="Xóa"
```

- [ ] **Step 11: `app/admin/activity-log/page.js` — 2 chỗ**

Tìm (dòng 32):
```javascript
if (role && !['giam_doc', 'pho_gd'].includes(role)) { router.replace('/'); }
```
Thay bằng:
```javascript
if (role && role !== 'giam_doc') { router.replace('/'); }
```

Tìm (dòng 59):
```javascript
if (role && !['giam_doc', 'pho_gd'].includes(role)) return null;
```
Thay bằng:
```javascript
if (role && role !== 'giam_doc') return null;
```

- [ ] **Step 12: `app/contractors/page.js` dòng 21**

Tìm:
```javascript
const canManage = ['giam_doc', 'pho_gd', 'ke_toan'].includes(role);
```
Thay bằng:
```javascript
const canManage = ['giam_doc', 'ke_toan'].includes(role);
```

- [ ] **Step 13: `app/partners/suppliers/[id]/page.js` dòng 8**

Tìm:
```javascript
const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];
```
Thay bằng:
```javascript
const FINANCE_ROLES = ['giam_doc', 'ke_toan'];
```

- [ ] **Step 14: `app/partners/page.js` dòng 11**

Tìm:
```javascript
const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];
```
Thay bằng:
```javascript
const FINANCE_ROLES = ['giam_doc', 'ke_toan'];
```

- [ ] **Step 15: `app/pipeline/page.js` dòng 29**

Tìm:
```javascript
const canSeeFinance = ['giam_doc', 'pho_gd', 'ke_toan'].includes(role);
```
Thay bằng:
```javascript
const canSeeFinance = ['giam_doc', 'ke_toan'].includes(role);
```

- [ ] **Step 16: `app/overhead/page.js` dòng 18**

Tìm:
```javascript
const canManage = ['giam_doc', 'pho_gd', 'ke_toan'].includes(role);
```
Thay bằng:
```javascript
const canManage = ['giam_doc', 'ke_toan'].includes(role);
```

- [ ] **Step 17: Commit**

```bash
git add \
  app/workshops/page.js \
  app/reports/page.js \
  app/expenses/page.js \
  components/products/ProductDrawer.js \
  app/expenses/categories/page.js \
  app/daily-logs/page.js \
  "app/acceptance/[id]/page.js" \
  components/finance/ReceivablesTab.js \
  app/acceptance/page.js \
  components/finance/ExpensesTab.js \
  app/admin/activity-log/page.js \
  app/contractors/page.js \
  "app/partners/suppliers/[id]/page.js" \
  app/partners/page.js \
  app/pipeline/page.js \
  app/overhead/page.js
git commit -m "feat(roles): remove pho_gd from frontend page role checks"
```

---

### Task 6: API routes — xóa pho_gd khỏi role guards

**Files:**
- Modify: `app/api/acceptance/[id]/route.js`
- Modify: `app/api/contract-templates/[id]/route.js`
- Modify: `app/api/contract-templates/route.js`
- Modify: `app/api/admin/activity-log/route.js`
- Modify: `app/api/batch/status/route.js`
- Modify: `app/api/workshops/route.js`
- Modify: `app/api/project-documents/[id]/route.js`
- Modify: `app/api/progress-reports/[id]/route.js`
- Modify: `app/api/schedule-tasks/import-template/route.js`
- Modify: `app/api/payment-corrections/route.js`
- Modify: `app/api/payment-corrections/[id]/route.js`
- Modify: `app/api/overhead/batches/[id]/confirm/route.js`
- Modify: `app/api/overhead/expenses/[id]/approve/route.js`
- Modify: `app/api/reports/workshop-kpi/route.js`
- Modify: `app/api/project-expenses/route.js`
- Modify: `app/api/reports/portfolio/route.js`
- Modify: `app/api/reports/project-settlement/[id]/route.js`
- Modify: `app/api/reports/payment-reminders/route.js`
- Modify: `app/api/reports/accounts-payable/route.js`
- Modify: `app/api/schedule-templates/route.js`
- Modify: `app/api/reports/profit-by-project/route.js`
- Modify: `app/api/quotations/[id]/route.js`
- Modify: `app/api/hr/handbook/route.js`
- Modify: `app/api/hr/seed-contract-templates/route.js`
- Modify: `app/api/hr/payroll-records/route.js`
- Modify: `app/api/hr/payroll-records/[id]/route.js`

**Nguyên tắc:** Mỗi chỗ chỉ đơn giản là xóa `'pho_gd'` khỏi array. Không thêm role mới vào finance/manager routes (các roles mới không cần quyền này).

- [ ] **Step 1: `app/api/acceptance/[id]/route.js` dòng 48**

Tìm:
```javascript
if (!['giam_doc', 'pho_gd'].includes(role)) {
```
Thay bằng:
```javascript
if (role !== 'giam_doc') {
```

- [ ] **Step 2: `app/api/contract-templates/[id]/route.js` — 2 chỗ (dòng 33, 39)**

Tìm (2 lần, cùng pattern):
```javascript
}, { roles: ['giam_doc', 'pho_gd'] });
```
Thay bằng (2 lần):
```javascript
}, { roles: ['giam_doc'] });
```

- [ ] **Step 3: `app/api/contract-templates/route.js` dòng 39**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc'] });
```

- [ ] **Step 4: `app/api/admin/activity-log/route.js` dòng 45**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc'] });
```

- [ ] **Step 5: `app/api/batch/status/route.js` dòng 58**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc'] });
```

- [ ] **Step 6: `app/api/workshops/route.js` dòng 31**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc'] });
```

- [ ] **Step 7: `app/api/project-documents/[id]/route.js` — 2 chỗ (dòng 29, 57)**

Tìm (2 lần):
```javascript
const adminRoles = ['giam_doc', 'pho_gd', 'admin'];
```
Thay bằng (2 lần):
```javascript
const adminRoles = ['giam_doc', 'admin'];
```

- [ ] **Step 8: `app/api/progress-reports/[id]/route.js` dòng 77**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc'] });
```

- [ ] **Step 9: `app/api/schedule-tasks/import-template/route.js` dòng 112**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc'] });
```

- [ ] **Step 10: `app/api/payment-corrections/route.js` dòng 6**

Tìm:
```javascript
const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];
```
Thay bằng:
```javascript
const FINANCE_ROLES = ['giam_doc', 'ke_toan'];
```

- [ ] **Step 11: `app/api/payment-corrections/[id]/route.js` dòng 6**

Tìm:
```javascript
const REVIEW_ROLES = ['giam_doc', 'pho_gd'];
```
Thay bằng:
```javascript
const REVIEW_ROLES = ['giam_doc'];
```

- [ ] **Step 12: `app/api/overhead/batches/[id]/confirm/route.js` dòng 6**

Tìm:
```javascript
const CONFIRM_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];
```
Thay bằng:
```javascript
const CONFIRM_ROLES = ['giam_doc', 'ke_toan'];
```

- [ ] **Step 13: `app/api/overhead/expenses/[id]/approve/route.js` dòng 6**

Tìm:
```javascript
const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];
```
Thay bằng:
```javascript
const FINANCE_ROLES = ['giam_doc', 'ke_toan'];
```

- [ ] **Step 14: `app/api/reports/workshop-kpi/route.js` dòng 67**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc', 'ke_toan'] });
```

- [ ] **Step 15: `app/api/project-expenses/route.js` dòng 85**

Tìm:
```javascript
const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];
```
Thay bằng:
```javascript
const FINANCE_ROLES = ['giam_doc', 'ke_toan'];
```

- [ ] **Step 16: `app/api/reports/portfolio/route.js` dòng 98**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc', 'ke_toan'] });
```

- [ ] **Step 17: `app/api/reports/project-settlement/[id]/route.js` dòng 144**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc', 'ke_toan'] });
```

- [ ] **Step 18: `app/api/reports/payment-reminders/route.js` dòng 81**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc', 'ke_toan'] });
```

- [ ] **Step 19: `app/api/reports/accounts-payable/route.js` dòng 126**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc', 'ke_toan'] });
```

- [ ] **Step 20: `app/api/schedule-templates/route.js` dòng 138**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc'] });
```

- [ ] **Step 21: `app/api/reports/profit-by-project/route.js` dòng 127**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc', 'ke_toan'] });
```

- [ ] **Step 22: `app/api/quotations/[id]/route.js` dòng 42**

Tìm:
```javascript
const APPROVE_ROLES = ['giam_doc', 'pho_gd'];
```
Thay bằng:
```javascript
const APPROVE_ROLES = ['giam_doc'];
```

- [ ] **Step 23: `app/api/hr/handbook/route.js` dòng 22**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc', 'ke_toan'] });
```

- [ ] **Step 24: `app/api/hr/seed-contract-templates/route.js` dòng 113**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc', 'ke_toan'] });
```

- [ ] **Step 25: `app/api/hr/payroll-records/route.js` dòng 86**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc', 'ke_toan'] });
```

- [ ] **Step 26: `app/api/hr/payroll-records/[id]/route.js` dòng 58**

Tìm:
```javascript
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
```
Thay bằng:
```javascript
}, { roles: ['giam_doc', 'ke_toan'] });
```

- [ ] **Step 27: Commit**

```bash
git add \
  "app/api/acceptance/[id]/route.js" \
  "app/api/contract-templates/[id]/route.js" \
  app/api/contract-templates/route.js \
  app/api/admin/activity-log/route.js \
  app/api/batch/status/route.js \
  app/api/workshops/route.js \
  "app/api/project-documents/[id]/route.js" \
  "app/api/progress-reports/[id]/route.js" \
  app/api/schedule-tasks/import-template/route.js \
  app/api/payment-corrections/route.js \
  "app/api/payment-corrections/[id]/route.js" \
  "app/api/overhead/batches/[id]/confirm/route.js" \
  "app/api/overhead/expenses/[id]/approve/route.js" \
  app/api/reports/workshop-kpi/route.js \
  app/api/project-expenses/route.js \
  app/api/reports/portfolio/route.js \
  "app/api/reports/project-settlement/[id]/route.js" \
  app/api/reports/payment-reminders/route.js \
  app/api/reports/accounts-payable/route.js \
  app/api/schedule-templates/route.js \
  app/api/reports/profit-by-project/route.js \
  "app/api/quotations/[id]/route.js" \
  app/api/hr/handbook/route.js \
  app/api/hr/seed-contract-templates/route.js \
  app/api/hr/payroll-records/route.js \
  "app/api/hr/payroll-records/[id]/route.js"
git commit -m "feat(roles): remove pho_gd from all API route guards"
```

---

### Task 7: Seed & scripts — xóa pho_gd user

**Files:**
- Modify: `prisma/seed.js`
- Modify: `scripts/create-admin.js`

- [ ] **Step 1: `prisma/seed.js` dòng 21**

Tìm:
```javascript
prisma.user.create({ data: { email: 'pho@motnha.vn', username: 'pho', name: 'Phó Giám đốc', password: hashedPassword, role: 'pho_gd' } }),
```
Xóa dòng này (hoặc comment out).

- [ ] **Step 2: `scripts/create-admin.js` dòng 18**

Tìm:
```javascript
    { email: 'pho@motnha.vn', username: 'pho', name: 'Phó Giám đốc', role: 'pho_gd' },
```
Xóa dòng này.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.js scripts/create-admin.js
git commit -m "chore: remove pho_gd seed user"
```

---

### Task 8: Build check + push

- [ ] **Step 1: Chạy build**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | tail -30
```

Expected: build thành công, không có lỗi đỏ. Warning OK.

Lỗi thường gặp:
- `pho_gd` còn sót — grep lại: `grep -rn "pho_gd" --include="*.js" app/ components/ lib/ contexts/`
- Import không tìm thấy — kiểm tra đường dẫn

- [ ] **Step 2: Sửa nếu có lỗi**

Nếu grep tìm thấy `pho_gd` còn sót, sửa từng file rồi commit thêm.

- [ ] **Step 3: Chạy tests**

```bash
npm test 2>&1 | tail -20
```

Expected: tất cả pass.

- [ ] **Step 4: Push**

```bash
git push
```

---

## Self-Review

### Spec coverage

| Yêu cầu | Task |
|---------|------|
| Xóa pho_gd | Task 1, 2, 3, 4, 5, 6, 7 |
| Thêm kinh_doanh | Task 1, 2, 3, 4 |
| Thêm kho | Task 1, 2, 3, 4 |
| ky_thuat thêm báo giá + mua sắm (Sidebar) | Task 4 |
| ke_toan thêm kho + mua sắm (Sidebar) | Task 4 |
| API routes nhất quán | Task 6 |
| Tạo TK được chọn role mới | Task 3 |

### Notes

- `quan_ly_du_an`, `nhan_vien` có trong `lib/roles.js` cũ và một số trang nhưng không trong `RoleContext.js`. Plan này giữ nguyên các tham chiếu `quan_ly_du_an` còn sót trong Sidebar (warranty, inventory, budget, acceptance) vì chúng không gây hại — users có role đó vẫn hoạt động đúng, chỉ là role đó không còn được tạo mới.
- Purchasing + inventory API routes (`/api/purchase-orders`, `/api/inventory/*`) không có role guard → tất cả roles đã login đều truy cập được → đúng theo thiết kế.
- Báo giá tạo/sửa: API `GET /api/quotations` và `POST /api/quotations` không có role guard → đúng. Chỉ approve/reject mới lock xuống `giam_doc`.
