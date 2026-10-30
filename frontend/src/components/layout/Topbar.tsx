import { Bell, KeyRound, LogOut, Menu, Search, UserCircle, X, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { notificationService, searchService, type SearchHit } from '@/lib/services/operationsService'
import { getInitials } from '@/lib/utils'

interface TopbarProps {
  onOpenMobileSidebar: () => void
}

const TYPE_STYLES: Record<string, string> = {
  Client: 'bg-blue-100 text-blue-700', Lead: 'bg-sky-100 text-sky-700', Quotation: 'bg-purple-100 text-purple-700',
  Contract: 'bg-indigo-100 text-indigo-700', Invoice: 'bg-green-100 text-green-700', Project: 'bg-orange-100 text-orange-700',
  Task: 'bg-amber-100 text-amber-700', Document: 'bg-rose-100 text-rose-700', Employee: 'bg-teal-100 text-teal-700',
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

  // ── Quick search (clients, projects, invoices, documents, … — only what your role can open) ──
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [showHits, setShowHits] = useState(false)
  const [active, setActive] = useState(0)
  const requestId = useRef(0)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setHits([]); setSearching(false); return }
    setSearching(true)
    const id = ++requestId.current
    const t = setTimeout(() => {
      searchService.query(term)
        .then(list => { if (id === requestId.current) { setHits(list); setActive(0) } })
        .catch(() => { if (id === requestId.current) setHits([]) })
        .finally(() => { if (id === requestId.current) setSearching(false) })
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  // Close the dropdowns when the page changes
  useEffect(() => { setShowHits(false); setProfileOpen(false) }, [location.pathname, location.search])

  const open = (hit: SearchHit) => {
    setShowHits(false)
    setQ('')
    navigate(hit.link)
  }
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setShowHits(false); (e.target as HTMLInputElement).blur() }
    if (!hits.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % hits.length) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i - 1 + hits.length) % hits.length) }
    if (e.key === 'Enter') { e.preventDefault(); open(hits[active]) }
  }

  const go = (path: string) => { setProfileOpen(false); navigate(path) }

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
            value={q}
            onChange={e => { setQ(e.target.value); setShowHits(true) }}
            onFocus={() => setShowHits(true)}
            onBlur={() => setTimeout(() => setShowHits(false), 150)}
            onKeyDown={onKey}
            placeholder="Search clients, projects, invoices, documents..."
            aria-label="Search"
            className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 focus:bg-white transition-all"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}

          {showHits && q.trim().length >= 2 && !searching && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 max-h-96 overflow-y-auto">
              {hits.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-500">No results for “{q.trim()}”</p>
              ) : hits.map((h, i) => (
                <button
                  key={`${h.type}-${h.link}-${i}`}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => open(h)}
                  onMouseEnter={() => setActive(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left ${i === active ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                >
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 w-16 text-center ${TYPE_STYLES[h.type] ?? 'bg-gray-100 text-gray-600'}`}>{h.type}</span>
                  <span className="min-w-0">
                    <span className="block text-sm text-gray-800 truncate">{h.title}</span>
                    {h.subtitle && <span className="block text-xs text-gray-400 truncate">{h.subtitle}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile search toggle */}
      <button
        onClick={() => setSearchOpen(!searchOpen)}
        aria-label={searchOpen ? 'Close search' : 'Search'}
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
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-12 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <button onClick={() => go('/profile')} className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <UserCircle className="w-4 h-4 text-gray-400" /> My Profile
                </button>
                <button onClick={() => go('/profile#password')} className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <KeyRound className="w-4 h-4 text-gray-400" /> Change password
                </button>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
