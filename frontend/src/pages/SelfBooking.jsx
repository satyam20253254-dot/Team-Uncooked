import { useState, useEffect, useCallback } from 'react'
import {
  CalendarCheck,
  Clock,
  MapPin,
  Video,
  UserCheck,
  CalendarDays,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Download,
  Calendar,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import api from '../services/api'
import { useDrive } from '../context/DriveContext'
import { useAuth } from '../context/AuthContext'

function SelfBooking() {
  const { activeDrive, rounds } = useDrive()
  const { user } = useAuth()

  const [selectedRoundId, setSelectedRoundId] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmedBooking, setConfirmedBooking] = useState(null)

  // Default to first round
  useEffect(() => {
    if (rounds.length > 0 && !selectedRoundId) {
      setSelectedRoundId(rounds[0]._id)
    }
  }, [rounds, selectedRoundId])

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
  }, [activeDrive, selectedRoundId])

  useEffect(() => {
    fetchSlots()
    fetchMyBookings()
  }, [fetchSlots, fetchMyBookings])

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
      fetchSlots()
      fetchMyBookings()
    } catch (err) {
      setError(err.message || 'Failed to book slot. It may have just been claimed by another candidate.')
    } finally {
      setBookingLoading(false)
    }
  }

  const selectedRound = rounds.find((r) => r._id === selectedRoundId)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700 uppercase">
              Interview booking
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Candidate Self-Booking Portal
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose a time that works for you from the available interview slots.
          </p>
        </div>

        <button
          onClick={fetchSlots}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Clock size={16} />
          Refresh Live Slots
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Booking Unavailable</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && confirmedBooking && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={24} className="mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold text-base">Interview Confirmed!</p>
              <p className="mt-1 text-sm text-emerald-800">
                Your slot is officially locked. Download your calendar invite below:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`http://localhost:5002/api/v1/interviews/${confirmedBooking._id || ''}/calendar.ics`}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  <Download size={14} />
                  Download .ics Calendar Invite
                </a>
              </div>
            </div>
          </div>
          <button
            onClick={() => setConfirmedBooking(null)}
            className="text-xs text-emerald-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Round Selection Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Select Interview Round
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {rounds.map((round) => (
            <button
              key={round._id}
              onClick={() => setSelectedRoundId(round._id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                selectedRoundId === round._id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Round {round.sequence}: {round.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  selectedRoundId === round._id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {round.durationMinutes}m
              </span>
            </button>
          ))}
        </div>

        {selectedRound && (
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span><strong>Duration:</strong> {selectedRound.durationMinutes} minutes</span>
            {selectedRound.requiredSkills?.length > 0 && (
              <span className="flex items-center gap-1">
                <strong>Target Skills:</strong>
                {selectedRound.requiredSkills.map((s) => (
                  <span key={s} className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">
                    {s}
                  </span>
                ))}
              </span>
            )}
            {selectedRound.description && (
              <span className="text-slate-400 italic">{selectedRound.description}</span>
            )}
          </div>
        )}
      </div>

      {/* Available Slots Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Available times</h2>
            <p className="text-xs text-slate-500">
              {availableSlots.length} slot{availableSlots.length === 1 ? '' : 's'} open matching round duration and interviewer expertise
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent" />
            <p className="mt-3 text-sm text-slate-500 font-medium">Finding available times...</p>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <CalendarCheck size={36} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">No open slots found for this round</p>
            <p className="mt-1 max-w-md mx-auto text-xs text-slate-500">
              Interviewers have either not posted availability windows for this drive yet, or all current slots have been booked. Check back soon or request your coordinator to open more windows.
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
                  className="flex flex-col justify-between rounded-xl border border-slate-200 p-4 transition hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-50/50"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        <CalendarDays size={13} />
                        {dateString}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {timeRange}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <p className="flex items-center gap-1.5">
                        <UserCheck size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate">Panel: <strong>{slot.interviewerName}</strong></span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        {slot.isVirtual ? (
                          <>
                            <Video size={14} className="text-purple-500 shrink-0" />
                            <span className="text-purple-700 font-medium truncate">Virtual Meeting Link</span>
                          </>
                        ) : (
                          <>
                            <MapPin size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate">{slot.roomName}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleBookSlot(slot)}
                    disabled={bookingLoading}
                    className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
                  >
                    <span>Confirm Slot</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* My Scheduled Interviews */}
      {myBookings.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">My Booked Interviews</h2>
          <p className="text-xs text-slate-500">Your confirmed slots across placement rounds</p>

          <div className="mt-4 divide-y divide-slate-100">
            {myBookings.map((interview) => (
              <div key={interview._id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-bold text-slate-900">{interview.round?.name || 'Interview'}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(interview.startTime).toLocaleDateString()} at{' '}
                    {new Date(interview.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with{' '}
                    <strong>{interview.interviewer?.name || 'Panel'}</strong> · Venue:{' '}
                    {interview.room?.name || 'Assigned'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`http://localhost:5002/api/v1/interviews/${interview._id}/calendar.ics`}
                    download
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
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
