import { createContext, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getUserId, getDisplayName, setUser, clearUser } from '../lib/storage'
import { apiPost } from '../lib/api'
import { supabase } from '../lib/supabase'

interface AuthState {
  userId: string | null
  displayName: string | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean
  register: (displayName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => void
  updateDisplayName: (name: string) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    userId: null,
    displayName: null,
    isLoading: true,
  })

  useEffect(() => {
    const userId = getUserId()
    const displayName = getDisplayName()

    if (userId) {
      setState({ userId, displayName, isLoading: false })
      return
    }

    // Check if returning from a Google OAuth redirect
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.access_token) {
        try {
          const result = await apiPost<{ userId: string; displayName: string }>(
            '/api/auth/google-signin',
            { accessToken: session.access_token }
          )
          setUser(result.userId, result.displayName)
          setState({ userId: result.userId, displayName: result.displayName, isLoading: false })
        } catch {
          setState({ userId: null, displayName: null, isLoading: false })
        }
      } else {
        setState({ userId: null, displayName: null, isLoading: false })
      }
    })
  }, [])

  const register = useCallback(async (displayName: string) => {
    const userId = crypto.randomUUID()
    await apiPost('/api/register', { userId, displayName })
    setUser(userId, displayName)
    setState({ userId, displayName, isLoading: false })
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { prompt: 'select_account' },
      },
    })
    // Page redirects to Google — execution does not continue here
  }, [])

  const signOut = useCallback(() => {
    clearUser()
    supabase.auth.signOut()
    setState({ userId: null, displayName: null, isLoading: false })
  }, [])

  const updateDisplayName = useCallback((name: string) => {
    if (!state.userId) return
    setUser(state.userId, name)
    setState(s => ({ ...s, displayName: name }))
  }, [state.userId])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAuthenticated: !!state.userId,
        register,
        signInWithGoogle,
        signOut,
        updateDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
