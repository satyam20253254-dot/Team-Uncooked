/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('uncooked_token')))

  const acceptSession = useCallback((session) => {
    const nextUser = session?.data?.user
    const token = session?.data?.token
    if (!nextUser || !token) throw new Error('The server returned an invalid sign-in response.')
    localStorage.setItem('uncooked_token', token)
    setUser(nextUser)
    return nextUser
  }, [])

  const signIn = useCallback(async (credentials, expectedRole) => {
    const session = await api.post('/auth/login', credentials)
    const actualRole = session?.data?.user?.role
    const roleMatches = expectedRole === 'coordinator' ? ['coordinator', 'admin'].includes(actualRole) : actualRole === expectedRole
    if (expectedRole && !roleMatches) {
      throw new Error(`This account is registered as ${actualRole || 'another role'}. Choose the matching role to sign in.`)
    }
    return acceptSession(session)
  }, [acceptSession])

  const signUp = useCallback(async (details) => {
    await api.post('/auth/register', details)
    return signIn({ email: details.email, password: details.password }, details.role)
  }, [signIn])

  const signOut = useCallback(async () => {
    try { await api.post('/auth/logout') } catch (error) { console.warn('Sign-out request failed:', error) }
    localStorage.removeItem('uncooked_token')
    setUser(null)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('uncooked_token')
    if (!token) return
    api.get('/auth/me')
      .then((response) => setUser(response?.data || null))
      .catch(() => {
        localStorage.removeItem('uncooked_token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const role = user?.role || null
  return <AuthContext.Provider value={{ user, role, signIn, signUp, signOut, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
