# College Digital Permission & Approval Platform

A role-based, multi-stage digital workflow engine designed for engineering colleges to digitize student permissions, clearance certificates, out-passes, and campus security gate verifications.

---

## 📌 Executive Overview

The **College Digital Permission & Approval Platform** replaces paper-based gate passes and clearance slips with a digital system. It provides:

- **Department & Year Scoped Routing**: Automatic routing of requests based on student year (2nd, 3rd, 4th) and engineering branch (CSM, CAI, CSD, AIDS, CSC).
- **Multi-Feature Support**: Handles Campus Out-Passes, Mess Fee Clearances, Internship Approvals, and Library Access.
- **Role-Based Workflows**: Multi-stage approval chains spanning CTPO, HOD, Hostel In-charge, and Placement Officer.
- **Physical Gate Security Verification**: **Only Out-Passes** require gate security verification via single-use encrypted QR codes. Academic clearances (Mess Fee, Internship, Library) generate certified institutional approval documents without gate QR codes.
- **Exact Official Document Format**: Printable and downloadable clearance slips matching college administrative layouts.
- **Lucide React Icons**: Consistent icons throughout the entire application.

---

## 👥 Unified Login Directory & Credentials

All accounts are stored in the unified `users` database collection. Passwords can be used directly as indicated below.

### 1. Administrative & Campus Gate Logins

| Role | Username | Password | Operational Scope |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `admin123` | System management, user accounts, and branch settings |
| **Campus Gate Security** | `security` | `security@123` | **QR code scanning & physical campus gate checkout (Out-Pass only)** |
| **Hostel In-charge / Warden** | `hostel_incharge` | `hostel@123` | Approves out-pass requests for Hosteler students |
| **Head Placement Officer** | `placement_officer` | `placement@123` | Final approval stage for student Internship permissions |

---

### 2. Department Officials (CTPO & HOD by Year and Branch)

Every year has a dedicated **Head of Department (HOD)** and each branch has a dedicated **Class Teacher / Placement Officer (CTPO)**.

#### A. 2nd Year Officials (Scope: 694 Students)
- **2nd Year HOD**: `2kthod` / `2KTHOD@123`
- **Branch CTPOs**:
  - CSM (AI & ML): `2ktcsm` / `2KTCSM@123`
  - CAI (AI): `2ktcai` / `2KTCAI@123`
  - CSD (Data Science): `2ktcsd` / `2KTCSD@123`
  - AIDS (AI & Data Science): `2ktaid` / `2KTAID@123`
  - CSC (Cyber Security): `2ktcsc` / `2KTCSC@123`

#### B. 3rd Year Officials (Scope: 821 Students)
- **3rd Year HOD**: `3kthod` / `3KTHOD@123`
- **Branch CTPOs**:
  - CSM (AI & ML): `3ktcsm` / `3KTCSM@123`
  - CAI (AI): `3ktcai` / `3KTCAI@123`
  - CSD (Data Science): `3ktcsd` / `3KTCSD@123`
  - AIDS (AI & Data Science): `3ktaid` / `3KTAID@123`
  - CSC (Cyber Security): `3ktcsc` / `3KTCSC@123`

#### C. 4th Year Officials (Scope: 594 Students)
- **4th Year HOD**: `4kthod` / `4KTHOD@123`
- **Branch CTPOs**:
  - CSM (AI & ML): `4ktcsm` / ` `
  - CAI (AI): `4ktcai` / `4KTCAI@123`
  - CSD (Data Science): `4ktcsd` / `4KTCS   D@123`
  - AIDS (AI & Data Science): `4ktaids` / `4KTAIDS@123`
  - CSC (Cyber Security): `4ktcsc` / `4KTCSC@123`

---

### 3. Student Logins (All 2,109 Enrolled Students)

Any enrolled student logs in using their **Roll Number** as both their **Username** and **Password** (case-insensitive).

| Year | Branch | Sample Roll Number | Name | Password |
| :--- | :--- | :--- | :--- | :--- |
| **4th Year** | CSM | `23B21A4268` | D. B. V. V. BHAVANI SANKAR | `23B21A4268` |
| **4th Year** | CAI | `23B21A4311` | KUMPATLA CHARAN TEJA | `23B21A4311` |
| **3rd Year** | CSM | `24B21A4201` | MANGAMURI VYSHNAVI | `24B21A4201` |
| **3rd Year** | CSD | `24B21A4401` | SANGULA NAGASAI | `24B21A4401` |
| **2nd Year** | CSM | `25B21A4201` | KADA MAHESH BHAGAVAN | `25B21A4201` |
| **2nd Year** | CSC | `25B21A4601` | KOTA SAI PRASANNA | `25B21A4601` |

---

## 🔄 End-to-End Workflow Lifecycles

```
+----------------------------------------------------------------------------------------------------+
|                                      STUDENT SUBMITS REQUEST                                      |
|            (System assigns Reference ID: PERM-2026-XXXXXX & auto-resolves Year + Branch)          |
+----------------------------------------------------------------------------------------------------+
                                                   |
                     +-----------------------------+-----------------------------+
                     |                             |                             |
             [ 1. CAMPUS OUT-PASS ]        [ 2. MESS FEE ]             [ 3. INTERNSHIP ]     [ 4. LIBRARY ]
                     |                             |                             |                 |
                Branch CTPO                   Branch CTPO                   Branch CTPO       Branch CTPO
                     |                             |                             |                 |
                  Year HOD                      Year HOD                      Year HOD         [ APPROVED ]
                     |                             |                             |                 |
         +-----------+-----------+                 |                      Placement Officer        |
         |                       |                 |                             |                 |
  [ DAY SCHOLAR ]           [ HOSTELER ]           |                             |                 |
         |                       |                 |                             |                 |
         |               Hostel In-charge          |                             |                 |
         |                       |                 |                             |                 |
         +-----------+-----------+                 |                             |                 |
                     |                             |                             |                 |
               [ GATE PASS ]                 [ CLEARED ]                    [ APPROVED ]           |
                     |                             |                             |                 |
         Security Gate Verification          Printable Clearance            Printable Letter       |
            (QR Scan Required)             (No Gate Scan Required)       (No Gate Scan Required)   |
                                                                                                   |
                                                                                Printable Clearance Slip
                                                                                 (No Gate Scan Required)
```

---

### Feature 1: Campus Out-Pass (With Security Verification)

> [!IMPORTANT]
> **Only Out-Pass requires security gate verification.** No other permission type requires physical QR scanning at the gate.

1. **Submission**:
   - Student enters Reason, Out Date & Time, Return Date & Time, Emergency Contact Number, and selects **Day Scholar** or **Hosteler**.
   - A unique tracking ID (`PERM-2026-XXXXXX`) is generated.
2. **Approval Path**:
   - **Day Scholar**: `Student ➔ Branch CTPO ➔ Year HOD ➔ Issued`
   - **Hosteler**: `Student ➔ Branch CTPO ➔ Year HOD ➔ Hostel In-charge ➔ Issued`
3. **QR Generation**:
   - Upon final approval, an encrypted QR code is issued containing `{ requestId, studentRoll, validUntil, hash }`.
4. **Gate Security Verification**:
   - Security officer (`security` / `security@123`) scans the QR code or types the Reference ID.
   - System verifies student identity, validates expiration, and marks status as `USED`. Subsequent scans are immediately rejected to prevent reuse.

---

### Feature 2: Mess Fee Clearance (Institutional Clearance)

1. **Submission**:
   - Student enters Reason, Billing Period (Start Date & End Date), Mess Amount (₹), Payment Status (`Paid` / `Partially Paid` / `Not Paid`), and optional fee receipt upload.
2. **Approval Path**:
   - `Student ➔ Branch CTPO ➔ Year HOD ➔ Cleared`
3. **Official Slip**:
   - Displays student details, fee payment breakdown, and faculty verification timestamps.
   - **No security gate QR verification is required.**

---

### Feature 3: Internship Permission (Off-Campus Training)

1. **Submission**:
   - Student enters Company Name, Company Location, Role, Mode (`Offline` / `Online` / `Hybrid`), Duration (Start Date & End Date), and optional Offer Letter PDF.
2. **Approval Path**:
   - `Student ➔ Branch CTPO ➔ Year HOD ➔ Placement Officer ➔ Approved`
3. **Official Letter**:
   - Generates an official clearance letter certified by the Branch CTPO, Department HOD, and Head Placement Officer.
   - **No security gate QR verification is required.**

---

### Feature 4: Library Access & Clearance (Fast-Track)

1. **Submission**:
   - Student enters Purpose (Book Borrowing, Research Database Access, or Semester No-Dues Clearance) and Access Date.
2. **Approval Path**:
   - `Student ➔ Branch CTPO ➔ Approved` *(Single-stage fast track approval)*
3. **Official Pass**:
   - Generates a certified library pass with the CTPO digital authorization stamp.
   - **No security gate QR verification is required.**

---

## 📑 Official Printable Document Layout

When viewing any approved request, students and administrators can click **"View & Print Official Slip"** to view and print the official document matching administrative standards:

```
+-------------------------------------------------------------------------+
|                  COLLEGE DIGITAL PERMISSION                             |
|                     & APPROVAL PLATFORM                                 |
|                                                                         |
|                 Reference ID: PERM-2026-N5XEVL                          |
+-------------------------------------------------------------------------+
| STUDENT INFORMATION                                                     |
| Name: T.HARIBABU                                                        |
| Roll Number: 23B21A4265                                                 |
| Department: CSE                                                         |
| Year: 4                                                                 |
| Student Type: HOSTELER                                                  |
+-------------------------------------------------------------------------+
| PERMISSION INFORMATION                                                  |
| Permission Type: Out-Pass                                               |
| Reason: Family function                                                 |
| Date: 10-09-2026                                                        |
| Emergency Contact: 9392393340                                           |
+-------------------------------------------------------------------------+
| APPROVAL HISTORY                                                        |
| CTPO                                                                    |
|   Approver: Faculty A                                                   |
|   Status: Approved                                                      |
|   Approved At: 06-09-2026 16:00                                         |
| HOD                                                                     |
|   Approver: Faculty B                                                   |
|   Status: Approved                                                      |
|   Approved At: 06-09-2026 16:30                                         |
| Security                                                                |
|   Approver: Security Officer                                            |
|   Status: Approved                                                      |
|   Approved At: 06-09-2026 17:00                                         |
+-------------------------------------------------------------------------+
| REFERENCE / QR CODE                                                     |
| Scan this QR code for security verification:                            |
|                            [  QR CODE  ]                                |
|                                                                         |
|            Document generated on 17/09/2026, 03:00:00 pm                |
+-------------------------------------------------------------------------+
```

*(Note: The QR Code section is rendered **exclusively for Out-Pass** requests. For Mess Fee, Internship, and Library clearances, it is replaced by official Institutional Verification text).*

---

## 🛠️ Rejection & Resubmission System

- **Mandatory Rejection Remarks**: Any authority rejecting a request must provide a mandatory remark explaining the reason for rejection.
- **Visual Alert**: The student's dashboard displays the rejection badge with the reviewer's remarks.
- **Edit & Resubmit Modal**: The student can click **"Edit & Resubmit"**, adjust dates/amounts or upload missing documents, and resubmit directly back to the CTPO queue.
- **Revision History**: Every resubmission is tracked in the timeline as `Resubmitted #1`, `Resubmitted #2`, etc.

---

## 💻 Tech Stack & Architecture

- **Backend**:
  - Node.js & Express.js
  - MongoDB with Mongoose ODM
  - JWT Authentication & BCrypt hashing
  - QR Code Generation via `qrcode`
  - File uploads via `multer`
- **Frontend**:
  - React 18 with Vite
  - React Router DOM
  - Lucide React (Clean icon set end-to-end; no emojis)
  - Pure CSS Design System with light theme and print stylesheets

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on `mongodb://localhost:27017`

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
# Server starts on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Vite dev server starts on http://localhost:5173
```

---

## 📁 Repository Structure

```
FINAL/
├── backend/
│   ├── src/
│   │   ├── config/             # Database connection & environment
│   │   ├── models/             # Mongoose schemas (User, OutpassRequest, ApprovalStep, Branch)
│   │   ├── modules/
│   │   │   ├── auth/           # Login, JWT, profile controllers
│   │   │   ├── outpass/        # Multi-feature permission creation, approval, QR, resubmission
│   │   │   └── security/       # Gate scanning & checkout verification
│   │   └── seed/               # Excel seeding scripts for 2nd, 3rd, and 4th year data
├── frontend/
│   ├── src/
│   │   ├── components/         # DashboardLayout, Sidebar, StatusBadge, Timeline
│   │   ├── context/            # AuthContext
│   │   ├── lib/                # Axios API client
│   │   ├── pages/              # Login, StudentDashboard, ApproverDashboard, SecurityDashboard, RequestDetail
│   │   └── index.css           # Global stylesheet & @media print styles
├── OFFICIALS_LOGIN_DIRECTORY.md# Complete directory of all CTPO, HOD, and Staff credentials
└── README.md                   # System documentation & workflows
```
