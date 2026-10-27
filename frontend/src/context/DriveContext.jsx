/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
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
