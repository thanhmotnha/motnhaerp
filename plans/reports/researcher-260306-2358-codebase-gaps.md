# HomeERP Codebase Gap Analysis

**Analysis Date:** 2026-03-06 | **Status:** Complete

---

## Executive Summary
HomeERP is a 60% feature-complete ERP for furniture & construction. Core modules exist but exhibit 4 categories of gaps: stub pages (160-180 LoC), DB models without UI, incomplete API-UI integrations, and cross-module connection failures.

---

## Completeness Matrix

| Module | Pages | API | Status | Notes |
|--------|-------|-----|--------|-------|
| **Customers** | Full | ✓ | 80% | List/create/edit complete; missing batch import, bulk actions |
| **Projects** | Full | ✓ | 85% | CRUD + pipeline view; missing project templates, phase breakdown |
| **Quotations** | Full | ✓ | 75% | Create/edit/PDF; missing approval workflow, category sync issues |
| **Contracts** | Full | ✓ | 80% | CRUD + payment schedule; missing amendments workflow, signature capture |
| **Payments** | Full | ✓ | 70% | Receipt tracking; weak AR aging, no payment plan automation |
| **Projects (Budget)** | Partial | ⚠ | 50% | Line items only; missing change orders UI, variance analysis |
| **Finance** | Full | ✓ | 65% | Dashboard + AR aging; missing GL integration, journal entries half-baked |
| **HR** | Full | ✓ | 60% | Attendance + payroll basic; missing leave management, benefits |
| **Furniture Orders** | Full | ✓ | 70% | Full lifecycle but weak design/material tracking integration |
| **Workshops** | Stub | ⚠ | 35% | List only (155 LoC); no batch management, no production tracking |
| **Acceptance** | Stub | ⚠ | 40% | Form-based; no template system, incomplete defect tracking |
| **Purchasing** | Full | ✓ | 65% | PO + GRN; missing purchase analytics, vendor mgmt weak |
| **Inventory** | Full | ✓ | 60% | Transactions only; missing stock alerts, no cycle count |
| **Work Orders** | Stub | ⚠ | 35% | List only (225 LoC); missing task assignment, progress tracking |
| **Products** | Full | ✓ | 70% | CRUD + BOM; missing attribute variants sync to orders |
| **Suppliers** | Full | ✓ | 65% | List/CRUD; missing rating system, contract terms |
| **Contractors** | Stub | ✓ | 50% | List + payment tracking; no task assignment, no performance metrics |
| **Expenses** | Full | ✓ | 60% | Basic tracking; missing approval workflow, budget control |
| **Reports** | Full | ✓ | 50% | Dashboard-heavy; missing custom report builder, export gaps |
| **Admin** | Partial | ✓ | 55% | Settings/users/audit; missing backup, permission matrix |

---

## Stub/Incomplete Modules (≤225 LoC)

### 1. **Workshops** (155 LoC - 35% complete)
- **What exists:** Card grid showing workshop list, basic info display
- **What's missing:**
  - No batch (ProductionBatch) management UI
  - No production tracking (what's in-queue, running, completed)
  - No capacity planning or utilization metrics
  - No integration with furniture orders → batch assignment
  - Workshop dashboard is purely informational

### 2. **Acceptance (Biên bản Nghiệm thu)** (161 LoC - 40% complete)
- **What exists:** Form-based report creation with pass/fail items
- **What's missing:**
  - No acceptance report list detail view (view by defect count, status, assignee)
  - No approval workflow (created → reviewed → approved → rejected)
  - No photo/attachment support (critical for construction)
  - No template library for standard acceptance checklists
  - Missing defect item resolution tracking (created defect → fix → re-inspect)

### 3. **Work Orders** (225 LoC - 35% complete)
- **What exists:** Basic list view with filters
- **What's missing:**
  - No work order detail/edit page (file exists but stub)
  - No task assignment UI (assign to employees/contractors)
  - No progress tracking (% complete, status updates)
  - No time logging integration
  - No materials/tools assignment

### 4. **Contractors** (246 LoC - 50% complete)
- **What exists:** List, create, document upload
- **What's missing:**
  - No contractor task assignment (SubContractorTask model exists but no UI)
  - No performance metrics (completion rate, quality score, cost variance)
  - No contract terms management
  - No payment terms automation (contractor payments partially done)
  - Payment module disconnected from task completion

---

## DB Models Without UI Pages

**Models in Prisma schema but NO corresponding list/detail page:**

- `LeaveRequest` — HR module exists but leave requests stub
- `Department` — No department management page
- `DesignVersion` — Design tracking for furniture/projects absent
- `MaterialSelectionItem` — Related to furniture design but no UI
- `TaskDependency` — Schedule dependency mgmt exists in API but no UI
- `PunchListItem` — Quality assurance punch lists referenced but not UI-accessible
- `WarrantyTicket` — Warranty tracking model exists, no warranty mgmt page
- `WorkItemLibrary` — Template library for work orders exists in DB but no editor UI

---

## Cross-Module Integration Gaps

### **Quotation → Contract → Project Budget**
- Quotation model has no sync field to contract (manual recreation of categories)
- Project budget categories hardcoded, not linked to quotation items
- **Impact:** Budget overruns due to quote-to-budget data drift

### **Product Variants ↔ Furniture Orders**
- `VariantTemplate` (product colors/sizes) exists but furniture order items don't use it
- Material selections stored separately; not linked to variant options
- **Impact:** Can't propagate product changes to open orders

### **Workshop Batches → Production Tasks**
- ProductionBatch created but no assignment mechanism to workshop capacity/schedule
- No task dependencies (batch A blocks batch B) implementation in UI
- **Impact:** Bottleneck blindness in production

### **Project → Acceptance → Warranty**
- Acceptance reports can be created but closure doesn't trigger warranty setup
- No defect-to-warranty-item link
- **Impact:** Warranty requests orphaned from project context

### **Contractor → Work Orders → Payments**
- Contractors exist, work orders exist, payments exist — but no unified assignment flow
- Payment triggers manual entry, not task-completion-based
- **Impact:** Double data entry, payment delays

### **Inventory → Purchasing**
- Stock levels tracked, PO created, GRN received — but no auto-suggestion for reorder
- Material requisitions exist (model) but no UI to convert to PO
- **Impact:** Stock-outs happen before PO is triggered

---

## UX/UI Gaps (Forms & Field Coverage)

| Form | Status | Missing Fields |
|------|--------|-----------------|
| Project create | ✓ Basic | Phase breakdown, labor allocation, risk register |
| Quotation create | ✓ Adequate | Markup calculation assistant, competitor pricing field |
| Contract create | ✓ Basic | Penalty clauses, warranty terms, defect liability period |
| Furniture order | ✓ Adequate | Material presets, size calculator, installation notes |
| Purchase order | ✓ Adequate | Receipt schedule, inspection checklist, payment terms |
| Work order create | ⚠ Missing | Labor estimate, tool list, material checklist |
| Acceptance form | ⚠ Minimal | Defect severity field, photographic evidence, rework estimate |
| HR: Leave request | ⚠ Missing | Balance check, approver field, auto-email trigger |

---

## API Routes Without Full Frontend Implementation

| API Endpoint | Purpose | Status | Gap |
|--------------|---------|--------|-----|
| `/api/material-requisitions` | Request materials for projects | ✓ Route | No UI form to create/approve |
| `/api/schedule-tasks/alerts` | Alert on task delays | ✓ Route | No dashboard widget |
| `/api/budget/variance` | Compare actual vs budget | ✓ Route | Report stub only |
| `/api/budget/profitability` | Project profitability | ✓ Route | Read-only in reports (no drill-down) |
| `/api/journal-entries/analyze` | GL analysis | ✓ Route | Not linked to finance dashboard |
| `/api/tracking-logs` | Activity tracking | ✓ Route | Queried but not visualized |
| `/api/commitments` | Financial commitments | ✓ Route | No commitment tracking UI |
| `/api/daily-logs` | Site daily reports | ✓ Route | **No page exists** |
| `/api/batch/status` | Production batch status | ✓ Route | No status dashboard |
| `/api/work-item-library` | Work task templates | ✓ Route | Read-only; no editor UI |

---

## Page Completeness Assessment (LoC threshold: 150=stub, 150-400=partial, 400+=solid)

**Solid (400+ LoC):** Products (1186), Reports (989), Finance (785), HR (735), Payments (480), Partners (469), Expenses (440), Purchasing (402)

**Partial (150-400):** Inventory (333), Schedule Templates (218), Quotations (223), Work Orders (225), Pipeline (228), Contractors (246), Customers (253), Suppliers (257)

**Stubs (<150 LoC):** Projects (129), Workshops (155), Acceptance (161), Login (155)

---

## Priority Gaps to Address

1. **Workshops Module** — Missing production batch UI; blocks furniture → workshop workflow
2. **Work Order Assignments** — No task assignment UI; blocks contractor payment automation
3. **Acceptance Workflow** — No approval/defect tracking; impacts project closeout
4. **Material Requisitions** — API exists but no form; breaks inventory planning
5. **Daily Site Logs** — API exists but no page; blocks on-site tracking
6. **Leave Requests** — Model exists, no HR UI; blocks attendance accuracy
7. **Design Versions** — Design tracking absent; furniture orders can't track design revisions
8. **Quotation → Contract Sync** — Data duplication; budget accuracy suffers

---

## Unresolved Questions

- Is material requisition workflow required or can PO creation replace it?
- Should design versions feed furniture order configurations automatically?
- Is daily site log tracking critical path or nice-to-have?
- Should workshop capacity planning integrate with project schedule or remain manual?
- Are warranty tickets in-scope for MVP or post-launch feature?
