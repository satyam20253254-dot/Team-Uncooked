import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDays,
  Users,
  Clock,
  CircleCheck,
  AlertCircle,
  Search,
  Plus,
  WandSparkles,
  Award,
  Sparkles,
  Download,
  CalendarCheck,
  Building2,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useDrive } from '../context/DriveContext'
import { useAuth } from '../context/AuthContext'

function Dashboard() {
  const { activeDrive, rounds } = useDrive()
  const { role, user } = useAuth()

  const [search, setSearch] = useState('')
  const [candidates, setCandidates] = useState([])
  const [interviewers, setInterviewers] = useState([])
  const [rooms, setRooms] = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    if (!activeDrive?._id) return
    setLoading(true)
    try {
      const [candRes, intRes, roomRes, schedRes] = await Promise.all([
        api.get(`/drives/${activeDrive._id}/participants?role=candidate`).catch(() => ({ data: { participants: [] } })),
        api.get(`/drives/${activeDrive._id}/participants?role=interviewer`).catch(() => ({ data: { participants: [] } })),
        api.get(`/drives/${activeDrive._id}/rooms`).catch(() => ({ data: [] })),
        api.get('/my-interviews').catch(() => ({ data: { interviews: [] } })),
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
  }, [activeDrive])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const filteredInterviews = interviews.filter((interview) => {
    const q = search.toLowerCase()
    const cName = interview.candidate?.name?.toLowerCase() || ''
    const rName = interview.round?.name?.toLowerCase() || ''
    const iName = interview.interviewer?.name?.toLowerCase() || ''
    return cName.includes(q) || rName.includes(q) || iName.includes(q)
  })

  // Candidate and interview summary counts.
  const pipelineStats = {
    total: candidates.length,
    active: candidates.filter((c) => c.status === 'active').length,
    disqualified: candidates.filter((c) => c.status === 'disqualified').length,
    scheduledCount: interviews.filter((i) => i.status === 'scheduled').length,
    completedCount: interviews.filter((i) => i.status === 'completed').length,
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/10">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles size={14} className="text-indigo-300" />
              <span>Placement drive</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {activeDrive?.name || 'Autumn Campus Placement Drive 2026'}
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
              Plan interview rounds, coordinate availability, and keep candidate evaluations in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/schedule"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              <WandSparkles size={15} className="text-indigo-600" />
              <span>View schedule</span>
            </Link>

            <Link
              to="/self-book"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/30 border border-white/20 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-indigo-500/40"
            >
              <CalendarCheck size={15} />
              <span>Book an interview</span>
            </Link>

            <Link
              to="/evaluations"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              <Award size={15} />
              <span>View evaluations</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Active Candidates"
          value={pipelineStats.active}
          subtitle={`Out of ${pipelineStats.total} registered`}
          icon={<Users size={20} className="text-indigo-600" />}
          trend="+8 today"
        />
        <SummaryCard
          title="Interviewers"
          value={interviewers.length}
          subtitle="Available for this drive"
          icon={<CircleCheck size={20} className="text-emerald-600" />}
          trend=""
        />
        <SummaryCard
          title="Rooms"
          value={rooms.length}
          subtitle={`${rooms.filter((r) => r.isVirtual).length} virtual meet links`}
          icon={<Clock size={20} className="text-purple-600" />}
          trend=""
        />
        <SummaryCard
          title="Scheduled Interviews"
          value={pipelineStats.scheduledCount}
          subtitle={`${pipelineStats.completedCount} evaluations submitted`}
          icon={<CalendarDays size={20} className="text-amber-600" />}
          trend=""
        />
      </div>

      {/* Candidate progress by round */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-bold text-slate-900">Candidate progress</h2>
            <p className="text-xs text-slate-500">
              Candidate progress through interview rounds
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
            Round progression
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
          {rounds.map((round, idx) => (
            <div
              key={round._id}
              className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4"
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Round {idx + 1}
                </span>
                <p className="mt-1 text-sm font-bold text-slate-900">{round.name}</p>
                <p className="text-xs text-slate-500">{round.durationMinutes} min session</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-indigo-700">
                <span>{round.requiredSkills?.slice(0, 2).join(', ') || 'General'}</span>
                <span>{round.isRequired ? 'Mandatory' : 'Optional'}</span>
              </div>
            </div>
          ))}

          {/* Final Outcome Stage */}
          <div className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                Final Decision
              </span>
              <p className="mt-1 text-sm font-bold text-emerald-950">Selected / Offer</p>
              <p className="text-xs text-emerald-700">Ranking Matrix Consensus</p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs font-semibold text-emerald-800">
              <Link to="/evaluations" className="hover:underline flex items-center gap-1">
                <span>View Leaderboard</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Live Interviews Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Upcoming Live Interviews</h2>
            <p className="text-xs text-slate-500">Real-time scheduled sessions with one-click calendar invites</p>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate, round or panel..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-400 sm:w-64"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading interview sessions...</div>
          ) : filteredInterviews.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarDays size={36} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">No scheduled sessions</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Generate a schedule or reserve a slot via the Self-Booking portal to view live sessions.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-3">Candidate</th>
                  <th className="px-3 py-3">Round</th>
                  <th className="px-3 py-3">Interviewer</th>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Venue</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Calendar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInterviews.slice(0, 8).map((interview) => (
                  <tr key={interview._id} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-3.5">
                      <p className="font-bold text-slate-900">{interview.candidate?.name || 'Candidate'}</p>
                      <p className="text-[11px] text-slate-400">{interview.candidate?.email}</p>
                    </td>
                    <td className="px-3 py-3.5 font-medium text-slate-700">{interview.round?.name || 'Round'}</td>
                    <td className="px-3 py-3.5 font-semibold text-slate-800">{interview.interviewer?.name || 'Panel'}</td>
                    <td className="px-3 py-3.5">
                      <p className="font-medium text-slate-800">
                        {new Date(interview.startTime).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(interview.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 text-slate-600 font-medium">{interview.room?.name || 'Assigned'}</td>
                    <td className="px-3 py-3.5">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 uppercase">
                        {interview.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <a
                        href={`http://localhost:5002/api/v1/interviews/${interview._id}/calendar.ics`}
                        download
                        title="Download RFC-5545 .ics Calendar File"
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-slate-400">{title}</p>
        <div className="rounded-xl bg-slate-50 p-2">{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{subtitle}</span>
        {trend && <span className="font-semibold text-emerald-600">{trend}</span>}
      </div>
    </div>
  )
}

export default Dashboard
