# ERP Upgrade Opportunities — HomeERP

**Research Date:** March 6, 2026
**Target:** Vietnamese furniture & construction company | Next.js 16, PostgreSQL, Prisma ORM

---

## Dashboard Improvements

**Current State:** Dashboard has basic KPIs (revenue, collection, profit, active projects, contracts), alerts for warranties/leave/overdue receivables, and furniture production status.

**High-Value Additions:**

| Feature | Impact | Why | Priority |
|---------|--------|-----|----------|
| **Profit Margin by Project** | High | Identify profitable vs loss-making projects for directors | Critical |
| **Project Health Index** (budget% + timeline% + quality%) | High | Leading indicator of project success | Critical |
| **Cash Flow Runway** | High | Days of operating capital remaining (Vietnam compliance critical) | Critical |
| **AR Aging by Customer** | Medium | Visualize overdue receivables by customer/status | High |
| **Revenue Forecast (3-month rolling)** | High | Leading indicator needed for Vietnamese tax planning | High |
| **Contractor Payment Status** | Medium | Subcontractor liability tracking | Medium |
| **Mobile Dashboard** (responsive grid) | Medium | Director/manager field access | Medium |

**Industry Benchmark:** Construction ERP dashboards typically show 8-10 KPIs maximum; HomeERP currently has ~12+ scattered. Consolidate into role-based views (Director vs Accountant vs Technical).

---

## Reports Module

**Current State:** Comprehensive reports page with AR aging, cash flow, monthly revenue/expense charts, aging receivables. Missing: Vietnamese-specific compliance reports.

**Critical Gaps:**

| Report | Requirement | Vietnamese Context |
|--------|-------------|-------------------|
| **Monthly Financial Statement (BCTC)** | VAS-compliant Balance Sheet, P/L, Notes | Due by March 30 annually; required format per Circular 99/2025 |
| **Cash Flow Statement (LDT)** | Classify by operations/investing/financing | Supports tax filing & audit requirements |
| **Project Profitability (by phase)** | Revenue vs Cost by milestone/contract phase | Construction-specific; needed for project managers |
| **Budget vs Actual Variance Report** | Grouped by cost categories | Identify overspend early; current page shows aged receivables only |
| **Supplier Settlement Report** | AP aging + payment terms | Critical for procurement; manage vendor relations |
| **Contractor/Subcontractor Settlement** | WO status + payment milestone tracking | Vietnamese construction uses subcontractors heavily |
| **Equipment & Asset Register** | Depreciation schedule for furniture/tools | Thai/Vietnam construction standard |
| **Warranty & Maintenance Log** | Post-project obligations tracking | Warranty tab exists; needs rollup report |

**Export Requirements:** Vietnam businesses (and furniture/construction specifically) require Excel/PDF exports with Vietnamese formatting (VND currency, date dd/mm/yyyy, Vietnamese fonts).

---

## Notifications System

**Current State:** None detected. Dashboard shows alerts but no in-app notification center or email/SMS notifications.

**Best Practices & Gaps:**

1. **Notification Center** (in-app)
   - Unread count badge on sidebar
   - Dismissible notification list with timestamps
   - Role-based filtering (e.g., accountants see expense approvals only)

2. **Approval Workflows** (critical for Vietnamese companies)
   - Auto-alert supervisor when expense/purchase order awaits approval
   - 3-level escalation: if not approved in 24h → escalate to manager → director
   - Avoids delays in payment processing (Vietnamese supply chains are tight)

3. **Project Alerts**
   - Budget threshold breach (e.g., 80% spent)
   - Milestone overdue (>7 days)
   - Warranty expiry within 30 days
   - Work order not started within 2 days of creation

4. **Financial Alerts**
   - Invoice due in 3 days / overdue
   - Contractor payment coming due
   - Low inventory on critical materials
   - Daily summary email to accountant/director

5. **Integration:** Email (default) + optional SMS for urgent items (construction sites need mobile alerts).

---

## Mobile Responsiveness

**Current State:** Dashboard is partially responsive. Reports page is mostly desktop-only. HR, Projects tabs are not optimized for mobile.

**Critical Mobile Pages (Field Worker Focus):**

| Page | Use Case | Mobile Must-Have |
|------|----------|-----------------|
| **Work Orders** | On-site progress tracking | Start/pause/complete WO; upload photo; add notes |
| **Project Details** | View budget, timeline, docs | View milestone %, contracts, punch list, warranty |
| **Expenses** | Submit field expenses | Take photo of receipt; voice note; auto-attach project |
| **Inventory** | Check material availability | Barcode scan; check stock; reserve quantity |
| **Punch List** | Track defects on-site | Add photo + location; mark resolved; before/after comparison |
| **Time Tracking** (missing) | Log work hours (for payroll) | QR code check-in; manual hours; overtime entry |
| **Dashboard** (critical for director) | Quick KPI check | Responsive cards; auto-collapse on <640px width |

**Technical Approach:** Add `@media (max-width: 768px)` rules; consider offline-first for Work Orders (sync when reconnected).

---

## HR Module Upgrades

**Current State:** Basic attendance tracking by month/year; salary calculations with BHXH insurance (8% + 1.5% + 1% = 10.5%); leave request UI present but backend incomplete.

**Gaps:**

| Feature | Vietnamese Context | Priority |
|---------|-------------------|----------|
| **Leave Management** | Annual leave (12 days), sick leave, parental leave per Labor Code | High |
| **Payroll Processing** | Monthly payroll batch; tax withholding; BHXH/BHYT deductions | High |
| **Overtime Tracking** | Construction often has overtime; track hours → auto-calculate extra pay | High |
| **Shift Management** | Construction crews work different shifts; assign people to shifts | Medium |
| **Performance Review** | Tie to bonuses; seasonal worker management | Medium |
| **Contract Templates** | Indefinite vs fixed-term contracts; probation period tracking | Medium |

**Implementation Priority:**
1. **Complete Leave Approval Workflow** (missing) — currently logs leave but no manager approval
2. **Payroll Export** (Vietnamese format) — TK27/TK27A forms for tax authority
3. **BHXH Insurance Report** — separate report per employee, monthly submission to social insurance office
4. **Timesheet Approval** — manager approves daily/weekly hours before payroll run

---

## Finance Module Upgrades

**Current State:** Dashboard shows revenue/expense overview. Reports page shows cash flow chart & aging. Lacks forward-looking features critical for small construction.

**High-Impact Additions:**

| Feature | Why | Vietnam-Specific |
|---------|-----|------------------|
| **Cash Flow Forecasting (12-week rolling)** | Predict shortfalls early; construction has long payment cycles (90+ days) | Bank requires for loan negotiations |
| **Budget vs Actual Variance Analysis** | Track which project phases/costs overrun | Identify inefficiencies; adjust future bids |
| **Budget Change Order Tracking** (exists partially) | Client scope changes → revenue adjustments | Construction-standard; must integrate with contracts |
| **Retention Money Tracking** | Client holds back 5-10% until warranty period | Vietnamese contracts standard practice |
| **Currency/Exchange Log** | If dealing with foreign suppliers (wood imports, machinery) | Track FX gains/losses separately |
| **Project Settlement Checklist** | Before marking project complete: all invoices issued, expenses recorded, contractor paid, warranty fund allocated | Reduces post-project disputes |

**Financial Reports (for Vietnamese compliance):**
- Monthly reconciliation by account (bank, AR, AP, inventory)
- VAT report (input VAT, output VAT, liability) — due monthly
- Corporate income tax calculation (20% on profit) — due quarterly

---

## Document Management & Workflow

**Current State:** ProjectDocument tab allows file upload by category. No version control, approval workflow, or structured collaboration.

**Best-Practice Additions:**

1. **Version Control**
   - Auto-track upload date + uploader + file version
   - Rollback to prior version if needed
   - Show "latest" label, deprecate old versions

2. **Approval Workflows**
   - Design drawings → designer → manager approval → release to site
   - RFIs (Request for Information) → respond → customer approval
   - Variation Orders → draft → review → approve → execute

3. **Document Categories** (construction-standard)
   - Design (CAD, sketches)
   - Contracts & RFIs
   - Inspection & Warranty
   - Photos (before/during/after)
   - Warranty & Maintenance
   - Project Completion (as-built drawings, handover)

4. **Collaboration Features**
   - Comments/annotations on documents (thread-based)
   - @mention team members in comments
   - Email notification on new comments

5. **Mobile-Friendly Viewer**
   - PDF preview on mobile (crucial for on-site review)
   - Download & annotate offline

---

## Data Export & Integration

**Current State:** Quotations can export to PDF. Most modules lack bulk export.

**High-Value Exports (Vietnamese context):**

| Format | Use Case | Priority |
|--------|----------|----------|
| **Excel** | Monthly financial reconciliation; payroll; customer lists; project reports | Critical |
| **PDF** | Contracts, quotations, invoices, warranty certificates, punch lists | High |
| **CSV** | Tax authority submission (VAT, corporate income tax); bank reconciliation | High |
| **JSON** | Integration with accounting software (e.g., Misa, FastAccounting) | Medium |

**Specific Templates (Vietnam-focused):**
- VAT Report (Excel): Input/Output by month → upload to eInvoicing portal
- Payroll Sheet (Excel): Employee + salary + deductions → payroll software
- Project Settlement (PDF): Revenue, cost, profit, contractor payoff summary

---

## Audit Trail / Activity Log

**Current State:** Admin → Activity Log exists. Logs login, data edits, approvals. Missing: detailed compliance requirements.

**Critical Events to Log (Vietnamese compliance):**

1. **Financial Transactions**
   - Invoice created/edited/deleted (user, timestamp, amount, approval status)
   - Payment approved/recorded (by whom, amount, method, contract reference)
   - Expense claim submitted/approved/rejected (with reason)
   - Budget adjustment (change order approval chain)

2. **Sensitive Data**
   - User login/logout with IP
   - Permission changes (who can view what)
   - Password changes
   - User account deactivation

3. **Project Milestones**
   - Contract signed (date, parties, amount)
   - Project status change (approval by manager)
   - Warranty period start/end
   - Project marked complete (checklist completion)

4. **Retention:** Logs must be kept 10 years per Vietnamese Accounting Law. Implement archive strategy.

5. **Audit Report Format:** Director should be able to pull "Activity Summary by Project" (who did what, when) for disputes or tax audits.

---

## Priority Matrix

| Feature | Impact | Effort | Priority | Timeline |
|---------|--------|--------|----------|----------|
| **Dashboard: Profit Margin by Project** | High | Low | Critical | Week 1 |
| **Notifications System** | High | High | Critical | Week 2-3 |
| **Leave Approval Workflow (HR)** | High | Medium | Critical | Week 2 |
| **Cash Flow Forecasting (12-week)** | High | Medium | Critical | Week 3 |
| **Vietnamese Financial Reports (BCTC, LDT)** | High | High | Critical | Week 4-5 |
| **Mobile Responsiveness (Work Orders + Dashboard)** | Medium | Medium | High | Week 3-4 |
| **Document Version Control** | Medium | Medium | High | Week 5 |
| **Approval Workflows (Expense/PO/Design)** | High | High | High | Week 3-4 |
| **Export Templates (Excel/PDF for Vietnam)** | Medium | Low | High | Week 5-6 |
| **Audit Trail Enhancements** | Medium | Low | Medium | Week 6 |
| **Budget vs Actual Report** | Medium | Low | Medium | Week 2 |
| **Contractor Settlement Report** | Medium | Low | Medium | Week 6 |

---

## Unresolved Questions

1. **Mobile Strategy:** Should HomeERP have a native mobile app (React Native/Flutter) or is responsive web sufficient?
2. **Approval Escalation:** Auto-escalate to director if manager doesn't approve within 24h — who owns configuring thresholds?
3. **Offline Sync:** For construction field work, which modules need offline-first capability (Work Orders, Inventory, Punch List)?
4. **Third-Party Integration:** Any integration roadmap with Vietnamese banking, tax authority (eInvoicing), or accounting software?
5. **Notification Channels:** Email only, or SMS/push notifications as well?

---

**Sources:**
- [Construction KPIs — Deltek](https://www.deltek.com/en/construction/construction-kpis)
- [Furniture Manufacturing KPIs Dashboard — Modeliks](https://www.modeliks.com/industries/manufacturing/custom-furniture-making-kpis-dashboard)
- [Vietnamese Accounting Standards & Compliance — Emerhub](https://emerhub.com/vietnam/accounting-compliance-deadlines-in-vietnam/)
- [Vietnamese Financial Reporting — IFRS/VAS Guide](https://vietnam.acclime.com/guides/vietnam-ifrs-and-vas/)
- [Mobile ERP Features — NetSuite](https://www.netsuite.com/portal/resource/articles/erp/mobile-erp.shtml)
- [Construction Audit Trail Best Practices — PlanRadar](https://www.planradar.com/ae-en/construction-audit-trails-benefits-and-challenges/)
- [ERP Approval Workflows — Atlassian Workstream](https://www.atlassian.com/work-management/project-management/approval-process-workflow)
- [Construction Document Management — Procore](https://www.procore.com/platform/document-management)
- [Cash Flow Forecasting for Construction — Dryrun](https://www.dryrun.com/blog/the-role-of-budgets-in-building-a-cash-flow-forecast)
- [Vietnam Labor Code & Payroll Compliance — Acclime Vietnam](https://vietnam.acclime.com/guides/hr-payroll/)
