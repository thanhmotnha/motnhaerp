# HomeERP - Mot Nha

ERP system for Vietnamese furniture & construction company management.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (Credentials)
- **Validation:** Zod
- **State:** React Query + Context API
- **UI:** Lucide React icons
- **Testing:** Vitest + Testing Library
- **Language:** JavaScript (TypeScript-ready with `strict: true`, `allowJs: true`)

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or Docker)

### Setup

```bash
# 1. Clone
git clone https://github.com/sherlock-126/motnha.git
cd motnha/motnhaerp

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# 4. Start PostgreSQL (with Docker)
docker compose up -d

# 5. Run migrations & seed
npm run db:migrate
npm run db:seed

# 6. Start dev server
npm run dev
```

Open http://localhost:3000

### Default Login
- **Email:** admin@motnha.vn
- **Password:** admin123

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Run tests |
| `npm run type-check` | TypeScript check |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset database |

## Features

- Customer relationship management with pipeline
- Project management with budgets and milestones
- Contract and quotation management (PDF export)
- Financial tracking (revenue, expenses, receivables)
- Inventory and warehouse management
- Supplier and contractor management
- Work order assignment and tracking
- Material planning and purchase orders
- 4-tier role-based access control
- Light/Dark theme

## Architecture

```
app/
  api/          # REST API routes (withAuth + Zod validation)
  login/        # Authentication page
  [pages]/      # Frontend pages
components/
  ui/           # Shared UI components (Modal, DataTable, Toast, etc.)
  AppShell.js   # Layout wrapper
  Header.js     # Top header with session
  Sidebar.js    # Navigation with role-based menu
lib/
  auth.js       # NextAuth config
  apiHandler.js # withAuth wrapper (auth + error handling + rate limit)
  pagination.js # Server-side pagination utilities
  validations/  # Zod schemas for all entities
  softDelete.js # Prisma middleware for soft delete
  prisma.js     # Prisma singleton + soft delete
  format.js     # Formatting utilities
  fetchClient.js # Frontend fetch wrapper
contexts/
  RoleContext.js # Role-based permissions (from session)
types/
  models.ts     # TypeScript interfaces
  api.ts        # API response types
prisma/
  schema.prisma # PostgreSQL schema (28 models + User)
  seed.js       # Seed data
```

## Security

- NextAuth.js session-based authentication
- bcrypt password hashing
- Zod input validation on all POST/PUT endpoints
- Rate limiting (60 req/min per user)
- withAuth wrapper prevents error message leaks
- MIME type + file size validation for uploads
- Soft delete (data preservation)
- Transaction-wrapped cascade deletes
