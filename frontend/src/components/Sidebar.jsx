import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  FileText,
  LogOut,
  Sparkles,
  Menu,
  X
} from 'lucide-react';

const NAV_CONFIG = {
  ADMIN: [
    { label: 'Overview', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Branches', icon: Building2, path: '/admin/branches' },
    { label: 'Year Tiers', icon: GraduationCap, path: '/admin/year-tiers' },
    { label: 'Staff Accounts', icon: Users, path: '/admin/users' },
    { label: 'Students', icon: UserCheck, path: '/admin/students' },
    { label: 'Academic Session', icon: Calendar, path: '/admin/session' }
  ],
  CTPO: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/ctpo/dashboard' },
    { label: 'Pending Requests', icon: Clock, path: '/ctpo/pending' },
    { label: 'All Requests', icon: ClipboardList, path: '/ctpo/history' }
  ],
  HOD: [
    { label: 'Overview', icon: LayoutDashboard, path: '/hod/dashboard' },
    { label: 'Branches', icon: Building2, path: '/hod/branches' },
    { label: 'Student Requests', icon: ClipboardList, path: '/hod/student-requests' },
    { label: 'My Approvals', icon: UserCheck, path: '/hod/approvals' },
    { label: 'Reports', icon: FileText, path: '/hod/reports' }
  ],
  HOSTEL_INCHARGE: [
    { label: 'Overview', icon: LayoutDashboard, path: '/hostel/dashboard', view: 'overview' },
    { label: 'Pending Requests', icon: Clock, path: '/hostel/dashboard', view: 'pending' },
    { label: 'Review History', icon: ClipboardList, path: '/hostel/dashboard', view: 'history' }
  ],
  PLACEMENT_OFFICER: [
    { label: 'Overview', icon: LayoutDashboard, path: '/placement/dashboard' },
    { label: 'Pending Requests', icon: Clock, path: '/placement/pending' },
    { label: 'Review History', icon: ClipboardList, path: '/placement/history' }
  ],
  SECURITY: [
    { label: 'QR Scanner', icon: QrCode, path: '/security/scanner' },
    { label: 'Permission History', icon: Clock, path: '/security/scanner?view=history' }
  ],
  STUDENT: [
    { label: 'My Permissions', icon: FileText, path: '/student/dashboard' }
  ]
};

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  CTPO: 'CTPO Approver',
  HOD: 'HOD Approver',
  HOSTEL_INCHARGE: 'Hostel In-charge',
  PLACEMENT_OFFICER: 'Placement Officer',
  SECURITY: 'Campus Security',
  STUDENT: 'Student'
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = NAV_CONFIG[user?.role] || [];

  const initials = user?.name
    ? user.name
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : 'U';

  const queryView = new URLSearchParams(location.search).get('view');

  const isHostelViewActive = (view) => {
    if (user?.role !== 'HOSTEL_INCHARGE') return false;
    const currentView = queryView || 'overview';
    return currentView === view;
  };

  const isSecurityViewActive = (view) => {
    if (user?.role !== 'SECURITY') return false;
    const currentView = queryView || 'scanner';
    return currentView === view;
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (mobileOpen && window.innerWidth <= 900) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    setMobileOpen(false);
    logout();
  };

  return (
    <>
      <button
        type="button"
        className="mobile-menu-button"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={21} /> : <Menu size={21} />}
      </button>

      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px'
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0
              }}
            >
              <Sparkles size={16} />
            </div>

            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
              Digital Permission
            </h1>
          </div>

          <p style={{ margin: 0, fontSize: '11px' }}>
            College Approval Platform
          </p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>

          {navItems.map((item) => {
            const Icon = item.icon;

            const isQueryRole =
              user?.role === 'HOSTEL_INCHARGE' ||
              user?.role === 'SECURITY';

            let forcedActive = null;

            if (user?.role === 'HOSTEL_INCHARGE') {
              forcedActive = isHostelViewActive(item.view);
            }

            if (user?.role === 'SECURITY') {
              if (item.label === 'QR Scanner') {
                forcedActive = isSecurityViewActive('scanner');
              }

              if (item.label === 'Permission Taken History') {
                forcedActive = isSecurityViewActive('history');
              }
            }

            return (
              <NavLink
                key={`${item.path}-${item.view || item.label}`}
                to={
                  item.view && item.view !== 'overview'
                    ? `${item.path}?view=${item.view}`
                    : item.path
                }
                end
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => {
                  if (isQueryRole) {
                    return `nav-item${forcedActive ? ' active' : ''}`;
                  }

                  return `nav-item${isActive ? ' active' : ''}`;
                }}
              >
                <span
                  className="nav-icon"
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <Icon size={18} />
                </span>

                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>

          <div className="sidebar-user-info">
            <div className="sidebar-user-name" title={user?.name}>
              {user?.name || 'User'}
            </div>

            <div className="sidebar-user-role">
              {ROLE_LABELS[user?.role] || user?.role}
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
