import { Bell, Menu, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { notificationService } from '@/lib/services/operationsService'
import { getInitials } from '@/lib/utils'

interface TopbarProps {
  onOpenMobileSidebar: () => void
}

export default function Topbar({ onOpenMobileSidebar }: TopbarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [unread, setUnread] = useState(0)

  // Real unread count: refresh on page change, every 2 minutes, and when notifications are read
  useEffect(() => {
    let alive = true
    const load = () => notificationService.unreadCount().then(n => { if (alive) setUnread(n) }).catch(() => { /* bell stays as is */ })
    load()
    const timer = window.setInterval(load, 120000)
    window.addEventListener('santech:notifications-changed', load)
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener('santech:notifications-changed', load) }
  }, [location.pathname])
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <header className="h-11 bg-white border-b-2 border-[#dde3f0] flex items-center px-4 gap-3 flex-shrink-0 z-10 shadow-sm">
      {/* Phones only: the sidebar is hidden there, so this opens it.
          On computers the menu button sits in the sidebar's top-right corner. */}
      <button
        onClick={onOpenMobileSidebar}
        aria-label="Open menu"
        className="lg:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className={`flex-1 max-w-md transition-all ${searchOpen ? 'block' : 'hidden sm:block'}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients, projects, tasks..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Mobile search toggle */}
      <button
        onClick={() => setSearchOpen(!searchOpen)}
        className="sm:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
      >
        {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
      </button>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          title={unread ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'Notifications'}
          className="relative p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-santech-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {user ? getInitials(`${user.firstName} ${user.lastName}`) : 'U'}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-700 leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 capitalize">
                {user?.role.replace('_', ' ').toLowerCase()}
              </p>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-800">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                My Profile
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                Settings
              </button>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
