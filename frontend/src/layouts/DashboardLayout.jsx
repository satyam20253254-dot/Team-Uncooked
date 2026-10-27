import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'

function DashboardLayout() {
  const [showMenu, setShowMenu] = useState(false)
  const location = useLocation()

  const pageTitles = {
    '/': 'Dashboard Overview',
    '/candidates': 'Candidate Directory',
    '/schedule': 'Automated Schedule Engine',
    '/interviewers': 'Interviewer Panels & Capacity',
    '/rounds': 'Interview Round Stages',
    '/availability': 'Venues & Availability Windows',
    '/self-book': 'Candidate Self-Booking Portal',
    '/evaluations': 'Live Rubric & Candidate Rankings',
  }

  const title = pageTitles[location.pathname] || 'Dashboard'

  return (
    <div className="min-h-screen bg-slate-50/90 text-slate-900">
      <Sidebar showMenu={showMenu} setShowMenu={setShowMenu} />

      <div className="min-h-screen lg:pl-64 flex flex-col">
        <Topbar showMenu={showMenu} setShowMenu={setShowMenu} title={title} />

        <main className="flex-1 mx-auto w-full max-w-[1500px] p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
