import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserRoundCheck,
  DoorOpen,
  CalendarCheck,
  Award,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navigation = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Schedule', path: '/schedule', icon: CalendarDays },
  { label: 'Candidates', path: '/candidates', icon: Users },
  { label: 'Interviewers', path: '/interviewers', icon: UserRoundCheck },
  { label: 'Rooms & Availability', path: '/availability', icon: DoorOpen },
  { label: 'Book an Interview', path: '/self-book', icon: CalendarCheck },
  { label: 'Evaluations', path: '/evaluations', icon: Award },
]

function Sidebar({ showMenu, setShowMenu }) {
  const { role } = useAuth()

  return (
    <>
      {/* Mobile backdrop */}
      {showMenu && (
        <button
          aria-label="Close navigation"
          onClick={() => setShowMenu(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          showMenu ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-lg font-black text-white shadow-md shadow-indigo-100">
              U
            </div>

            <div>
              <h1 className="font-bold tracking-tight text-slate-900 leading-none">Uncooked</h1>
              <p className="mt-1 text-[11px] font-medium text-indigo-600">
                Interview scheduling
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowMenu(false)}
            aria-label="Close navigation"
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 pt-6">
          <div className="mb-3 flex items-center justify-between px-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Recruitment Suite
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
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        size={18}
                        className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}
                      />
                      <span>{label}</span>
                    </div>

                    {badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium transition ${
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

      </aside>
    </>
  )
}

export default Sidebar
