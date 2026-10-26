import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

function App() {
  return (
    <AuthProvider>
      <DriveProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/candidates" element={<Candidates />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/interviewers" element={<Interviewers />} />
              <Route path="/availability" element={<Availability />} />
              <Route path="/self-book" element={<SelfBooking />} />
              <Route path="/evaluations" element={<Evaluations />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DriveProvider>
    </AuthProvider>
  )
}

export default App
