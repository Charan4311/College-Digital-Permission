import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';

// ============================================================
// PAGES
// ============================================================

import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import RequestDetail from './pages/RequestDetail';

import ApproverDashboard from './pages/ApproverDashboard';
import CTPODashboard from './pages/CTPO/CTPODashboard';
import CTPOPending from './pages/CTPOPending';
import CTPOHistory from "./pages/CTPO/CTPOHistory";
import SecurityScanner from './pages/SecurityScanner';
import CTPOReports from './pages/CTPO/CTPOReports';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBranches from './pages/admin/AdminBranches';
import AdminYearTiers from './pages/admin/AdminYearTiers';
import AdminUsers from './pages/admin/AdminUsers';
import AdminStudents from './pages/admin/AdminStudents';
import AdminSession from './pages/admin/AdminSession';


// ============================================================
// PROTECTED ROUTE
// ============================================================

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  // User is not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User does not have permission
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


// ============================================================
// AUTH ROUTE
// Prevent logged-in users from opening login
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
        to={redirects[user.role] || '/student/dashboard'}
        replace
      />
    );
  }

  return children;
}


// ============================================================
// APP ROUTES
// ============================================================

function AppRoutes() {
  return (
    <Routes>

      {/* =====================================================
          LOGIN
      ===================================================== */}

      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />


      {/* =====================================================
          STUDENT
      ===================================================== */}

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

{/* =====================================================
    CTPO ROUTES
===================================================== */}

{/* CTPO Overview */}
<Route
  path="/ctpo/dashboard"
  element={
    <ProtectedRoute roles={['CTPO']}>
      <CTPODashboard />
    </ProtectedRoute>
  }
/>

{/* CTPO Pending Requests */}
<Route
  path="/ctpo/pending"
  element={
    <ProtectedRoute roles={['CTPO']}>
      <CTPOPending />
    </ProtectedRoute>
  }
/>

{/* CTPO All Requests */}
<Route
  path="/ctpo/history"
  element={
    <ProtectedRoute roles={['CTPO']}>
      <CTPOHistory />
    </ProtectedRoute>
  }
/>

{/* CTPO Reports */}
<Route
  path="/ctpo/reports"
  element={
    <ProtectedRoute roles={['CTPO']}>
      <CTPOReports />
    </ProtectedRoute>
  }
/>
      {/* =====================================================
          HOD
      ===================================================== */}

      <Route
        path="/hod/dashboard"
        element={
          <ProtectedRoute roles={['HOD']}>
            <ApproverDashboard page="dashboard" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hod/pending"
        element={
          <ProtectedRoute roles={['HOD']}>
            <ApproverDashboard page="pending" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hod/history"
        element={
          <ProtectedRoute roles={['HOD']}>
            <ApproverDashboard page="history" />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          HOSTEL IN-CHARGE
      ===================================================== */}

      <Route
        path="/hostel/dashboard"
        element={
          <ProtectedRoute roles={['HOSTEL_INCHARGE']}>
            <ApproverDashboard page="dashboard" />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          PLACEMENT OFFICER
      ===================================================== */}

      <Route
        path="/placement/dashboard"
        element={
          <ProtectedRoute roles={['PLACEMENT_OFFICER']}>
            <ApproverDashboard page="dashboard" />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          SECURITY
      ===================================================== */}

      <Route
        path="/security/scanner"
        element={
          <ProtectedRoute roles={['SECURITY']}>
            <SecurityScanner />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          ADMIN
      ===================================================== */}

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


      {/* =====================================================
          REQUEST DETAILS
      ===================================================== */}

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
              'ADMIN'
            ]}
          >
            <RequestDetail />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          DEFAULT
      ===================================================== */}

      <Route
        path="/"
        element={
          <Navigate to="/login" replace />
        }
      />


      {/* =====================================================
          UNKNOWN URL
      ===================================================== */}

      <Route
        path="*"
        element={
          <Navigate to="/login" replace />
        }
      />

    </Routes>
  );
}
<Route
  path="/ctpo/reports"
  element={<CTPOReports />}
/>

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