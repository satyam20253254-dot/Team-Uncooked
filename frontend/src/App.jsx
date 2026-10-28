import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { DriveProvider } from './context/DriveContext'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Candidates from './pages/Candidates'
import Schedule from './pages/Schedule'
import Interviewers from './pages/Interviewers'
import Availability from './pages/Availability'
import SelfBooking from './pages/SelfBooking'
import Evaluations from './pages/Evaluations'
import SignIn from './pages/SignIn'
import Rounds from './pages/Rounds'
import { useAuth } from './context/AuthContext'

function ProtectedWorkspace() {
  const { user, loading } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f6f5f1] dark:bg-slate-950 text-sm text-slate-500">Loading your workspace…</div>
  return user ? <DashboardLayout /> : <Navigate to="/signin" replace />
}

function RoleGate({ allowed }) {
  const { role } = useAuth()
  if (role === 'coordinator' || role === 'admin' || allowed.includes(role)) return <Outlet />
  return <Navigate to="/" replace />
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DriveProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/signin" element={<SignIn />} />
            <Route element={<ProtectedWorkspace />}>
              <Route path="/" element={<Dashboard />} />
              <Route element={<RoleGate allowed={[]} />}>
                <Route path="/candidates" element={<Candidates />} />
                <Route path="/interviewers" element={<Interviewers />} />
                <Route path="/rounds" element={<Rounds />} />
              </Route>
              <Route element={<RoleGate allowed={['interviewer']} />}>
                <Route path="/schedule" element={<Schedule />} />
              </Route>
              <Route element={<RoleGate allowed={['interviewer', 'candidate']} />}>
                <Route path="/availability" element={<Availability />} />
              </Route>
              <Route element={<RoleGate allowed={['candidate']} />}>
                <Route path="/self-book" element={<SelfBooking />} />
              </Route>
              <Route element={<RoleGate allowed={['interviewer']} />}>
                <Route path="/evaluations" element={<Evaluations />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DriveProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App
