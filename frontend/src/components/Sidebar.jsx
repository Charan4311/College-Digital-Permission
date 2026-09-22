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
  FileText,
  LogOut,
  Sparkles
} from 'lucide-react';

const NAV_CONFIG = {
  ADMIN: [
    {
      label: 'Overview',
      icon: LayoutDashboard,
      path: '/admin/dashboard'
    },
    {
      label: 'Branches',
      icon: Building2,
      path: '/admin/branches'
    },
    {
      label: 'Year Tiers',
      icon: GraduationCap,
      path: '/admin/year-tiers'
    },
    {
      label: 'Staff Accounts',
      icon: Users,
      path: '/admin/users'
    },
    {
      label: 'Students',
      icon: UserCheck,
      path: '/admin/students'
    },
    {
      label: 'Academic Session',
      icon: Calendar,
      path: '/admin/session'
    }
  ],

  /* =========================================================
     CTPO NAVIGATION
  ========================================================= */
  CTPO: [
    {
      label: 'Overview',
      icon: LayoutDashboard,
      path: '/ctpo/dashboard'
    },
    {
      label: 'Pending Requests',
      icon: Clock,
      path: '/ctpo/pending'
    },
    {
      label: 'All Requests',
      icon: ClipboardList,
      path: '/ctpo/history'
    },
    {
      label: 'Reports',
      icon: FileText,
      path: '/ctpo/reports'
    }
  ],

  HOD: [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/hod/dashboard'
    },
    {
      label: 'Pending Requests',
      icon: Clock,
      path: '/hod/pending'
    },
    {
      label: 'All Requests',
      icon: ClipboardList,
      path: '/hod/history'
    }
  ],

  HOSTEL_INCHARGE: [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/hostel/dashboard'
    }
  ],

  PLACEMENT_OFFICER: [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/placement/dashboard'
    }
  ],

  SECURITY: [
    {
      label: 'QR Scanner',
      icon: QrCode,
      path: '/security/scanner'
    }
  ],

  STUDENT: [
    {
      label: 'My Permissions',
      icon: FileText,
      path: '/student/dashboard'
    }
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

  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <aside className="sidebar">

      {/* =====================================================
          LOGO
      ===================================================== */}
      <div className="sidebar-logo">

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >

          <div
            style={{
              width: '28px',
              height: '28px',
              minWidth: '28px',
              borderRadius: '8px',
              background:
                'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0
            }}
          >
            <Sparkles size={16} />
          </div>

          <h1
            style={{
              margin: 0,
              padding: 0,
              fontSize: '16px',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            Digital Permission
          </h1>

        </div>

        <p
          style={{
            margin: 0,
            padding: 0,
            fontSize: '11px',
            whiteSpace: 'nowrap'
          }}
        >
          College Approval Platform
        </p>

      </div>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}
      <nav className="sidebar-nav">

        <div className="nav-section-label">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;

          const isActive =
            location.pathname === item.path;

          return (
            <button
              key={item.path}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => navigate(item.path)}
              type="button"
            >

              <span
                className="nav-icon"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Icon size={18} />
              </span>

              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {item.label}
              </span>

            </button>
          );
        })}

      </nav>

      {/* =====================================================
          USER SECTION
      ===================================================== */}
      <div className="sidebar-user">

        <div className="sidebar-avatar">
          {initials}
        </div>

        <div className="sidebar-user-info">

          <div
            className="sidebar-user-name"
            title={user?.name}
          >
            {user?.name || 'User'}
          </div>

          <div className="sidebar-user-role">
            {ROLE_LABELS[user?.role] || user?.role}
          </div>

        </div>

        <button
          className="sidebar-logout"
          onClick={logout}
          title="Logout"
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <LogOut size={16} />
        </button>

      </div>

    </aside>
  );
}