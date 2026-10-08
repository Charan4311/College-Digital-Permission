import React, { useState } from 'react';
import StudentSidebar from './StudentSidebar';
import { useAuth } from '../context/AuthContext';
import { Menu, Bell, ChevronDown } from 'lucide-react';
import '../student.css';

export default function StudentLayout({
  children,
  pageTitle = '',
  pageSubtitle = '',
  headerRight = null   // slot for extra controls in the header (e.g. search box)
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="s-layout">
      {/* Fixed pastel background blobs */}
      <div className="s-bg" aria-hidden="true">
        <div className="s-bg-blob s-bg-blob-1" />
        <div className="s-bg-blob s-bg-blob-2" />
        <div className="s-bg-blob s-bg-blob-3" />
      </div>

      {/* Floating sidebar panel */}
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Floating main panel */}
      <div className="s-main-wrapper">

        {/* Page header — always at the top of the main panel */}
        <header className="s-page-header">
          <div className="s-page-header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Mobile hamburger */}
            <button
              type="button"
              className="s-hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              style={{
                display: 'none',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                color: '#1e293b'
              }}
            >
              <Menu size={20} />
            </button>
            <div>
              {pageTitle   && <h1 className="s-page-title">{pageTitle}</h1>}
              {pageSubtitle && <p className="s-page-subtitle">{pageSubtitle}</p>}
            </div>
          </div>

          <div className="s-page-header-right">
            {/* Any extra controls passed in (e.g. search on My Requests) */}
            {headerRight}


          </div>
        </header>

        {/* Scrollable page content */}
        <main className="s-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
