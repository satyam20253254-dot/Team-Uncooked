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
} from 'lucide-react'

const coordinatorNavigation = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Schedule Engine', path: '/schedule', icon: CalendarDays },
  { label: 'Candidates', path: '/candidates', icon: Users },
  { label: 'Interviewer Panels', path: '/interviewers', icon: UserRoundCheck },
  { label: 'Interview Rounds', path: '/rounds', icon: ListOrdered },
  { label: 'Venues & Availability', path: '/availability', icon: DoorOpen },
  { label: 'Candidate Self-Booking', path: '/self-book', icon: CalendarCheck },
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

function Sidebar({ showMenu, setShowMenu }) {
  const { role } = useAuth()
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/90 bg-white transition-transform duration-200 lg:translate-x-0 ${
          showMenu ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6 bg-slate-900 text-white">
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        size={17}
                        className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}
                      />
                      <span>{label}</span>
                    </div>

                    {badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
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

        {/* Footer info: active drive status */}
        <div className="border-t border-slate-100 p-4 bg-slate-50/70">
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-emerald-600 shrink-0" />
              <p className="text-xs font-bold text-slate-900 truncate">
                {activeDrive?.name || 'Active Drive'}
              </p>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="capitalize">{activeDrive?.status || 'Scheduled'}</span>
              </span>
              <span className="text-slate-400 font-mono text-[10px]">Port 5002</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
