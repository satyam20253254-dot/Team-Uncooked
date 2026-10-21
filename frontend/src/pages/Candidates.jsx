
import { Users, Search, Plus } from 'lucide-react'

function Candidates() {
  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Candidates
          </h1>
          <p className="mt-2 text-slate-500">
            Manage candidates registered for your placement drive.
          </p>
        </div>

        <button
          onClick={() => alert('Candidate form coming next!')}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
        >
          <Plus size={18} />
          Add candidate
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
            <Users size={24} />
          </div>

          <div>
            <h2 className="font-semibold">Candidate management</h2>
            <p className="text-sm text-slate-500">
              Your candidate list will appear here.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-slate-400">
          <Search size={18} />
          <span className="text-sm">Search candidates...</span>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          No backend data connected yet.
        </p>
      </div>
    </div>
  )
}

export default Candidates
