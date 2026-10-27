import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock3, ListOrdered, Plus, Trash2, X } from 'lucide-react'
import api from '../services/api'
import { useDrive } from '../context/DriveContext'

const emptyForm = () => ({
  name: '',
  durationMinutes: 45,
  requiredSkills: '',
  isRequired: true,
  prerequisiteRound: [],
})

function Rounds() {
  const { activeDrive, refreshRounds } = useDrive()
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const loadRounds = useCallback(async () => {
    if (!activeDrive?._id) {
      setRounds([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const response = await api.get(`/drives/${activeDrive._id}/rounds`)
      setRounds(response?.data || [])
    } catch (requestError) {
      setError(requestError.message || 'Could not load interview rounds.')
    } finally {
      setLoading(false)
    }
  }, [activeDrive])

  useEffect(() => {
    const timer = setTimeout(loadRounds, 0)
    return () => clearTimeout(timer)
  }, [loadRounds])

  function togglePrerequisite(roundId) {
    setForm((current) => ({
      ...current,
      prerequisiteRound: current.prerequisiteRound.includes(roundId)
        ? current.prerequisiteRound.filter((id) => id !== roundId)
        : [...current.prerequisiteRound, roundId],
    }))
  }

  async function submitRound(event) {
    event.preventDefault()
    if (!activeDrive?._id) return
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.post(`/drives/${activeDrive._id}/rounds`, {
        ...form,
        sequence: nextSequence,
        durationMinutes: Number(form.durationMinutes),
        requiredSkills: form.requiredSkills.split(',').map((skill) => skill.trim()).filter(Boolean),
      })
      await Promise.all([loadRounds(), refreshRounds()])
      setForm(emptyForm())
      setShowForm(false)
      setSuccess('Interview round added to the drive. Drive participants were notified.')
    } catch (requestError) {
      setError(requestError.message || 'Could not add this round.')
    } finally {
      setSaving(false)
    }
  }

  async function removeRound(round) {
    if (!window.confirm(`Remove “${round.name}” from this drive?`)) return
    setError('')
    setSuccess('')
    try {
      await api.delete(`/drives/${activeDrive._id}/rounds/${round._id}`)
      await Promise.all([loadRounds(), refreshRounds()])
      setSuccess('Round removed. Drive participants were notified.')
    } catch (requestError) {
      setError(requestError.message || 'Could not remove this round.')
    }
  }

  const getPrerequisiteNames = (round) => rounds
    .filter((item) => round.prerequisiteRound?.some((id) => id.toString() === item._id))
    .map((item) => item.name)
  const nextSequence = rounds.reduce((maxSequence, round) => Math.max(maxSequence, Number(round.sequence) || 0), 0) + 1

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-amber-700">Coordinator setup</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Interview rounds</h1>
          <p className="mt-2 text-sm text-slate-500">Create the stages, dependencies, and skills the scheduler uses to match panels.</p>
        </div>
        <button
          onClick={() => { setError(''); setSuccess(''); setShowForm(true) }}
          disabled={!activeDrive}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
        >
          <Plus size={16} />Add Round
        </button>
      </header>

      {!activeDrive && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Create or select an interview drive before setting up rounds.</p>}
      {error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={17} />{error}</p>}
      {success && !error && <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={17} />{success}</p>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? <p className="p-10 text-center text-sm text-slate-400">Loading rounds…</p> : rounds.length === 0 ? (
          <div className="p-12 text-center">
            <ListOrdered size={32} className="mx-auto text-slate-300" />
            <h2 className="mt-3 font-semibold text-slate-800">No rounds configured</h2>
            <p className="mt-1 text-sm text-slate-500">The schedule generator needs at least one round.</p>
            <button onClick={() => setShowForm(true)} className="mt-4 text-sm font-semibold text-emerald-700 hover:underline">Create the first round</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rounds.map((round, index) => {
              const prerequisiteNames = getPrerequisiteNames(round)
              return (
                <article key={round._id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="flex items-start gap-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-emerald-50 text-sm font-bold text-emerald-800">{round.sequence || index + 1}</span>
                    <div>
                      <h2 className="font-semibold text-slate-900">{round.name}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1"><Clock3 size={13} />{round.durationMinutes} min</span>
                        <span>{round.isRequired ? 'Required' : 'Optional'}</span>
                        {round.requiredSkills?.length > 0 && <span>Skills: {round.requiredSkills.join(', ')}</span>}
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        Prerequisites: <span className="font-medium text-slate-700">{prerequisiteNames.length ? prerequisiteNames.join(', ') : 'None'}</span>
                      </p>
                    </div>
                  </div>
                  <button onClick={() => removeRound(round)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${round.name}`}><Trash2 size={16} /></button>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <section className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Add interview round</h2>
                <p className="mt-1 text-xs text-slate-500">This becomes round {nextSequence} in the sequence.</p>
              </div>
              <button onClick={() => setShowForm(false)} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={submitRound} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Round name
                <input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Technical interview" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Duration in minutes
                <input type="number" required min="15" step="1" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500" />
              </label>
              <fieldset className="rounded-xl border border-slate-200 p-3">
                <legend className="px-1 text-sm font-semibold text-slate-700">Prerequisite rounds</legend>
                <p className="mb-2 text-xs text-slate-500">Candidates must complete every selected round before this one.</p>
                {rounds.length === 0 ? <p className="py-2 text-xs text-slate-400">No earlier rounds available.</p> : (
                  <div className="max-h-36 space-y-2 overflow-y-auto">
                    {rounds.map((round) => (
                      <label key={round._id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                        <input type="checkbox" checked={form.prerequisiteRound.includes(round._id)} onChange={() => togglePrerequisite(round._id)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        <span><span className="font-medium">Round {round.sequence}:</span> {round.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
              <label className="block text-sm font-medium text-slate-700">Required skills <span className="font-normal text-slate-400">(comma-separated; leave blank for any interviewer)</span>
                <input value={form.requiredSkills} onChange={(event) => setForm({ ...form, requiredSkills: event.target.value })} placeholder="System design, React" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500" />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.isRequired} onChange={(event) => setForm({ ...form, isRequired: event.target.checked })} />Required round</label>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Cancel</button>
                <button disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-60">{saving ? 'Saving…' : 'Save round'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default Rounds
