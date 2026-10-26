import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Search,
  Plus,
  Mail,
  GraduationCap,
  X,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles,
} from 'lucide-react'
import api from '../services/api'
import { useDrive } from '../context/DriveContext'
import { useAuth } from '../context/AuthContext'

function Candidates() {
  const { activeDrive, rounds } = useDrive()
  const { role } = useAuth()

  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'Computer Science',
    skills: 'DSA, React, Python',
  })

  const fetchCandidates = useCallback(async () => {
    if (!activeDrive?._id) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/drives/${activeDrive._id}/participants?role=candidate`)
      setCandidates(res?.data?.participants || [])
    } catch (err) {
      console.warn('Could not load candidates:', err)
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }, [activeDrive])

  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!activeDrive?._id) return
    setError('')
    setSuccess('')

    try {
      // 1. Ensure user account exists
      let userId
      try {
        const userRes = await api.post('/auth/register', {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: 'Password123!',
          role: 'candidate',
        })
        userId = userRes?.data?._id
      } catch (userErr) {
        // If email already registered, search for user
        const searchRes = await api.get(`/auth/users?search=${encodeURIComponent(formData.email.trim())}`)
        const existing = searchRes?.data?.users?.[0]
        if (existing) {
          userId = existing._id
        } else {
          throw new Error('Email already registered but could not retrieve account.')
        }
      }

      // 2. Add as Drive Participant
      const parsedSkills = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      // By default, candidates start eligible for Round 1
      const initialRoundIds = rounds.length > 0 ? [rounds[0]._id] : []

      await api.post(`/drives/${activeDrive._id}/participants`, {
        userId,
        role: 'candidate',
        eligibleRoundIds: initialRoundIds,
        metadata: {
          department: formData.department,
          skills: parsedSkills,
          registeredAt: new Date().toISOString(),
        },
      })

      setSuccess(`Candidate ${formData.name} successfully registered in this drive!`)
      setFormData({ name: '', email: '', department: 'Computer Science', skills: 'DSA, React, Python' })
      setShowForm(false)
      fetchCandidates()
    } catch (err) {
      setError(err.message || 'Failed to add candidate.')
    }
  }

  async function handleStatusChange(participantId, newStatus) {
    if (!activeDrive?._id) return
    try {
      await api.patch(`/drives/${activeDrive._id}/participants/${participantId}`, {
        status: newStatus,
      })
      fetchCandidates()
    } catch (err) {
      alert(err.message || 'Failed to update candidate status')
    }
  }

  async function handleRemove(participantId, candidateName) {
    if (!activeDrive?._id) return
    const confirmed = window.confirm(`Remove ${candidateName} from this drive?`)
    if (!confirmed) return

    try {
      await api.delete(`/drives/${activeDrive._id}/participants/${participantId}`)
      fetchCandidates()
    } catch (err) {
      alert(err.message || 'Cannot remove candidate with active scheduled interviews.')
    }
  }

  const filteredCandidates = candidates.filter((item) => {
    const query = search.toLowerCase().trim()
    const name = item.userId?.name?.toLowerCase() || ''
    const email = item.userId?.email?.toLowerCase() || ''
    const dept = item.metadata?.department?.toLowerCase() || ''

    return name.includes(query) || email.includes(query) || dept.includes(query)
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Candidates</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registered students and their progression across placement rounds.
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-100 hover:bg-indigo-700"
        >
          <Plus size={16} />
          Register Candidate
        </button>
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
        <SummaryCard label="Total Candidates" value={candidates.length} icon={Users} />
        <SummaryCard
          label="Active Status"
          value={candidates.filter((c) => c.status === 'active').length}
          icon={GraduationCap}
        />
        <SummaryCard
          label="Disqualified / Eliminated"
          value={candidates.filter((c) => c.status === 'disqualified').length}
          icon={X}
        />
      </div>

      {/* Candidate List Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search candidates by name, email, department..."
            className="w-full py-2.5 text-xs outline-none"
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading candidates...</div>
          ) : filteredCandidates.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={36} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">No candidates registered</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Click <strong>"Register Candidate"</strong> to add participants to this placement drive.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-3">Candidate</th>
                  <th className="px-3 py-3">Department</th>
                  <th className="px-3 py-3">Skills Tags</th>
                  <th className="px-3 py-3">Eligible Rounds</th>
                  <th className="px-3 py-3">Pipeline Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.map((item) => {
                  const candidateUser = item.userId
                  const skills = item.metadata?.skills || []

                  return (
                    <tr key={item._id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700">
                            {candidateUser?.name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{candidateUser?.name || 'Unnamed'}</p>
                            <p className="text-[11px] text-slate-400">{candidateUser?.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 font-medium text-slate-700">
                        {item.metadata?.department || 'General'}
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {skills.length > 0 ? (
                            skills.map((s, idx) => (
                              <span key={idx} className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">None tagged</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {item.eligibleRoundIds?.length > 0 ? (
                            item.eligibleRoundIds.map((roundId) => {
                              const r = rounds.find((rd) => rd._id === roundId)
                              return (
                                <span key={roundId} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                                  {r?.name || 'Round'}
                                </span>
                              )
                            })
                          ) : (
                            <span className="text-slate-400">All Cleared</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item._id, e.target.value)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase outline-none ${
                            item.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'disqualified'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <option value="active">Active</option>
                          <option value="withdrawn">Withdrawn</option>
                          <option value="disqualified">Disqualified</option>
                        </select>
                      </td>

                      <td className="px-3 py-3.5 text-right">
                        <button
                          onClick={() => handleRemove(item._id, candidateUser?.name)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Remove from drive"
                        >
                          <Trash2 size={15} />
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

      {/* Add Candidate Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Register Candidate</h2>
                <p className="text-xs text-slate-500">Add student to the current placement drive pool.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700 uppercase">Candidate Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Aarav Sharma"
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 uppercase">Email Address</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="aarav@college.edu"
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 uppercase">Department</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 outline-none focus:border-indigo-400"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Electrical Engineering">Electrical Engineering</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 uppercase">Skills (Comma-separated)</label>
                <input
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="DSA, React, Python, SQL"
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700"
                >
                  Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
        <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-black text-slate-900">{value}</p>
    </div>
  )
}

export default Candidates
