# STATE.md — Một Nhà ERP

> Cập nhật: 2025-07-14T22:00

## Project Overview
- **Stack**: Next.js 16 + React 19 + Prisma 6 + PostgreSQL + Docker
- **Mục đích**: ERP quản lý doanh nghiệp nội thất/xây dựng
- **API Routes**: 150+ routes, 60+ modules
- **DB Models**: 62+ Prisma models (mới: DailyAttendance, Notification)
- **Auth**: JWT (web) + Bearer Token (mobile) + Public pages
- **Storage**: Cloudflare R2
- **AI**: Gemini (Journal Assistant)

## Done (gần đây)
- [x] Phase 1A: Schema migration (DailyAttendance, Notification, Employee+10 fields, Customer+lostReason)
- [x] Phase 1B: 7 API routes mới (daily-attendance, notifications CRUD, customer-pipeline, leave-calendar, employee-profile, dashboard-enhanced)
- [x] Fix: quotations/[token] route conflict (xóa duplicate)
- [x] Install: @tiptap/*, nodemailer
- [x] Build pass ✅

## In Progress
- [ ] Chưa có task đang thực hiện

## Next
- [ ] Frontend UI cho 6 phân hệ mới (Dashboard cards, Calendar, Pipeline board...)
- [ ] Deploy phase 1 lên VPS

## Commit
- Branch: `main`
- Uncommitted: Phase 1 schema + API routes + validation changes
