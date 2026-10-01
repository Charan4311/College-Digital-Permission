import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiMenu as Menu,
  FiX as X,
  FiLogOut as LogOut,
  FiAward as Sparkles,
  FiGrid as LayoutDashboard,
  FiClock as Clock,
  FiClipboard as ClipboardList,
  FiFileText as FileText,
} from 'react-icons/fi';

const CTPO_NAV = [
  { label: 'Overview',         icon: LayoutDashboard, path: '/ctpo/dashboard' },
  { label: 'Pending Requests', icon: Clock,            path: '/ctpo/pending'   },
  { label: 'All Requests',     icon: ClipboardList,    path: '/ctpo/history'   },
  { label: 'Reports',          icon: FileText,         path: '/ctpo/reports'   },
];

export default function CTPOMobileNav() {
  const navigate          = useNavigate();
  const location          = useLocation();
  const { user, logout }  = useAuth();
  const [open, setOpen]   = useState(false);

  const close = () => setOpen(false);
  const go    = (path) => { close(); navigate(path); };

  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <>
      <button
        type="button"
        className="ctpo-mob-hamburger"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu size={22} />
      </button>

      {open && (
        <div className="ctpo-mob-overlay" onClick={close} aria-hidden="true" />
      )}

      <div
        className={`ctpo-mob-drawer${open ? ' ctpo-mob-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="CTPO Navigation"
      >
        <div className="ctpo-mob-drawer-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: '4px' }}>
            <img
              src="/kiet_logo.jpg"
              alt="KIET"
              style={{
                width: '120px',
                height: 'auto',
                objectFit: 'contain'
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <button className="ctpo-mob-drawer-close" onClick={close} type="button" aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <div className="ctpo-mob-nav-label">Navigation</div>

        <nav className="ctpo-mob-nav">
          {CTPO_NAV.map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              type="button"
              className={`ctpo-mob-nav-item${location.pathname === path ? ' ctpo-mob-nav-item--active' : ''}`}
              onClick={() => go(path)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="ctpo-mob-drawer-user">
          <div className="ctpo-mob-avatar">{initials}</div>
          <div className="ctpo-mob-user-info">
            <div className="ctpo-mob-user-name" title={user?.name}>{user?.name || 'User'}</div>
            <div className="ctpo-mob-user-role">CTPO Approver</div>
          </div>
          <button
            type="button"
            className="ctpo-mob-logout"
            onClick={() => { close(); logout(); }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

