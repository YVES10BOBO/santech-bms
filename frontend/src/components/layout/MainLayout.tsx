import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'transparent' }}>
      {/* Sidebar — fixed width column, never reflows */}
      <div
        className="flex-shrink-0 hidden lg:block sidebar-transition"
        style={{ width: sidebarCollapsed ? '4rem' : '16rem' }}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          onToggle={() => setSidebarCollapsed(c => !c)}
        />
      </div>

      {/* Mobile sidebar — rendered outside flow so it never shifts content */}
      <div className="lg:hidden">
        <Sidebar
          collapsed={false}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
      </div>

      {/* Main content area — takes remaining space, never changes width */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <Topbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        {/* Page content — overflow-y-scroll keeps scrollbar always visible (no width jump) */}
        <main
          className="flex-1 overflow-y-scroll"
          style={{ padding: '0.75rem 0.85rem', minHeight: 0 }}
        >
          <div style={{ minHeight: '100%' }}>
            <Outlet />
          </div>
        </main>

        <footer className="shrink-0 border-t border-[#d8e0ef] bg-[#e8edf8] px-4 py-2 text-center text-xs text-[#596d89]">
          © 2026 SAN TECH. All rights reserved.
        </footer>
      </div>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
    </div>
  )
}
