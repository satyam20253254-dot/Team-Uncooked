import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDays,
  Users,
  Clock,
  DoorOpen,
  Search,
  WandSparkles,
  Award,
  Sparkles,
  Download,
  CalendarCheck,
  Plus,
  Video,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api, { API_BASE_URL } from '../services/api'
import { useDrive } from '../context/DriveContext'
import { useAuth } from '../context/AuthContext'

function Dashboard() {
  const { activeDrive, rounds, refreshDrives } = useDrive()
  const { role, user } = useAuth()

  const [search, setSearch] = useState('')
  const [candidates, setCandidates] = useState([])
  const [interviewers, setInterviewers] = useState([])
  const [rooms, setRooms] = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [driveName, setDriveName] = useState('')
  const driveCompany = 'Apex Innovations & Tech Corp'
  const [driveError, setDriveError] = useState('')

  const fetchDashboardData = useCallback(async () => {
    if (!activeDrive?._id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      if (role === 'candidate' || role === 'interviewer') {
        const sessions = await api.get('/my-interviews')
        setInterviews(sessions?.data?.interviews || [])
        return
      }

      const [candRes, intRes, roomRes, schedRes] = await Promise.all([
        api.get(`/drives/${activeDrive._id}/participants?role=candidate`).catch(() => ({ data: { participants: [] } })),
        api.get(`/drives/${activeDrive._id}/participants?role=interviewer`).catch(() => ({ data: { participants: [] } })),
        api.get(`/drives/${activeDrive._id}/rooms`).catch(() => ({ data: [] })),
        api.get(`/my-interviews?driveId=${activeDrive._id}`).catch(() => ({ data: { interviews: [] } })),
      ])

      setCandidates(candRes?.data?.participants || [])
      setInterviewers(intRes?.data?.participants || [])
      setRooms(roomRes?.data || [])
      setInterviews(schedRes?.data?.interviews || [])
    } catch (err) {
      console.warn('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [activeDrive, role])

  useEffect(() => {
    const timer = setTimeout(fetchDashboardData, 0)
    return () => clearTimeout(timer)
  }, [fetchDashboardData])

  const filteredInterviews = interviews.filter((interview) => {
    const q = search.toLowerCase()
    const cName = interview.candidate?.name?.toLowerCase() || ''
    const rName = interview.round?.name?.toLowerCase() || ''
    const iName = interview.interviewer?.name?.toLowerCase() || ''
    return cName.includes(q) || rName.includes(q) || iName.includes(q)
  })

  async function createDrive(event) {
    event.preventDefault()
    setDriveError('')
    const start = new Date()
    const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000)
    try {
      await api.post('/drives', {
        name: driveName.trim(),
        companyName: driveCompany.trim() || 'Apex Innovations & Tech Corp',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        dailyStartTime: '09:00',
        dailyEndTime: '17:00',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      })
      await refreshDrives()
      setDriveName('')
    } catch (err) {
      setDriveError(err.message || 'Could not create the interview drive.')
    }
  }

  const pipelineStats = {
    total: candidates.length,
    active: candidates.filter((c) => c.status === 'active').length,
    disqualified: candidates.filter((c) => c.status === 'disqualified').length,
    scheduledCount: interviews.filter((i) => i.status === 'scheduled').length,
    completedCount: interviews.filter((i) => i.status === 'completed').length,
  }

  // Candidate / Interviewer Portal Views
  if (role === 'candidate' || role === 'interviewer') {
    const isCandidate = role === 'candidate'
    const upcoming = interviews
      .filter((item) => ['scheduled', 'rescheduled'].includes(item.status))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))

    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <section
          className={`relative overflow-hidden rounded-3xl p-7 sm:p-10 text-white shadow-xl ${
            isCandidate
              ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border border-emerald-500/30'
              : 'bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/30'
          }`}
        >
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
              <Sparkles size={14} className="text-emerald-400" />
              {isCandidate ? 'Candidate Portal' : 'Interviewer Panel Console'}
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name || (isCandidate ? 'Candidate' : 'Interviewer')}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
              {isCandidate
                ? 'Track your upcoming interview stages, choose preferred open slots, and download calendar invites.'
                : 'Review your panel assignments, manage availability windows, and record candidate scores post-interview.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={isCandidate ? '/self-book' : '/schedule'}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-md transition hover:bg-slate-100 active:scale-95"
              >
                {isCandidate ? 'Self-Book Interview Slot' : 'View Assigned Schedule'}
                <CalendarCheck size={15} />
              </Link>
              <Link
                to="/availability"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                <Clock size={15} />
                Set My Availability
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Upcoming Sessions"
            value={upcoming.length}
            subtitle="Scheduled & active rounds"
            icon={<CalendarDays size={20} className="text-emerald-600" />}
          />
          <SummaryCard
            title="Completed Rounds"
            value={interviews.filter((item) => item.status === 'completed').length}
            subtitle="Evaluations submitted"
            icon={<Award size={20} className="text-emerald-600" />}
          />
          <SummaryCard
            title="Placement Drive"
            value={activeDrive?.name || 'Default Campus Drive'}
            subtitle={activeDrive?.companyName || 'Campus Placement 2026'}
            icon={<DoorOpen size={20} className="text-amber-600" />}
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                {isCandidate ? 'My Confirmed Interview Slots' : 'My Assigned Panel Sessions'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {isCandidate
                  ? 'Your scheduled times and venue details across interview stages'
                  : 'Interviews assigned to you for evaluation in this drive'}
              </p>
            </div>
            {!isCandidate && (
              <Link className="text-xs font-bold text-emerald-600 hover:underline" to="/evaluations">
                Open Scorecard Matrix →
              </Link>
            )}
          </div>

          {loading ? (
            <p className="py-12 text-center text-xs text-slate-400">Loading your sessions…</p>
          ) : upcoming.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarCheck size={36} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">No upcoming interviews scheduled</p>
              <p className="mt-1 text-xs text-slate-500">
                {isCandidate
                  ? 'Open the Self-Booking Portal to choose an available time slot.'
                  : 'Sessions will appear here once the coordinator generates or publishes the schedule.'}
              </p>
              {isCandidate && (
                <Link
                  to="/self-book"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                >
                  Book a Slot Now
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {upcoming.map((item) => (
                <div key={item._id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                  <div>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase border border-emerald-100">
                      {item.round?.name || 'Interview Round'}
                    </span>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {new Date(item.startTime).toLocaleDateString()} at{' '}
                      {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isCandidate
                        ? `Panelist: ${item.interviewer?.name || 'Assigned Panel'}`
                        : `Candidate: ${item.candidate?.name || 'Assigned Student'}`}{' '}
                      · Venue: {item.room?.name || 'Assigned Room'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`${API_BASE_URL}/interviews/${item._id}/calendar.ics`}
                      download
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Download size={13} />
                      .ics Invite
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  // Coordinator & Admin View
  return (
    <div className="space-y-6">
      {/* Enterprise Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950/30 p-6 sm:p-8 text-white shadow-xl shadow-slate-950/20">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur">
              <Sparkles size={14} className="text-emerald-400" />
              <span>THE ANCIENT ONE’S TRIALS · INTERVIEW SCHEDULING</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {activeDrive?.name || 'Autumn Campus Placement Drive 2026'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Multi-round interview scheduling with zero room collisions, automated interviewer skill-matching, real-time rubric leaderboards, and candidate self-booking.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap gap-2.5">
            <Link
              to="/schedule"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 active:scale-95"
            >
              <WandSparkles size={15} />
              <span>Schedule Engine</span>
            </Link>

            <Link
              to="/self-book"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
            >
              <CalendarCheck size={15} />
              <span>Candidate Portal</span>
            </Link>

            <Link
              to="/evaluations"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
            >
              <Award size={15} />
              <span>Rankings Leaderboard</span>
            </Link>
          </div>
        </div>
      </div>

      {!activeDrive && role && ['coordinator', 'admin'].includes(role) && (
        <form onSubmit={createDrive} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex sm:items-end sm:gap-3">
          <label className="block flex-1 text-sm font-semibold text-slate-800">
            Create Placement Drive
            <input
              required
              minLength={2}
              value={driveName}
              onChange={(e) => setDriveName(e.target.value)}
              placeholder="e.g. Autumn Campus Placement Drive 2026"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-normal outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <button className="mt-3 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 sm:mt-0 shadow-sm">
            Create Drive
          </button>
          {driveError && <p role="alert" className="mt-3 text-xs text-rose-600 sm:absolute">{driveError}</p>}
        </form>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Active Candidates"
          value={pipelineStats.active}
          subtitle={`Out of ${pipelineStats.total} registered in pool`}
          icon={<Users size={20} className="text-emerald-600" />}
          trend="Eligible pool"
        />
        <SummaryCard
          title="Interviewer Panels"
          value={interviewers.length}
          subtitle="Qualified panelists with tagged skills"
          icon={<Award size={20} className="text-emerald-600" />}
          trend="Active panels"
        />
        <SummaryCard
          title="Interview Venues"
          value={rooms.length}
          subtitle={`${rooms.filter((r) => r.isVirtual).length} virtual Google Meet links`}
          icon={<DoorOpen size={20} className="text-teal-600" />}
          trend="Physical & Virtual"
        />
        <SummaryCard
          title="Scheduled Interviews"
          value={interviews.length}
          subtitle={`${pipelineStats.completedCount} completed with scorecards`}
          icon={<CalendarDays size={20} className="text-amber-600" />}
          trend="Live sessions"
        />
      </div>

      {/* Multi-Round Progression Stages */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Configured Interview Pipeline Stages</h2>
            <p className="text-xs text-slate-500">
              Ordered round progression and required interviewer competencies
            </p>
          </div>
          <Link
            to="/rounds"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={14} />
            Manage Rounds
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rounds.map((round, idx) => (
            <div
              key={round._id}
              className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-emerald-300 hover:shadow-xs"
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Round {idx + 1} Stage
                </span>
                <p className="mt-1 text-sm font-bold text-slate-900">{round.name}</p>
                <p className="text-xs text-slate-500">{round.durationMinutes} min session</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-emerald-800">
                <span className="truncate max-w-[120px]">{round.requiredSkills?.slice(0, 2).join(', ') || 'General'}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] uppercase text-emerald-800">
                  {round.isRequired ? 'Mandatory' : 'Optional'}
                </span>
              </div>
            </div>
          ))}

          {/* Final Consensus Stage */}
          <div className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                Final Consensus
              </span>
              <p className="mt-1 text-sm font-bold text-emerald-950">Offer Consensus Matrix</p>
              <p className="text-xs text-emerald-700">Aggregated Rubric Leaderboard</p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs font-bold text-emerald-800">
              <Link to="/evaluations" className="hover:underline flex items-center gap-1">
                <span>Leaderboard</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Live Interviews Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Scheduled Live Interviews</h2>
            <p className="text-xs text-slate-500">
              Active sessions across rounds with instant calendar (.ics) sync
            </p>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate, round or panel..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 sm:w-64"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading interview sessions...</div>
          ) : filteredInterviews.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarDays size={36} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">No scheduled sessions found</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Click <strong>Schedule Engine</strong> to generate a constraint-matched schedule.
              </p>
              <Link
                to="/schedule"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <WandSparkles size={14} />
                Generate Schedule
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-3">Candidate</th>
                  <th className="px-3 py-3">Round</th>
                  <th className="px-3 py-3">Interviewer</th>
                  <th className="px-3 py-3">Date & Time</th>
                  <th className="px-3 py-3">Venue / Meet</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Calendar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInterviews.slice(0, 10).map((interview) => (
                  <tr key={interview._id} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-3.5">
                      <p className="font-bold text-slate-900">{interview.candidate?.name || 'Candidate'}</p>
                      <p className="text-[11px] text-slate-400">{interview.candidate?.email}</p>
                    </td>
                    <td className="px-3 py-3.5 font-medium text-slate-700">{interview.round?.name || 'Round'}</td>
                    <td className="px-3 py-3.5 font-semibold text-slate-800">{interview.interviewer?.name || 'Panel'}</td>
                    <td className="px-3 py-3.5">
                      <p className="font-semibold text-slate-800">
                        {new Date(interview.startTime).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(interview.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(interview.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-3 py-3.5">
                      {interview.room?.isVirtual ? (
                        <a
                          href={interview.room?.meetingLink || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-teal-700 font-semibold hover:underline"
                        >
                          <Video size={13} />
                          <span>Virtual Link</span>
                        </a>
                      ) : (
                        <span className="text-slate-600 font-medium">{interview.room?.name || 'Assigned Room'}</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                          interview.status === 'scheduled'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : interview.status === 'rescheduled'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {interview.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <a
                        href={`${API_BASE_URL}/interviews/${interview._id}/calendar.ics`}
                        download
                        title="Download RFC-5545 .ics Calendar Invite"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Download size={12} />
                        <span>.ics</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, subtitle, icon, trend }) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        <div className="rounded-xl bg-slate-100/80 p-2 text-slate-700">{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{value}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span className="truncate">{subtitle}</span>
        {trend && <span className="font-semibold text-emerald-700 shrink-0">{trend}</span>}
      </div>
    </div>
  )
}

export default Dashboard
