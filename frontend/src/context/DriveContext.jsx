import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

const DriveContext = createContext(null)

export function DriveProvider({ children }) {
  const { user } = useAuth()
  const [drives, setDrives] = useState([])
  const [activeDrive, setActiveDrive] = useState(null)
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRounds = useCallback(async (driveId) => {
    if (!driveId) return []
    try {
      const res = await api.get(`/drives/${driveId}/rounds`)
      const fetchedRounds = res?.data || []
      setRounds(fetchedRounds)
      return fetchedRounds
    } catch (err) {
      console.warn('Could not fetch rounds:', err)
      return []
    }
  }, [])

  const fetchDrives = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/drives')
      const driveList = res?.data?.drives || []
      setDrives(driveList)

      if (driveList.length > 0) {
        // Keep existing active drive or select first
        setActiveDrive((prev) => {
          const match = driveList.find((d) => d._id === prev?._id)
          return match || driveList[0]
        })
      } else {
        // Automatically bootstrap a default drive if none exists
        try {
          const now = new Date()
          const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

          const newDriveRes = await api.post('/drives', {
            name: 'Autumn Campus Placement Drive 2026',
            companyName: 'Apex Innovations & Tech Corp',
            startDate: now.toISOString(),
            endDate: nextWeek.toISOString(),
            dailyStartTime: '09:00',
            dailyEndTime: '17:00',
            timeZone: 'Asia/Kolkata',
          })

          const createdDrive = newDriveRes?.data
          if (createdDrive) {
            setDrives([createdDrive])
            setActiveDrive(createdDrive)

            // Seed 3 standard rounds: Coding/Technical 1, Technical 2, HR Round
            await api.post(`/drives/${createdDrive._id}/rounds`, {
              name: 'Technical Round 1',
              sequence: 1,
              durationMinutes: 45,
              requiredSkills: ['DSA', 'React', 'JavaScript'],
              isRequired: true,
              description: 'Core Data Structures, Algorithms and Frontend Concepts',
            }).catch(() => {})

            await api.post(`/drives/${createdDrive._id}/rounds`, {
              name: 'Technical Round 2',
              sequence: 2,
              durationMinutes: 60,
              requiredSkills: ['System Design', 'Node.js', 'Databases'],
              isRequired: true,
              description: 'Architecture, Database Design and Problem Solving',
            }).catch(() => {})

            await api.post(`/drives/${createdDrive._id}/rounds`, {
              name: 'HR & Culture Round',
              sequence: 3,
              durationMinutes: 30,
              requiredSkills: ['Communication', 'Culture Fit'],
              isRequired: true,
              description: 'Values, Culture Alignment, and Compensation Discussion',
            }).catch(() => {})

            // Seed sample rooms
            await api.post(`/drives/${createdDrive._id}/rooms`, {
              name: 'Conference Room Alpha',
              location: 'Academic Block A, 2nd Floor',
              capacity: 4,
              isVirtual: false,
            }).catch(() => {})

            await api.post(`/drives/${createdDrive._id}/rooms`, {
              name: 'Virtual Room Beta (Google Meet)',
              location: 'Online',
              capacity: 10,
              isVirtual: true,
              meetingLink: 'https://meet.google.com/unc-kook-rec',
            }).catch(() => {})
          }
        } catch (seedErr) {
          console.warn('Auto-seed drive fallback:', seedErr)
        }
      }
    } catch (err) {
      console.warn('Could not fetch drives:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchDrives()
    }
  }, [user, fetchDrives])

  useEffect(() => {
    if (activeDrive?._id) {
      fetchRounds(activeDrive._id)
    }
  }, [activeDrive, fetchRounds])

  return (
    <DriveContext.Provider
      value={{
        drives,
        activeDrive,
        setActiveDrive,
        rounds,
        loading,
        refreshDrives: fetchDrives,
        refreshRounds: () => fetchRounds(activeDrive?._id),
      }}
    >
      {children}
    </DriveContext.Provider>
  )
}

export function useDrive() {
  const context = useContext(DriveContext)
  if (!context) {
    throw new Error('useDrive must be used within a DriveProvider')
  }
  return context
}
