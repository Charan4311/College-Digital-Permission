import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  Users,
  UserCheck,
  Calendar,
  Clock,
  ClipboardList,
  QrCode,
  ShieldCheck,
  FileText,
  LogOut,
  Sparkles,
  BarChart2,
  X
} from 'lucide-react';

const NAV_CONFIG = {
  ADMIN: [
    { label: 'Overview', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Students Data', icon: UserCheck, path: '/admin/students' },
    { label: 'Permission requests', icon: ShieldCheck, path: '/admin/requests' },
    { label: 'Reports & Analytics', icon: BarChart2, path: '/admin/reports' },
  ],
  CTPO: [
    { label: 'Overview', icon: LayoutDashboard, path: '/ctpo/dashboard' },
    { label: 'Pending Requests', icon: Clock, path: '/ctpo/pending' },
    { label: 'All Requests', icon: ClipboardList, path: '/ctpo/history' },
    { label: 'Reports', icon: FileText, path: '/ctpo/reports' },
  ],
  HOD: [
    { label: 'Overview', icon: LayoutDashboard, path: '/hod/dashboard' },
    { label: 'Branches', icon: Building2, path: '/hod/branches' },
    { label: 'Student Requests', icon: ClipboardList, path: '/hod/student-requests' },
    { label: 'My Approvals', icon: UserCheck, path: '/hod/approvals' },
    { label: 'Reports', icon: BarChart2, path: '/hod/reports' },
  ],
  HOSTEL_INCHARGE: [
    { label: 'Overview', icon: LayoutDashboard, path: '/hostel/dashboard' },
  ],
  PLACEMENT_OFFICER: [
    { label: 'Overview', icon: LayoutDashboard, path: '/placement/dashboard' },
    { label: 'Pending Requests', icon: Clock, path: '/placement/pending' },
    { label: 'Review History', icon: ClipboardList, path: '/placement/history' },
  ],
  SECURITY: [
    { label: 'QR Scanner', icon: QrCode, path: '/security/scanner' },
  ],
  STUDENT: [
    { label: 'Overview', icon: LayoutDashboard, path: '/student/dashboard' },
    { label: 'New Permission', icon: FileText, path: '/student/new-permission' },
    { label: 'My Request', icon: ClipboardList, path: '/student/my-request' },
    { label: 'My Profile', icon: Users, path: '/student/profile' },
  ],
};

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  CTPO: 'CTPO Approver',
  HOD: 'HOD Approver',
  HOSTEL_INCHARGE: 'Hostel In-charge',
  PLACEMENT_OFFICER: 'Placement Officer',
  SECURITY: 'Campus Security',
  STUDENT: 'Student',
};

export default function Sidebar({ isOpen = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = NAV_CONFIG[user?.role] || [];

  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const handleNavClick = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Backdrop for mobile drawer */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <Sparkles size={16} />
              </div>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Digital Permission</h1>
            </div>
            <p style={{ margin: 0, fontSize: '11px' }}>College Approval Platform</p>
          </div>

          {/* Close button inside sidebar on mobile */}
          <button
            className="mobile-sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: '#64748B',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                className={`nav-item${isActive ? ' active' : ''}`}
                onClick={() => handleNavClick(item.path)}
              >
                <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <Icon size={18} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar" style={{ overflow: 'hidden' }}>
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name" title={user?.name}>{user?.name || 'User'}</div>
            <div className="sidebar-user-role">{ROLE_LABELS[user?.role] || user?.role}</div>
          </div>
          <button className="sidebar-logout" onClick={logout} title="Logout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
