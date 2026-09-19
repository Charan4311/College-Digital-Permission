import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="layout">
      <button
        type="button"
        className="mobile-nav-toggle"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={22} />
      </button>

      <div
        className={`sidebar-backdrop ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="main-content" onClick={() => setIsSidebarOpen(false)}>
        {children}
      </main>
    </div>
  );
}
