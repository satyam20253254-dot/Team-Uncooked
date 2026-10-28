import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  CalendarCheck,
  Clock,
  MapPin,
  Video,
  UserCheck,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Download,
  ChevronRight,
  Lock,
  Sparkles,
  Trophy,
  ArrowRight,
} from 'lucide-react'
import api, { API_BASE_URL } from '../services/api'
import { useDrive } from '../context/DriveContext'
import { useAuth } from '../context/AuthContext'

function SelfBooking() {
  const { role } = useAuth()
  const { activeDrive, rounds } = useDrive()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryRoundId = searchParams.get('roundId')

  const [selectedRoundId, setSelectedRoundId] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [pipelineData, setPipelineData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pipelineLoading, setPipelineLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmedBooking, setConfirmedBooking] = useState(null)

  // Fetch candidate's pipeline status
  const fetchPipelineStatus = useCallback(async () => {
    if (!activeDrive?._id) return
    setPipelineLoading(true)
    try {
      const res = await api.get(`/drives/${activeDrive._id}/my-pipeline`)
      const data = res?.data || null
      setPipelineData(data)

      // Auto-select the round: query param first, then active unlocked round to book, then first round
      if (queryRoundId && rounds.some((r) => r._id === queryRoundId)) {
        setSelectedRoundId(queryRoundId)
      } else if (data?.nextRoundToBook?._id) {
        setSelectedRoundId(data.nextRoundToBook._id)
      } else if (rounds.length > 0 && !selectedRoundId) {
        setSelectedRoundId(rounds[0]._id)
      }
    } catch (err) {
      console.warn('Could not fetch pipeline status:', err)
      if (rounds.length > 0 && !selectedRoundId) {
        setSelectedRoundId(queryRoundId || rounds[0]._id)
      }
    } finally {
      setPipelineLoading(false)
    }
  }, [activeDrive, queryRoundId, rounds, selectedRoundId])

  // Fetch my interviews
  const fetchMyBookings = useCallback(async () => {
    try {
      const res = await api.get('/my-interviews')
      setMyBookings(res?.data?.interviews || [])
    } catch (err) {
      console.warn('Could not load my bookings:', err)
    }
  }, [])

  // Fetch available slots for the selected round
  const fetchSlots = useCallback(async () => {
    if (!activeDrive?._id || !selectedRoundId) return

    // Find enriched round status if available
    const enriched = pipelineData?.rounds?.find((r) => r._id === selectedRoundId)
    if (enriched?.status === 'completed' || enriched?.status === 'locked') {
      setAvailableSlots([])
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/drives/${activeDrive._id}/rounds/${selectedRoundId}/available-slots`)
      setAvailableSlots(res?.data?.availableSlots || [])
    } catch (err) {
      setError(err.message || 'Failed to fetch open slots for this round.')
      setAvailableSlots([])
    } finally {
      setLoading(false)
    }
  }, [activeDrive, selectedRoundId, pipelineData])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPipelineStatus()
      fetchMyBookings()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchPipelineStatus, fetchMyBookings])

  useEffect(() => {
    if (selectedRoundId) {
      const timer = setTimeout(fetchSlots, 0)
      return () => clearTimeout(timer)
    }
  }, [selectedRoundId, fetchSlots])

  const handleBookSlot = async (slot) => {
    if (!activeDrive?._id || !selectedRoundId) return
    setBookingLoading(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        interviewerId: slot.interviewerId,
        roomId: slot.roomId,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }

      const res = await api.post(
        `/drives/${activeDrive._id}/rounds/${selectedRoundId}/self-book`,
        payload
      )

      setSuccess('Slot reserved successfully!')
      setConfirmedBooking(res?.data || slot)
      fetchPipelineStatus()
      fetchMyBookings()
    } catch (err) {
      setError(err.message || 'Failed to book slot. It may have just been claimed by another candidate.')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleSelectRound = (roundId) => {
    setSelectedRoundId(roundId)
    setSearchParams({ roundId })
    setError('')
  }

  const selectedRound = rounds.find((r) => r._id === selectedRoundId)
  const selectedEnriched = pipelineData?.rounds?.find((r) => r._id === selectedRoundId)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase border border-emerald-200 dark:border-emerald-800">
              Candidate Self-Booking Portal
            </span>
            {pipelineData?.currentRoundName && (
              <span className="rounded-full bg-amber-50 dark:bg-amber-950/70 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Current Stage: {pipelineData.currentRoundName}
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Interview Slot Self-Booking
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Select your eligible placement round and reserve an available slot matching interviewer expertise and venue availability.
          </p>
        </div>

        <button
          onClick={() => {
            fetchPipelineStatus()
            fetchSlots()
          }}
          disabled={loading || pipelineLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition"
        >
          <Clock size={16} />
          Refresh Live Slots
        </button>
      </div>

      {/* Coordinator Advisory */}
      {(role === 'coordinator' || role === 'admin') && (
        <div className="flex flex-col gap-3 rounded-2xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/80 dark:bg-sky-950/40 p-5 text-sky-950 dark:text-sky-200 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <div className="flex items-start gap-3">
            <Sparkles size={20} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
            <div>
              <p className="font-bold text-sm">Coordinator View: Candidate Self-Booking Portal</p>
              <p className="mt-0.5 text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
                You are previewing the portal that candidates use to pick interview slots for their unlocked rounds. To run automated scheduling or manage candidate allocations, visit the Schedule Engine.
              </p>
            </div>
          </div>
          <Link
            to="/schedule"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-500 transition shadow-sm"
          >
            Open Schedule Engine &rarr;
          </Link>
        </div>
      )}

      {/* Disqualified Alert */}
      {pipelineData?.isDisqualified && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/50 p-5 text-sm text-rose-800 dark:text-rose-300">
          <AlertCircle size={22} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div>
            <p className="font-bold text-base">Placement Drive Pipeline Update</p>
            <p className="mt-1 leading-relaxed">
              You were eliminated at the{' '}
              <strong>{pipelineData.eliminatedAtRound || 'previous'}</strong> round. No further interview slots can be booked for this drive.
            </p>
          </div>
        </div>
      )}

      {/* Completed All Rounds Trophy Banner */}
      {pipelineData?.isCompletedAll && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/50 p-6 text-emerald-950 dark:text-emerald-200 shadow-sm">
          <div className="flex items-start gap-3.5">
            <Trophy size={28} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-bold text-lg">Congratulations! All Rounds Cleared</p>
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                You have successfully passed every evaluation round in this placement drive! The recruitment coordinator will reach out with final offer details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/50 p-4 text-sm text-red-700 dark:text-red-300">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Booking Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && confirmedBooking && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/50 p-5 text-emerald-900 dark:text-emerald-200 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={24} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-bold text-base">Interview Confirmed!</p>
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
                Your slot is officially locked. Download your RFC-5545 calendar invite below:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`${API_BASE_URL}/interviews/${confirmedBooking._id || ''}/calendar.ics`}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm"
                >
                  <Download size={14} />
                  Download .ics Calendar Invite
                </a>
              </div>
            </div>
          </div>
          <button
            onClick={() => setConfirmedBooking(null)}
            className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Round Selection Tabs with Live Progression Badges */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Interview Rounds & Progression
          </label>
          {pipelineData?.lastPassedRound && (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Last Cleared Round: <strong>{pipelineData.lastPassedRound}</strong>
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2.5">
          {rounds.map((round) => {
            const enriched = pipelineData?.rounds?.find((r) => r._id === round._id)
            const isSelected = selectedRoundId === round._id
            const status = enriched?.status || (round.sequence === 1 ? 'action_required' : 'locked')

            return (
              <button
                key={round._id}
                onClick={() => handleSelectRound(round._id)}
                className={`relative flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-bold transition shadow-sm ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white ring-2 ring-emerald-500'
                    : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>Round {round.sequence}: {round.name}</span>

                {/* Status Badge */}
                {status === 'completed' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 size={11} />
                    Cleared
                  </span>
                )}
                {status === 'scheduled' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-950/80 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                    <CalendarCheck size={11} />
                    Booked
                  </span>
                )}
                {status === 'action_required' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950 animate-pulse">
                    <Sparkles size={11} />
                    Ready to Book
                  </span>
                )}
                {status === 'locked' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    <Lock size={10} />
                    Locked
                  </span>
                )}

                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {round.durationMinutes}m
                </span>
              </button>
            )
          })}
        </div>

        {selectedRound && (
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400">
            <span><strong className="text-slate-700 dark:text-slate-300">Round:</strong> {selectedRound.name} (Round {selectedRound.sequence})</span>
            <span><strong className="text-slate-700 dark:text-slate-300">Duration:</strong> {selectedRound.durationMinutes} minutes</span>
            {selectedRound.requiredSkills?.length > 0 && (
              <span className="flex items-center gap-1">
                <strong className="text-slate-700 dark:text-slate-300">Required Skills:</strong>
                {selectedRound.requiredSkills.map((s) => (
                  <span key={s} className="rounded bg-amber-50 dark:bg-amber-950/70 border border-amber-200/60 dark:border-amber-800/60 px-1.5 py-0.5 text-amber-700 dark:text-amber-300 font-medium">
                    {s}
                  </span>
                ))}
              </span>
            )}
            {selectedRound.description && (
              <span className="text-slate-400 dark:text-slate-500 italic">{selectedRound.description}</span>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Content Based on Selected Round Pipeline Status */}
      {selectedEnriched?.status === 'completed' ? (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-slate-900 p-6 shadow-sm transition">
          <div className="flex items-start gap-3.5">
            <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="rounded bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase border border-emerald-100 dark:border-emerald-800/60">
                Round {selectedRound?.sequence} Complete
              </span>
              <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                You have passed the {selectedRound?.name} round!
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Your performance in this interview round was evaluated and marked successfully cleared. You are not required to book this round again.
              </p>

              {pipelineData?.nextRoundToBook ? (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleSelectRound(pipelineData.nextRoundToBook._id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-500 active:scale-95"
                  >
                    <span>Proceed to Book {pipelineData.nextRoundToBook.name} (Round {pipelineData.nextRoundToBook.sequence})</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  All rounds of this recruitment drive have been completed!
                </p>
              )}
            </div>
          </div>
        </div>
      ) : selectedEnriched?.status === 'scheduled' ? (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-white dark:bg-slate-900 p-6 shadow-sm transition">
          <div className="flex items-start gap-3.5">
            <CalendarCheck size={32} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="rounded bg-blue-50 dark:bg-blue-950/70 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase border border-blue-100 dark:border-blue-800/60">
                Slot Confirmed
              </span>
              <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                You already have a confirmed booking for {selectedRound?.name}
              </h2>
              {selectedEnriched.scheduledInterview && (
                <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-4 text-xs text-slate-700 dark:text-slate-200 space-y-1">
                  <p>
                    <strong className="text-slate-900 dark:text-slate-100">Scheduled Time:</strong>{' '}
                    {new Date(selectedEnriched.scheduledInterview.startTime).toLocaleDateString()} at{' '}
                    {new Date(selectedEnriched.scheduledInterview.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {new Date(selectedEnriched.scheduledInterview.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p>
                    <strong className="text-slate-900 dark:text-slate-100">Panelist:</strong> {selectedEnriched.scheduledInterview.interviewer?.name || 'Assigned Panel'}
                  </p>
                  <p>
                    <strong className="text-slate-900 dark:text-slate-100">Venue / Link:</strong>{' '}
                    {selectedEnriched.scheduledInterview.room?.isVirtual ? (
                      <a
                        href={selectedEnriched.scheduledInterview.room?.meetingLink || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-600 dark:text-teal-400 font-semibold underline"
                      >
                        Join Virtual Meeting
                      </a>
                    ) : (
                      selectedEnriched.scheduledInterview.room?.name || 'Campus Room'
                    )}
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`${API_BASE_URL}/interviews/${selectedEnriched.scheduledInterview?._id}/calendar.ics`}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Download size={14} />
                  Download .ics Invite
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : selectedEnriched?.status === 'locked' ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition">
          <div className="flex items-start gap-3.5">
            <Lock size={32} className="text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                Stage Locked
              </span>
              <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                {selectedRound?.name} is not unlocked yet
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                You must first complete and pass the earlier round(s) in sequence before booking slots for this stage.
              </p>
              {pipelineData?.nextRoundToBook && (
                <button
                  onClick={() => handleSelectRound(pipelineData.nextRoundToBook._id)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:hover:bg-emerald-500 transition"
                >
                  <span>Go to Active Stage: {pipelineData.nextRoundToBook.name}</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Available Slots Grid (Ready to Book) */
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm transition">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Available Times for {selectedRound?.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {availableSlots.length} slot{availableSlots.length === 1 ? '' : 's'} matching interviewer availability, room status, and required skill constraints
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-r-transparent" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-medium">Finding available slots...</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 py-12 text-center p-4">
              <CalendarCheck size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">No open slots currently found for {selectedRound?.name}</p>
              <p className="mt-1 max-w-md mx-auto text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Interviewers with matching skills ({selectedRound?.requiredSkills?.join(', ') || 'General'}) have either not submitted availability windows yet, or all current slots have been filled. Check back shortly or contact the placement coordinator.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {availableSlots.map((slot, index) => {
                const start = new Date(slot.startTime)
                const end = new Date(slot.endTime)

                const dateString = start.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })

                const timeRange = `${start.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })} - ${end.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`

                return (
                  <div
                    key={index}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 transition hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800/60">
                          <CalendarDays size={13} />
                          {dateString}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {timeRange}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <p className="flex items-center gap-1.5">
                          <UserCheck size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="truncate">Panel: <strong className="text-slate-800 dark:text-slate-200">{slot.interviewerName}</strong></span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          {slot.isVirtual ? (
                            <>
                              <Video size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
                              <span className="text-teal-600 dark:text-teal-400 font-medium truncate">Virtual Meeting</span>
                            </>
                          ) : (
                            <>
                              <MapPin size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                              <span className="truncate text-slate-700 dark:text-slate-300">Venue: {slot.roomName}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBookSlot(slot)}
                      disabled={bookingLoading}
                      className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50"
                    >
                      <span>Reserve Slot</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* My Confirmed Interviews Across Placement Rounds */}
      {myBookings.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition">
          <h2 className="font-bold text-slate-900 dark:text-slate-100">My Confirmed Interviews</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Your scheduled and completed appointments across rounds</p>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {myBookings.map((interview) => (
              <div key={interview._id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{interview.round?.name || 'Interview'}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        interview.status === 'completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                      }`}
                    >
                      {interview.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {new Date(interview.startTime).toLocaleDateString()} at{' '}
                    {new Date(interview.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with{' '}
                    <strong className="text-slate-700 dark:text-slate-300">{interview.interviewer?.name || 'Panel'}</strong> · Venue:{' '}
                    <span className="text-slate-700 dark:text-slate-300">{interview.room?.name || 'Assigned'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`${API_BASE_URL}/interviews/${interview._id}/calendar.ics`}
                    download
                    className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <Download size={13} />
                    .ics Invite
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SelfBooking
