
import { useState } from 'react'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserRoundCheck,
  DoorOpen,
  Settings,
  Search,
  Bell,
  Plus,
  ChevronDown,
  Clock,
  CircleCheck,
  AlertCircle,
  Menu,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const initialInterviews = [
  {
    id: 1,
    candidate: 'Aarav Sharma',
    email: 'aarav@example.com',
    round: 'Technical Screening',
    interviewer: 'Rahul Verma',
    time: '10:00 AM – 10:30 AM',
    room: 'Room A',
    status: 'Scheduled',
  },
  {
    id: 2,
    candidate: 'Priya Singh',
    email: 'priya@example.com',
    round: 'Technical Interview',
    interviewer: 'Ananya Gupta',
    time: '10:30 AM – 11:15 AM',
    room: 'Room B',
    status: 'Scheduled',
  },
  {
    id: 3,
    candidate: 'Rohan Patel',
    email: 'rohan@example.com',
    round: 'Technical Screening',
    interviewer: 'Unassigned',
    time: 'Not assigned',
    room: '—',
    status: 'Unassigned',
  },
  {
    id: 4,
    candidate: 'Sneha Verma',
    email: 'sneha@example.com',
    round: 'HR Interview',
    interviewer: 'Karan Mehta',
    time: '12:00 PM – 12:30 PM',
    room: 'Room C',
    status: 'Scheduled',
  },
]

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Schedule', icon: CalendarDays },
  { label: 'Candidates', icon: Users },
  { label: 'Interviewers', icon: UserRoundCheck },
  { label: 'Rooms & Availability', icon: DoorOpen },
]

function Dashboard() {
  const [activePage, setActivePage] = useState('Overview')
  const [search, setSearch] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [interviews, setInterviews] = useState(initialInterviews)

  const filteredInterviews = interviews.filter((interview) =>
    `${interview.candidate} ${interview.round} ${interview.interviewer}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  function handleGenerateSchedule() {
    alert(
      'Schedule generation will be connected to the backend API later.'
    )
  }

  function handlePublish() {
    const confirmed = window.confirm(
      'Publish the current schedule?'
    )

    if (confirmed) {
      alert('Publishing will be connected to the backend API later.')
    }
  }

  function handleAddInterview() {
    const name = window.prompt('Enter candidate name:')

    if (!name?.trim()) return

    setInterviews((current) => [
      ...current,
      {
        id: Date.now(),
        candidate: name.trim(),
        email: 'Not provided',
        round: 'Technical Screening',
        interviewer: 'Unassigned',
        time: 'Not assigned',
        room: '—',
        status: 'Unassigned',
      },
    ])
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile menu backdrop */}
      {showMenu && (
        <button
          aria-label="Close navigation"
          onClick={() => setShowMenu(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          showMenu ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
              U
            </div>
            <div>
              <h1 className="font-bold tracking-tight">Uncooked</h1>
              <p className="text-xs text-slate-500">
                Placement Scheduler
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowMenu(false)}
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map(({ label, icon: Icon }) => (
              <NavLink
                key={label}
                onClick={() => {
                  setActivePage(label)
                  setShowMenu(false)
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  activePage === label
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={19} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl bg-slate-900 p-4 text-white">
            <p className="text-sm font-semibold">Need a hand?</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Manage your placement drive with ease.
            </p>
            <p className="mt-3 text-xs font-medium text-indigo-300">
              Uncooked Team
            </p>
          </div>

          <button
            onClick={() => setActivePage('Settings')}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Settings size={19} />
            Settings
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="min-h-screen lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMenu(true)}
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={21} />
            </button>
            <div>
              <p className="text-sm text-slate-500">
                Workspace / {activePage}
              </p>
              <h2 className="font-semibold">{activePage}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              aria-label="Notifications"
              onClick={() => alert('No new notifications.')}
              className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
            >
              <Bell size={19} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-500" />
            </button>

            <div className="hidden items-center gap-3 border-l border-slate-200 pl-4 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                C
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold">Coordinator</p>
                <p className="text-xs text-slate-500">Admin account</p>
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] p-4 sm:p-8">
          {/* Page heading */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-indigo-600">
                PLACEMENT MANAGEMENT
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Good evening, Coordinator 👋
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Here's what's happening with your placement drive.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleAddInterview}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm hover:bg-slate-50"
              >
                <Plus size={17} />
                Add candidate
              </button>

              <button
                onClick={handleGenerateSchedule}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <CalendarDays size={17} />
                Generate schedule
              </button>
            </div>
          </div>

          {/* Drive banner */}
          <section className="mt-8 flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-600 p-6 text-white sm:flex-row sm:items-center sm:p-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-indigo-100">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Current placement drive
              </div>
              <h2 className="mt-3 text-xl font-bold sm:text-2xl">
                Engineering Placement Drive 2026
              </h2>
              <p className="mt-2 text-sm text-indigo-100">
                Manage rounds, assign interview slots and resolve conflicts.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm sm:self-center">
              <Clock size={17} />
              Draft schedule
            </div>
          </section>

          {/* Statistics */}
          <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total candidates"
              value="240"
              subtitle="Registered for the drive"
              icon={Users}
              color="indigo"
            />
            <StatCard
              title="Scheduled"
              value={interviews.filter((item) => item.status === 'Scheduled').length}
              subtitle="In this sample timetable"
              icon={CircleCheck}
              color="emerald"
            />
            <StatCard
              title="Unassigned"
              value={interviews.filter((item) => item.status === 'Unassigned').length}
              subtitle="Need a suitable slot"
              icon={Clock}
              color="amber"
            />
            <StatCard
              title="Conflicts"
              value="0"
              subtitle="No live validation yet"
              icon={AlertCircle}
              color="rose"
            />
          </section>

          {/* Interviews table */}
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
              <div>
                <h2 className="text-lg font-bold">Interview schedule</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review candidate assignments and their current status.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search interviews..."
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-56"
                  />
                </div>

                <button
                  onClick={handlePublish}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Publish schedule
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Candidate</th>
                    <th className="px-6 py-4 font-semibold">Interview round</th>
                    <th className="px-6 py-4 font-semibold">Interviewer</th>
                    <th className="px-6 py-4 font-semibold">Time & room</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredInterviews.map((interview) => (
                    <tr key={interview.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-5">
                        <p className="font-semibold text-slate-800">
                          {interview.candidate}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {interview.email}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-slate-700">
                        {interview.round}
                      </td>
                      <td className="px-6 py-5 text-slate-600">
                        {interview.interviewer}
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-medium text-slate-700">
                          {interview.time}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {interview.room}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={interview.status} />
                      </td>
                    </tr>
                  ))}

                  {filteredInterviews.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        No interviews match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-2 border-t border-slate-100 px-6 py-4 text-xs text-slate-500 sm:flex-row">
              <span>
                Showing {filteredInterviews.length} of {interviews.length} sample interviews
              </span>
              <span>Demo data · Not connected to the backend</span>
            </div>
          </section>

          <p className="mt-6 text-center text-xs text-slate-400">
            Built with React and Tailwind CSS · Team Uncooked
          </p>
        </main>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`rounded-xl p-2.5 ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    Scheduled: 'bg-emerald-50 text-emerald-700',
    Unassigned: 'bg-amber-50 text-amber-700',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${
        styles[status] || 'bg-slate-100 text-slate-600'
      }`}
    >
      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

export default Dashboard
