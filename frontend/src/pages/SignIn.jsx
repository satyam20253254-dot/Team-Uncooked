import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Eye,
  EyeOff,
  LoaderCircle,
  ArrowRight,
  ShieldCheck,
  CalendarCheck2,
  Award,
  Layers,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function SignIn() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('coordinator')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Demo accounts helper
  const handleQuickFill = (demoRole, demoEmail, demoPass) => {
    setError('')
    setMode('signin')
    setRole(demoRole)
    setEmail(demoEmail)
    setPassword(demoPass)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (mode === 'signup' && role === 'coordinator') {
      setError('The coordinator account is pre-provisioned. Use the Coordinator quick login or sign in directly.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signup') {
        await signUp({ name: name.trim(), email: email.trim(), password, role })
      } else {
        await signIn({ email: email.trim(), password }, role)
      }
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Could not authenticate. Check your details and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 text-slate-100 px-4 py-8 sm:py-12 sm:grid sm:place-items-center">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-slate-950/80 backdrop-blur-xl lg:grid-cols-[1.05fr_.95fr]">
        
        {/* Left: Enterprise Value Proposition Hero */}
        <section className="relative hidden min-h-[640px] flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 p-12 text-white lg:flex border-r border-slate-800/80">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -left-20 bottom-10 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-lg text-white">The Ancient One’s Trials</span>
              <span className="ml-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Interview Scheduling
              </span>
            </div>
          </div>

          <div className="relative z-10 my-auto max-w-md py-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.22em] text-emerald-400">
              Placement & Interview Orchestration
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-white">
              Constraint-aware scheduling built for high-stakes drives.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Multi-round interview scheduling with zero room collisions, automated interviewer skill-matching, real-time rubric leaderboards, and candidate self-booking portals.
            </p>

            <div className="mt-8 space-y-3.5 border-t border-slate-800 pt-6">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck size={14} />
                </span>
                <span>Automated CSP Solver — Eliminates double-booking of rooms & panels</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
                  <CalendarCheck2 size={14} />
                </span>
                <span>Instant Self-Booking & RFC-5545 iCalendar (.ics) Sync</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <Award size={14} />
                </span>
                <span>Synchronous Scoring Rubric & Candidate Ranking Leaderboard</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs text-slate-400">
            <span>Enterprise Placement Suite</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              API Services Operational
            </span>
          </div>
        </section>

        {/* Right: Modern Form & Demo Quick-Logins */}
        <section className="flex min-h-[640px] flex-col justify-center px-6 py-10 sm:px-12 bg-slate-900/60">
          <div className="mx-auto w-full max-w-sm">
            
            {/* Mobile Header */}
            <div className="mb-6 lg:hidden flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="font-bold text-white text-base">The Ancient One’s Trials</p>
                <p className="text-[11px] text-emerald-400 font-medium">Interview Orchestration</p>
              </div>
            </div>

            {/* Quick Demo Switcher */}
            <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-3.5 backdrop-blur">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Layers size={13} />
                  1-Click Quick Demo Sign In
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('coordinator', 'coordinator@ancienttrials.edu', 'AncientOne#2026')}
                  className="rounded-xl border border-emerald-500/40 bg-slate-800/80 p-2 text-center transition hover:bg-emerald-600/30 hover:border-emerald-400 active:scale-95 text-left"
                >
                  <p className="text-[11px] font-bold text-emerald-200">Coordinator</p>
                  <p className="text-[10px] text-slate-400 truncate">Admin Lead</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('interviewer', 'interviewer@uncooked.edu', 'Password#123')}
                  className="rounded-xl border border-emerald-500/30 bg-slate-800/80 p-2 text-center transition hover:bg-emerald-600/30 hover:border-emerald-400 active:scale-95 text-left"
                >
                  <p className="text-[11px] font-bold text-emerald-300">Interviewer</p>
                  <p className="text-[10px] text-slate-400 truncate">Panel Review</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('candidate', 'candidate@uncooked.edu', 'Password#123')}
                  className="rounded-xl border border-amber-500/30 bg-slate-800/80 p-2 text-center transition hover:bg-amber-600/30 hover:border-amber-400 active:scale-95 text-left"
                >
                  <p className="text-[11px] font-bold text-amber-300">Candidate</p>
                  <p className="text-[10px] text-slate-400 truncate">Self-Book</p>
                </button>
              </div>
            </div>

            <div className="mb-4 flex rounded-xl border border-slate-800 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => { setMode('signin'); setError('') }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  mode === 'signin'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setRole('candidate'); setError('') }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  mode === 'signup'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white">
              {mode === 'signin' ? 'Welcome back' : 'Create candidate or interviewer account'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {mode === 'signin'
                ? 'Select your role and enter your credentials below.'
                : 'Sign up to submit your availability and book interview rounds.'}
            </p>

            <form className="mt-5 space-y-3.5" onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Full Name</label>
                  <input
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  {mode === 'signup' ? 'Join as' : 'Sign In Persona'}
                </label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {[
                    { id: 'coordinator', label: 'Coordinator' },
                    { id: 'interviewer', label: 'Interviewer' },
                    { id: 'candidate', label: 'Candidate' },
                  ]
                    .filter((r) => mode !== 'signup' || r.id !== 'coordinator')
                    .map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setRole(item.id)}
                        className={`rounded-xl border py-2 text-xs font-semibold transition ${
                          role === item.id
                            ? 'border-emerald-500 bg-emerald-600/20 text-emerald-300 shadow-sm'
                            : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Email Address</label>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <div className="relative mt-1">
                  <input
                    required
                    minLength={8}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create Account & Join'}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-slate-400">
              {mode === 'signin' ? 'Need a candidate account?' : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setMode(mode === 'signin' ? 'signup' : 'signin')
                }}
                className="font-semibold text-emerald-400 hover:underline"
              >
                {mode === 'signin' ? 'Sign up here' : 'Sign in here'}
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default SignIn
