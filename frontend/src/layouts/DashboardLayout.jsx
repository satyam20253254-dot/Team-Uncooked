
import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'

function DashboardLayout() {
    const [showMenu, setShowMenu] = useState(false)
    const location = useLocation()

    const pageTitles = {
        '/': 'Overview',
        '/candidates': 'Candidates',
        '/schedule': 'Schedule Engine',
        '/interviewers': 'Interviewer Panels',
        '/availability': 'Rooms & Availability',
        '/self-book': 'Candidate Self-Booking Portal',
        '/evaluations': 'Live Evaluation Rubric & Rankings',
    }

    const title = pageTitles[location.pathname] || 'Overview'

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Sidebar
                showMenu={showMenu}
                setShowMenu={setShowMenu}
            />

            <div className="min-h-screen lg:pl-64">
                <Topbar
                    showMenu={showMenu}
                    setShowMenu={setShowMenu}
                    title={title}
                />

                <main className="mx-auto max-w-[1500px] p-4 sm:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout
