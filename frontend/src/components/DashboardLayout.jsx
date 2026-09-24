import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  LuChevronDown as ChevronDown,
  LuCircleHelp as CircleHelp,
  LuInstagram as Instagram,
  LuLinkedin as Linkedin,
  LuMail as Mail,
  LuMenu as Menu,
  LuSparkles as Sparkles,
} from 'react-icons/lu';

const FOOTER_LINKS = {
  ADMIN: { overview: '/admin/dashboard', requests: '/admin/requests', approvals: '/admin/requests', reports: '/admin/reports' },
  CTPO: { overview: '/ctpo/dashboard', requests: '/ctpo/history', approvals: '/ctpo/pending', reports: '/ctpo/reports' },
  HOD: { overview: '/hod/dashboard', requests: '/hod/student-requests', approvals: '/hod/approvals', reports: '/hod/reports' },
  HOSTEL_INCHARGE: { overview: '/hostel/dashboard', requests: '/hostel/history', approvals: '/hostel/history', reports: '/hostel/dashboard' },
  PLACEMENT_OFFICER: { overview: '/placement/dashboard', requests: '/placement/pending', approvals: '/placement/pending', reports: '/placement/dashboard' },
  SECURITY: { overview: '/security/scanner', requests: '/security/scanner', approvals: '/security/scanner', reports: '/security/scanner' },
  STUDENT: { overview: '/student/dashboard', requests: '/student/my-request', approvals: '/student/my-request', reports: '/student/my-request' },
};

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const footerLinks = FOOTER_LINKS[user?.role] || FOOTER_LINKS.STUDENT;
  const userInitials = user?.name
    ? user.name.split(' ').filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const handleFooterLink = (event, path) => {
    event.preventDefault();
    navigate(path);
  };

  const handleProfileClick = () => {
    navigate('/student/profile');
  };

  const handleLogoutClick = () => {
    logout();
  };

  return (
    <div className="layout">
      <header className="dashboard-topbar" aria-label="Top navigation">
        <div className="dashboard-topbar-inner">
          <div className="dashboard-topbar-left">
            <div className="dashboard-topbar-brand" aria-label="Digital Permission portal branding">
              <div className="dashboard-topbar-mark">
                <Sparkles size={12} />
              </div>
              <span>Digital Permission</span>
            </div>
          </div>

          <div className="dashboard-topbar-user-menu">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="dashboard-topbar-profile-trigger"
                  type="button"
                  aria-label="Open profile menu"
                >
                  <div className="dashboard-topbar-avatar" aria-label="User profile">
                    {user?.profileImage ? (
                      <img src={user.profileImage} alt={user.name || 'User'} />
                    ) : (
                      userInitials
                    )}
                  </div>
                  <div className="dashboard-topbar-user-meta">
                    <span className="dashboard-topbar-user-name">{user?.name || 'User'}</span>
                    <span className="dashboard-topbar-user-role">{user?.role || 'Student'}</span>
                  </div>
                  <ChevronDown className="dashboard-topbar-chevron" size={14} />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="dashboard-topbar-dropdown">
                <DropdownMenuItem className="dashboard-topbar-dropdown-item" onSelect={handleProfileClick}>
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="dashboard-topbar-dropdown-item danger" onSelect={handleLogoutClick}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onToggle={() => setSidebarOpen((open) => !open)}
        />

        <main className="main-content">
          <div className="page-shell">
            {children}
          </div>
        </main>
      </div>

      <footer className="dashboard-footer">
        <div className="dashboard-footer-main">
          <div className="dashboard-footer-brand">
            <div className="dashboard-footer-logo" aria-hidden="true">
              <Sparkles size={15} />
            </div>
            <div>
              <strong>College Digital Permission Portal</strong>
              <span>A smart digital platform for managing college permissions, approvals, and requests.</span>
              <div className="dashboard-footer-socials" aria-label="Social links">
                <a href="#linkedin" onClick={(event) => event.preventDefault()} aria-label="LinkedIn"><Linkedin size={15} /></a>
                <a href="#instagram" onClick={(event) => event.preventDefault()} aria-label="Instagram"><Instagram size={15} /></a>
                <a href="#email" onClick={(event) => event.preventDefault()} aria-label="Email"><Mail size={15} /></a>
              </div>
            </div>
          </div>

          <div className="dashboard-footer-column">
            <span className="dashboard-footer-heading">Platform</span>
            <div className="dashboard-footer-link-list">
              <a href={footerLinks.overview} onClick={(event) => handleFooterLink(event, footerLinks.overview)}>Overview</a>
              <a href={footerLinks.requests} onClick={(event) => handleFooterLink(event, footerLinks.requests)}>Student Requests</a>
              <a href={footerLinks.approvals} onClick={(event) => handleFooterLink(event, footerLinks.approvals)}>My Approvals</a>
              <a href={footerLinks.reports} onClick={(event) => handleFooterLink(event, footerLinks.reports)}>Reports</a>
            </div>
          </div>

          <div className="dashboard-footer-column">
            <span className="dashboard-footer-heading">Support</span>
            <div className="dashboard-footer-link-list">
              <span className="dashboard-footer-static-link">Help Center</span>
              <span className="dashboard-footer-static-link">Contact Administration</span>
              <span className="dashboard-footer-static-link">Privacy Policy</span>
              <span className="dashboard-footer-static-link">Terms of Service</span>
            </div>
          </div>
        </div>

        <div className="dashboard-footer-bottom">
          <span>&copy; 2026 College Digital Permission Portal. All rights reserved.</span>
          <div className="dashboard-footer-bottom-links">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Help</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
