import { useState } from 'react'
import { Bell, CreditCard, AlertCircle, FileText, Phone, Clock } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'

type NotificationType =
  | 'PAYMENT_DUE'
  | 'OVERDUE'
  | 'CONTRACT_EXPIRY'
  | 'FOLLOW_UP'
  | 'TASK_DEADLINE'
  | 'SYSTEM'

interface Notification {
  id: number
  type: NotificationType
  title: string
  description: string
  time: string
  read: boolean
}

type FilterTab = 'All' | 'Unread' | 'Payment' | 'Follow-up' | 'Tasks'

// --- Mock data ---
const initialNotifications: Notification[] = [
  { id: 1,  type: 'OVERDUE',          title: 'Invoice Overdue',              description: 'ECOBANK invoice INV-2026-005 is overdue by 3 days',                          time: '2026-10-13T09:00:00', read: false },
  { id: 2,  type: 'FOLLOW_UP',        title: 'Follow-up Due',                description: 'Call QUINCAILLAIRE KEMEC — scheduled for Oct 15',                            time: '2026-10-14T08:30:00', read: false },
  { id: 3,  type: 'CONTRACT_EXPIRY',  title: 'Contract Expiring',            description: 'Contract CT-2026-001 expires in 82 days — review required',                  time: '2026-10-12T10:00:00', read: false },
  { id: 4,  type: 'TASK_DEADLINE',    title: 'Task Deadline Tomorrow',       description: 'EVS proposal for Ecobank is due tomorrow',                                   time: '2026-10-14T07:00:00', read: false },
  { id: 5,  type: 'FOLLOW_UP',        title: 'Follow-up: Call Client',       description: 'Call SABBAN ABATTOIR — contact: HR THEONESTE',                               time: '2026-10-13T11:00:00', read: false },
  { id: 6,  type: 'PAYMENT_DUE',      title: 'Payment Due Soon',             description: 'N&T PLASTIC INDUSTRIES balance due on Oct 30 — RWF 1,500,000',              time: '2026-10-14T09:30:00', read: true  },
  { id: 7,  type: 'FOLLOW_UP',        title: 'New Lead Assigned',            description: 'MARRIOTT INTERNATIONAL assigned to you — initial contact needed',            time: '2026-10-11T14:00:00', read: true  },
  { id: 8,  type: 'CONTRACT_EXPIRY',  title: 'Contract Awaiting Signature',  description: 'SABBAN ABATTOIR contract CT-2026-004 needs client signature',               time: '2026-10-10T16:00:00', read: true  },
  { id: 9,  type: 'SYSTEM',           title: 'Task Approved',                description: 'Monthly sales report approved by Admin',                                     time: '2026-10-09T12:00:00', read: true  },
  { id: 10, type: 'SYSTEM',           title: 'System Backup',                description: 'Database backup completed successfully at 02:00 AM',                         time: '2026-10-14T02:00:00', read: true  },
]

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
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [activeTab, setActiveTab] = useState<FilterTab>('All')

  const unreadCount = notifications.filter(n => !n.read).length
  const filtered = filterNotifications(notifications, activeTab)

  const markAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

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
                onClick={() => !notification.read && markAsRead(notification.id)}
                className={cn(
                  'bms-card p-4 flex items-start gap-4 transition-colors',
                  !notification.read ? 'cursor-pointer hover:bg-blue-50/30' : ''
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
