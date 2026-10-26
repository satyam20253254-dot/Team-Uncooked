import { useState } from 'react'
import {
  Menu,
  ChevronDown,
  Building2,
  UserCheck,
  Briefcase,
  GraduationCap,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useDrive } from '../../context/DriveContext'

const ROLES = [
  { id: 'coordinator', label: 'Coordinator', icon: Briefcase, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'interviewer', label: 'Interviewer', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'candidate', label: 'Candidate', icon: GraduationCap, color: 'text-purple-600 bg-purple-50 border-purple-200' },
]

function Topbar({ showMenu, setShowMenu, title }) {
  const { user, role, switchRole, loading: authLoading } = useAuth()
  const { drives, activeDrive, setActiveDrive } = useDrive()
  const [showDriveMenu, setShowDriveMenu] = useState(false)

  const currentRoleConfig = ROLES.find((r) => r.id === role) || ROLES[0]
  const RoleIcon = currentRoleConfig.icon

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">
      {/* Left: Hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Toggle navigation"
          aria-expanded={showMenu}
          className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={21} />
        </button>

        <div>
          <p className="text-xs font-medium text-slate-400">
            Placement Workspace / {title}
          </p>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {activeDrive && (
              <span className="hidden items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {activeDrive.status || 'draft'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Drive Selector + Multi-Role Persona Switcher */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Drive Selector */}
        {drives.length > 0 && (
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowDriveMenu(!showDriveMenu)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Building2 size={15} className="text-indigo-600" />
              <span className="max-w-[160px] truncate">
                {activeDrive?.name || 'Select Drive'}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {showDriveMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1 shadow-lg z-50">
                <p className="px-3 py-2 text-[11px] font-semibold uppercase text-slate-400">
                  Active Placement Drive
                </p>
                {drives.map((d) => (
                  <button
                    key={d._id}
                    onClick={() => {
                      setActiveDrive(d)
                      setShowDriveMenu(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                      activeDrive?._id === d._id
                        ? 'bg-indigo-50 font-semibold text-indigo-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{d.name}</span>
                    <span className="text-[10px] uppercase text-slate-400">
                      {d.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Role switcher */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
          {ROLES.map(({ id, label, icon: Icon }) => {
            const isActive = role === id
            return (
              <button
                key={id}
                onClick={() => switchRole(id)}
                disabled={authLoading}
                title={`Switch to ${label} persona`}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </div>

        {/* Active User Avatar */}
        <div className="flex items-center gap-2 pl-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-semibold text-white shadow-sm shadow-indigo-100">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {user?.name || 'Authorized User'}
            </p>
            <p className="text-[11px] capitalize text-indigo-600 font-medium leading-tight">
              {role} View
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Topbar
