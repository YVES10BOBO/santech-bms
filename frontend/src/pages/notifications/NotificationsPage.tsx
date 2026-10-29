import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CreditCard, AlertCircle, FileText, Phone, Clock } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { notificationService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

type NotificationType =
  | 'PAYMENT_DUE'
  | 'OVERDUE'
  | 'CONTRACT_EXPIRY'
  | 'FOLLOW_UP'
  | 'TASK_DEADLINE'
  | 'SYSTEM'

interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  time: string
  read: boolean
  link: string
}

/** Lets the top-bar bell refresh after notifications are read */
export const NOTIFICATIONS_CHANGED = 'santech:notifications-changed'

type FilterTab = 'All' | 'Unread' | 'Payment' | 'Follow-up' | 'Tasks'

// --- Type config ---
const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ElementType; iconBg: string; badgeColor: string; label: string }
> = {
  PAYMENT_DUE:     { icon: CreditCard,  iconBg: 'bg-orange-100 text-orange-600', badgeColor: 'bg-orange-100 text-orange-700', label: 'Payment Due'      },
  OVERDUE:         { icon: AlertCircle, iconBg: 'bg-red-100 text-red-600',       badgeColor: 'bg-red-100 text-red-700',       label: 'Overdue'          },
  CONTRACT_EXPIRY: { icon: FileText,    iconBg: 'bg-purple-100 text-purple-600', badgeColor: 'bg-purple-100 text-purple-700', label: 'Contract Expiry'  },
  FOLLOW_UP:       { icon: Phone,       iconBg: 'bg-blue-100 text-blue-600',     badgeColor: 'bg-blue-100 text-blue-700',     label: 'Follow-up'        },
  TASK_DEADLINE:   { icon: Clock,       iconBg: 'bg-yellow-100 text-yellow-600', badgeColor: 'bg-yellow-100 text-yellow-700', label: 'Task Deadline'    },
  SYSTEM:          { icon: Bell,        iconBg: 'bg-gray-100 text-gray-500',     badgeColor: 'bg-gray-100 text-gray-600',     label: 'System'           },
}

const TABS: FilterTab[] = ['All', 'Unread', 'Payment', 'Follow-up', 'Tasks']

function filterNotifications(notifications: Notification[], tab: FilterTab): Notification[] {
  switch (tab) {
    case 'Unread':    return notifications.filter(n => !n.read)
    case 'Payment':   return notifications.filter(n => n.type === 'PAYMENT_DUE' || n.type === 'OVERDUE')
    case 'Follow-up': return notifications.filter(n => n.type === 'FOLLOW_UP')
    case 'Tasks':     return notifications.filter(n => n.type === 'TASK_DEADLINE')
    default:          return notifications
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('All')

  useEffect(() => {
    notificationService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setNotifications((res.data ?? []).map((n: any) => ({
        id: n.id,
        type: (n.type in TYPE_CONFIG ? n.type : 'SYSTEM') as NotificationType,
        title: n.title,
        description: n.description,
        time: n.createdAt,
        read: n.read,
        link: n.link ?? '',
      }))))
      .catch(err => toast.error(apiError(err, 'Failed to load notifications')))
      .finally(() => { setLoading(false); window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED)) })
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length
  const filtered = filterNotifications(notifications, activeTab)

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    notificationService.markRead([id])
      .then(() => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED)))
      .catch(() => { /* stays read on screen; will sync next load */ })
  }

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    try {
      await notificationService.markRead()
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED))
    } catch (err) {
      toast.error(apiError(err, 'Failed to mark as read'))
    }
  }

  const open = (n: Notification) => {
    if (!n.read) markAsRead(n.id)
    if (n.link) navigate(n.link)
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-gray-500 text-sm mt-0.5">Stay on top of important alerts and reminders</p>
        </div>
        <button
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Bell className="w-4 h-4" />
          Mark all as read
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Notifications', value: notifications.length, color: 'text-santech-600' },
          { label: 'Unread',              value: unreadCount,           color: 'text-red-600'     },
        ].map(s => (
          <div key={s.label} className="kpi-card p-4 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="bms-card p-1 flex gap-1 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-santech-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'
            )}
          >
            {tab}
            {tab === 'Unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bms-card p-10 text-center text-gray-400 text-sm">
            No notifications here.
          </div>
        ) : (
          filtered.map(notification => {
            const cfg = TYPE_CONFIG[notification.type]
            const Icon = cfg.icon
            return (
              <div
                key={notification.id}
                onClick={() => open(notification)}
                className={cn(
                  'bms-card p-4 flex items-start gap-4 transition-colors',
                  !notification.read || notification.link ? 'cursor-pointer hover:bg-blue-50/30' : ''
                )}
              >
                {/* Colored icon */}
                <div className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center', cfg.iconBg)}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn('text-sm', notification.read ? 'font-normal text-gray-700' : 'font-bold text-gray-900')}>
                        {notification.title}
                      </p>
                      {/* Unread dot */}
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" aria-label="Unread" />
                      )}
                      {/* Type badge */}
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.badgeColor)}>
                        {cfg.label}
                      </span>
                    </div>
                    {/* Time ago */}
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {timeAgo(notification.time)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{notification.description}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

import React from 'react'
