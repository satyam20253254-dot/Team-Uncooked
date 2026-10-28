import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  User,
  Mail,
  ShieldCheck,
  Building2,
  Calendar,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Tag,
  Loader2,
  Edit3,
  Info,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDrive } from '../context/DriveContext'
import { ThemeToggle } from '../context/ThemeContext'

function ProfileModal({ isOpen, onClose }) {
  const { user, role, updateProfile } = useAuth()
  if (!isOpen || !user) return null

  return (
    <ProfileModalContent
      key={user._id}
      isOpen={isOpen}
      onClose={onClose}
      user={user}
      role={role}
      updateProfile={updateProfile}
    />
  )
}

function ProfileModalContent({ isOpen, onClose, user, role, updateProfile }) {
  const { activeDrive } = useDrive()

  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'edit'

  // Form State
  const [name, setName] = useState(() => user.name || '')
  const [email, setEmail] = useState(() => user.email || '')
  const [department, setDepartment] = useState(() => user.metadata?.department || '')
  const [skills, setSkills] = useState(() =>
    Array.isArray(user.metadata?.skills)
      ? user.metadata.skills.join(', ')
      : (user.metadata?.skills || '')
  )
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen || !user) return null

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    if (newPassword) {
      if (!currentPassword) {
        setErrorMsg('Please enter your current password to set a new password.')
        setSaving(false)
        return
      }
      if (newPassword.length < 6) {
        setErrorMsg('New password must be at least 6 characters long.')
        setSaving(false)
        return
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('New password and confirm password do not match.')
        setSaving(false)
        return
      }
    }

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        department: department.trim(),
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
      }
      if (newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }

      await updateProfile(payload)
      setSuccessMsg('Profile updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setSuccessMsg('')
      }, 3500)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const roleBadgeStyle = () => {
    switch (role) {
      case 'coordinator':
      case 'admin':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/60'
      case 'interviewer':
        return 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-700/60'
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/60'
    }
  }

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U'
  const skillsArray = Array.isArray(user.metadata?.skills)
    ? user.metadata.skills
    : typeof user.metadata?.skills === 'string' && user.metadata.skills
      ? user.metadata.skills.split(',').map((s) => s.trim())
      : []

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl my-auto flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[min(88vh,720px)] overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with User Info and Close Button */}
        <div className="shrink-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white/40 bg-white/10 backdrop-blur-sm text-2xl font-black text-white shadow-md">
                {userInitial}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold tracking-tight text-white leading-tight truncate">
                    {user.name}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize shadow-xs ${roleBadgeStyle()}`}
                  >
                    <ShieldCheck size={12} />
                    {role}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-emerald-100 font-medium truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close profile modal"
              className="shrink-0 rounded-xl bg-black/25 p-2 text-white/90 hover:bg-black/50 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs directly inside header bar */}
          <div className="mt-4 flex gap-2 border-t border-white/15 pt-3">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-white/80 hover:bg-white/15 hover:text-white'
              }`}
            >
              <Info size={14} />
              Account Details
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'edit'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-white/80 hover:bg-white/15 hover:text-white'
              }`}
            >
              <Edit3 size={14} />
              Edit Profile & Security
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 text-slate-900 dark:text-slate-100">
          {successMsg && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/50 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/50 p-3 text-xs font-semibold text-rose-800 dark:text-rose-300">
              <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 dark:text-slate-400">
                    <User size={13} />
                    <span>Full Name</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{user.name}</p>
                </div>

                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 dark:text-slate-400">
                    <Mail size={13} />
                    <span>Email Address</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100 break-all">{user.email}</p>
                </div>

                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 dark:text-slate-400">
                    <Building2 size={13} />
                    <span>Department / Branch</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                    {user.metadata?.department || (role === 'interviewer' ? 'Engineering & Tech' : 'Computer Science')}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 dark:text-slate-400">
                    <Calendar size={13} />
                    <span>Member Since</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Active Member'}
                  </p>
                </div>
              </div>

              {/* Skills / Specializations */}
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 dark:text-slate-400">
                  <Tag size={13} />
                  <span>Skills & Competencies</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {skillsArray.length > 0 ? (
                    skillsArray.map((skill, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg border border-emerald-200/80 dark:border-emerald-800/70 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-xs"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No skills listed yet.</span>
                  )}
                </div>
              </div>

              {/* Active Drive Enrolled */}
              {activeDrive && (
                <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-300">
                        Current Placement Drive
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                        {activeDrive.name}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-200/60 dark:bg-emerald-800/60 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-200">
                      {activeDrive.status || 'Active'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'edit' && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    placeholder="e.g. Adarsh Kumar"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department / Faculty
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    placeholder="e.g. Computer Science & Engg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Skills (comma separated)
                  </label>
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    placeholder="e.g. DSA, React, System Design"
                  />
                </div>
              </div>

              {/* Password Section */}
              <div className="mt-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <KeyRound size={14} className="text-amber-600 dark:text-amber-400" />
                  <span>Change Password (Optional)</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:text-white"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:text-white"
                      placeholder="Min 6 characters"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:text-white"
                      placeholder="Re-enter password"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 transition"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Profile Changes'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div className="shrink-0 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 px-5 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Theme:</span>
            <ThemeToggle className="scale-90" />
          </div>

          <div className="flex items-center gap-3">
            <p className="hidden sm:block text-[11px] text-slate-400 dark:text-slate-500">
              ID: <span className="font-mono text-slate-600 dark:text-slate-300">{user._id?.slice(-8) || 'N/A'}</span>
            </p>

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ProfileModal
