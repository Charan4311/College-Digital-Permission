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
  X
} from 'lucide-react';

const NAV_CONFIG = {
  ADMIN: [
    { label: 'Overview', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Branches', icon: Building2, path: '/admin/branches' },
    { label: 'Year Tiers', icon: GraduationCap, path: '/admin/year-tiers' },
    { label: 'Staff Accounts', icon: Users, path: '/admin/users' },
    { label: 'Students', icon: UserCheck, path: '/admin/students' },
    { label: 'Academic Session', icon: Calendar, path: '/admin/session' },
  ],
  CTPO: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/ctpo/dashboard' },
    { label: 'Pending Requests', icon: Clock, path: '/ctpo/pending' },
    { label: 'All Requests', icon: ClipboardList, path: '/ctpo/history' },
  ],
  HOD: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/hod/dashboard' },
    { label: 'Pending Requests', icon: Clock, path: '/hod/pending' },
    { label: 'All Requests', icon: ClipboardList, path: '/hod/history' },
  ],
  HOSTEL_INCHARGE: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/hostel/dashboard' },
  ],
  PLACEMENT_OFFICER: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/placement/dashboard' },
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

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = NAV_CONFIG[user?.role] || [];

  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const handleNavClick = (path) => {
    navigate(path);
    onClose();
  };

  const roleLabel = ROLE_LABELS[user?.role] || user?.role || 'Student';
  const studentMeta = user?.rollNo || user?.username || 'Student';
  const departmentMeta = user?.branch || user?.department || 'Department';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-brand-mark">
            <Sparkles size={16} />
          </div>
          <div className="sidebar-brand-copy">
            <h1>Digital Permission</h1>
            <p>College Approval Platform</p>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Student navigation">
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
              <span className="nav-icon">
                <Icon size={18} />
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-user-panel">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name" title={user?.name}>{user?.name || 'User'}</div>
            <div className="sidebar-user-role">{roleLabel}</div>
            <div className="sidebar-user-meta">
              <span>{studentMeta}</span>
              <span className="sidebar-user-dot">•</span>
              <span>{departmentMeta}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={logout} title="Logout" aria-label="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
