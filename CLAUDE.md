# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MỘT NHÀ ERP** — Enterprise Resource Planning system for a Vietnamese furniture & construction company. Built with Next.js 15 App Router, React 19, Prisma 6, and PostgreSQL.

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

# Docker (dev: DB only, prod: full stack)
docker compose up -d                          # Start PostgreSQL for local dev
docker compose -f docker-compose.prod.yml up  # Full production stack
```

## Architecture

### Request Lifecycle

1. `middleware.js` — Guards all routes; public paths: `/login`, `/api/auth/*`, `/progress/*`, `/public/*`
2. `app/api/**/route.js` — API route handlers, all wrapped with `withAuth()` from `lib/apiHandler.js`
3. `lib/auth.js` — NextAuth config (CredentialsProvider JWT 8h for web, Bearer token for mobile)
4. `lib/prisma.js` — Prisma singleton with soft delete extension auto-applied

### API Route Pattern

All API routes use `withAuth()` which provides: auth check (JWT or Bearer), rate limiting (60 req/min), Prisma error handling (P2002/P2025), Zod validation errors, Sentry capture, and activity logging.

```javascript
export const GET = withAuth(async (request, context, session) => {
    // session.user.id, .name, .role available
    const { searchParams } = new URL(request.url);
    const { skip, take } = getPagination(searchParams);
    const data = await prisma.entity.findMany({ skip, take, where: { deletedAt: null } });
    return NextResponse.json({ data, pagination: { ... } });
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

### Role-Based Access Control (5 Tiers)

Roles in `contexts/RoleContext.js`:
- `giam_doc` — Full access (Director)
- `pho_gd` — Full except cannot delete expenses (Vice Director)
- `ke_toan` — Finance, expenses, suppliers only (Accountant)
- `nhan_vien` — Limited access (Employee)
- `thi_cong` — Read-only projects (Technical)

Check roles in API routes via `session.user.role`; in UI via the `RoleContext`.

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
| `lib/validations/` | Zod schemas for all 79 entities |
| `lib/pagination.js` | `getPagination()` helper |
| `lib/generateCode.js` | Auto-generate codes (BG-001, HD-001, PO-001) |
| `lib/format.js` | Vietnamese locale formatting |
| `lib/activityLogger.js` | Mutation logging |
| `lib/r2.js` | Cloudflare R2 file storage |
| `components/AppShell.js` | Layout wrapper (sidebar + header) |
| `components/Sidebar.js` | Role-aware navigation menu |
| `components/ui/` | 16 shared UI components (Modal, DataTable, Toast, etc.) |
| `prisma/schema.prisma` | 79 database models |
| `middleware.js` | Route protection + CORS |
| `app/globals.css` | All styles |

## Database

79 Prisma models. Schema is in `prisma/schema.prisma`. In CI/CD, `prisma db push` is used (not `migrate deploy`). For local dev, use `npm run db:migrate`.

When adding a new entity: create the Prisma model → create a Zod validation schema in `lib/validations/` → create API routes using `withAuth()` → create frontend page → add menu item to `components/Sidebar.js`.

## Document Features

- **Import Word**: LibreOffice CLI → HTML → TinyMCE editor
- **Export Word**: `html-to-docx` library
- **Export PDF**: `html2pdf.js` + `pdf-lib` for merging
- **Contract variables**: `{{variable}}` substitution via `lib/contractVariables.js`
- **Rich text editors**: TinyMCE (primary, GPL license included) and TipTap

## Deployment

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) auto-deploys to self-hosted runner. Steps: create `.env` from secrets → run `prisma db push` → build Docker image → deploy containers. Deploy time ~2-3 minutes.

Environment variables required: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `R2_*` (Cloudflare R2), optionally `GEMINI_API_KEY`, `SENTRY_DSN`, SMTP settings.
