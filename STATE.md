# STATE.md — Một Nhà ERP

> Cập nhật: 2025-07-15T22:20

## Project Overview
- **Stack**: Next.js 16 + React 19 + Prisma 6 + PostgreSQL + Docker
- **Mục đích**: ERP quản lý doanh nghiệp nội thất/xây dựng
- **API Routes**: 150+ routes, 60+ modules
- **DB Models**: 62+ Prisma models (mới: DailyAttendance, Notification)
- **Auth**: JWT (web) + Bearer Token (mobile) + Public pages
- **Storage**: Cloudflare R2
- **AI**: Gemini (Journal Assistant)

## Done (gần đây)
- [x] Phase 1: Schema + API (DailyAttendance, Notification, Pipeline, Dashboard, Employee Profile, Leave Calendar)
- [x] Phase 2: Furniture Workflow APIs + Payroll Records API
- [x] Phase 3A: NotificationBell + Dashboard KPI Tier 3 (chấm công, đi trễ, nghỉ phép, pipeline)
- [x] Phase 3B: DailyAttendanceTab (check-in/out, day/month views)
- [x] Phase 3C: LeaveCalendarTab (visual monthly calendar)
- [x] Phase 3D: Customer Pipeline đã có sẵn (Kanban + Table tabs)
- [x] Phase 3E: Furniture Orders list + detail page (5 tabs: Tổng quan, Hạng mục, Thiết kế, Vật liệu, Thanh toán)
- [x] Phase 3F: Production Batches page (QC status, action buttons)
- [x] Phase 3G: Build verification passed (exit 0)
- [x] HR page: 6 tabs (Nhân viên, Chấm công & Lương, Chấm công ngày, Nghỉ phép, Lịch nghỉ, Bảng lương)
- [x] Sidebar: thêm "Đơn nội thất" + "Lô sản xuất" vào Sản xuất

## In Progress
- (none)

## Next
- [ ] Commit Phase 1-3 changes
- [ ] Deployment / staging test

## Commit
- Branch: `main`
- Uncommitted: Phase 1-3 (schema, APIs, HR tabs, dashboard KPI, furniture orders, production batches)
