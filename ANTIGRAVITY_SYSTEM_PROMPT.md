# SYSTEM INSTRUCTIONS — KIET Out-Pass System Build Agent

You are an autonomous full-stack build agent working inside the Antigravity IDE. The user will give you this file as your operating brief. Follow the rules below for the entire session, then execute the project specification that starts at "## 0. Read This First".

## Agent Operating Rules

1. **This file is the single source of truth.** Do not ask the user clarifying questions before starting — every decision needed to build Feature 1 (Out-Pass) end-to-end is already made below. Where something is genuinely undecided (see Section 13, "Out Of Scope"), skip it rather than stopping to ask.
2. **Work autonomously through the Build Order (Section 12), in order, without pausing for approval between steps.** Each numbered step should leave the project in a runnable state before you move to the next. If a step fails (a package won't install, a test doesn't pass), fix it yourself and continue — don't hand control back to the user unless you hit something this document genuinely doesn't answer.
3. **Never deviate from the tech constraints** in the "Non-negotiable tech constraints" block below (JavaScript only, MERN, shadcn/ui, Recharts, bcrypt, MongoDB). If you're about to write a `.ts`/`.tsx` file, stop and rewrite it as `.js`/`.jsx`.
4. **Build real, running code — not scaffolding with TODOs.** Every model, route, and screen described below must actually work against the real MongoDB database and the real seeded student data by the time you reach the end of the Build Order. No mocked data is acceptable in the final delivered system for this feature.
5. **Treat every schema, endpoint, and file path in this document as exact.** Field names, enum values, route paths, and folder structure are specified precisely so that later sections (which depend on earlier ones) line up — don't rename things as you go.
6. **When you finish the Build Order**, do a final pass through Section 12, step 15 (the two full end-to-end walkthroughs — Day Scholar and Hosteler) yourself, in the running app, before declaring the task done. That walkthrough passing is the actual definition of "Feature 1 complete," not just "code compiles."
7. **Stay inside the scope of Feature 1 (Out-Pass) only.** Section 13 lists what's explicitly out of scope right now — do not build the other 7 features from the wider platform, and do not add authentication flows, notification systems, or infrastructure beyond what's described here.

Once you've internalized these rules, begin executing the specification below, starting from Section 0.

---

# KIET Out-Pass System — Complete Build Instructions for Antigravity

## 0. Read This First

You are building **Feature 1 of 8 — Out-Pass Permission** from the College Digital Permission & Approval Platform, for **KIET**, starting with **4th Year students only**. The architecture must be generalized (branch, year, section are all data — never hard-coded) so that scaling to 1st/2nd/3rd year and to every future feature (Events, Mess Fee, Bus, Internships, Hostel, Library, Club Permission) is a data/config change later, not a rewrite. Build ONLY the Out-Pass feature end-to-end right now. Do not build the other 7 features — just don't build anything that would block them later (i.e., keep the data model generic where noted).

**Non-negotiable tech constraints:**
- **JavaScript only. No TypeScript. No `.tsx`/`.ts` files anywhere, frontend or backend.**
- Backend: Node.js + Express + MongoDB (Mongoose).
- Frontend: React (`.jsx`, Vite), **shadcn/ui** components, **Recharts** for live charts.
- Auth: JWT + **bcrypt** password hashing. Passwords are never stored or returned in plaintext.
- Input validation on every write endpoint (`express-validator` or `zod`, JS-only usage — no TS types).
- QR codes generated server-side (`qrcode` npm package), single-use, expire immediately on scan.
- Everything must actually run — no placeholder/mock data in the delivered system. Seed data comes from the real roll-number list (Section 4).

Work top to bottom through this document. Each section is a checklist — do not skip ahead until a section's checklist is satisfied, because later sections depend on earlier ones.

---

## 1. Real-World Rules This System Must Encode

### 1.1 KIET Branches (current 5, more may be added later by Admin — never hard-code this list in code, store it as data)

| Branch Code | Branch Name |
|---|---|
| 42 | CSM |
| 43 | CAI |
| 44 | CSD |
| 45 | AIDS |
| 46 | CSC |

### 1.2 Roll Number Format (this is how you auto-derive a student's branch during seeding)

KIET roll numbers look like `22B21A4288`. Breaking it down by character position (0-indexed):
- `[0:2]` = admission year, e.g. `22`
- `[2:6]` = campus/scheme code, e.g. `B21A` (not used by this system)
- `[6:8]` = **branch code**, e.g. `42` → maps to CSM per the table above
- `[8:10]` = serial number within the branch

**Rule:** `branchCode = rollNo.slice(6, 8)`. Use this to auto-assign every seeded student to a Branch — do not ask a human to tag 600 students by hand.

### 1.2b Admission Year → Current Academic Year (also auto-derived from the roll number — never hard-code "year 4")

`rollNo.slice(0, 2)` is the admission year. Confirmed mapping right now:

| Roll No Prefix | Admission Year | Current Academic Year (as of 2026-27) |
|---|---|---|
| `23B21A43xx` | 2023 | 4th Year |
| `24B21A43xx` | 2024 | 3rd Year |
| `25B21A43xx` | 2025 | 2nd Year |

**Do not hard-code "2023 = year 4" in code.** Instead, store one Admin-editable setting — `AcademicSession.currentSessionYear` (e.g. `2026`, meaning the 2026-27 session) — and compute every student's current year at seed/refresh time as:

```
admissionYear = parseInt(rollNo.slice(0, 2)) + 2000        // "23" -> 2023
currentYear = AcademicSession.currentSessionYear - admissionYear + 1
```

This way, when the next academic session starts, Admin changes **one number** in Settings and re-runs a "recompute years" job (a button, not a new seed script) — every student's `year` and `yearTier` update automatically instead of needing a fresh spreadsheet each time. Build this `AcademicSession` collection and the recompute function now, even though today you're only seeding the 2023 batch (current 4th years).

### 1.3 Who Approves What (from the hand-drawn workflow — Out-Pass only, this is Feature 1)

```
Student → CTPO → HOD ─┬─(Day Scholar)→ Out-Pass Issued
                       └─(Hosteler)→ Hostel In-charge → Out-Pass Issued
```

- **CTPO is per-branch.** There are 5 CTPO logins right now (one per branch in the table above — CSM, CAI, CSD, AIDS, CSC). A CTPO only ever sees requests from students in their own branch.
- **HOD is per year-tier AND per student-type (Day Scholar vs Hosteler) — NOT per branch.** The college currently runs, e.g., one HOD for a year-tier's Day Scholars and a different HOD for that same year-tier's Hostelers. This must be **configurable data**, not a hard-coded rule, because the exact tier grouping (the user described "1st tier / secondary tier / 3rd year" as three groups covering the four years) may not map 1:1 to a single academic year and may change. Model it as: an Admin-configured **Authority Assignment** of `{ role: 'HOD', scope: { yearTier, studentType } }` → a specific HOD user. Do not assume year 4 = one specific tier in code; read it from this assignment table.
- **Hostel In-charge** only gets involved if the student is a Hosteler, and only after HOD approval. Hostel In-charge is a full role with its own dashboard, pending queue, and approve/reject actions — identical in shape to CTPO/HOD, not a lesser or read-only screen (Section 7.4).
- **Security** scans the final QR at the gate. Scanning **immediately and permanently expires** that QR (single use). The scan is logged and instantly reflected on both the student's and the CTPO's live view.

### 1.4 Logins

- **Student**: username = roll number, password = roll number (seeded — student can change their password later, but that's out of scope for right now; just make sure the password field is a normal hashed field so changing it later needs no schema change).
- **CTPO / HOD / Security / Admin**: accounts are **never self-registered**. They are created exclusively through the **Admin panel** (Section 6). Admin assigns a CTPO to exactly one branch, and an HOD to exactly one `(yearTier, studentType)` combination, at creation time.
- **Admin**: one seeded super-admin account (seed script, not through the UI, since there's no one above Admin to create it).

---

## 2. Roles Summary

| Role | Scope | Created By | Sees |
|---|---|---|---|
| STUDENT | self | Seed script (Section 4) | Their own requests, live status, QR when issued |
| CTPO | one Branch | Admin | Pending/all requests for students in their branch; approve/reject |
| HOD | one (yearTier, studentType) pair | Admin | Requests that have passed CTPO, matching their tier+type; approve/reject |
| HOSTEL_INCHARGE | global (or scoped later — keep it simple: one for now, scope field ready for more) | Admin | Requests that passed HOD AND studentType = Hosteler; final approve → issues pass |
| SECURITY | gate | Admin | QR scanner screen; scan log |
| ADMIN | everything | Seeded once | Manage branches, users, authority assignments, all requests, live analytics |

---

## 3. Data Model (MongoDB / Mongoose — build these first)

```js
// Branch
{
  code: String,        // "42"
  name: String,        // "CSM"
  isActive: Boolean
}

// User  (covers CTPO, HOD, HOSTEL_INCHARGE, SECURITY, ADMIN — NOT students, see below)
{
  name: String,
  username: String,           // unique, chosen by Admin at creation
  passwordHash: String,       // bcrypt
  role: { type: String, enum: ['CTPO','HOD','HOSTEL_INCHARGE','SECURITY','ADMIN'] },
  branchId: ObjectId,         // required only when role === 'CTPO'
  authorityScope: {           // required only when role === 'HOD'
    yearTier: String,         // admin-defined label, e.g. "Y4" — data, not enum locked to 4 values
    studentType: { type: String, enum: ['DAY_SCHOLAR','HOSTELER'] }
  },
  isActive: Boolean,
  createdAt: Date
}

// Student  (separate collection from User — logs in the same way but has different fields)
{
  rollNo: String,              // unique, this IS the username. admissionYear = rollNo.slice(0,2), branchCode = rollNo.slice(6,8)
  name: String,
  passwordHash: String,        // bcrypt hash of rollNo initially
  branchId: ObjectId,          // auto-derived from rollNo at seed time (Section 1.2)
  year: Number,                // 1-4, RECOMPUTED (not hand-set) from rollNo + AcademicSession.currentSessionYear (Section 1.2b)
  yearTier: String,            // which HOD-tier this student currently falls under, recomputed alongside `year` (see 3.1 below)
  studentType: { type: String, enum: ['DAY_SCHOLAR','HOSTELER'] }, // set by Admin/CTPO after seeding (not derivable from the sheet)
  isActive: Boolean
}

// AcademicSession  (single-document config Admin edits once per year)
{
  currentSessionYear: Number   // e.g. 2026, meaning the 2026-27 session — drives the year/yearTier recompute for every student
}

// YearTierMapping  (lets Admin define what "1st tier / secondary / 3rd tier" actually means, without code changes)
{
  yearTier: String,     // e.g. "TIER_1"
  years: [Number],      // e.g. [1,2] -- which academic years fall in this tier
  label: String         // display name, e.g. "1st & 2nd Year"
}

// OutpassRequest
{
  studentId: ObjectId,
  branchId: ObjectId,              // copied from student at creation, for fast CTPO filtering
  studentType: String,             // copied from student at creation (day scholar / hosteler) -- freezes the workflow path even if the student's status changes later
  reason: String,
  outDate: Date,
  outTime: String,
  expectedReturnDate: Date,
  expectedReturnTime: String,
  status: {
    type: String,
    enum: [
      'PENDING_CTPO', 'REJECTED_CTPO',
      'PENDING_HOD', 'REJECTED_HOD',
      'PENDING_HOSTEL_INCHARGE', 'REJECTED_HOSTEL_INCHARGE',
      'ISSUED',        // QR generated, not yet scanned
      'USED',          // scanned by security, QR expired
      'CANCELLED'
    ],
    default: 'PENDING_CTPO'
  },
  currentApproverRole: String,     // denormalized convenience field for "where is it stuck" — always in sync with status
  createdAt: Date,
  updatedAt: Date
}

// ApprovalStep  (the permanent, append-only history / digital-signature record — never edit or delete rows)
{
  requestId: ObjectId,
  role: String,          // 'CTPO' | 'HOD' | 'HOSTEL_INCHARGE'
  approverUserId: ObjectId,
  decision: { type: String, enum: ['APPROVED','REJECTED'] },
  remarks: String,
  decidedAt: Date
}

// QRPass
{
  requestId: ObjectId,       // one-to-one with a fully-approved OutpassRequest
  token: String,             // signed JWT or random opaque token embedded in the QR image, single-use
  issuedAt: Date,
  expiresAt: Date,           // hard time-based expiry too, in case it's never scanned (e.g. end of outDate)
  status: { type: String, enum: ['ACTIVE','USED','EXPIRED'], default: 'ACTIVE' }
}

// ScanLog  (append-only, this is the permanent gate record)
{
  qrPassId: ObjectId,
  requestId: ObjectId,
  scannedByUserId: ObjectId,   // the SECURITY user who scanned it
  scanResult: { type: String, enum: ['VALID','ALREADY_USED','EXPIRED','INVALID'] },
  scannedAt: Date
}
```

### 3.1 How `student.yearTier` gets set
Whenever a student's `year` is set/changed, look up `YearTierMapping` for the tier whose `years` array contains that year, and store its `yearTier` string on the student. Recompute this on any bulk year-promotion the Admin runs (not needed yet for the 4th-year-only rollout, but wire the function now so it's a one-line call later).

---

## 4. Seeding Real Students (from the provided roll-number/name data)

You have been given an Excel export containing `HTNO` (roll number) and `NAME` columns for real students. Write a one-time Node seed script (`backend/scripts/seedStudents.js`) that:

1. Reads the spreadsheet (`xlsx` or `exceljs` npm package) — accept a file path as a CLI arg so it's reusable for the next class later.
2. For each row: take `HTNO` and `NAME` only — ignore every other column (backlog data in that sheet is unrelated to this feature).
3. Derive `branchId` by slicing `rollNo.slice(6,8)` and matching it against the Branch collection (Section 1.1/1.2) — create the 5 Branch documents first if they don't exist yet, seeded directly from the table in Section 1.1.
4. Derive `year` and `yearTier` by calling the same recompute function described in Section 1.2b/3.1 (`admissionYear = rollNo.slice(0,2) + 2000`, `year = AcademicSession.currentSessionYear - admissionYear + 1`) — **do not** pass year as a hard-coded CLI flag; read `AcademicSession.currentSessionYear` from the DB (seed it to `2026` first if it doesn't exist yet). This means the exact same script, run unmodified against next year's spreadsheet, will correctly compute `year = 1` for the new intake once `currentSessionYear` still says `2026`, and will correctly shift everyone else up a year once Admin bumps it to `2027` — you don't need a year flag at all.
5. Set `password = bcrypt.hash(rollNo, 10)`.
6. Leave `studentType` unset/null at seed time — the college doesn't have this in the sheet. Build a small Admin bulk-edit screen (Section 6) where Admin/CTPO marks each student Day Scholar or Hosteler after seeding, since the workflow can't route an out-pass without knowing this.
7. Skip/report duplicates instead of crashing (`rollNo` unique index; catch duplicate-key errors and log them, keep going).
8. Print a summary at the end: total rows read, students created, duplicates skipped, any rows with an unrecognized branch code.

Run this once manually for the 4th-year sheet you were given before declaring the feature "done" — the system must have real students in it, not be left empty.

---

## 5. Out-Pass Workflow Logic (the core of this feature)

Build this as a single service function so the routing rule lives in exactly one place — `backend/src/modules/outpass/workflowService.js`:

```
function resolveNextStage(request, decision):
  if request.status == PENDING_CTPO:
    if decision == REJECTED: return status = REJECTED_CTPO
    if decision == APPROVED: return status = PENDING_HOD

  if request.status == PENDING_HOD:
    if decision == REJECTED: return status = REJECTED_HOD
    if decision == APPROVED:
      if request.studentType == DAY_SCHOLAR: return status = ISSUED  -> trigger QR generation
      if request.studentType == HOSTELER:    return status = PENDING_HOSTEL_INCHARGE

  if request.status == PENDING_HOSTEL_INCHARGE:
    if decision == REJECTED: return status = REJECTED_HOSTEL_INCHARGE
    if decision == APPROVED: return status = ISSUED  -> trigger QR generation
```

Every decision (approve or reject, at any stage) creates one `ApprovalStep` row — this is the permanent record of who approved/rejected and when, and it is never edited afterward.

**Who is allowed to act at each stage** (enforce this in the route, not just the UI):
- `PENDING_CTPO` → only the CTPO whose `branchId` matches `request.branchId`.
- `PENDING_HOD` → only the HOD whose `authorityScope.yearTier` matches the student's `yearTier` AND whose `authorityScope.studentType` matches `request.studentType`.
- `PENDING_HOSTEL_INCHARGE` → only a HOSTEL_INCHARGE user, and only reachable if `request.studentType === 'HOSTELER'`.

**On transition to `ISSUED`:**
1. Generate a random opaque token (e.g. `crypto.randomUUID()` or a signed short-lived JWT containing just `requestId` + token — either is fine, but it must be unguessable).
2. Create a `QRPass` with that token, `status: 'ACTIVE'`, `expiresAt` = end of `outDate` (so an unscanned pass can't be used the next day).
3. Generate the actual QR image server-side (`qrcode` package) encoding a URL like `https://<app>/api/security/verify/:token` — this is what Security's scanner reads.
4. Return the QR image (as a data URL or a served image endpoint) to the student's request-detail screen.

**On scan (`POST /api/security/scan`):**
1. Look up `QRPass` by token.
2. If not found → `ScanLog.scanResult = 'INVALID'`, respond invalid.
3. If found but `status !== 'ACTIVE'` → `ScanLog.scanResult = 'ALREADY_USED'` (or `'EXPIRED'` if past `expiresAt`), respond accordingly — **do not re-issue or re-activate it**.
4. If valid and active → set `QRPass.status = 'USED'`, set `OutpassRequest.status = 'USED'`, write the `ScanLog` row with `scanResult: 'VALID'`, respond success with student name + out-pass details for the guard to see on screen.
5. This state change must be visible on the student's and CTPO's live views within seconds — see Section 8 (polling is fine, no need for websockets right now).

---

## 6. Admin Panel (build this before CTPO/HOD screens — nothing else works without it)

Admin is the only role that creates other logins. Build:

- **Branches** — list (seeded already, Section 4), toggle active/inactive. Adding a 6th branch later is just a new row here plus updating the roll-number-derivation table if KIET ever reuses a code (out of scope now, just don't hard-code the 5 as a `switch` statement — read from this collection).
- **Year Tier Mapping** — CRUD for `YearTierMapping` (Section 3.1). Seed one sensible default tier covering year 4 before you build the HOD-creation screen, since HOD creation needs at least one tier to assign into.
- **CTPO Accounts** — form: name, username, password, select Branch (dropdown from the 5 branches, e.g. assigning a CSM (`42`) login gives that CTPO access to every student whose `branchId` resolves to CSM). One CTPO per branch is the expectation, but don't hard-block a second one — just let Admin manage it.
- **HOD Accounts** — form: name, username, password, select Year Tier, select Student Type (Day Scholar / Hosteler). This is exactly what encodes "day scholars have one HOD, hostelers have another" per tier.
- **Hostel In-charge Accounts** — form: name, username, password. (No branch/tier scope needed yet — one Hostel In-charge covers every Hosteler who reaches that stage. If the college later splits this by hostel block/gender, add a `scope` field the same way HOD has one — the schema is already shaped for it, see `authorityScope` on `User`.) Hostel In-charge gets a full dashboard identical in shape to CTPO/HOD (Section 7.4), not a read-only view.
- **Security Accounts** — same simple create-account form, no extra scope needed yet.
- **Students — Bulk Student-Type Assignment** — a table of students (filterable by branch), with a Day Scholar/Hosteler toggle per row or a bulk-select + set action, so Admin can fill in the one field the seed script couldn't set.
- **Live Overview** — counts: total students, total requests today, pending at each stage, issued today, used today — this doubles as your first Recharts dashboard (Section 8).

All create-account forms must hash the password with bcrypt server-side before saving — never trust a pre-hashed password from the client.

### 6.1 Why Admin — and only Admin — creates/manages these accounts

Faculty assigned as CTPO, HOD, or Hostel In-charge rotate: a section can get reassigned to a different faculty member, someone goes on leave, a new CTPO takes over a branch mid-year. Because CTPO access is entirely determined by `branchId` and HOD/Hostel-In-charge access by `authorityScope` — never by the person's name — **reassigning a role never means editing code or touching student data**. It means:

1. Admin opens the outgoing person's account (e.g. the CSM CTPO) and sets `isActive = false` (soft-delete — never hard-delete a `User`, because their `ApprovalStep` history must stay intact and attributable forever, exactly like the platform's other approval workflows).
2. Admin creates a new `User` with `role: 'CTPO'`, `branchId` = the same CSM branch. The new account immediately sees every pending CSM request — no data migration needed, because requests are linked to `branchId`, not to the old CTPO's user ID.
3. The exact same two-step pattern (deactivate old → create new, same scope) works identically for HOD (same `authorityScope`) and Hostel In-charge.

Build the account list screen so each row has a clear **Deactivate** action (not a hard delete button) alongside **Create New**, and make deactivated accounts still visible (greyed out, filterable) in the list so Admin can see who used to hold a role and when — this list, plus the untouched `ApprovalStep` history, is the audit trail for "who approved this back when they were still CTPO."

---

## 7. Student, CTPO, HOD, Hostel In-charge & Security Screens

### 7.1 Student
- **Login** — roll number + password.
- **New Out-Pass Request** — form: reason (textarea), out date, out time, expected return date/time. On submit, `studentType` and `branchId` are copied server-side from the logged-in student's record — never accept these from the client form.
- **My Requests** — table of their own requests with status Badge.
- **Request Detail** — shows the full approval timeline (CTPO → HOD → Hostel In-charge if applicable) built from `ApprovalStep` rows, current stage clearly highlighted ("waiting on HOD" etc.), and — once `ISSUED` — the QR code image to show at the gate. Once `USED`, show it as completed with the scan timestamp.

### 7.2 CTPO
- **Dashboard** — pending count for their branch, approved/rejected today (Recharts-ready numbers).
- **Pending Requests** — table filtered to `status = PENDING_CTPO AND branchId = own branch`.
- **Approve/Reject screen** — shows the student's reason/dates, an Approve and a Reject button (Reject requires a remarks field), calls the workflow service (Section 5).
- **All My Branch's Requests** (not just pending) — for visibility/history, with status Badges.

### 7.3 HOD
- Same shape as CTPO (Dashboard, Pending, Approve/Reject, History) but filtered to `status = PENDING_HOD` AND the student's `yearTier`/`studentType` matches this HOD's `authorityScope`.

### 7.4 Hostel In-charge
- Same shape again, filtered to `status = PENDING_HOSTEL_INCHARGE` (which, by construction, only ever contains Hostelers).

### 7.5 Security
- **Scanner screen** — a single large input (or camera-based QR scan if time allows; a manual token-entry fallback is required either way) + "Verify" button. Shows an unmistakable big green "VALID — Issued to [Name], Out: [date/time], Return by: [date/time]" or big red "ALREADY USED" / "EXPIRED" / "INVALID" result.
- **Recent Scans** — small list of the last ~20 `ScanLog` entries for the guard's own reference.

---

## 8. Live Tracking & Analytics (Recharts)

"Live" here means: **poll every 5–10 seconds** on the relevant screens (student's request detail while pending, CTPO/HOD/Admin dashboards) using a simple `setInterval` + refetch, or `useEffect` with an interval — no need for websockets/socket.io for this feature.

Build these with Recharts, all numbers computed by a backend aggregation endpoint (never hard-coded in the frontend):
- **Admin dashboard**: Bar chart — requests by current stage (Pending CTPO / Pending HOD / Pending Hostel In-charge / Issued / Used / Rejected). Line chart — requests created per day, last 14 days.
- **CTPO dashboard**: Bar chart — approved vs rejected, last 7 days, for their branch only.
- **HOD dashboard**: same shape as CTPO, scoped to their tier+type.

Every chart wrapped in `ResponsiveContainer`, proper `dataKey`, tooltip, legend — per the shadcn/ui + Recharts learning material this team has already been using on the rest of the platform.

---

## 9. API Endpoint List

```
POST   /api/auth/login                       (works for Student, CTPO, HOD, HOSTEL_INCHARGE, SECURITY, ADMIN)
GET    /api/me

# Admin
GET/POST/PATCH   /api/admin/branches
GET/POST/PATCH   /api/admin/year-tiers
GET/PATCH        /api/admin/academic-session         (view/update currentSessionYear; PATCH triggers the recompute job from Section 1.2b)
GET/POST         /api/admin/users                    (create CTPO/HOD/HOSTEL_INCHARGE/SECURITY)
PATCH             /api/admin/users/:id/deactivate     (soft-delete — see Section 6.1, never a hard DELETE)
GET/PATCH        /api/admin/students                 (list + bulk studentType assignment)
GET              /api/admin/overview                  (dashboard counts)

# Student
POST   /api/outpass                            (create request)
GET    /api/outpass/mine
GET    /api/outpass/:id

# CTPO / HOD / Hostel In-charge (role-checked per Section 5)
GET    /api/outpass/pending-for-me
POST   /api/outpass/:id/approve
POST   /api/outpass/:id/reject
GET    /api/outpass/dashboard-stats

# Security
POST   /api/security/scan                       (body: token)
GET    /api/security/recent-scans

# QR
GET    /api/outpass/:id/qr                        (returns the QR image for an ISSUED request; only the owning student or Admin can fetch it)
```

Every response uses one consistent envelope: `{ success: true, data }` or `{ success: false, message, errors }`.

---

## 10. Project Structure

```
backend/
  src/
    config/          db.js, env.js
    models/           Branch.js, User.js, Student.js, YearTierMapping.js,
                       OutpassRequest.js, ApprovalStep.js, QRPass.js, ScanLog.js
    modules/
      auth/            routes, controller, service
      admin/           routes, controller, service
      outpass/         routes, controller, service, workflowService.js
      security/        routes, controller, service
    middleware/       auth.js (JWT verify), requireRole.js, errorHandler.js, validate.js
    app.js
    server.js
  scripts/
    seedStudents.js
    seedAdmin.js
  .env.example

frontend/
  src/
    features/
      auth/
      student/
      ctpo/
      hod/
      hostel-incharge/
      security/
      admin/
    components/ui/     (shadcn components live here via its CLI)
    lib/                api client, auth context, date/format helpers
    App.jsx
    main.jsx
  vite.config.js
  .env.example
```

Every `.jsx` file — plain JavaScript + JSX, no TypeScript syntax, no `.ts`/`.tsx` extensions anywhere in the repo.

---

## 11. Environment Variables

```
# backend/.env
MONGODB_URI=
JWT_SECRET=
PORT=5000
QR_BASE_URL=http://localhost:5173

# frontend/.env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 12. Build Order (follow exactly — each step should run/compile before moving to the next)

1. Backend project init, `.env`, MongoDB connection, health-check route.
2. Models (Section 3) — all of them, even the ones not used until step 4/5.
3. `seedAdmin.js` (one ADMIN user) and `seedStudents.js` (Section 4) — run both, confirm real students exist in the DB.
4. Auth: login + JWT + `requireRole` middleware. **Login must reject `isActive: false` accounts** (both `User` and `Student`) with a clear "account disabled" message — this is what makes Admin's deactivate-and-replace pattern (Section 6.1) actually take effect immediately. Confirm the seeded Admin and a manually-inserted test student can both log in.
5. Admin module: Branches (already seeded, just expose CRUD), Year Tiers, Users (CTPO/HOD/HOSTEL_INCHARGE/SECURITY creation), Students bulk studentType screen, Overview counts.
6. Create, via the Admin UI you just built, all 5 CTPOs (one per branch) and at least one HOD per required tier/type combination, and one Hostel In-charge and one Security account. Manually assign `studentType` to a handful of seeded students so you have both Day Scholar and Hosteler test cases.
7. Outpass module backend: create request, workflow service, approve/reject endpoints, pending-for-me, QR generation on `ISSUED`.
8. Security module backend: scan endpoint + scan log.
9. Frontend shell: routing, auth context, shadcn/ui setup (install via its CLI, Tailwind config), login page, role-based redirect after login.
10. Student screens (Section 7.1) — build and test one full request end-to-end as a Day Scholar (should skip Hostel In-charge) and one as a Hosteler (should require Hostel In-charge) against the real backend, not mocks — this feature is small enough to integrate immediately rather than mocking.
11. CTPO screens (7.2), HOD screens (7.3), Hostel In-charge screens (7.4) — reuse one generic "approval console" component across all three, since their screens are structurally identical (only the query filter differs), exactly like the earlier platform-wide frontend plan.
12. Security scanner screen (7.5).
13. Recharts dashboards (Section 8) for Admin, CTPO, HOD.
14. Polling for live updates on student detail + all three approver dashboards + Admin overview.
15. Walk through Section 1.3's full diagram once for a Day Scholar and once for a Hosteler, start to finish, including the QR scan at Security, and confirm the scan instantly shows as "Used" on both the student's screen and the approving CTPO's history — this is the actual definition of done for Feature 1.

---

## 13. Explicitly Out Of Scope Right Now (do not build, but do not block either)

- Features 2–8 (Events, Mess Fee, Bus, Internships, Hostel, Library, Club Permission) — the `OutpassRequest`/workflow naming is fine to be Outpass-specific for now; a future generalization into the `PermissionType`/`Workflow` engine from the platform's other planning docs is a separate task, not this one.
- Student self-registration or password reset flow.
- Email/SMS notifications — an in-app status view is enough for this feature.
- Multi-campus support beyond KIET's current single campus.
- Nothing further needed for year promotion — it's already automatic via `AcademicSession.currentSessionYear` (Section 1.2b); Admin bumping that one number each June is the entire "promotion" process, and a brand-new intake just needs its spreadsheet run through `seedStudents.js` once.
