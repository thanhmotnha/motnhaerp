# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MỘT NHÀ ERP** — Enterprise Resource Planning system for a Vietnamese furniture & construction company. Built with Next.js 16 App Router, React 19, Prisma 6, PostgreSQL, Zod 4, and React Query 5.

Live: https://admin.tiktak.vn | Repo: https://github.com/sherlock-126/motnha

## Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm start            # Start production server

# Database
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed sample data
npm run db:studio    # Open Prisma Studio GUI (port 5555)

# Testing & Quality
npm test             # Run Vitest suite
npm run test:watch   # Watch mode
npm run type-check   # TypeScript validation (strict, allowJs)
npm run lint         # ESLint

# Database extras
npm run db:generate  # Regenerate Prisma client after schema change
npm run db:reset     # Reset database + re-seed (destructive)

# Docker (dev: DB only, prod: full stack)
docker compose up -d                          # Start PostgreSQL for local dev
docker compose -f docker-compose.prod.yml up  # Full production stack
```

**WARNING:** Never run bare `npx prisma` commands without `npm install` first — it may install Prisma v7 which is incompatible with the v6 schema. Always use the npm scripts above.

## Architecture

### Request Lifecycle

1. `middleware.js` — Guards all routes; public paths: `/login`, `/api/auth/*`, `/progress/*`, `/public/*`
2. `app/api/**/route.js` — API route handlers, all wrapped with `withAuth()` from `lib/apiHandler.js`
3. `lib/auth.js` — NextAuth config (CredentialsProvider JWT 8h for web, Bearer token for mobile)
4. `lib/prisma.js` — Prisma singleton with soft delete extension auto-applied

### API Route Pattern

All API routes use `withAuth()` which provides: auth check (JWT or Bearer), rate limiting (60 req/min), Prisma error handling (P2002/P2025), Zod validation errors, Sentry capture, and activity logging. Use `withAuth(handler, { public: true })` for public routes.

```javascript
export const GET = withAuth(async (request, context, session) => {
    // session.user.id, .name, .role available
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const [data, total] = await Promise.all([
        prisma.entity.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.entity.count(),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const validated = entityCreateSchema.parse(body); // .strict() rejects unknown fields
    const created = await prisma.entity.create({ data: { ...validated, createdById: session.user.id } });
    await logActivity(session.user.id, 'CREATE', 'Entity', created.id, created.name);
    return NextResponse.json(created, { status: 201 });
});
```

### Frontend Fetch Pattern

```javascript
'use client';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const { showToast } = useToast();
const res = await apiFetch('/api/customers?page=1&limit=20');
// res.data (array) + res.pagination (metadata)
```

### Soft Delete

10 models (Customer, Project, Product, Quotation, Contract, Contractor, Supplier, Employee, WorkOrder, ProjectExpense) use soft delete. The Prisma extension in `lib/softDelete.js` auto-filters `deletedAt: null` on `findMany`/`findFirst`. Delete operations set `deletedAt` instead of hard deleting.

### Validation

All schemas in `lib/validations/` use Zod with `.strict()` to reject unknown fields. Always import from the appropriate validation file, never inline validation logic.

### Role-Based Access Control (4 Tiers)

Roles defined in `contexts/RoleContext.js` with granular permissions:
- `giam_doc` — Full access (Giám đốc / Director)
- `pho_gd` — Full except cannot delete expenses (Phó Giám đốc / Vice Director)
- `ke_toan` — Finance, expenses, suppliers; no approve/reject (Kế toán / Accountant)
- `ky_thuat` — Read-only projects, no finance/expenses (Kỹ thuật / Technical) — this is the default fallback role

Check roles in API routes via `session.user.role`; in UI via `useRole()` hook which returns `{ role, permissions }`. Permissions are boolean flags like `canApprove`, `canCreateExpense`, `canViewFinance`, etc.

### Styling

All styles are in a single file: `app/globals.css` (65KB). Use existing CSS variables (`var(--bg-primary)`, `var(--text-primary)`, `var(--border)`) and component classes (`.card`, `.btn`, `.data-table`, `.modal`, `.badge`, `.form-input`). Do not add component-scoped CSS files.

### Path Alias

`@/*` maps to the project root (configured in `jsconfig.json`). Always use `@/` imports.

## Key Files

| File | Purpose |
|------|---------|
| `lib/apiHandler.js` | `withAuth()` wrapper — the core of every API route |
| `lib/fetchClient.js` | `apiFetch()` — frontend HTTP client |
| `lib/prisma.js` | Prisma singleton with soft delete extension |
| `lib/auth.js` | NextAuth configuration |
| `lib/validations/` | Zod schemas (~20 files, each with `createSchema` + `updateSchema`) |
| `lib/pagination.js` | `parsePagination()` + `paginatedResponse()` helpers |
| `lib/generateCode.js` | Auto-generate codes (BG-001, HD-001, PO-001) |
| `lib/format.js` | Vietnamese locale formatting |
| `lib/activityLogger.js` | Mutation logging |
| `lib/r2.js` | Cloudflare R2 file storage |
| `components/AppShell.js` | Layout wrapper (sidebar + header) |
| `components/Sidebar.js` | Role-aware navigation menu |
| `components/ui/` | 16 shared UI components (Modal, DataTable, Toast, etc.) |
| `prisma/schema.prisma` | 81 database models |
| `middleware.js` | Route protection + CORS |
| `app/globals.css` | All styles |

## Database

81 Prisma models. Schema is in `prisma/schema.prisma`. Table/column names use **PascalCase** (must use double quotes in raw SQL). In CI/CD, `prisma db push` is used (not `migrate deploy`). For local dev, use `npm run db:migrate`.

When adding a new entity: create the Prisma model → `npm run db:migrate` → create a Zod validation schema in `lib/validations/` → create API routes using `withAuth()` → create frontend page → add menu item to `components/Sidebar.js` → add page title in `components/Header.js`.

## Common Gotchas

| Issue | Solution |
|-------|----------|
| `npx prisma` installs wrong version | Always `npm install` first, never bare `npx prisma` |
| Prisma `$use` not found | Use `$extends` (Prisma 6 removed `$use`) |
| `useSearchParams()` SSR crash | Wrap component in `<Suspense>` |
| Paginated response undefined | Access `res.data` not `res` directly |
| Soft delete not filtering | Import prisma from `@/lib/prisma` (has $extends) |
| Zod rejects valid data | Check for unknown fields (`.strict()` mode) |
| Auth returns null in API | Ensure `withAuth()` wraps handler |
| Toast not showing | Ensure component is inside `<Providers>` tree |

## Document Features

- **Import Word**: LibreOffice CLI → HTML → TinyMCE editor
- **Export Word**: `html-to-docx` library
- **Export PDF**: `html2pdf.js` + `pdf-lib` for merging
- **Contract variables**: `{{variable}}` substitution via `lib/contractVariables.js`
- **Rich text editors**: TinyMCE (primary, GPL license included) and TipTap

## Deployment

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) auto-deploys to self-hosted runner. Steps: create `.env` from secrets → run `prisma db push` → build Docker image → deploy containers. Deploy time ~2-3 minutes.

Environment variables required: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `R2_*` (Cloudflare R2), optionally `GEMINI_API_KEY`, `SENTRY_DSN`, SMTP settings.
