import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import {
  AuthProvider,
  useAuth,
} from './context/AuthContext';

// ============================================================
// COMMON PAGES
// ============================================================

import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import RequestDetail from './pages/RequestDetail';
import ApproverDashboard from './pages/ApproverDashboard';
import PlacementDashboard from './pages/PlacementDashboard';
import SecurityScanner from './pages/SecurityScanner';

// ============================================================
// ADMIN
// ============================================================

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBranches from './pages/admin/AdminBranches';
import AdminYearTiers from './pages/admin/AdminYearTiers';
import AdminUsers from './pages/admin/AdminUsers';
import AdminStudents from './pages/admin/AdminStudents';
import AdminSession from './pages/admin/AdminSession';

// ============================================================
// HOD
// ============================================================

import HODDashboard from './pages/hod/HODDashboard';
import HODBranches from './pages/hod/HODBranches';
import HODBranchRequests from './pages/hod/HODBranchRequests';
import HODStudentRequests from './pages/hod/HODStudentRequests';
import HODApprovals from './pages/hod/HODApprovals';
import HODReports from './pages/hod/HODReports';


// ============================================================
// PROTECTED ROUTE
// ============================================================

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (
    roles &&
    !roles.includes(user.role)
  ) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


// ============================================================
// AUTH ROUTE
// ============================================================

function AuthRoute({ children }) {
  const { user } = useAuth();

  if (user) {
    const redirects = {
      STUDENT: '/student/dashboard',
      CTPO: '/ctpo/dashboard',
      HOD: '/hod/dashboard',
      HOSTEL_INCHARGE: '/hostel/dashboard',
      PLACEMENT_OFFICER: '/placement/dashboard',
      SECURITY: '/security/scanner',
      ADMIN: '/admin/dashboard',
    };

    return (
      <Navigate
        to={
          redirects[user.role] ||
          '/student/dashboard'
        }
        replace
      />
    );
  }

  return children;
}


// ============================================================
// ROUTES
// ============================================================

function AppRoutes() {
  return (
    <Routes>

      {/* ======================================================
          LOGIN
      ====================================================== */}

      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />


      {/* ======================================================
          STUDENT
      ====================================================== */}

      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/request/:id"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <RequestDetail />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          CTPO
      ====================================================== */}

      <Route
        path="/ctpo/dashboard"
        element={
          <ProtectedRoute roles={['CTPO']}>
            <ApproverDashboard />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          HOD DASHBOARD
      ====================================================== */}

      <Route
        path="/hod/dashboard"
        element={
          <ProtectedRoute roles={['HOD']}>
            <HODDashboard />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          HOD BRANCHES
      ====================================================== */}

      <Route
        path="/hod/branches"
        element={
          <ProtectedRoute roles={['HOD']}>
            <HODBranches />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          HOD BRANCH REQUESTS
          
          THIS IS THE IMPORTANT ROUTE
      ====================================================== */}

      <Route
        path="/hod/branches/:branchCode/requests"
        element={
          <ProtectedRoute roles={['HOD']}>
            <HODBranchRequests />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          HOD ALL STUDENT REQUESTS
      ====================================================== */}

      <Route
        path="/hod/student-requests"
        element={
          <ProtectedRoute roles={['HOD']}>
            <HODStudentRequests />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          HOD APPROVALS
      ====================================================== */}

      <Route
        path="/hod/approvals"
        element={
          <ProtectedRoute roles={['HOD']}>
            <HODApprovals />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          HOD REPORTS
      ====================================================== */}

      <Route
        path="/hod/reports"
        element={
          <ProtectedRoute roles={['HOD']}>
            <HODReports />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          HOSTEL IN-CHARGE
      ====================================================== */}

      <Route
        path="/hostel/dashboard"
        element={
          <ProtectedRoute
            roles={['HOSTEL_INCHARGE']}
          >
            <ApproverDashboard />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          PLACEMENT OFFICER
      ====================================================== */}

      <Route
        path="/placement/dashboard"
        element={
          <ProtectedRoute roles={['PLACEMENT_OFFICER']}>
            <PlacementDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/placement/pending"
        element={
          <ProtectedRoute roles={['PLACEMENT_OFFICER']}>
            <PlacementDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/placement/history"
        element={
          <ProtectedRoute roles={['PLACEMENT_OFFICER']}>
            <PlacementDashboard />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          SECURITY
      ====================================================== */}

      <Route
        path="/security/scanner"
        element={
          <ProtectedRoute roles={['SECURITY']}>
            <SecurityScanner />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          ADMIN
      ====================================================== */}

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/branches"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminBranches />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/year-tiers"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminYearTiers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/students"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminStudents />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/session"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminSession />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          REQUEST DETAIL
      ====================================================== */}

      <Route
        path="/outpass/:id"
        element={
          <ProtectedRoute
            roles={[
              'CTPO',
              'HOD',
              'HOSTEL_INCHARGE',
              'PLACEMENT_OFFICER',
              'SECURITY',
              'ADMIN',
            ]}
          >
            <RequestDetail />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          DEFAULT
      ====================================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

    </Routes>
  );
}


// ============================================================
// APP
// ============================================================

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}