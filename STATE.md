# STATE.md — Một Nhà ERP

> Cập nhật: 2026-03-16T11:30

## Project Overview
- **Stack**: Next.js 16 + React 19 + Prisma 6 + PostgreSQL + Docker
- **Mục đích**: ERP quản lý doanh nghiệp nội thất/xây dựng
- **API Routes**: 170+ routes, 70+ modules
- **DB Models**: 79 Prisma models
- **Auth**: JWT (web) + Bearer Token (mobile) + Public pages
- **Storage**: Cloudflare R2
- **AI**: Gemini (Journal Assistant)

## Done (gần đây)
- [x] Phase 1-3: Schema, APIs, Dashboard, HR tabs, Furniture Orders, Production Batches
- [x] Phase 4-6: CustomerInteraction, EmployeeReview, SalaryAdvance, Quotation versioning, Accounting
- [x] Phase 7-9: Sidebar, Notification bell, Daily Logs, Admin Settings, Dashboard Tier 4
- [x] Phase 10: Full test suite 61/61, Schema sync audit
- [x] Export hợp đồng → Word (.docx) + Import mẫu Word → template
- [x] Chuyển trình soạn thảo hợp đồng TipTap → TinyMCE (Word-like, font selector, pro toolbar)

## In Progress
- (none)

## Next
- [ ] Deployment / staging test
- [ ] Mobile responsive polish

## Commit
- Branch: `main`
- Last commit: `17795e2` — feat: export/import Word
