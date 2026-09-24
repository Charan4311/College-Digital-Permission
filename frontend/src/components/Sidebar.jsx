import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LuLayoutDashboard as LayoutDashboard,
  LuBuilding2 as Building2,
  LuUsers as Users,
  LuUserCheck as UserCheck,
  LuClock as Clock,
  LuClipboardList as ClipboardList,
  LuQrCode as QrCode,
  LuShieldCheck as ShieldCheck,
  LuFileText as FileText,
  LuChartBar as BarChart2,
  LuMenu as Menu,
} from 'react-icons/lu';

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
    { label: 'Review History', icon: ClipboardList, path: '/hostel/history' },
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

export default function Sidebar({ isOpen = false, onClose, onToggle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = NAV_CONFIG[user?.role] || [];

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

      {!isOpen && (
        <button
          className="sidebar-collapsed-toggle"
          onClick={onToggle}
          aria-label="Open sidebar"
          title="Open sidebar"
          type="button"
        >
          <Menu size={20} />
        </button>
      )}

      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-header-label">NAVIGATION</div>
          <button
            className="sidebar-header-toggle"
            onClick={onToggle}
            aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
            title={isOpen ? 'Close sidebar' : 'Open sidebar'}
            type="button"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
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
      </aside>
    </>
  );
}
