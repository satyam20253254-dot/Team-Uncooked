import { useMemo, useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Search,
  MapPin,
  Users,
  DoorOpen,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Video,
  Trash2,
  Sparkles,
} from 'lucide-react'
import api from '../services/api'
import { useDrive } from '../context/DriveContext'
import { useAuth } from '../context/AuthContext'

function Availability() {
  const { activeDrive } = useDrive()
  const { role, user } = useAuth()

  const [rooms, setRooms] = useState([])
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
    ownerType: 'interviewer',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    selectedRoomId: '',
  })

  const fetchData = useCallback(async () => {
    if (!activeDrive?._id) return
    setLoading(true)
    setError('')
    try {
      const [roomsRes, availRes] = await Promise.all([
        api.get(`/drives/${activeDrive._id}/rooms`),
        api.get(`/drives/${activeDrive._id}/availabilities`),
      ])

      setRooms(roomsRes?.data || [])
      setAvailabilities(availRes?.data?.availabilities || [])
    } catch (err) {
      console.warn('Could not load rooms or availability:', err)
    } finally {
      setLoading(false)
    }
  }, [activeDrive])

  useEffect(() => {
    fetchData()
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
        meetingLink: roomForm.meetingLink?.trim() || '',
      })

      setSuccess(`Room "${roomForm.name}" created successfully!`)
      setShowRoomModal(false)
      setRoomForm({ name: '', location: '', capacity: 4, isVirtual: false, meetingLink: '' })
      fetchData()
    } catch (err) {
      setError(err.message || 'Failed to create interview room.')
    }
  }

  async function handleDeleteRoom(roomId, roomName) {
    if (!activeDrive?._id) return
    const confirmed = window.confirm(`Delete room "${roomName}"?`)
    if (!confirmed) return

    try {
      await api.delete(`/drives/${activeDrive._id}/rooms/${roomId}`)
      fetchData()
    } catch (err) {
      alert(err.message || 'Cannot delete room with active scheduled interviews.')
    }
  }

  async function handleAddAvailability(e) {
    e.preventDefault()
    if (!activeDrive?._id) return
    setError('')
    setSuccess('')
    try {
      const startDateTime = new Date(`${availForm.date}T${availForm.startTime}:00`)
      const endDateTime = new Date(`${availForm.date}T${availForm.endTime}:00`)

      const payload = {
        ownerType: availForm.ownerType,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      }

      if (availForm.ownerType === 'room') {
        if (!availForm.selectedRoomId) throw new Error('Please select a room.')
        payload.ownerId = availForm.selectedRoomId
      }

      await api.post(`/drives/${activeDrive._id}/availabilities`, payload)
      setSuccess('Availability added.')
      setShowAvailModal(false)
      fetchData()
    } catch (err) {
      setError(err.message || 'Failed to post availability window.')
    }
  }

  async function handleDeleteAvail(availId) {
    if (!activeDrive?._id) return
    try {
      await api.delete(`/drives/${activeDrive._id}/availabilities/${availId}`)
      fetchData()
    } catch (err) {
      alert(err.message || 'Failed to delete availability window.')
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
          <h1 className="text-3xl font-bold text-slate-900">
            Rooms & Availability Windows
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Add interview rooms and set the times when candidates, interviewers, and rooms are available.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAvailModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
          >
            <Clock size={16} />
            Post Availability Window
          </button>

          <button
            onClick={() => setShowRoomModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-100 hover:bg-indigo-700"
          >
            <Plus size={16} />
            Add Room
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard title="Configured Rooms" value={rooms.length} icon={<DoorOpen size={18} />} />
        <SummaryCard
          title="Virtual Meet Links"
          value={rooms.filter((r) => r.isVirtual).length}
          icon={<Video size={18} />}
        />
        <SummaryCard
          title="Active Availability Windows"
          value={availabilities.length}
          icon={<CalendarDays size={18} />}
        />
      </div>

      {/* Rooms Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Configured Interview Venues</h2>
            <p className="text-xs text-slate-500">
              Rooms and virtual links available for candidate panels
            </p>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rooms..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-400 sm:w-60"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading rooms...</div>
          ) : filteredRooms.length === 0 ? (
            <div className="py-12 text-center">
              <DoorOpen size={36} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">No rooms configured</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Click <strong>"Add Room"</strong> to add physical venues or virtual meeting rooms.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-3">Room / Venue</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Capacity</th>
                  <th className="px-3 py-3">Location / Link</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.map((room) => (
                  <tr key={room._id} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-3.5 font-bold text-slate-900">{room.name}</td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          room.isVirtual
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {room.isVirtual ? 'Virtual Meet' : 'Physical'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-slate-600">{room.capacity} panelist/seats</td>
                    <td className="px-3 py-3.5">
                      {room.isVirtual ? (
                        <a
                          href={room.meetingLink || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-700 font-semibold hover:underline flex items-center gap-1"
                        >
                          <Video size={13} />
                          <span className="max-w-[200px] truncate">{room.meetingLink || 'Virtual Meeting'}</span>
                        </a>
                      ) : (
                        <span className="text-slate-600 flex items-center gap-1">
                          <MapPin size={13} className="text-slate-400" />
                          {room.location || 'Campus'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteRoom(room._id, room.name)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
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
      </div>

      {/* Availability Windows Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Active Availability Windows</h2>
          <p className="text-xs text-slate-500">
            Availability windows used when finding and booking interview times
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          {availabilities.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No availability windows registered. Click <strong>"Post Availability Window"</strong> to define time blocks.
            </p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-3">Owner Type</th>
                  <th className="px-3 py-3">Resource / Panel</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Time Window</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {availabilities.map((av) => {
                  const s = new Date(av.startTime)
                  const e = new Date(av.endTime)

                  return (
                    <tr key={av._id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                          {av.ownerType}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900">
                        {av.ownerId?.name || (av.ownerType === 'room' ? 'Room Venue' : 'Panel / Candidate')}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{s.toLocaleDateString()}</td>
                      <td className="px-3 py-3 text-slate-800 font-medium">
                        {s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => handleDeleteAvail(av._id)}
                          className="rounded-lg p-1 text-slate-400 hover:text-rose-600"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Add Interview Venue</h2>
              <button onClick={() => setShowRoomModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700 uppercase">Room Name</label>
                <input
                  required
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder="e.g. Conference Room Charlie or Google Meet #1"
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="isVirtual"
                  checked={roomForm.isVirtual}
                  onChange={(e) => setRoomForm({ ...roomForm, isVirtual: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="isVirtual" className="font-semibold text-slate-700">
                  This is an Online / Virtual Meeting Room
                </label>
              </div>

              {roomForm.isVirtual ? (
                <div>
                  <label className="mb-1 block font-bold text-slate-700 uppercase">Meeting Link</label>
                  <input
                    required
                    value={roomForm.meetingLink}
                    onChange={(e) => setRoomForm({ ...roomForm, meetingLink: e.target.value })}
                    placeholder="https://meet.google.com/xyz-abc-qrs"
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-400"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700 uppercase">Physical Location</label>
                    <input
                      required
                      value={roomForm.location}
                      onChange={(e) => setRoomForm({ ...roomForm, location: e.target.value })}
                      placeholder="e.g. Academic Block, 3rd Floor"
                      className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700 uppercase">Capacity</label>
                    <input
                      type="number"
                      min="1"
                      value={roomForm.capacity}
                      onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Post Availability Window</h2>
                <p className="text-xs text-slate-500">Choose who or what this availability applies to, then set a time.</p>
              </div>
              <button onClick={() => setShowAvailModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddAvailability} className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700 uppercase">Resource Type</label>
                <select
                  value={availForm.ownerType}
                  onChange={(e) => setAvailForm({ ...availForm, ownerType: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 outline-none focus:border-indigo-400"
                >
                  <option value="interviewer">Interviewer Panelist</option>
                  <option value="room">Room Venue</option>
                  <option value="candidate">Candidate</option>
                </select>
              </div>

              {availForm.ownerType === 'room' && (
                <div>
                  <label className="mb-1 block font-bold text-slate-700 uppercase">Select Room</label>
                  <select
                    required
                    value={availForm.selectedRoomId}
                    onChange={(e) => setAvailForm({ ...availForm, selectedRoomId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 outline-none focus:border-indigo-400"
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

              <div>
                <label className="mb-1 block font-bold text-slate-700 uppercase">Date</label>
                <input
                  required
                  type="date"
                  value={availForm.date}
                  onChange={(e) => setAvailForm({ ...availForm, date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700 uppercase">Start Time</label>
                  <input
                    required
                    type="time"
                    value={availForm.startTime}
                    onChange={(e) => setAvailForm({ ...availForm, startTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700 uppercase">End Time</label>
                  <input
                    required
                    type="time"
                    value={availForm.endTime}
                    onChange={(e) => setAvailForm({ ...availForm, endTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAvailModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700"
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-slate-400">{title}</p>
        <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-black text-slate-900">{value}</p>
    </div>
  )
}

export default Availability
