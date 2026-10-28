import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'transparent' }}>
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <Topbar
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        {/* Page content — fixed height, always scrollable so layout never shifts */}
        <main
          className="flex-1 overflow-y-scroll"
          style={{ padding: '0.75rem 0.85rem', minHeight: 0 }}
        >
          {/* Inner wrapper always fills full height — prevents content-height changes
              from bubbling up and shaking the layout */}
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
