import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDrive } from '../../context/DriveContext'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserRoundCheck,
  DoorOpen,
  CalendarCheck,
  Award,
  Sparkles,
  ListOrdered,
  X,
  Building2,
  User,
} from 'lucide-react'

const coordinatorNavigation = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Schedule Engine', path: '/schedule', icon: CalendarDays },
  { label: 'Candidates', path: '/candidates', icon: Users },
  { label: 'Interviewer Panels', path: '/interviewers', icon: UserRoundCheck },
  { label: 'Interview Rounds', path: '/rounds', icon: ListOrdered },
  { label: 'Venues & Availability', path: '/availability', icon: DoorOpen },
  { label: 'Evaluations & Rankings', path: '/evaluations', icon: Award },
]

const roleNavigation = {
  candidate: [
    { label: 'My Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Self-Book Interview', path: '/self-book', icon: CalendarCheck },
    { label: 'My Availability', path: '/availability', icon: DoorOpen },
  ],
  interviewer: [
    { label: 'Panel Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Assigned Schedule', path: '/schedule', icon: CalendarDays },
    { label: 'Scorecards & Rubric', path: '/evaluations', icon: Award },
    { label: 'My Availability', path: '/availability', icon: DoorOpen },
  ],
}

function Sidebar({ showMenu, setShowMenu, onOpenProfile }) {
  const { user, role } = useAuth()
  const { activeDrive } = useDrive()
  const navigation =
    role === 'coordinator' || role === 'admin'
      ? coordinatorNavigation
      : roleNavigation[role] || roleNavigation.candidate

  return (
    <>
      {/* Mobile backdrop */}
      {showMenu && (
        <button
          aria-label="Close navigation"
          onClick={() => setShowMenu(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 lg:translate-x-0 ${
          showMenu ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex h-20 items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/30">
              <Sparkles size={20} className="text-white" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold tracking-tight text-white leading-none text-base">
                  The Ancient One’s
                </h1>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-400">
                Trials · Interview orchestration
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowMenu(false)}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 pt-6">
          <div className="mb-3 px-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {role === 'coordinator' || role === 'admin' ? 'Drive Management' : 'Personal Workspace'}
            </p>
          </div>

          <nav className="space-y-1">
            {navigation.map(({ label, path, icon: Icon, badge }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                onClick={() => setShowMenu(false)}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        size={17}
                        className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}
                      />
                      <span>{label}</span>
                    </div>

                    {badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer info: user profile & active drive status */}
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-950/40 space-y-2.5">
          {user && (
            <button
              onClick={() => {
                setShowMenu(false)
                onOpenProfile?.()
              }}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/90 p-2.5 text-left shadow-xs transition hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-slate-800 group"
              title="View and edit your profile"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-[11px] font-extrabold text-white">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                    {user.name}
                  </p>
                  <p className="text-[10px] capitalize text-slate-400 dark:text-slate-400 font-medium">
                    {role} Profile
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                Edit &rarr;
              </span>
            </button>
          )}

          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/90 p-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {activeDrive?.name || 'Active Drive'}
              </p>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="capitalize">{activeDrive?.status || 'Scheduled'}</span>
              </span>
              <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">Port 5002</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
