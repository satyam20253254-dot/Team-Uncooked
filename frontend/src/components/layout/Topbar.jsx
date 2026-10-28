import { useCallback, useEffect, useState } from 'react'
import {
  Menu,
  ChevronDown,
  Building2,
  LogOut,
  Bell,
  CheckCheck,
  CalendarDays,
  CircleCheck,
  ListOrdered,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useDrive } from '../../context/DriveContext'
import { ThemeToggle } from '../../context/ThemeContext'
import api from '../../services/api'

function Topbar({ showMenu, setShowMenu, title, onOpenProfile }) {
  const { user, role, signOut } = useAuth()
  const { drives, activeDrive, setActiveDrive } = useDrive()
  const [showDriveMenu, setShowDriveMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const loadNotifications = useCallback(async () => {
    if (!user?._id) return
    try {
      const response = await api.get('/notifications?limit=30')
      setNotifications(response?.data?.notifications || [])
      setUnreadCount(response?.data?.unreadCount || 0)
    } catch (error) {
      console.warn('Could not load notifications:', error.message)
    }
  }, [user?._id])

  useEffect(() => {
    const initialTimer = window.setTimeout(loadNotifications, 0)
    const timer = window.setInterval(loadNotifications, 30000)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(timer)
    }
  }, [loadNotifications])

  async function markAllRead() {
    if (unreadCount === 0) return
    try {
      await api.patch('/notifications/read-all')
      const readAt = new Date().toISOString()
      setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || readAt })))
      setUnreadCount(0)
    } catch (error) {
      console.warn('Could not mark notifications as read:', error.message)
    }
  }

  async function markRead(notification) {
    if (notification.readAt) return
    try {
      await api.patch(`/notifications/${notification._id}/read`)
      setNotifications((items) => items.map((item) => item._id === notification._id
        ? { ...item, readAt: new Date().toISOString() }
        : item))
      setUnreadCount((count) => Math.max(0, count - 1))
    } catch (error) {
      console.warn('Could not mark notification as read:', error.message)
    }
  }

  const notificationIcon = (type) => {
    if (type?.includes('schedule') || type?.includes('interview')) return CalendarDays
    if (type?.includes('completed')) return CircleCheck
    return ListOrdered
  }

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 backdrop-blur-md sm:px-8 transition-colors">
      {/* Left: Hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Toggle navigation"
          aria-expanded={showMenu}
          className="rounded-xl p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div>
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            The Ancient One’s Trials / {role} workspace
          </p>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h2>
            {activeDrive && (
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200/80 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {activeDrive.status || 'Active'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Theme Toggle + Drive Selector + Notifications + User Card + Sign Out */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Drive Selector */}
        {(role === 'coordinator' || role === 'admin') && drives.length > 0 && (
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowDriveMenu(!showDriveMenu)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition"
            >
              <Building2 size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span className="max-w-[170px] truncate">
                {activeDrive?.name || 'Select Drive'}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {showDriveMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl shadow-slate-900/10 z-50">
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Switch Active Placement Drive
                </p>
                {drives.map((d) => (
                  <button
                    key={d._id}
                    onClick={() => {
                      setActiveDrive(d)
                      setShowDriveMenu(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition ${
                      activeDrive?._id === d._id
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 font-bold text-emerald-800 dark:text-emerald-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{d.name}</span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
                      {d.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications((open) => !open); loadNotifications() }}
            className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-500 dark:text-slate-400 transition hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400"
            title="Notifications"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={showNotifications}
          >
            <Bell size={19} />
            {unreadCount > 0 && <span className="absolute right-1 top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-4 text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
          {showNotifications && (
            <section className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/10 dark:shadow-black/40">
              <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}</p>
                </div>
                {unreadCount > 0 && <button onClick={markAllRead} className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"><CheckCheck size={14}/>Mark all read</button>}
              </header>
              <div className="max-h-[min(65vh,26rem)] overflow-y-auto">
                {notifications.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p> : notifications.map((notification) => {
                  const Icon = notificationIcon(notification.type)
                  return (
                    <button
                      key={notification._id}
                      onClick={() => markRead(notification)}
                      className={`flex w-full gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${notification.readAt ? 'bg-white dark:bg-slate-900' : 'bg-emerald-50/50 dark:bg-emerald-950/20'}`}
                    >
                      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${notification.readAt ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'}`}><Icon size={16}/></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{notification.title}</span>
                          {!notification.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600"/>}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">{notification.message}</span>
                        <span className="mt-1.5 block text-[10px] text-slate-400 dark:text-slate-500">{new Date(notification.createdAt).toLocaleString()}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* User Card (Interactive profile trigger) */}
        <button
          onClick={onOpenProfile}
          className="group flex items-center gap-2.5 rounded-xl border-l border-slate-200 dark:border-slate-800 py-1 pl-2.5 pr-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60 focus:outline-none"
          title="Click to view and edit your profile"
          aria-label="User profile settings"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-xs font-extrabold text-white shadow-sm transition-transform group-hover:scale-105">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden text-left lg:block">
            <div className="flex items-center gap-1">
              <p className="text-xs font-bold leading-tight text-slate-900 dark:text-slate-100 transition group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                {user?.name || 'Authorized User'}
              </p>
              <ChevronDown size={11} className="text-slate-400 dark:text-slate-500 transition group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            </div>
            <p className="text-[11px] font-semibold capitalize leading-tight text-emerald-700 dark:text-emerald-400">
              {role}
            </p>
          </div>
        </button>

        <button
          onClick={signOut}
          className="rounded-xl p-2 text-slate-400 dark:text-slate-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}

export default Topbar
