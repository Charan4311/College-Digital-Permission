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
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
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

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
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

        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={18} />
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
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name" title={user?.name}>{user?.name || 'User'}</div>
          <div className="sidebar-user-role">{ROLE_LABELS[user?.role] || user?.role}</div>
        </div>
        <button className="sidebar-logout" onClick={logout} title="Logout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
