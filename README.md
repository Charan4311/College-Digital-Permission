# College Digital Permission & Approval Platform

## 1. Project Abstract

### Project Title
College Digital Permission & Approval Platform

### Problem Statement
In many engineering colleges, obtaining permissions for campus out-passes, mess fee clearances, internships, and library access relies on manual, paper-based processes. These physical slips are easily misplaced, prone to forgery, and difficult to track. Additionally, navigating through multiple approval stages (e.g., CTPO, HOD, Hostel In-charge) is time-consuming for students and creates an administrative bottleneck for faculty and campus security.

### Objectives
- Digitize and centralize all student permission requests and clearance certificates.
- Implement a role-based workflow engine that routes requests intelligently based on the student's year and branch.
- Secure campus exits using single-use, encrypted QR codes verified physically at the gate.
- Provide official, printable, and verifiable digital clearance documents matching the institution's layout.

### Proposed Solution
A multi-stage digital workflow system where students can request permissions from their dashboard. The system automatically identifies the student's branch and year, routing the request to the exact Class Teacher/Placement Officer (CTPO) and Head of Department (HOD). Upon final approval, an encrypted QR code (for gate passes) or a certified digital document is generated. Security personnel can scan the QR code at the campus gate to instantly verify and check out the student, preventing reuse or forgery.

### Key Technologies Used
- **Frontend:** React 18, Vite, React Router, pure CSS, Lucide React (Icons).
- **Backend:** Node.js, Express.js, JSON Web Tokens (JWT), Bcrypt, Multer (file uploads), QRCode.
- **Database:** MongoDB (Atlas cloud database), Mongoose ODM.

---

## 2. Project Architecture

### System Architecture
The application follows a standard 3-tier architecture (Client-Server-Database), strictly decoupled via RESTful APIs.

### Frontend Components
- **Role-Specific Dashboards:** Dedicated interactive interfaces for Students, Admins, Approvers (CTPO/HOD/Warden), and Security.
- **Context Providers:** React Context (e.g., `AuthContext`) for global state management and JWT validation handling.
- **API Client:** Axios interceptors mapped securely to backend endpoints for seamless data fetching and automatic authorization token injection.
- **UI Components:** Reusable and modular components for Status Badges, KPI Stat Cards, Timeline displays, and dynamic tables using standard CSS and Lucide React icons.

### Backend Components
- **RESTful API Routes:** Modularized Express routes handling Authentication, Outpass/Permission flows, Security gate endpoints, and Admin operations.
- **Controllers & Middleware:** Core business logic controllers isolated by domain. Middleware functions handle role-based JWT authorization, request validation, and error management.
- **File & QR Utilities:** Built-in backend generators for encrypted single-use QR codes and `multer` configurations for secure multipart/form-data upload management.

### Database Collections
- **Users Collection (`users`):** A unified directory storing profiles for over 2,100 students and all department faculty, mapped by Year, Branch, and functional Roles.
- **Requests Collection (`outpassrequests`):** The central tracking collection containing all Out-passes, Mess Fee clearances, Internship permissions, and Library accesses, including their full multi-stage approval lifecycle states.
- **Configurations (`branches`, `academicsessions`):** Normalization collections managing branch names, codes, active academic years, and tier-level routing maps.

### Data Flow & Workflow
1. **Submission:** A student submits a permission request (Out-pass, Mess Fee, Internship, etc.). A unique, trackable `PERM-` reference ID is generated.
2. **First Stage (CTPO):** The request routes *only* to the specific Branch & Year CTPO associated with the student (e.g., 2nd Year CSM CTPO).
3. **Second Stage (HOD):** Upon CTPO approval, it escalates sequentially to the corresponding Year HOD.
4. **Third Stage (Optional based on Request Type):** If the student is a Hosteler requesting an Out-pass, it routes to the Hostel In-charge. If it's an Internship, it routes to the Head Placement Officer.
5. **Final Generation:** The system issues a printable official slip. For physical Out-passes, an encrypted single-use QR code is attached.
6. **Security Verification:** Gate security scans the QR code using a mobile device or standard scanner, instantly changing its state in the database to `USED` to authorize the exit and prevent double-scanning.

### Major Technologies and Integrations
- **MERN Stack:** MongoDB, Express.js, React.js, Node.js.
- **JWT & Bcrypt:** Secure stateless authentication and payload signing for QR codes.
- **Multer:** Handles multipart/form-data for receipt and offer-letter PDF/Image uploads.
- **QRCode:** Backend library generation of encrypted QR data buffers rendered directly into the UI.

---

## 3. System Role Architecture & Access Control

The platform uses a role-based access control (RBAC) model mapped across five primary actor tiers:

```
+-----------------------------------------------------------------------------------+
|                                STUDENT DASHBOARD                                  |
|  - Submit Out-pass / Clearance Requests                                           |
|  - View Approval Timelines & Download Certified Slips                              |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                       CLASS TEACHER / PLACEMENT OFFICER (CTPO)                    |
|  - Initial Verification Tier                                                      |
|  - Scoped strictly to assigned Branch & Academic Year                             |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                            HEAD OF DEPARTMENT (HOD)                               |
|  - Departmental Approval Tier                                                     |
|  - Oversees all branch-specific CTPO recommendations                              |
+-----------------------------------------------------------------------------------+
                                       |
         +-----------------------------+-----------------------------+
         | (Out-pass for Hosteler)                                   | (Internship Clearance)
         v                                                           v
+----------------------------------+                       +------------------------+
|        HOSTEL IN-CHARGE          |                       |   PLACEMENT OFFICER    |
|  - Final Hostel Exit Clearance   |                       |   - Institutional      |
+----------------------------------+                       |     Verification       |
         |                                                 +------------------------+
         +-----------------------------+-----------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                             CAMPUS GATE SECURITY                                  |
|  - Instant QR Code Validation via Mobile / Scanner                                |
|  - Atomic Database State Mutation (ISSUED -> USED)                               |
+-----------------------------------------------------------------------------------+
```

### Role Scope Matrix

| Role | Scope / Authority | Primary Responsibilities |
| :--- | :--- | :--- |
| **Student** | Personal Dashboard | Submits Out-passes, Mess Fee & Internship clearance requests; tracks status; accesses generated QR passes. |
| **CTPO (Class Teacher / Placement Officer)** | Assigned Branch & Year | Performs 1st-stage verification for student requests within their specific branch and cohort. |
| **HOD (Head of Department)** | Department-Wide | Reviews escalated requests from CTPOs; grants 2nd-stage departmental authorization. |
| **Hostel In-charge / Warden** | Hostel Campus | Final approver for hosteler exit passes after HOD approval. |
| **Placement Officer** | Institution-Wide | Validates and approves specialized internship clearance workflows. |
| **Gate Security** | Campus Exits | Real-time QR scanning and exit verification. |
| **System Admin** | Global Platform | Manages academic sessions, branch allocations, user directories, and system configurations. |

---

## 4. Running Locally

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster (configured in `.env`)

### Quick Start

1. **Backend Setup**
```bash
cd backend
npm install
# Ensure .env is populated with PORT, MONGODB_URI, and JWT_SECRET
npm run dev
# Server starts on http://localhost:5000
```

2. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
# Vite dev server starts on http://localhost:5173
```

---

## 5. Appendix: API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate users (Students and Staff) and issue JWT tokens.
- `GET /api/me`: Retrieve current logged-in user profile details and authority scopes.

### Permission & Outpass Management (`/api/outpass`)
- `POST /api/outpass/request`: Submit a new permission/outpass request (Student).
- `GET /api/outpass/my-requests`: Fetch all requests submitted by the logged-in student.
- `GET /api/outpass/pending`: Fetch pending requests dynamically scoped to the approver's tier (CTPO/HOD/Warden).
- `PUT /api/outpass/:id/approve`: Approve or reject a specific request (with mandatory rejection remarks).

### Security Gate Operations (`/api/security`)
- `POST /api/security/scan`: Validate an encrypted QR code payload and authorize campus exit, marking the QR as used.

### Admin & Reporting (`/api/admin` & `/api/reports`)
- `GET /api/admin/users`: Fetch directory of registered users and roles.
- `GET /api/reports/analytics`: Generate dynamic reports, metrics, and KPI aggregations for dashboards.
