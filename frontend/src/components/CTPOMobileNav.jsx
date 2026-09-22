import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Menu, X, LogOut, Sparkles,
  LayoutDashboard, Clock, ClipboardList, FileText,
} from 'lucide-react';

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{
              width: '28px', height: '28px', minWidth: '28px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
            }}>
              <Sparkles size={16} />
            </div>
            <span style={{
              fontSize: '16px', fontWeight: 800,
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Digital Permission
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
            College Approval Platform
          </p>
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
