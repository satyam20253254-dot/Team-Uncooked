import { useMemo, useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Search,
  MapPin,
  DoorOpen,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Video,
  Trash2,
} from 'lucide-react'
import api from '../services/api'
import { useDrive } from '../context/DriveContext'
import { useAuth } from '../context/AuthContext'

function getTomorrowDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function Availability() {
  const { activeDrive } = useDrive()
  const { role, user } = useAuth()
  const userId = user?._id

  const [rooms, setRooms] = useState([])
  const [candidateParticipants, setCandidateParticipants] = useState([])
  const [interviewerParticipants, setInterviewerParticipants] = useState([])
  const [availabilities, setAvailabilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [showAvailModal, setShowAvailModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Add Room form state
  const [roomForm, setRoomForm] = useState({
    name: '',
    location: '',
    capacity: 4,
    isVirtual: false,
    meetingLink: '',
  })

  // Add Availability form state
  const [availForm, setAvailForm] = useState({
    ownerType: role === 'candidate' ? 'candidate' : role === 'coordinator' || role === 'admin' ? 'room' : 'interviewer',
    date: getTomorrowDate(),
    startTime: '09:00',
    endTime: '17:00',
    selectedRoomId: '',
    selectedParticipantId: '',
  })

  const fetchData = useCallback(async () => {
    if (!activeDrive?._id) return
    setLoading(true)
    setError('')
    try {
      const canManageRooms = role === 'coordinator' || role === 'admin'
      const availabilityQuery = canManageRooms ? '' : `?ownerType=${role}&ownerId=${userId}`
      const [roomsRes, availRes, candidatesRes, interviewersRes] = await Promise.all([
        canManageRooms ? api.get(`/drives/${activeDrive._id}/rooms`) : Promise.resolve({ data: [] }),
        api.get(`/drives/${activeDrive._id}/availabilities${availabilityQuery}`),
        canManageRooms ? api.get(`/drives/${activeDrive._id}/participants?role=candidate`) : Promise.resolve({ data: { participants: [] } }),
        canManageRooms ? api.get(`/drives/${activeDrive._id}/participants?role=interviewer`) : Promise.resolve({ data: { participants: [] } }),
      ])

      setRooms(roomsRes?.data || [])
      setAvailabilities(availRes?.data?.availabilities || [])
      setCandidateParticipants(candidatesRes?.data?.participants || [])
      setInterviewerParticipants(interviewersRes?.data?.participants || [])
    } catch (err) {
      console.warn('Could not load rooms or availability:', err)
    } finally {
      setLoading(false)
    }
  }, [activeDrive, role, userId])

  useEffect(() => {
    const timer = setTimeout(fetchData, 0)
    return () => clearTimeout(timer)
  }, [fetchData])

  async function handleAddRoom(e) {
    e.preventDefault()
    if (!activeDrive?._id) return
    setError('')
    setSuccess('')
    try {
      await api.post(`/drives/${activeDrive._id}/rooms`, {
        name: roomForm.name.trim(),
        location: roomForm.location.trim(),
        capacity: Number(roomForm.capacity),
        isVirtual: Boolean(roomForm.isVirtual),
        meetingLink: roomForm.isVirtual ? roomForm.meetingLink.trim() : null,
      })
      setSuccess(`Venue ${roomForm.name} added successfully!`)
      setRoomForm({ name: '', location: '', capacity: 4, isVirtual: false, meetingLink: '' })
      setShowRoomModal(false)
      fetchData()
    } catch (err) {
      setError(err.message || 'Failed to add venue.')
    }
  }

  async function handleDeleteRoom(roomId, roomName) {
    if (!activeDrive?._id) return
    const confirmed = window.confirm(`Delete venue "${roomName}"? Existing interviews may be impacted.`)
    if (!confirmed) return
    try {
      await api.delete(`/drives/${activeDrive._id}/rooms/${roomId}`)
      fetchData()
    } catch (err) {
      alert(err.message || 'Cannot delete room with assigned interviews.')
    }
  }

  async function handleAddAvailability(e) {
    e.preventDefault()
    if (!activeDrive?._id) return
    setError('')
    setSuccess('')

    let resolvedOwnerId
    if (role === 'candidate' || role === 'interviewer') {
      resolvedOwnerId = userId
    } else {
      resolvedOwnerId = availForm.ownerType === 'room'
        ? availForm.selectedRoomId
        : availForm.selectedParticipantId
    }

    if (!resolvedOwnerId) {
      setError('Please select a valid resource owner for this availability window.')
      return
    }

    try {
      const [startH, startM] = availForm.startTime.split(':')
      const [endH, endM] = availForm.endTime.split(':')

      const start = new Date(`${availForm.date}T${startH}:${startM}:00`)
      const end = new Date(`${availForm.date}T${endH}:${endM}:00`)

      if (end <= start) {
        setError('End time must be after start time.')
        return
      }

      await api.post(`/drives/${activeDrive._id}/availabilities`, {
        ownerType: availForm.ownerType,
        ownerId: resolvedOwnerId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      setSuccess('Availability window published successfully!')
      setShowAvailModal(false)
      fetchData()
    } catch (err) {
      setError(err.message || 'Failed to save availability window.')
    }
  }

  async function handleDeleteAvail(availId) {
    if (!activeDrive?._id) return
    try {
      await api.delete(`/drives/${activeDrive._id}/availabilities/${availId}`)
      fetchData()
    } catch (err) {
      alert(err.message || 'Could not delete availability window.')
    }
  }

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const query = search.toLowerCase()
      return room.name.toLowerCase().includes(query) || (room.location || '').toLowerCase().includes(query)
    })
  }, [rooms, search])

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {role === 'candidate' ? 'My availability' : role === 'interviewer' ? 'My availability' : 'Rooms & Availability Windows'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {role === 'candidate' || role === 'interviewer' ? 'Share the times you can attend so the coordinator can find a feasible interview slot.' : 'Add interview rooms and manage room availability. Candidates and interviewers submit their own availability.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAvailModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/70 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
          >
            <Clock size={16} />
            Post Availability Window
          </button>

          {(role === 'coordinator' || role === 'admin') && <button
            onClick={() => setShowRoomModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition active:scale-95"
          >
            <Plus size={16} />
            Add Room
          </button>}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/50 p-4 text-xs font-medium text-red-700 dark:text-red-300">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/50 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className={`grid grid-cols-1 gap-4 ${role === 'coordinator' || role === 'admin' ? 'sm:grid-cols-3' : 'sm:grid-cols-1'}`}>
        {(role === 'coordinator' || role === 'admin') && <>
        <SummaryCard title="Configured Rooms" value={rooms.length} icon={<DoorOpen size={18} />} />
        <SummaryCard
          title="Virtual Meet Links"
          value={rooms.filter((r) => r.isVirtual).length}
          icon={<Video size={18} />}
        />
        </>}
        <SummaryCard
          title="Active Availability Windows"
          value={availabilities.length}
          icon={<CalendarDays size={18} />}
        />
      </div>

      {/* Rooms Table */}
      {(role === 'coordinator' || role === 'admin') && <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm transition">
        <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Configured Interview Venues</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rooms and virtual links available for candidate panels
            </p>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rooms..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-500 sm:w-60"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">Loading rooms...</div>
          ) : filteredRooms.length === 0 ? (
            <div className="py-12 text-center">
              <DoorOpen size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">No rooms configured</p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                Click <strong>"Add Room"</strong> to add physical venues or virtual meeting rooms.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-3">Room / Venue</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Capacity</th>
                  <th className="px-3 py-3">Location / Link</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRooms.map((room) => (
                  <tr key={room._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <td className="px-3 py-3.5 font-bold text-slate-900 dark:text-slate-100">{room.name}</td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          room.isVirtual
                            ? 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60'
                            : 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                        }`}
                      >
                        {room.isVirtual ? 'Virtual Meet' : 'Physical'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-slate-600 dark:text-slate-300">{room.capacity} panelist/seats</td>
                    <td className="px-3 py-3.5">
                      {room.isVirtual ? (
                        <a
                          href={room.meetingLink || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-600 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <Video size={13} />
                          <span className="max-w-[200px] truncate">{room.meetingLink || 'Virtual Meeting'}</span>
                        </a>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <MapPin size={13} className="text-slate-400 dark:text-slate-500" />
                          {room.location || 'Campus'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteRoom(room._id, room.name)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 transition"
                        title="Delete room"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>}

      {/* Availability Windows Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm transition">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="font-bold text-slate-900 dark:text-slate-100">Active Availability Windows</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Availability windows used when finding and booking interview times
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          {availabilities.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              No availability windows registered. Click <strong>"Post Availability Window"</strong> to define time blocks.
            </p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-3">Owner Type</th>
                  <th className="px-3 py-3">Resource / Panel</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Time Window</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {availabilities.map((av) => {
                  const s = new Date(av.startTime)
                  const e = new Date(av.endTime)

                  return (
                    <tr key={av._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                      <td className="px-3 py-3">
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                          {av.ownerType}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {av.ownerId?.name || (av.ownerType === 'room' ? 'Room Venue' : 'Panel / Candidate')}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{s.toLocaleDateString()}</td>
                      <td className="px-3 py-3 text-slate-800 dark:text-slate-200 font-medium">
                        {s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => handleDeleteAvail(av._id)}
                          className="rounded-lg p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                          title="Delete window"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add Interview Venue</h2>
              <button onClick={() => setShowRoomModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Room Name</label>
                <input
                  required
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder="e.g. Conference Room Charlie or Google Meet #1"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="isVirtual"
                  checked={roomForm.isVirtual}
                  onChange={(e) => setRoomForm({ ...roomForm, isVirtual: e.target.checked })}
                  className="rounded text-amber-600"
                />
                <label htmlFor="isVirtual" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  This is an Online / Virtual Meeting Room
                </label>
              </div>

              {roomForm.isVirtual ? (
                <div>
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Meeting Link</label>
                  <input
                    required
                    value={roomForm.meetingLink}
                    onChange={(e) => setRoomForm({ ...roomForm, meetingLink: e.target.value })}
                    placeholder="https://meet.google.com/xyz-abc-qrs"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Physical Location</label>
                    <input
                      required
                      value={roomForm.location}
                      onChange={(e) => setRoomForm({ ...roomForm, location: e.target.value })}
                      placeholder="e.g. Academic Block, 3rd Floor"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Capacity</label>
                    <input
                      type="number"
                      min="1"
                      value={roomForm.capacity}
                      onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                >
                  Save Venue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Availability Modal */}
      {showAvailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Post Availability Window</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Choose who or what this availability applies to, then set a time.</p>
              </div>
              <button onClick={() => setShowAvailModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddAvailability} className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Resource Type</label>
                {role === 'coordinator' || role === 'admin' ? <select
                  value={availForm.ownerType}
                  onChange={(e) => setAvailForm({ ...availForm, ownerType: e.target.value, selectedRoomId: '', selectedParticipantId: '' })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                >
                  <option value="candidate">Candidate</option>
                  <option value="interviewer">Interviewer</option>
                  <option value="room">Room Venue</option>
                </select> : <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-semibold capitalize text-slate-700 dark:text-slate-200">My {role} availability</div>}
              </div>

              {availForm.ownerType === 'room' && (
                <div>
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Select Room</label>
                  <select
                    required
                    value={availForm.selectedRoomId}
                    onChange={(e) => setAvailForm({ ...availForm, selectedRoomId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                  >
                    <option value="">Select a room</option>
                    {rooms.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name} ({r.isVirtual ? 'Virtual' : r.location})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(role === 'coordinator' || role === 'admin') && availForm.ownerType !== 'room' && (
                <div>
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Select {availForm.ownerType}</label>
                  <select required value={availForm.selectedParticipantId} onChange={(e) => setAvailForm({ ...availForm, selectedParticipantId: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400 dark:focus:border-amber-500">
                    <option value="">Choose an active {availForm.ownerType}</option>
                    {(availForm.ownerType === 'candidate' ? candidateParticipants : interviewerParticipants).filter((participant) => participant.status === 'active' && participant.userId?._id).map((participant) => <option key={participant._id} value={participant.userId._id}>{participant.userId.name} · {participant.userId.email}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Date</label>
                <input
                  required
                  type="date"
                  value={availForm.date}
                  onChange={(e) => setAvailForm({ ...availForm, date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Start Time</label>
                  <input
                    required
                    type="time"
                    value={availForm.startTime}
                    onChange={(e) => setAvailForm({ ...availForm, startTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">End Time</label>
                  <input
                    required
                    type="time"
                    value={availForm.endTime}
                    onChange={(e) => setAvailForm({ ...availForm, endTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAvailModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                >
                  Post Window
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ title, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">{title}</p>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200/60 dark:border-amber-800/60 p-2 text-amber-600 dark:text-amber-400">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  )
}

export default Availability
