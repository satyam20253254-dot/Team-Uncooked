import { useState, useEffect, useCallback } from 'react'
import {
  Award,
  Star,
  CheckCircle2,
  Search,
  TrendingUp,
  X,
} from 'lucide-react'
import api from '../services/api'
import { useDrive } from '../context/DriveContext'

function Evaluations() {
  const { activeDrive } = useDrive()

  const [rankings, setRankings] = useState([])
  const [interviewsToEvaluate, setInterviewsToEvaluate] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedInterview, setSelectedInterview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [pipelineNotice, setPipelineNotice] = useState(null)

  // Scoring form state
  const [evaluationForm, setEvaluationForm] = useState({
    rating: 8,
    recommendation: 'hire',
    feedback: '',
  })

  // Fetch ranking matrix
  const fetchRankings = useCallback(async () => {
    if (!activeDrive?._id) return
    setLoading(true)
    try {
      const res = await api.get(`/drives/${activeDrive._id}/ranking-matrix`)
      setRankings(res?.data?.rankings || [])
    } catch (err) {
      console.warn('Could not fetch ranking matrix:', err)
      setRankings([])
    } finally {
      setLoading(false)
    }
  }, [activeDrive])

  // Fetch interviews pending evaluation
  const fetchPendingInterviews = useCallback(async () => {
    try {
      const res = await api.get('/my-interviews')
      const all = res?.data?.interviews || []
      setInterviewsToEvaluate(all)
    } catch (err) {
      console.warn('Could not load interviews for evaluation:', err)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRankings()
      fetchPendingInterviews()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchRankings, fetchPendingInterviews])

  const handleOpenEvaluationModal = (interview) => {
    setSelectedInterview(interview)
    setEvaluationForm({
      rating: 8,
      recommendation: 'hire',
      feedback: '',
    })
    setPipelineNotice(null)
  }

  const handleSubmitEvaluation = async (e) => {
    e.preventDefault()
    if (!selectedInterview?._id) return
    setSubmitting(true)
    try {
      const res = await api.post(`/interviews/${selectedInterview._id}/evaluation`, evaluationForm)
      const action = res?.data?.pipelineAction || 'Evaluation recorded'
      setPipelineNotice(action)
      fetchRankings()
      fetchPendingInterviews()
    } catch (err) {
      alert(err.message || 'Failed to submit evaluation')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredRankings = rankings.filter((item) => {
    const q = search.toLowerCase()
    return item.name?.toLowerCase().includes(q) || item.email?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300 uppercase">
              Interview feedback
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Live Evaluation Rubric & Candidate Ranking Matrix
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Synchronous scoring sheets with blinded feedback and aggregated hiring decision matrix.
          </p>
        </div>

        <button
          onClick={fetchRankings}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition"
        >
          <TrendingUp size={16} />
          Refresh Leaderboard
        </button>
      </div>

      {/* Pending Evaluations Sheet (For Interviewers & Coordinators) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm transition">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Synchronous Evaluation Scoring Sheets</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Record your assessment and recommendation for each completed interview.
            </p>
          </div>
        </div>

        <div className="mt-4">
          {interviewsToEvaluate.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              No active interviews pending evaluation. Check back after scheduling rounds.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {interviewsToEvaluate.map((interview) => (
                <div
                  key={interview._id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 p-4 transition hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {interview.round?.name || 'Interview'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          interview.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                        }`}
                      >
                        {interview.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                      Candidate: {interview.candidate?.name || 'Assigned'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Panel: {interview.interviewer?.name || 'You'} · Venue: {interview.room?.name || 'Room'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenEvaluationModal(interview)}
                    className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-[0.98]"
                  >
                    <Star size={14} />
                    <span>{interview.status === 'completed' ? 'Update Scorecard' : 'Score Candidate'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Candidate rankings */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm transition">
        <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Aggregated Candidate Ranking Matrix</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time leaderboard ordered by average evaluation ratings across all rounds
            </p>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate name or email..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400 dark:focus:border-amber-500 sm:w-64 transition"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">Loading ranking matrix...</div>
          ) : filteredRankings.length === 0 ? (
            <div className="py-12 text-center">
              <Award size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">No evaluations submitted yet</p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                Scorecards submitted by interviewers above will automatically populate this leaderboard.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Candidate</th>
                  <th className="py-3 px-3">Interviews</th>
                  <th className="py-3 px-3">Average Rating</th>
                  <th className="py-3 px-3">Consensus Decision</th>
                  <th className="py-3 px-3">Round Score Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRankings.map((candidate, idx) => {
                  const avg = candidate.averageRating || 0
                  const hasReject = candidate.recommendations?.includes('reject')
                  const hasHire = candidate.recommendations?.includes('hire')

                  return (
                    <tr key={candidate.candidateId} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                      <td className="py-3.5 px-3 font-bold text-slate-500 dark:text-slate-400">
                        {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{candidate.name}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{candidate.email}</p>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        {candidate.totalInterviews} round{candidate.totalInterviews === 1 ? '' : 's'}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400">{avg}</span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">/ 10</span>
                          <div className="flex text-amber-400">
                            {'★'.repeat(Math.min(5, Math.round(avg / 2)))}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                            hasReject
                              ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                              : hasHire
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                              : 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                          }`}
                        >
                          {hasReject ? 'Disqualified' : hasHire ? 'Selected / Hire' : 'In Progress'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {candidate.evaluations?.map((ev, i) => (
                            <span
                              key={i}
                              className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                              title={ev.feedback}
                            >
                              R{i + 1}: <strong className="text-slate-900 dark:text-slate-100">{ev.rating}/10</strong> ({ev.recommendation})
                            </span>
                          ))}
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

      {/* Synchronous Scoring Sheet Modal */}
      {selectedInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Live Interview Evaluation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Candidate: <strong className="text-slate-800 dark:text-slate-200">{selectedInterview.candidate?.name}</strong> · Round:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{selectedInterview.round?.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedInterview(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {pipelineNotice ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 size={44} className="mx-auto text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">Evaluation saved</h4>
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{pipelineNotice}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  The candidate record and rankings have been updated.
                </p>
                <button
                  onClick={() => setSelectedInterview(null)}
                  className="mt-2 rounded-xl bg-slate-900 dark:bg-slate-800 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitEvaluation} className="mt-4 space-y-4">
                {/* 1-10 Rating Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Rating Score: <span className="text-amber-600 dark:text-amber-400 text-sm">{evaluationForm.rating} / 10</span>
                  </label>
                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        type="button"
                        key={score}
                        onClick={() => setEvaluationForm({ ...evaluationForm, rating: score })}
                        className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                          evaluationForm.rating === score
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recommendation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Recommendation
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { id: 'hire', label: 'Hire' },
                      { id: 'next_round', label: 'Next Round' },
                      { id: 'hold', label: 'Hold' },
                      { id: 'reject', label: 'Reject' },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setEvaluationForm({ ...evaluationForm, recommendation: opt.id })}
                        className={`rounded-xl border py-2 text-xs font-semibold transition ${
                          evaluationForm.recommendation === opt.id
                            ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-bold'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Blinded Interview Feedback & Notes
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={evaluationForm.feedback}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, feedback: e.target.value })}
                    placeholder="Candidate demonstrated strong algorithmic problem solving, clean recursion, but needs more system design depth..."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedInterview(null)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {submitting ? 'Saving evaluation...' : 'Save evaluation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Evaluations
