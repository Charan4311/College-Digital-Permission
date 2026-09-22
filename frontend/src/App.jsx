import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Common Pages
import Login from './pages/Login';
import RequestDetail from './pages/RequestDetail';
import ApproverDashboard from './pages/ApproverDashboard';
import SecurityScanner from './pages/SecurityScanner';
import PlacementDashboard from './pages/PlacementDashboard';

// Student Pages
import StudentDashboard from './pages/StudentDashboard';
import StudentNewPermissionPage from './pages/StudentNewPermissionPage';
import StudentMyRequestsPage from './pages/StudentMyRequestsPage';
import StudentProfilePage from './pages/StudentProfilePage';

// CTPO Pages
import CTPODashboard from './pages/CTPO/CTPODashboard';
import CTPOPending from './pages/CTPOPending';
import CTPOHistory from './pages/CTPO/CTPOHistory';
import CTPOReports from './pages/CTPO/CTPOReports';

// HOD Pages
import HODDashboard from './pages/hod/HODDashboard';
import HODBranches from './pages/hod/HODBranches';
import HODBranchRequests from './pages/hod/HODBranchRequests';
import HODStudentRequests from './pages/hod/HODStudentRequests';
import HODApprovals from './pages/hod/HODApprovals';
import HODReports from './pages/hod/HODReports';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudents from './pages/admin/AdminStudents';
import AdminRequests from './pages/admin/AdminRequests';
import AdminReports from './pages/admin/AdminReports';

// Role-based protected route
function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

// Redirect authenticated users away from login
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
    return <Navigate to={redirects[user.role] || '/student/dashboard'} replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />

      {/* Student Routes */}
      <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
      <Route path="/student/dashboard" element={
        <ProtectedRoute roles={['STUDENT']}><StudentDashboard /></ProtectedRoute>
      } />
      <Route path="/student/new-permission" element={
        <ProtectedRoute roles={['STUDENT']}><StudentNewPermissionPage /></ProtectedRoute>
      } />
      <Route path="/student/my-request" element={
        <ProtectedRoute roles={['STUDENT']}><StudentMyRequestsPage /></ProtectedRoute>
      } />
      <Route path="/student/profile" element={
        <ProtectedRoute roles={['STUDENT']}><StudentProfilePage /></ProtectedRoute>
      } />
      <Route path="/student/request/:id" element={
        <ProtectedRoute roles={['STUDENT']}><RequestDetail /></ProtectedRoute>
      } />

      {/* CTPO Routes */}
      <Route path="/ctpo/dashboard" element={
        <ProtectedRoute roles={['CTPO']}><CTPODashboard /></ProtectedRoute>
      } />
      <Route path="/ctpo/pending" element={
        <ProtectedRoute roles={['CTPO']}><CTPOPending /></ProtectedRoute>
      } />
      <Route path="/ctpo/history" element={
        <ProtectedRoute roles={['CTPO']}><CTPOHistory /></ProtectedRoute>
      } />
      <Route path="/ctpo/reports" element={
        <ProtectedRoute roles={['CTPO']}><CTPOReports /></ProtectedRoute>
      } />

      {/* HOD Routes */}
      <Route path="/hod/dashboard" element={
        <ProtectedRoute roles={['HOD']}><HODDashboard /></ProtectedRoute>
      } />
      <Route path="/hod/branches" element={
        <ProtectedRoute roles={['HOD']}><HODBranches /></ProtectedRoute>
      } />
      <Route path="/hod/branches/:branchCode/requests" element={
        <ProtectedRoute roles={['HOD']}><HODBranchRequests /></ProtectedRoute>
      } />
      <Route path="/hod/student-requests" element={
        <ProtectedRoute roles={['HOD']}><HODStudentRequests /></ProtectedRoute>
      } />
      <Route path="/hod/approvals" element={
        <ProtectedRoute roles={['HOD']}><HODApprovals /></ProtectedRoute>
      } />
      <Route path="/hod/reports" element={
        <ProtectedRoute roles={['HOD']}><HODReports /></ProtectedRoute>
      } />
      <Route path="/hod/pending" element={
        <ProtectedRoute roles={['HOD']}><HODApprovals /></ProtectedRoute>
      } />
      <Route path="/hod/history" element={
        <ProtectedRoute roles={['HOD']}><HODStudentRequests /></ProtectedRoute>
      } />

      {/* Hostel In-charge Routes */}
      <Route path="/hostel/dashboard" element={
        <ProtectedRoute roles={['HOSTEL_INCHARGE']}><ApproverDashboard /></ProtectedRoute>
      } />

      {/* Placement Officer Routes */}
      <Route path="/placement/dashboard" element={
        <ProtectedRoute roles={['PLACEMENT_OFFICER']}><PlacementDashboard /></ProtectedRoute>
      } />
      <Route path="/placement/pending" element={
        <ProtectedRoute roles={['PLACEMENT_OFFICER']}><PlacementDashboard defaultTab="pending" /></ProtectedRoute>
      } />
      <Route path="/placement/history" element={
        <ProtectedRoute roles={['PLACEMENT_OFFICER']}><PlacementDashboard defaultTab="history" /></ProtectedRoute>
      } />

      {/* Security Routes */}
      <Route path="/security/scanner" element={
        <ProtectedRoute roles={['SECURITY']}><SecurityScanner /></ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/admin/students" element={
        <ProtectedRoute roles={['ADMIN']}><AdminStudents /></ProtectedRoute>
      } />
      <Route path="/admin/requests" element={
        <ProtectedRoute roles={['ADMIN']}><AdminRequests /></ProtectedRoute>
      } />
      <Route path="/admin/reports" element={
        <ProtectedRoute roles={['ADMIN']}><AdminReports /></ProtectedRoute>
      } />

      {/* Request detail (shared across all approvers and admin) */}
      <Route path="/outpass/:id" element={
        <ProtectedRoute roles={['CTPO','HOD','HOSTEL_INCHARGE','PLACEMENT_OFFICER','SECURITY','ADMIN']}><RequestDetail /></ProtectedRoute>
      } />

      {/* Fallbacks */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
