import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, Sparkles } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout">
      {/* Mobile top navigation header */}
      <header className="mobile-topbar">
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1E293B',
            borderRadius: '6px'
          }}
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Sparkles size={14} />
          </div>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Digital Permission</span>
        </div>

        <div style={{ width: '28px' }} />
      </header>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
