'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAssignmentStore } from '@/store/assignmentStore';
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  Settings,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/create', label: 'Create Assessment', icon: FilePlus2 },
  { href: '/assessments', label: 'My Assessments', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAssignmentStore();

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="sidebar-logo" style={{ gap: 8 }}>
          <div className="sidebar-logo-icon" style={{ width: 32, height: 32, fontSize: 14 }}>
            <Sparkles size={18} />
          </div>
          <span className="sidebar-logo-text" style={{ fontSize: 16 }}>VedaAI</span>
        </div>
        <button className="menu-toggle" onClick={toggleSidebar}>
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="sidebar-logo-text">VedaAI</div>
              <div className="sidebar-logo-sub">Assessment Creator</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link" style={{ opacity: 0.6 }}>
            <Settings size={20} />
            Settings
          </button>
          <div style={{
            padding: '12px 16px',
            fontSize: 11,
            color: 'var(--text-muted)',
            letterSpacing: '0.3px',
          }}>
            VedaAI v1.0 · Powered by Gemini
          </div>
        </div>
      </aside>
    </>
  );
}
