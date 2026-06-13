# Operix — Build Roadmap

Build the 13 modules as **4 vertical slices**, each independently demoable. Build the dependency graph from the top (Org/Employee) toward the bottom (Payroll). Ship after Slice 2 — that alone is a usable HR/attendance product.

---

## Slice 0 — Project setup (1–2 days)
- Next.js (App Router) + TypeScript strict + Tailwind + shadcn/ui.
- Prisma + PostgreSQL; run first migration from `prisma/schema.prisma`.
- Auth.js with credentials provider; session carries `userId`, `companyId`, `role`.
- `lib/auth/can.ts` — central `can(user, action, resource)` capability map.
- `lib/db.ts` — Prisma client with **companyId-scoping** enforced.
- Seed script: one demo Company + a Super Admin user.
- CI: typecheck + lint + `prisma validate` on every push.

## Slice 1 — Foundation (Modules 1, 2, 13)
**Org Management, Employee Management, Roles & Permissions.**
- Company setup + Departments / Teams / Designations / Work Shifts CRUD.
- Employee directory: profile, employment details, documents (S3 presigned), emergency contacts, reporting line.
- Role-based shells: `(admin)`, `(employee)`, `(client)` route groups with guards.
- User invite + login per role.
- **Security tests:** employee can't read others' records; client sees nothing internal.
> ✅ Demo: log in as each role, manage real org + people.

## Slice 2 — Time & Presence (Modules 5, 6, 7, 4) — *MVP ship point*
**Attendance, Leave, Timesheet, Resource Allocation.**
- Attendance: clock in/out, breaks, monthly calendar.
- Leave: types, balances, request → manager → HR approval workflow.
- Timesheet: time entries per project/task, daily/weekly/monthly views, manager approval.
- Resource Allocation: capacity vs assigned hours, utilization indicators.
- Notifications wired for these events (in-app first, email next).
> ✅ Demo + **ship internally**. This drives the MVP adoption metrics (login rate, attendance/timesheet completion).

## Slice 3 — Delivery (Modules 3, 9, 10, 11)
**Projects, Tasks, Clients, Client Portal, Knowledge Base.**
- Projects + tasks: subtasks, checklists, comments, attachments, dependencies, milestones.
- Task views: Kanban, List, Calendar, Timeline.
- Client database + contacts + project mapping.
- Client Portal: scoped login, view projects/progress, upload files, deliverables, approve/request-revision. **Hard isolation tests here.**
- Knowledge Base: categories, rich-text articles, version history, search.
> ✅ Demo: run a client project end-to-end through the portal.

## Slice 4 — Money & Insight (Modules 8, 12)
**Payroll, Reporting & Analytics.**
- Salary structures; payroll run (DRAFT → LOCKED → PAID) as a background job.
- India statutory calculators in `lib/payroll`: PF, ESI, Professional Tax (per-state slabs), overtime, leave deductions, incentives. Money in paise. Frozen payslip snapshots.
- Payslip PDF generation + download.
- Reporting: employee (attendance/leave/utilization/timesheets), project (progress/completion/delays), payroll (salary summary, dept cost), management dashboard.
> ✅ Demo: process a month of payroll, generate payslips, view dashboards.

---

## Engineering guardrails (apply throughout)
1. **No tenant query without `companyId`.** Centralize and test.
2. **Authorization at the service layer**, not just UI. Two hard boundaries: client isolation, employee self-service.
3. **Business logic in `lib/<domain>`**, route handlers stay thin.
4. **Money = integer paise**, never floats.
5. **Payslips are immutable snapshots.**
6. **Statutory rates live in config/DB**, not constants — they change yearly.
7. Write the **isolation/permission tests with the feature**, not after.

## Open decisions to confirm before Slice 4
- TDS / income-tax in MVP scope? (currently out)
- Overtime policy (rate multiplier, eligibility)?
- Leave accrual model (annual grant vs monthly accrual)?
