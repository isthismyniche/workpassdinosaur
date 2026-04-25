import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { signInWithGoogle, register } = useAuth()
  const [showNameForm, setShowNameForm] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGoogleSignIn() {
    setError('')
    try {
      await signInWithGoogle()
    } catch {
      setError('Could not start Google sign-in. Try again.')
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const name = displayName.trim()
    if (!name) { setError('Enter a display name.'); return }
    if (name.length > 30) { setError('Name must be 30 characters or fewer.'); return }
    setError('')
    setLoading(true)
    try {
      await register(name)
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <picture>
          <source srcSet="/mascot/hero.webp" type="image/webp" />
          <img
            src="/mascot/hero.png"
            alt="Work Pass Dinosaur"
            className="w-72 max-w-full"
            loading="eager"
          />
        </picture>
        <p className="text-text-secondary text-base italic">Ancient Wisdom, transforming with the times</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {!showNameForm ? (
          <>
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-accent-primary text-white font-semibold text-base hover:opacity-90 transition-opacity"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <button
              onClick={() => setShowNameForm(true)}
              className="text-text-secondary text-sm underline underline-offset-2 hover:text-text-primary transition-colors text-center"
            >
              Continue without signing in
            </button>
          </>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <label className="text-text-primary text-sm font-semibold" htmlFor="display-name">
              What should we call you on the leaderboard?
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Display name (max 30 chars)"
              maxLength={30}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-text-secondary/30 bg-bg-card text-text-primary placeholder:text-text-secondary text-base focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
            {error && <p className="text-error text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-accent-primary text-white font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Setting up…' : 'Let\'s go'}
            </button>
            <button
              type="button"
              onClick={() => { setShowNameForm(false); setError('') }}
              className="text-text-secondary text-sm underline underline-offset-2 hover:text-text-primary transition-colors text-center"
            >
              Back
            </button>
          </form>
        )}

        {error && !showNameForm && <p className="text-error text-sm text-center">{error}</p>}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#fff" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#ffffffcc" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#ffffffaa" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#ffffffdd" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
