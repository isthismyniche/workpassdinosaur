import { createContext, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  getUserId, getDisplayName, getGoogleLinked,
  setUser, setGoogleLinked, clearUser,
  PENDING_LINK_KEY,
} from '../lib/storage'
import { apiPost } from '../lib/api'
import { supabase } from '../lib/supabase'

interface AuthState {
  userId: string | null
  displayName: string | null
  googleLinked: boolean
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean
  register: (displayName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  linkGoogleAccount: () => Promise<void>
  signOut: () => void
  updateDisplayName: (name: string) => void
  setGoogleLinkedState: (value: boolean) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    userId: null,
    displayName: null,
    googleLinked: false,
    isLoading: true,
  })

  useEffect(() => {
    const userId = getUserId()
    const displayName = getDisplayName()
    const googleLinked = getGoogleLinked()

    if (userId) {
      setState({ userId, displayName, googleLinked, isLoading: false })
      return
    }

    // Check if we're returning from a Google OAuth redirect
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.access_token) {
        setState({ userId: null, displayName: null, googleLinked: false, isLoading: false })
        return
      }

      const isPendingLink = localStorage.getItem(PENDING_LINK_KEY) === 'true'
      const existingUserId = getUserId()

      if (isPendingLink && existingUserId) {
        // Linking flow — attach Google to the already-logged-in username-only account
        localStorage.removeItem(PENDING_LINK_KEY)
        try {
          await apiPost('/api/auth/link-google', { accessToken: session.access_token })
          setGoogleLinked(true)
          setState(s => ({ ...s, googleLinked: true, isLoading: false }))
        } catch {
          // Link failed (e.g. already claimed) — stay logged in, just not linked
          setState(s => ({ ...s, isLoading: false }))
        }
      } else {
        // Normal sign-in flow
        localStorage.removeItem(PENDING_LINK_KEY)
        try {
          const result = await apiPost<{ userId: string; displayName: string }>(
            '/api/auth/google-signin',
            { accessToken: session.access_token }
          )
          setUser(result.userId, result.displayName, true)
          setState({ userId: result.userId, displayName: result.displayName, googleLinked: true, isLoading: false })
        } catch {
          setState({ userId: null, displayName: null, googleLinked: false, isLoading: false })
        }
      }
    })
  }, [])

  const register = useCallback(async (displayName: string) => {
    const userId = crypto.randomUUID()
    await apiPost('/api/register', { userId, displayName })
    setUser(userId, displayName, false)
    setState({ userId, displayName, googleLinked: false, isLoading: false })
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { prompt: 'select_account' },
      },
    })
  }, [])

  const linkGoogleAccount = useCallback(async () => {
    // Signal that the upcoming OAuth redirect is a linking flow, not a sign-in
    localStorage.setItem(PENDING_LINK_KEY, 'true')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/me`,
        queryParams: { prompt: 'select_account' },
      },
    })
  }, [])

  const signOut = useCallback(() => {
    clearUser()
    supabase.auth.signOut()
    setState({ userId: null, displayName: null, googleLinked: false, isLoading: false })
  }, [])

  const updateDisplayName = useCallback((name: string) => {
    if (!state.userId) return
    setUser(state.userId, name, state.googleLinked)
    setState(s => ({ ...s, displayName: name }))
  }, [state.userId, state.googleLinked])

  const setGoogleLinkedState = useCallback((value: boolean) => {
    setGoogleLinked(value)
    setState(s => ({ ...s, googleLinked: value }))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAuthenticated: !!state.userId,
        register,
        signInWithGoogle,
        linkGoogleAccount,
        signOut,
        updateDisplayName,
        setGoogleLinkedState,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
