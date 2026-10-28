import { useState, useEffect, useCallback } from 'react'
import {
  UserRoundCheck,
  Search,
  Plus,
  BriefcaseBusiness,
  Clock,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import api from '../services/api'
import { useDrive } from '../context/DriveContext'

function Interviewers() {
  const { activeDrive } = useDrive()

  const [interviewers, setInterviewers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: 'Engineering & Tech',
    skills: 'DSA, System Design, React, Node.js',
    maxDailyInterviews: 4,
  })

  const fetchInterviewers = useCallback(async () => {
    if (!activeDrive?._id) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/drives/${activeDrive._id}/participants?role=interviewer`)
      setInterviewers(res?.data?.participants || [])
    } catch (err) {
      console.warn('Could not load interviewers:', err)
      setInterviewers([])
    } finally {
      setLoading(false)
    }
  }, [activeDrive])

  useEffect(() => {
    const timer = setTimeout(fetchInterviewers, 0)
    return () => clearTimeout(timer)
  }, [fetchInterviewers])

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
    const email = formData.email.trim().toLowerCase()
    if (interviewers.some((item) => item.userId?.email?.toLowerCase() === email)) {
      setError('This interviewer is already a participant in the selected drive.')
      return
    }
    setIsSubmitting(true)

    try {
      // 1. Ensure user account exists
      let userId
      try {
        const userRes = await api.post('/auth/users', {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: 'interviewer',
        })
        userId = userRes?.data?._id
      } catch (createError) {
        if (!createError.message.toLowerCase().includes('already registered')) throw createError
        // Search if already registered
        const searchRes = await api.get(`/auth/users?search=${encodeURIComponent(email)}`)
        const existing = searchRes?.data?.users?.[0]
        if (existing) {
          if (existing.role !== 'interviewer') throw new Error('This email belongs to an account with a different role.', { cause: createError })
          userId = existing._id
        } else {
          throw new Error('Email already registered but could not retrieve account.', { cause: createError })
        }
      }

      // 2. Add as Interviewer Participant with skills metadata for constraint solver
      const parsedSkills = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      await api.post(`/drives/${activeDrive._id}/participants`, {
        userId,
        role: 'interviewer',
        metadata: {
          department: formData.department,
          skills: parsedSkills,
          maxDailyInterviews: Number(formData.maxDailyInterviews) || 4,
          joinedAt: new Date().toISOString(),
        },
      })

      setSuccess(`Interviewer ${formData.name} added successfully!`)
      setFormData({
        name: '',
        email: '',
        password: '',
        department: 'Engineering & Tech',
        skills: 'DSA, System Design, React, Node.js',
        maxDailyInterviews: 4,
      })
      setShowForm(false)
      fetchInterviewers()
    } catch (err) {
      setSuccess('')
      setError(err.message || 'Failed to add interviewer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRemove(participantId, interviewerName) {
    if (!activeDrive?._id) return
    const confirmed = window.confirm(`Remove panelist ${interviewerName} from this drive?`)
    if (!confirmed) return

    try {
      await api.delete(`/drives/${activeDrive._id}/participants/${participantId}`)
      fetchInterviewers()
    } catch (err) {
      alert(err.message || 'Cannot remove interviewer with scheduled active interviews.')
    }
  }

  const filteredInterviewers = interviewers.filter((item) => {
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
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Interviewer Panels</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure panelists, skill requirements, and maximum daily interview thresholds.
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-95"
        >
          <Plus size={16} />
          Add Interviewer Panel
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/50 p-4 text-xs font-medium text-red-700 dark:text-red-300">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && !error && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/50 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total Interviewers" value={interviewers.length} icon={UserRoundCheck} />
        <SummaryCard
          label="Active Panels"
          value={interviewers.filter((i) => i.status === 'active').length}
          icon={Clock}
        />
        <SummaryCard
          label="Skill Tags Indexed"
          value={interviewers.reduce((acc, curr) => acc + (curr.metadata?.skills?.length || 0), 0)}
          icon={BriefcaseBusiness}
        />
      </div>

      {/* Interviewers Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm transition">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 transition">
          <Search size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search panels by name, email, department..."
            className="w-full py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none bg-transparent"
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">Loading interview panels...</div>
          ) : filteredInterviewers.length === 0 ? (
            <div className="py-12 text-center">
              <UserRoundCheck size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">No interviewers assigned yet</p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                Add interviewers and their areas of expertise to make them available for scheduling.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-3">Interviewer</th>
                  <th className="px-3 py-3">Department</th>
                  <th className="px-3 py-3">Expertise & Skill Tags</th>
                  <th className="px-3 py-3">Daily Capacity</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInterviewers.map((item) => {
                  const interviewerUser = item.userId
                  const skills = item.metadata?.skills || []
                  const maxDaily = item.metadata?.maxDailyInterviews || 4

                  return (
                    <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/60 dark:border-emerald-800/60 font-bold text-emerald-700 dark:text-emerald-300">
                            {interviewerUser?.name?.charAt(0) || 'I'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{interviewerUser?.name || 'Panelist'}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">{interviewerUser?.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                        {item.metadata?.department || 'Engineering'}
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {skills.map((s, idx) => (
                            <span key={idx} className="rounded bg-emerald-50 dark:bg-emerald-950/70 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-3 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        Max {maxDaily} interviews / day
                      </td>

                      <td className="px-3 py-3.5">
                        <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase">
                          {item.status}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-right">
                        <button
                          onClick={() => handleRemove(item._id, interviewerUser?.name)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 transition"
                          title="Remove panel"
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

      {/* Add Interviewer Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add Interviewer Panel</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add an interviewer and set their interview capacity and expertise.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Interviewer Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Rahul Verma"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Email Address</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="rahul.verma@apex.corp"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Temporary Password</label>
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                  >
                    <option value="Engineering & Tech">Engineering & Tech</option>
                    <option value="Product & Design">Product & Design</option>
                    <option value="People & Culture (HR)">People & Culture (HR)</option>
                    <option value="Management">Management</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Max Daily Load</label>
                  <input
                    name="maxDailyInterviews"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.maxDailyInterviews}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 uppercase">Expertise & Skills</label>
                <input
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="DSA, System Design, React, Node.js"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                />
                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                  Used to match interviewers with the requirements for each round.
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                >
                  {isSubmitting ? 'Adding…' : 'Register Panelist'}
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
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">{label}</p>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/60 dark:border-emerald-800/60 p-2 text-emerald-600 dark:text-emerald-400">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  )
}

export default Interviewers
