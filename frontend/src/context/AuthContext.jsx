import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const DEFAULT_USERS = {
  coordinator: {
    email: 'coordinator@uncooked.edu',
    password: 'Password123!',
    name: 'Dr. Sarah Jenkins',
    role: 'coordinator',
  },
  interviewer: {
    email: 'interviewer@uncooked.edu',
    password: 'Password123!',
    name: 'Rahul Verma',
    role: 'interviewer',
  },
  candidate: {
    email: 'candidate@uncooked.edu',
    password: 'Password123!',
    name: 'Aarav Sharma',
    role: 'candidate',
  },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(localStorage.getItem('uncooked_role') || 'coordinator')
  const [loading, setLoading] = useState(true)

  // Quick switch role for testing all 3 PS personas
  const switchRole = useCallback(async (targetRole) => {
    setLoading(true)
    try {
      const creds = DEFAULT_USERS[targetRole] || DEFAULT_USERS.coordinator
      // Try login first
      let res
      try {
        res = await api.post('/auth/login', {
          email: creds.email,
          password: creds.password,
        })
      } catch (loginErr) {
        // If user does not exist, auto-register
        try {
          res = await api.post('/auth/register', creds)
          // After register, login to get JWT
          res = await api.post('/auth/login', {
            email: creds.email,
            password: creds.password,
          })
        } catch (regErr) {
          console.warn('Auto-register fallback:', regErr)
        }
      }

      if (res?.data?.token) {
        localStorage.setItem('uncooked_token', res.data.token)
        localStorage.setItem('uncooked_role', targetRole)
        setUser(res.data.user)
        setRole(targetRole)
      } else {
        // Local fallback persona if backend auth fails
        setUser({ name: creds.name, email: creds.email, role: targetRole, _id: targetRole + '_demo' })
        setRole(targetRole)
        localStorage.setItem('uncooked_role', targetRole)
      }
    } catch (err) {
      console.error('Failed to switch persona:', err)
      setRole(targetRole)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    const savedRole = localStorage.getItem('uncooked_role') || 'coordinator'
    switchRole(savedRole)
  }, [switchRole])

  return (
    <AuthContext.Provider value={{ user, role, switchRole, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
