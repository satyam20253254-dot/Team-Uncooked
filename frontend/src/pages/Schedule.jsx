import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  CalendarDays,
  Clock,
  MapPin,
  UserRound,
  WandSparkles,
  Send,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Video,
} from 'lucide-react'
import WeeklyCalendar from '../components/WeeklyCalendar'
import api from '../services/api'
import { useDrive } from '../context/DriveContext'
import { useAuth } from '../context/AuthContext'

function Schedule() {
  const { activeDrive, rounds } = useDrive()
  const { role, user } = useAuth()

  const [interviews, setInterviews] = useState([])
  const [scheduleVersions, setScheduleVersions] = useState([])
  const [activeVersion, setActiveVersion] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Notification banners
  const [bannerNotice, setBannerNotice] = useState(null)
  const [bannerError, setBannerError] = useState(null)

  // Reschedule Modal
  const [rescheduleModal, setRescheduleModal] = useState(null)
  const [rescheduleReason, setRescheduleReason] = useState('Interviewer unavailable due to urgent campus panel duty')
  const [rescheduling, setRescheduling] = useState(false)

  // Fetch schedule versions for active drive
  const fetchSchedule = useCallback(async () => {
    if (!activeDrive?._id) return
    setLoading(true)
    setBannerError(null)
    try {
      const res = await api.get(`/drives/${activeDrive._id}/schedules`)
      const versions = res?.data?.versions || []
      setScheduleVersions(versions)

      if (versions.length > 0) {
        // Default to latest version (published or draft)
        const published = versions.find((v) => v.status === 'published')
        const target = published || versions[0]
        setActiveVersion(target)

        // Fetch interviews for this version
        const intRes = await api.get(`/drives/${activeDrive._id}/schedules/${target._id}/interviews`)
        setInterviews(intRes?.data?.interviews || [])
      } else {
        setActiveVersion(null)
        setInterviews([])
      }
    } catch (err) {
      console.warn('Could not load schedule versions:', err)
      setInterviews([])
    } finally {
      setLoading(false)
    }
  }, [activeDrive])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  // Generate a draft schedule from current availability and round requirements.
  const handleGenerateSchedule = async () => {
    if (!activeDrive?._id) return
    setGenerating(true)
    setBannerNotice(null)
    setBannerError(null)
    try {
      const res = await api.post(`/drives/${activeDrive._id}/schedules/generate`, {
        changeSummary: 'Automated constraint-satisfaction schedule generation via portal',
      })

      const data = res?.data
      setBannerNotice(
        `Draft schedule created with ${data?.totalInterviewsScheduled || 0} interviews for ${
          data?.totalCandidates || 0
        } candidates without time or room collisions.`
      )
      await fetchSchedule()
    } catch (err) {
      setBannerError(err.message || 'Generation failed. Ensure candidates, interviewers with skills, and rooms exist.')
    } finally {
      setGenerating(false)
    }
  }

  // Publish Schedule Version
  const handlePublishSchedule = async () => {
    if (!activeDrive?._id || !activeVersion?._id) return
    if (activeVersion.status === 'published') {
      alert('This schedule is already published.')
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to publish Schedule v${activeVersion.versionNumber}? This will notify participants and lock the schedule.`
    )
    if (!confirmed) return

    try {
      await api.patch(`/drives/${activeDrive._id}/schedules/${activeVersion._id}/publish`)
      setBannerNotice(`Schedule v${activeVersion.versionNumber} officially published and locked!`)
      await fetchSchedule()
    } catch (err) {
      setBannerError(err.message || 'Failed to publish schedule.')
    }
  }

  // Find an eligible replacement interviewer for this session.
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault()
    if (!rescheduleModal?._id) return
    setRescheduling(true)
    setBannerNotice(null)
    setBannerError(null)
    try {
      const res = await api.post(`/interviews/${rescheduleModal._id}/reschedule`, {
        reason: rescheduleReason,
      })

      const dynamicAction = res?.data?.resolutionAction || 'Interview rescheduled successfully!'
      setBannerNotice(
        `Rescheduling complete. ${dynamicAction}`
      )
      setRescheduleModal(null)
      await fetchSchedule()
    } catch (err) {
      setBannerError(err.message || 'Failed to reschedule interview. No alternate interviewer with matching skills was available.')
    } finally {
      setRescheduling(false)
    }
  }

  // Format Google Calendar Web Intent URL
  const getGoogleCalendarUrl = (interview) => {
    const title = encodeURIComponent(`Interview: ${interview.round?.name || 'Recruitment Round'}`)
    const details = encodeURIComponent(
      `Candidate: ${interview.candidate?.name}\nPanel: ${interview.interviewer?.name}\nRoom: ${interview.room?.name || 'TBD'}`
    )
    const location = encodeURIComponent(interview.room?.meetingLink || interview.room?.location || 'Campus Placement Cell')
    const startIso = new Date(interview.startTime).toISOString().replace(/-|:|\.\d\d\d/g, '')
    const endIso = new Date(interview.endTime).toISOString().replace(/-|:|\.\d\d\d/g, '')

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${startIso}/${endIso}`
  }

  // Adapt interviews for WeeklyCalendar display
  const calendarAdaptedInterviews = interviews.map((item) => {
    const sDate = new Date(item.startTime)
    const year = sDate.getFullYear()
    const month = String(sDate.getMonth() + 1).padStart(2, '0')
    const day = String(sDate.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`

    return {
      id: item._id,
      candidate: item.candidate?.name || 'Candidate',
      round: item.round?.name || 'Interview',
      interviewer: item.interviewer?.name || 'Panel',
      date: dateKey,
      time: sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      room: item.room?.name || (item.room?.isVirtual ? 'Virtual Meet' : 'Room'),
      status: item.status === 'scheduled' ? 'Scheduled' : item.status,
      raw: item,
    }
  })

  const filteredInterviews = interviews.filter((interview) => {
    const query = search.toLowerCase()
    const cName = interview.candidate?.name?.toLowerCase() || ''
    const rName = interview.round?.name?.toLowerCase() || ''
    const iName = interview.interviewer?.name?.toLowerCase() || ''

    const matchesSearch = cName.includes(query) || rName.includes(query) || iName.includes(query)
    const matchesStatus = statusFilter === 'All' || interview.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase">
              Interview schedule
            </span>
            {activeVersion && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                v{activeVersion.versionNumber} ({activeVersion.status})
              </span>
            )}
          </div>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Interview schedule
          </h1>
          <p className="mt-1 text-slate-500">
            Create and review interview times based on availability, interviewer expertise, and room capacity.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleGenerateSchedule}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
          >
            <WandSparkles size={16} />
            {generating ? 'Creating schedule...' : 'Generate schedule'}
          </button>

          {activeVersion && activeVersion.status === 'draft' && (
            <button
              onClick={handlePublishSchedule}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Send size={15} />
              Publish Schedule
            </button>
          )}
        </div>
      </div>

      {/* Notices */}
      {bannerNotice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
            <p className="font-medium">{bannerNotice}</p>
          </div>
          <button onClick={() => setBannerNotice(null)} className="text-xs text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {bannerError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <p className="font-medium">{bannerError}</p>
          </div>
          <button onClick={() => setBannerError(null)} className="text-xs text-red-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Visual Weekly Calendar */}
      <WeeklyCalendar interviews={calendarAdaptedInterviews} />

      {/* Schedule Table & Operations */}
      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Scheduled Interviews</h2>
            <p className="text-xs text-slate-500">
              {interviews.length} interview{interviews.length === 1 ? '' : 's'} in this schedule
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-slate-200 px-3">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate, round or panel..."
                className="w-full min-w-0 py-2 text-xs outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400"
            >
              <option value="All">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading schedule...</div>
          ) : filteredInterviews.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarDays size={36} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">No interviews in this version</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Select <strong>Generate schedule</strong> to create interview times from your current availability and room settings.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="px-3 py-3">Candidate</th>
                  <th className="px-3 py-3">Round</th>
                  <th className="px-3 py-3">Interviewer</th>
                  <th className="px-3 py-3">Time Slot</th>
                  <th className="px-3 py-3">Venue / Link</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions & Calendar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInterviews.map((item) => {
                  const sTime = new Date(item.startTime)
                  const eTime = new Date(item.endTime)
                  const dateStr = sTime.toLocaleDateString()
                  const timeRange = `${sTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${eTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

                  return (
                    <tr key={item._id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-3.5">
                        <p className="font-bold text-slate-900">{item.candidate?.name || 'Candidate'}</p>
                        <p className="text-[11px] text-slate-400">{item.candidate?.email}</p>
                      </td>
                      <td className="px-3 py-3.5 font-medium text-slate-700">
                        {item.round?.name || 'Interview'}
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="font-semibold text-slate-800">{item.interviewer?.name || 'Panel'}</p>
                        <p className="text-[11px] text-slate-400">{item.interviewer?.email}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="font-medium text-slate-800">{dateStr}</p>
                        <p className="text-[11px] text-slate-500">{timeRange}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        {item.room?.isVirtual ? (
                          <a
                            href={item.room?.meetingLink || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-purple-700 font-semibold hover:underline"
                          >
                            <Video size={13} />
                            <span>Meet Link</span>
                          </a>
                        ) : (
                          <span className="text-slate-600 font-medium">{item.room?.name || 'Assigned Room'}</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            item.status === 'scheduled'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'rescheduled'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Download a calendar invite. */}
                          <a
                            href={`http://localhost:5002/api/v1/interviews/${item._id}/calendar.ics`}
                            download
                            title="Download RFC-5545 .ics Calendar Invite"
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Download size={14} />
                          </a>

                          {/* Google Calendar Web Intent */}
                          <a
                            href={getGoogleCalendarUrl(item)}
                            target="_blank"
                            rel="noreferrer"
                            title="Add to Google Calendar"
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-indigo-600"
                          >
                            <ExternalLink size={14} />
                          </a>

                          {/* Find a replacement interviewer. */}
                          <button
                            onClick={() => setRescheduleModal(item)}
                            title="Find a replacement interviewer"
                            className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                          >
                            <RotateCcw size={12} />
                            <span>Reschedule</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reschedule dialog */}
      {rescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                  Reschedule interview
                </span>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  Reschedule Interview Panel
                </h3>
              </div>
              <button
                onClick={() => setRescheduleModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs space-y-1 text-slate-600">
              <p><strong>Candidate:</strong> {rescheduleModal.candidate?.name}</p>
              <p><strong>Current Panel:</strong> {rescheduleModal.interviewer?.name}</p>
              <p><strong>Round:</strong> {rescheduleModal.round?.name}</p>
              <p><strong>Scheduled Slot:</strong> {new Date(rescheduleModal.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(rescheduleModal.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Reason for Last-Minute Cancellation
                </label>
                <input
                  required
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Interviewer urgent cancellation"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-400"
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                We’ll look for another available interviewer with the required expertise and capacity for this time.
              </p>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setRescheduleModal(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduling}
                  className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {rescheduling ? 'Finding an interviewer...' : 'Find replacement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Schedule
