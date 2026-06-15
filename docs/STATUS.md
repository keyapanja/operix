# Operix — Build Status Snapshot

Compact current-state reference. See `docs/architecture.md` for rationale,
`docs/roadmap.md` for the original plan, and **`docs/SESSION-2026-06-15.md`** for
the most recent session's detailed change log + handoff.
_Last updated: 2026-06-15 (end of the portal/UX/notifications session)._

## Stack (as built)
- **Next.js 16** (App Router, Turbopack) · **TypeScript** strict · **Tailwind v4**
- **Prisma 6.19.3** (pinned — Prisma 7 moved DB URLs to a config file) · **PostgreSQL on Supabase**
  - **DB is in Mumbai (`aws-1-ap-south-1`), session pooler on port 5432** (not the 6543 transaction pooler — session pooler is ~30ms/query and correct for a persistent server). Migrated from the old Sydney DB this build; old DB kept for rollback.
  - **Shared DB with real data → `db:push` only, never `db:seed`.**
- **Auth:** hand-rolled `jose` JWT in an httpOnly cookie (not NextAuth) + set-password invite flow. Session carries `userId, companyId, role, email, employeeId, clientId`.
- **Email:** `nodemailer` SMTP — Gmail configured in `.env` and verified sending; falls back to console logging if `SMTP_HOST` is unset.
- **UI:** custom primitives — searchable `Combobox`, themed `DatePicker`, `Modal` + right offcanvas drawer, `Avatar` (image/initials + status dot); emerald/teal palette; full light + dark theme; collapsible sidebar with accordion sub-menus. Main content max width **1600px**.

## Modules live (all build-verified: `tsc` green)
- **Auth/RBAC** — login, logout, `proxy.ts` route guard (now **role-aware**: CLIENT → `/portal`, staff → app), `/set-password`. Dynamic permissions (`RolePermission` table, `lib/auth/permissions.ts`, **Organization → Access** matrix); Super Admin always full.
- **Dashboard** — role-aware; punch in/out card (live timer, shift grace, late flag, auto-refresh on punch-in).
- **Organization** — single **Company** tab (company profile: name/tagline/**logo**/business type/website/email/phone/address → name+tagline+logo show in the sidebar footer; plus work shifts, locations [single/multi toggle, add-form hidden when single+already-set], probation periods, **day-before reminder setting**), Departments, Services, Designations, Access matrix, Task access. Sections are single-box (form + table in one card).
- **Employees** — directory, create/edit, profile, emergency contacts, email invite + resend.
- **User profiles** — `/profile` (self: nickname, avatar URL, bio) + `/people/[id]` (anyone can view) with an **Active/Away badge** from attendance (punched-in-not-out). Avatar + "My profile" in the topbar.
- **Attendance** — admin daily grid (search/sort/paginate). Status is **display-only badge**; a **＋/✏️ "Log attendance" modal** sets status + in/out; editing a **self-logged** record first asks for confirmation. Self-service punch, leave sync, holiday banner, late detection → notifications.
- **Leave** — types (allowance per month/year); self-service apply (live balance, **submit disabled + warning when category exhausted/over-balance**, half-day, WFH, Employee→Manager→HR approval). **Notifications**: apply → approvers; approve/reject → employee.
- **Calendar** — holidays, who's away, announcements; click/drag a date → modal to apply leave / add holiday / post announcement. Posting an announcement **fans a notification to everyone**; optional **day-before reminders** for holidays + announcements (org-configurable time).
- **Projects** — list with progress, create (Services picker has a **search box**), detail with drag-and-drop Kanban + list. Internal project detail has a **Deliverables** panel (publish link-based deliverables for client review).
- **Tasks** — review workflow; Kanban (**column order: To Do → In Progress → Review → Client Review → Completed → Redo**) + List with **per-row Edit/Delete actions**; inline assignees + checklist; comments (@-mentions); per-user timers; role-based visibility. `deleteTask` now cleans up all child rows.
- **Time tracking** — per-task/user stopwatch, non-destructive pause, global bottom bar, pause/resume anywhere.
- **Clients** — list, contacts, project mapping, **"Portal access" invite** (creates a CLIENT login + emails the set-password link).
- **Knowledge Base** (Module 11) — guides scoped to **Project → Department → Service**, editable by everyone, full change log (who/when), **hand-rolled WYSIWYG editor** (contentEditable → Markdown, XSS-safe). Tasks show a **"Related guides"** card matching their project+service (project-specific first).
- **Reports** — read-only analytics (Time & Utilization, Projects, People, Attendance, Leave) with custom date ranges, multi-color charts, XLS/CSV/PDF export.
- **Notifications** — topbar bell → right drawer; `/notifications` page filterable by color-coded category (Tasks / Mentions / Attendance / Leave / **Announcements** / Payroll / Clients / General). Events firing: task workflow, @-mentions, late login, **leave apply/approve/reject**, **announcement posted**, **deliverable approve/revision**, **holiday/announcement day-before reminders**.

### Client Portal (Module 10) — Phase 1 built, client-side walkthrough pending
- Isolated `/portal` segment (own minimal layout); proxy confines CLIENT to `/portal/*` and staff out of it; `requirePortal()` guard; every query scoped to `clientId` in `lib/portal/data.ts`.
- Client invites from the Clients page; overview + projects + project detail (progress-only — no assignees/time/cost); approve/request-changes on **CLIENT_REVIEW tasks**; approve/request-revision on **link-based deliverables**; decisions notify the internal team.
- **Not yet live-verified on the client side** (needs a real CLIENT login — see SESSION doc). Internal side (invite UI, deliverables panel, staff redirect) is verified.

## Key conventions / decisions
- **Multi-tenant**: every tenant row carries `companyId`; all queries scope by it. **Portal/server actions re-check ownership** — the proxy is only the first line.
- **No UI libraries** — charts, Markdown renderer, combobox, datepicker, modal, and the WYSIWYG editor are all hand-rolled. KB/profile/logo "images" are **URL-based** until Phase-2 file storage lands.
- **Times**: company-local wall-clock; 12-hour display; "today" via company timezone (`nowInZone`).
- **Money**: integer paise.
- **Notifications**: taxonomy + colors + deep-links in `lib/notifications/categories.ts` (isomorphic). Fan-out helpers: `lib/calendar/reminders.ts` (`notifyAllInternal`), per-domain inline helpers in the relevant `actions.ts`.
- **Task visibility**: per-role scope (`ALL`/`TEAM`/`OWN`) as namespaced `task:scope:*` rows in `RolePermission`.

## Pending / what's left
- **Client Portal** — client-side live walkthrough + hard-isolation tests (needs a test CLIENT login). Phase 2 = real file deliverables/uploads.
- **Form Builder** (planned next phase) — drag-drop custom forms for clients/employees (referral/feedback/service-selection/POSH), JSON storage, form-data reports. Build current work to not conflict (see the user memory note).
- **File uploads (S3 / Supabase Storage, presigned)** — still unwired; blocks real avatars/logos, employee docs, task attachments, payslip PDFs, file-based deliverables.
- **Scheduled jobs / cron** — none in-app. Day-before reminders + late-check are **lazy triggers** (fire on the first page load past the time). Exact-time delivery + payroll runs need a real scheduler.
- **Resource Allocation (4), Timesheet views/approval (7), Payroll (8)** — schema only / partial.
- **Automated tests** — none (isolation/permission tests especially).
- Finishing touches: edit screens for work shifts / leave types / clients; attendance break tracking + monthly view; subtasks/dependencies/milestones; profile-link entry points (task assignees, directory).

## Workflow caveats (Windows)
- Dev server on **port 3000**; restart it after **schema changes** (`npm run db:push`) and after **renaming/removing an exported symbol** (Turbopack stale-module error).
- `prisma generate` may EPERM while the dev server holds the engine DLL — **stop the dev server before `db:push`**, then restart.
- Preview tooling: full-page **screenshots often time out** (dev-tools overlay) → verify via accessibility/DOM `eval`; the preview viewport **resets narrow on server restart** → `preview_resize` to ~1680 for desktop checks.
- Auto-mode classifier **blocks creating external accounts / sending real emails** (e.g. client portal invites) — those need explicit user setup.
