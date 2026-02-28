# HomeERP - Mot Nha

ERP system for Vietnamese furniture & construction company. Built with Next.js 16, PostgreSQL, Prisma ORM.

**Live:** https://admin.tiktak.vn
**Repo:** https://github.com/sherlock-126/motnha

---

## Quick Start (Development)

### Prerequisites
- Node.js 18+ (recommend 22)
- Docker (for PostgreSQL)
- Git

### Setup

```bash
git clone https://github.com/sherlock-126/motnha.git
cd motnha/motnhaerp

npm install

cp .env.example .env
# Edit .env if needed (defaults work with docker-compose)

docker compose up -d          # Start PostgreSQL on port 5432
npm run db:migrate             # Run migrations
npm run db:seed                # Seed sample data

npm run dev                    # http://localhost:3000
```

### Default Login
| Email | Password | Role |
|-------|----------|------|
| admin@motnha.vn | admin123 | Giam doc (Director) |
| pho@motnha.vn | admin123 | Pho GD (Vice Director) |
| ketoan@motnha.vn | admin123 | Ke toan (Accountant) |
| kythuat@motnha.vn | admin123 | Ky thuat (Technical) |

### Environment Variables

```env
# .env (development)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/motnhaerp?schema=public"
NEXTAUTH_SECRET="motnha-erp-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (webpack) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Watch mode |
| `npm run type-check` | TypeScript strict check |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:seed` | Seed database |
| `npm run db:reset` | Reset database |
| `npm run db:studio` | Open Prisma Studio (GUI) |
| `npm run db:generate` | Regenerate Prisma client |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router, standalone) |
| Language | JavaScript (TypeScript-ready, `strict: true`, `allowJs: true`) |
| Database | PostgreSQL 16 + Prisma 6.19.2 |
| Auth | NextAuth.js 4.24 (Credentials, JWT, 8h expiry) |
| Validation | Zod 4.3.6 (`.strict()` on all schemas) |
| State | React Query 5 + Context API |
| Icons | Lucide React |
| Testing | Vitest 4 + Testing Library |
| Deploy | Docker + GitHub Actions (self-hosted runner) |

---

## Project Structure

```
motnhaerp/
├── app/                          # Next.js App Router
│   ├── layout.js                 # Root layout (wraps Providers)
│   ├── page.js                   # Dashboard
│   ├── login/page.js             # Login page
│   ├── globals.css               # ALL styles (single CSS file)
│   │
│   ├── customers/                # CRM
│   │   ├── page.js               # Customer list
│   │   └── [id]/page.js          # Customer detail
│   ├── projects/                 # Project management
│   │   ├── page.js
│   │   └── [id]/page.js
│   ├── contracts/                # Contracts
│   │   ├── page.js
│   │   ├── create/page.js
│   │   └── [id]/page.js
│   ├── quotations/               # Quotations
│   │   ├── page.js
│   │   ├── create/page.js
│   │   ├── [id]/edit/page.js
│   │   └── [id]/pdf/page.js
│   ├── finance/page.js           # Finance overview
│   ├── payments/page.js          # Payment tracking
│   ├── expenses/page.js          # Expenses
│   ├── products/page.js          # Product catalog
│   ├── inventory/page.js         # Inventory
│   ├── work-orders/page.js       # Work orders
│   ├── purchasing/page.js        # Purchase orders
│   ├── hr/page.js                # HR management
│   ├── contractors/page.js       # Contractors
│   ├── suppliers/page.js         # Suppliers
│   ├── pipeline/page.js          # Sales pipeline
│   ├── partners/page.js          # Partners
│   ├── reports/page.js           # Reports
│   ├── progress/[code]/page.js   # Public project tracking
│   │
│   └── api/                      # REST API routes
│       ├── auth/[...nextauth]/   # NextAuth handler
│       ├── dashboard/            # GET - KPI stats
│       ├── customers/            # CRUD
│       ├── projects/             # CRUD
│       ├── contracts/            # CRUD + payments
│       ├── quotations/           # CRUD
│       ├── quotation-templates/  # CRUD
│       ├── products/             # CRUD
│       ├── employees/            # CRUD
│       ├── contractors/          # CRUD
│       ├── suppliers/            # CRUD
│       ├── work-orders/          # CRUD
│       ├── work-item-library/    # CRUD
│       ├── finance/              # Finance + receivables
│       ├── inventory/            # Stock management
│       ├── purchase-orders/      # Purchase orders
│       ├── material-plans/       # Material planning
│       ├── project-documents/    # Documents
│       ├── project-expenses/     # Expenses
│       ├── tracking-logs/        # CRM activity logs
│       ├── milestones/[id]/      # Milestone updates
│       ├── upload/               # File upload
│       └── progress/[code]/      # Public API
│
├── components/
│   ├── AppShell.js               # Layout: sidebar + header + content
│   ├── Header.js                 # Top bar (title, search, user, theme)
│   ├── Sidebar.js                # Navigation menu (role-aware)
│   ├── Providers.js              # SessionProvider, QueryClient, Role, Toast
│   ├── ui/                       # Reusable UI components
│   │   ├── Modal.js              # Modal dialog
│   │   ├── DataTable.js          # Sortable table
│   │   ├── Pagination.js         # Pagination controls
│   │   ├── Toast.js              # Toast notifications (context)
│   │   ├── ConfirmDialog.js      # Confirmation dialog
│   │   ├── SearchBar.js          # Search input
│   │   ├── FilterBar.js          # Filter controls
│   │   ├── StatusBadge.js        # Status badges
│   │   ├── FormGroup.js          # Form field wrapper
│   │   └── KPICard.js            # KPI stat card
│   └── quotation/                # Quotation-specific
│       ├── CategoryTable.js
│       ├── TreeSidebar.js
│       └── Summary.js
│
├── lib/                          # Server & shared utilities
│   ├── prisma.js                 # Prisma singleton + soft delete extension
│   ├── auth.js                   # NextAuth config (CredentialsProvider)
│   ├── apiHandler.js             # withAuth() wrapper
│   ├── fetchClient.js            # Frontend fetch (apiFetch)
│   ├── pagination.js             # parsePagination() + paginatedResponse()
│   ├── softDelete.js             # Prisma $extends for soft delete
│   ├── generateCode.js           # Auto-generate codes (DA-001, HD-001, etc.)
│   ├── format.js                 # Vietnamese locale formatting
│   ├── rateLimit.js              # In-memory rate limiter (60 req/min)
│   ├── quotation-constants.js    # Quotation enums/templates
│   └── validations/              # Zod schemas
│       ├── common.js             # Shared types (optStr, optFloat, optDate, cuid)
│       ├── customer.js
│       ├── project.js
│       ├── contract.js
│       ├── quotation.js
│       ├── product.js
│       ├── employee.js
│       ├── contractor.js
│       ├── supplier.js
│       ├── expense.js
│       ├── workOrder.js
│       └── workItemLibrary.js
│
├── contexts/
│   └── RoleContext.js            # 4-tier RBAC (permissions from session)
│
├── hooks/
│   ├── useQuotationForm.js       # Quotation form state
│   └── useAutoSaveDraft.js       # Auto-save draft
│
├── prisma/
│   ├── schema.prisma             # 28 models + User (PostgreSQL)
│   └── seed.js                   # Full sample data
│
├── types/
│   ├── models.ts                 # TypeScript interfaces
│   └── api.ts                    # API response types
│
├── __tests__/                    # Tests
│   ├── setup.ts
│   └── lib/
│       ├── format.test.ts
│       ├── pagination.test.ts
│       └── validations.test.ts
│
├── scripts/
│   └── entrypoint.sh             # Docker entrypoint
│
├── docker-compose.yml            # Dev: PostgreSQL only
├── docker-compose.prod.yml       # Prod: PostgreSQL + App
├── Dockerfile                    # Multi-stage (Node 22 Alpine)
├── .github/workflows/deploy.yml  # CI/CD pipeline
├── middleware.js                  # NextAuth route protection
├── next.config.mjs               # standalone output, bcryptjs external
├── package.json
└── vitest.config.ts
```

---

## Architecture & Patterns

### API Route Pattern

ALL API routes use the `withAuth()` wrapper. Never write raw route handlers.

```javascript
// app/api/customers/route.js
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { customerCreateSchema } from '@/lib/validations/customer';

// GET /api/customers?page=1&limit=20&search=abc
export const GET = withAuth(async (request, context, session) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get('search') || '';

    const where = search
        ? { name: { contains: search, mode: 'insensitive' } }
        : {};

    const [data, total] = await Promise.all([
        prisma.customer.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.customer.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

// POST /api/customers
export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const validated = customerCreateSchema.parse(body);  // Zod validates + strips unknown fields

    const customer = await prisma.customer.create({ data: validated });
    return NextResponse.json(customer, { status: 201 });
});
```

**Key points:**
- `withAuth()` handles: auth check, rate limiting (60/min), error catching, Prisma/Zod error formatting
- `withAuth(handler, { public: true })` for public routes (no auth)
- Session available as 3rd argument: `session.user.id`, `session.user.name`, `session.user.role`
- Always use `parsePagination()` for list endpoints
- Always validate with Zod schema (`.strict()` blocks unknown fields)

### Frontend Fetch Pattern

Use `apiFetch()` from `lib/fetchClient.js` for all API calls. It auto-redirects to `/login` on 401.

```javascript
'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

export default function CustomersPage() {
    const [data, setData] = useState({ data: [], pagination: {} });
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/customers?page=${page}&limit=20`);
            setData(res);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Create
    const handleCreate = async (formData) => {
        try {
            await apiFetch('/api/customers', {
                method: 'POST',
                body: JSON.stringify(formData),
            });
            showToast('Them thanh cong!', 'success');
            fetchData();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    return (/* ... */);
}
```

**Key points:**
- All pages are `'use client'` components
- Use `showToast()` instead of `alert()` / `window.confirm()`
- For confirmations, use `ConfirmDialog` component
- Paginated responses: `res.data` (array) + `res.pagination` (metadata)

### Validation Pattern

All Zod schemas live in `lib/validations/`. Each entity has `createSchema` and `updateSchema` (partial).

```javascript
// lib/validations/customer.js
import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

export const customerCreateSchema = z.object({
    name: z.string().trim().min(1, 'Ten khach hang bat buoc'),
    phone: z.string().trim().min(1, 'So dien thoai bat buoc'),
    email: optStr,
    address: optStr,
    type: optStr.default('Ca nhan'),
    // ...more fields
}).strict();  // IMPORTANT: .strict() rejects unknown fields

export const customerUpdateSchema = customerCreateSchema.partial();
```

### Soft Delete

10 models have soft delete: Customer, Project, Product, Quotation, Contract, Contractor, Supplier, Employee, WorkOrder, ProjectExpense.

Handled automatically by Prisma `$extends` in `lib/softDelete.js`. Queries auto-filter `deletedAt: null`. Use `prisma.model.delete()` normally - it sets `deletedAt` instead of hard deleting.

### Auto Code Generation

`lib/generateCode.js` generates sequential codes (DA-001, HD-001, BG-001, etc.) using PostgreSQL `Serializable` transactions to prevent race conditions.

```javascript
import { generateCode } from '@/lib/generateCode';

const code = await generateCode('Customer', 'code', 'KH');  // -> KH-001, KH-002, ...
```

### Role-Based Access

4 roles defined in `contexts/RoleContext.js`:

| Role | Permissions |
|------|-------------|
| Giam doc | Full access |
| Pho GD | Full access, cannot delete expenses |
| Ke toan | Finance, expenses, suppliers; no approve/reject/collect |
| Ky thuat | Read-only projects; no finance, no expenses |

Use in components:
```javascript
import { useRole } from '@/contexts/RoleContext';

const { role, can } = useRole();
if (can('editContracts')) { /* show edit button */ }
```

---

## Database (Prisma)

### Key Models (28 + User)

**CRM:** Customer, TrackingLog
**Sales:** Quotation, QuotationCategory, QuotationItem, QuotationTemplate (+Category, +Item)
**Projects:** Project, ProjectMilestone, ProjectBudget, ProjectExpense, ProjectDocument, ProjectEmployee
**Contracts:** Contract, ContractPayment
**Operations:** WorkOrder, Product, InventoryTransaction, Warehouse, MaterialPlan, PurchaseOrder, PurchaseOrderItem
**HR:** Employee, Department
**Finance:** Transaction, Contractor, ContractorPayment, Supplier

### Common Prisma Commands

```bash
npm run db:studio       # Open Prisma Studio GUI (browse data)
npm run db:migrate      # Create migration after schema change
npm run db:generate     # Regenerate client after schema change
npm run db:seed         # Seed sample data
npm run db:reset        # Reset DB + re-seed
```

### Schema Changes Workflow

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npm run db:migrate
# 3. (If migration fails, fix schema, try again)
# 4. Prisma client auto-regenerates via postinstall
```

**WARNING:** Do NOT run `npx prisma` without `npm install` first. It may install Prisma v7 which is incompatible with our v6 schema.

---

## Styling

All styles are in a single file: `app/globals.css`. No CSS modules, no Tailwind.

**Conventions:**
- CSS variables for theming (light/dark): `var(--bg-primary)`, `var(--text-primary)`, `var(--border)`, etc.
- Component classes: `.card`, `.stat-card`, `.data-table`, `.modal`, `.btn`, `.badge`, `.form-input`, etc.
- Responsive breakpoints: 1024px, 768px (tablet), 480px (mobile)

---

## Git Workflow & Deployment

### Branch Strategy
- `main` branch only
- Push to `main` triggers auto-deploy

### Commit & Deploy

```bash
# 1. Make your changes
# 2. Stage files
git add <files>

# 3. Commit
git commit -m "Short description of what and why"

# 4. Push (triggers auto-deploy)
git push origin main
```

### What Happens on Push

1. GitHub Actions self-hosted runner on server picks up the job
2. Checks out code
3. Creates `.env` from GitHub Secrets
4. Starts PostgreSQL container
5. Runs `npm ci` + `prisma generate` + `prisma db push`
6. Builds Docker image + deploys containers
7. Cleans up old images

**Deploy time:** ~2-3 minutes
**Server:** https://admin.tiktak.vn

### If Deploy Fails

- Check GitHub Actions tab for logs
- Common issues:
  - Schema change needs `prisma db push` (auto-handled)
  - New env vars need to be added to GitHub Secrets
  - Docker build failure = check Dockerfile

---

## Adding a New Feature (Step-by-Step)

### Example: Add a new "Suppliers" CRUD

#### 1. Database Model (if needed)

Edit `prisma/schema.prisma`:
```prisma
model Supplier {
  id        String   @id @default(cuid())
  code      String   @unique
  name      String
  phone     String?
  // ...fields
  deletedAt DateTime?  // For soft delete
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Then: `npm run db:migrate`

#### 2. Validation Schema

Create `lib/validations/supplier.js`:
```javascript
import { z } from 'zod';
import { optStr } from './common';

export const supplierCreateSchema = z.object({
    name: z.string().trim().min(1, 'Ten NCC bat buoc'),
    phone: optStr,
    // ...
}).strict();

export const supplierUpdateSchema = supplierCreateSchema.partial();
```

#### 3. API Routes

Create `app/api/suppliers/route.js`:
```javascript
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { supplierCreateSchema } from '@/lib/validations/supplier';

export const GET = withAuth(async (request, context, session) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get('search') || '';

    const where = search
        ? { name: { contains: search, mode: 'insensitive' } }
        : {};

    const [data, total] = await Promise.all([
        prisma.supplier.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.supplier.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const validated = supplierCreateSchema.parse(body);

    const supplier = await prisma.supplier.create({ data: validated });
    return NextResponse.json(supplier, { status: 201 });
});
```

Create `app/api/suppliers/[id]/route.js` for GET/PUT/DELETE by ID.

#### 4. Frontend Page

Create `app/suppliers/page.js` - use existing pages as reference (e.g., `app/customers/page.js`).

#### 5. Add to Sidebar

Edit `components/Sidebar.js` - add menu item to `menuItems` array.

#### 6. Add Page Title

Edit `components/Header.js` - add to `pageTitles` object.

---

## Common Gotchas

| Issue | Solution |
|-------|----------|
| `npx prisma` installs wrong version | Always `npm install` first, never bare `npx prisma` |
| Prisma `$use` not found | Use `$extends` (Prisma 6 removed `$use`) |
| `useSearchParams()` SSR crash | Wrap component in `<Suspense>` |
| Paginated response undefined | Access `res.data` not `res` directly |
| Soft delete not filtering | Import prisma from `@/lib/prisma` (has $extends) |
| Zod rejects valid data | Check for unknown fields (`.strict()` mode) |
| Windows path errors in bash | Use forward slashes: `cd C:/Users/...` |
| Auth returns null in API | Ensure `withAuth()` wraps handler |
| Toast not showing | Ensure component is inside `<Providers>` tree |

---

## AI Vibe Coding Guide

This section is for AI assistants (Claude Code, Cursor, Copilot, etc.) working on this codebase.

### Before You Code

1. **Read the relevant existing code** before making changes
2. **Follow existing patterns** - don't invent new ones
3. **Check `lib/validations/`** for schema patterns
4. **Check existing pages** for UI patterns (e.g., `app/customers/page.js`)

### Must-Follow Rules

- **API routes:** Always use `withAuth()` wrapper
- **Validation:** Always use Zod schema with `.strict()`
- **Fetching:** Always use `apiFetch()` from `lib/fetchClient.js`
- **Notifications:** Use `showToast()`, never `alert()` or `window.confirm()`
- **Pagination:** Use `parsePagination()` + `paginatedResponse()`
- **Prisma import:** Always from `@/lib/prisma` (has soft delete extension)
- **Search:** Use `{ contains: search, mode: 'insensitive' }` for PostgreSQL
- **Cascade deletes:** Wrap in `prisma.$transaction(async (tx) => {...})`
- **Code generation:** Use `generateCode(model, field, prefix)`
- **Styling:** Add CSS to `app/globals.css`, use existing CSS variables

### Build & Test

```bash
npm run build           # Verify no build errors
npm test                # Run tests
npm run type-check      # TypeScript validation
```

### Commit & Deploy

```bash
git add <specific-files>
git commit -m "Description of changes"
git push origin main    # Auto-deploys to server
```

### File Checklist for New Feature

- [ ] `prisma/schema.prisma` - Model (if new entity)
- [ ] `lib/validations/<entity>.js` - Zod schema
- [ ] `app/api/<entity>/route.js` - API (GET, POST)
- [ ] `app/api/<entity>/[id]/route.js` - API (GET, PUT, DELETE)
- [ ] `app/<entity>/page.js` - Frontend page
- [ ] `components/Sidebar.js` - Menu item
- [ ] `components/Header.js` - Page title
- [ ] `app/globals.css` - Styles (if needed)
- [ ] `npm run db:migrate` - Migration (if schema changed)
