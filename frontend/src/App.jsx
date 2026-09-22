import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import RequestDetail from './pages/RequestDetail';
import ApproverDashboard from './pages/ApproverDashboard';
import SecurityScanner from './pages/SecurityScanner';
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

      {/* Student */}
      <Route path="/student/dashboard" element={
        <ProtectedRoute roles={['STUDENT']}><StudentDashboard /></ProtectedRoute>
      } />
      <Route path="/student/request/:id" element={
        <ProtectedRoute roles={['STUDENT']}><RequestDetail /></ProtectedRoute>
      } />

      {/* CTPO */}
      <Route path="/ctpo/dashboard" element={
        <ProtectedRoute roles={['CTPO']}><ApproverDashboard /></ProtectedRoute>
      } />

      {/* HOD */}
      <Route path="/hod/dashboard" element={
        <ProtectedRoute roles={['HOD']}><ApproverDashboard /></ProtectedRoute>
      } />

      {/* Hostel In-charge */}
      <Route path="/hostel/dashboard" element={
        <ProtectedRoute roles={['HOSTEL_INCHARGE']}><ApproverDashboard /></ProtectedRoute>
      } />

      {/* Placement Officer */}
      <Route path="/placement/dashboard" element={
        <ProtectedRoute roles={['PLACEMENT_OFFICER']}><ApproverDashboard /></ProtectedRoute>
      } />

      {/* Security */}
      <Route path="/security/scanner" element={
        <ProtectedRoute roles={['SECURITY']}><SecurityScanner /></ProtectedRoute>
      } />

      {/* Admin */}
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


      {/* Request detail (approvers can view) */}
      <Route path="/outpass/:id" element={
        <ProtectedRoute roles={['CTPO','HOD','HOSTEL_INCHARGE','PLACEMENT_OFFICER','SECURITY','ADMIN']}><RequestDetail /></ProtectedRoute>
      } />

      {/* Fallback */}
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
