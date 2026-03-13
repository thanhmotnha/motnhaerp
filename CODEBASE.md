# CODEBASE.md — MỘT NHÀ ERP

> Auto-generated: 2026-03-12 | 46 pages | 144 API routes | 16 UI components

---

## Tech Stack

| Layer | Tech | File |
|-------|------|------|
| Framework | Next.js 16, React 19 | `next.config.mjs` |
| ORM | Prisma 6 | `prisma/schema.prisma` (57KB, 60+ models) |
| DB | PostgreSQL | `.env` / `docker-compose.yml` |
| Auth | NextAuth.js (JWT + Mobile Bearer) | `lib/auth.js` |
| Validation | Zod | `lib/validations.js`, `lib/validations/` |
| Styling | Vanilla CSS | `app/globals.css` |
| State | TanStack Query | `components/Providers.js` |
| Monitoring | Sentry | `lib/sentry.js` |
| Storage | Cloudflare R2 | `lib/r2.js` |

---

## Frontend Pages (46)

| Module | Path | File |
|--------|------|------|
| Dashboard | `/` | `app/page.js` |
| Login | `/login` | `app/login/page.js` |
| **Pipeline** | `/pipeline` | `app/pipeline/page.js` |
| **Khách hàng** | `/customers` | `app/customers/page.js` |
| KH Detail | `/customers/[id]` | `app/customers/[id]/page.js` |
| **Báo giá** | `/quotations` | `app/quotations/page.js` |
| BG Create | `/quotations/create` | `app/quotations/create/page.js` |
| BG Edit | `/quotations/[id]/edit` | `app/quotations/[id]/edit/page.js` |
| BG PDF | `/quotations/[id]/pdf` | `app/quotations/[id]/pdf/page.js` |
| **Hợp đồng** | `/contracts` | `app/contracts/page.js` |
| HĐ Detail | `/contracts/[id]` | `app/contracts/[id]/page.js` |
| HĐ Create | `/contracts/create` | `app/contracts/create/page.js` |
| **Dự án** | `/projects` | `app/projects/page.js` |
| DA Detail | `/projects/[id]` | `app/projects/[id]/page.js` |
| **Sản phẩm** | `/products` | `app/products/page.js` |
| SP Detail | `/products/[id]` | `app/products/[id]/page.js` |
| **Mua sắm** | `/purchasing` | `app/purchasing/page.js` |
| **Kho** | `/inventory` | `app/inventory/page.js` |
| **Đối tác** | `/partners` | `app/partners/page.js` |
| NCC Detail | `/partners/suppliers/[id]` | `app/partners/suppliers/[id]/page.js` |
| TPC Detail | `/partners/contractors/[id]` | `app/partners/contractors/[id]/page.js` |
| **Thầu phụ** | `/contractors` | `app/contractors/page.js` |
| **Xưởng SX** | `/workshops` | `app/workshops/page.js` |
| **Tài chính** | `/finance` | `app/finance/page.js` |
| **Chi phí** | `/expenses` | `app/expenses/page.js` |
| **Thanh toán** | `/payments` | `app/payments/page.js` |
| **Nhân sự** | `/hr` | `app/hr/page.js` |
| Bảng lương | `/hr/payroll` | `app/hr/payroll/page.js` |
| **Bảo hành** | `/warranty` | `app/warranty/page.js` |
| **Work Orders** | `/work-orders` | `app/work-orders/page.js` |
| WO Detail | `/work-orders/[id]` | `app/work-orders/[id]/page.js` |
| **Nhật ký** | `/daily-logs` | `app/daily-logs/page.js` |
| **Nghiệm thu** | `/acceptance` | `app/acceptance/page.js` |
| NT Detail | `/acceptance/[id]` | `app/acceptance/[id]/page.js` |
| **Tiến độ** | `/progress/[code]` | `app/progress/[code]/page.js` |
| **Lịch biểu mẫu** | `/schedule-templates` | `app/schedule-templates/page.js` |
| **Báo cáo** | `/reports` | `app/reports/page.js` |
| BC Quyết toán | `/reports/settlement/[id]` | `app/reports/settlement/[id]/page.js` |
| **NCC** | `/suppliers` | `app/suppliers/page.js` |
| **Admin Users** | `/admin/users` | `app/admin/users/page.js` |
| Admin Settings | `/admin/settings` | `app/admin/settings/page.js` |
| Activity Log | `/admin/activity-log` | `app/admin/activity-log/page.js` |
| System Health | `/admin/system-health` | `app/admin/system-health/page.js` |
| **Public BG** | `/public/baogia/[id]` | `app/public/baogia/[id]/page.js` |
| **Customer Portal** | `/customer/index` | `app/customer/index/page.js` |

---

## API Routes (144)

### Auth (3)
| Method | Path | File |
|--------|------|------|
| * | `/api/auth/[...nextauth]` | `app/api/auth/[...nextauth]/route.js` |
| POST | `/api/auth/mobile` | `app/api/auth/mobile/route.js` |
| POST | `/api/auth/mobile/refresh` | `app/api/auth/mobile/refresh/route.js` |

### Admin (6)
| Method | Path | File |
|--------|------|------|
| GET | `/api/admin/activity-log` | `app/api/admin/activity-log/route.js` |
| GET | `/api/admin/gemini-status` | `app/api/admin/gemini-status/route.js` |
| GET/PUT | `/api/admin/settings` | `app/api/admin/settings/route.js` |
| GET | `/api/admin/system-health` | `app/api/admin/system-health/route.js` |
| GET/POST | `/api/admin/users` | `app/api/admin/users/route.js` |
| GET/PUT/DEL | `/api/admin/users/[id]` | `app/api/admin/users/[id]/route.js` |

### Budget (7)
- `/api/budget/alerts`, `change-orders`, `lock`, `profitability`, `s-curve`, `variance`

### Contracts (5)
- CRUD `/api/contracts`, `[id]`, `[id]/addenda`, `[id]/payments`, `[id]/payments/[paymentId]`

### Customers (3)
- CRUD `/api/customers`, `[id]`

### Contractor Payments (7)
- CRUD + approve, compare-budget, items

### Contractors (4)
- CRUD + bulk, `[id]/documents`

### Projects (nhiều sub-routes)
- CRUD + schedule, budget, milestones, materials, daily-logs, work-items, documents, settlement, progress-photos, acceptance

### Finance (nhiều sub-routes)
- cashflow, ar-aging, expenses, payments, journal-entries, payment-categories

### Products & Inventory
- products CRUD, inventory CRUD, purchase-orders, stock-movement

### HR
- employees CRUD, payroll

### Others
- quotations, partners, work-orders, workshops, warranty, notifications, daily-logs, reports, templates, upload, schedule

---

## Shared Components (5 root + 16 UI)

### Root Components
| File | Mô tả |
|------|-------|
| `components/AppShell.js` | Layout chính (sidebar + header + content) |
| `components/Header.js` | Top navigation bar |
| `components/Sidebar.js` | Sidebar navigation (10KB) |
| `components/Providers.js` | QueryClient + SessionProvider |
| `components/ErrorBoundary.js` | Error boundary wrapper |

### UI Components (`components/ui/`)
| File | Mô tả |
|------|-------|
| `Modal.js` | Reusable modal dialog |
| `DataTable.js` | Generic data table |
| `Pagination.js` | Page navigation |
| `SearchBar.js` | Search input |
| `FilterBar.js` | Filter controls |
| `ConfirmDialog.js` | Confirm/cancel dialog |
| `EmptyState.js` | No data placeholder |
| `KPICard.js` | Dashboard KPI card |
| `StatusBadge.js` | Status indicator |
| `Toast.js` | Notification toast |
| `Skeleton.js` | Loading skeleton |
| `Breadcrumbs.js` | Breadcrumb navigation |
| `FormGroup.js` | Form field wrapper |
| `GlobalSearch.js` | Global search (⌘K) |
| `NotificationBell.js` | Notification dropdown |
| `KeyboardShortcuts.js` | Keyboard shortcut handler |

### Domain Components (`components/`)
| Dir | Mô tả |
|-----|-------|
| `budget/` | Budget & change order components |
| `contractor/` | Contractor management components |
| `dashboard/` | Dashboard widgets |
| `documents/` | Document management |
| `finance/` | Finance-related components |
| `hr/` | HR & payroll components |
| `journal/` | Daily journal components |
| `products/` | Product catalog components |
| `quotation/` | Quotation builder components |
| `schedule/` | Schedule & Gantt components |
| `settings/` | Settings page components |

---

## Library (`lib/`)

| File | Mô tả | Used By |
|------|-------|---------|
| `prisma.js` | Prisma client singleton | All API routes |
| `auth.js` | NextAuth config + JWT | All protected routes |
| `apiHandler.js` | API route wrapper (error handling, auth check) | All API routes |
| `fetchClient.js` | Frontend fetch wrapper | All frontend pages |
| `validations.js` | Zod schemas | API routes, forms |
| `format.js` | Number/date formatters | Frontend |
| `generateCode.js` | Auto-gen mã báo giá, hợp đồng, PO | API routes |
| `pagination.js` | Pagination helper | API list routes |
| `softDelete.js` | Soft delete middleware | API routes |
| `rateLimit.js` | Rate limiting | API routes |
| `activityLogger.js` | Activity log writer | API routes |
| `activityLog.js` | Activity log helper | API routes |
| `r2.js` | Cloudflare R2 storage | Upload routes |
| `sentry.js` | Sentry error tracking | Global |
| `perfMonitor.js` | Performance monitoring | API routes |
| `emailTemplates.js` | Email HTML templates | Notification routes |
| `exportCsv.js` | CSV export utility | Report routes |
| `exportExcel.js` | Excel export utility | Report routes |
| `budgetTemplates.js` | Budget template data | Budget routes |
| `contractTemplates.js` | Contract templates | Contract routes |
| `defaultFolders.js` | Default folder structure | Document routes |
| `document-constants.js` | Document type constants | Document routes |
| `quotation-constants.js` | Quotation constants | Quotation routes |
| `scheduleUtils.js` | Schedule calculation | Schedule routes |
| `scheduleAlerts.js` | Schedule alert logic | Schedule routes |
| `productMatch.js` | Product matching | Product routes |
| `geminiJournal.js` | Gemini AI integration | Journal feature |
| `nexusApi.js` | External Nexus API | Integration |

---

## Config Files

| File | Mô tả |
|------|-------|
| `prisma/schema.prisma` | Database schema (57KB, 60+ models) |
| `next.config.mjs` | Next.js configuration |
| `package.json` | Dependencies |
| `middleware.js` | Route protection middleware |
| `docker-compose.yml` | Dev Docker setup |
| `docker-compose.prod.yml` | Production Docker setup |
| `Dockerfile` | Container build |
| `eslint.config.mjs` | ESLint rules |
| `jsconfig.json` | Path aliases |
| `vitest.config.ts` | Test configuration |
| `jest.config.js` | Jest configuration |

---

## File Dependencies (Critical Paths)

```
middleware.js → lib/auth.js
All API routes → lib/apiHandler.js → lib/prisma.js + lib/auth.js
All pages → components/AppShell.js → components/Sidebar.js + components/Header.js
All pages → components/Providers.js (QueryClient + Session)
All forms → lib/validations.js (Zod schemas)
All list pages → components/ui/DataTable.js + components/ui/Pagination.js
Budget module → lib/budgetTemplates.js
Quotation module → lib/quotation-constants.js
Schedule module → lib/scheduleUtils.js + lib/scheduleAlerts.js
Upload features → lib/r2.js
Export features → lib/exportCsv.js + lib/exportExcel.js
```

---

## Prisma Seeds

| File | Mô tả |
|------|-------|
| `prisma/seed.js` | Main seed (users, categories, products, settings) |
| `prisma/seed-categories.mjs` | Product categories |
| `prisma/seed-lks.js` | LKS (đơn giá nhân công) data |
| `prisma/seed-schedule-templates.js` | Schedule templates |
| `prisma/seed-work-items.js` | Work items |
| `prisma/migrate-products.js` | Product data migration |
