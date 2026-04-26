import { useEffect, useState } from 'react'
import { ShieldCheck, AlertTriangle } from 'lucide-react'
import { apiGet, apiPatch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { Nav } from '../components/Nav'
import type { MeResponse } from '../types'

type LinkState = 'idle' | 'loading' | 'success' | 'conflict' | 'error'

export function MePage() {
  const { displayName, googleLinked, linkGoogleAccount, updateDisplayName, signOut, setGoogleLinkedState } = useAuth()
  const [stats, setStats] = useState<MeResponse | null>(null)
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [linkState, setLinkState] = useState<LinkState>('idle')

  // Sync googleLinked from API (source of truth)
  useEffect(() => {
    apiGet<MeResponse>('/api/me').then(data => {
      setStats(data)
      if (data.googleLinked) setGoogleLinkedState(true)
    }).catch(() => {})
  }, [setGoogleLinkedState])

  // After returning from Google OAuth linking redirect, detect success via linkState
  useEffect(() => {
    // If googleLinked flipped to true after a page load, show success briefly
    if (googleLinked && linkState === 'loading') setLinkState('success')
  }, [googleLinked, linkState])

  async function handleLinkGoogle() {
    setLinkState('loading')
    try {
      await linkGoogleAccount()
      // Page redirects to Google — execution stops here.
      // On return, AuthContext handles the link and sets googleLinked = true.
    } catch {
      setLinkState('error')
    }
  }

  async function saveName() {
    const name = nameInput.trim()
    if (!name) return
    if (name.length > 30) { setSaveError('Max 30 characters'); return }
    setSaving(true)
    setSaveError('')
    try {
      await apiPatch('/api/me', { displayName: name })
      updateDisplayName(name)
      setEditing(false)
    } catch {
      setSaveError('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  // Determine linked status from API response (more reliable than localStorage on first load)
  const isGoogleLinked = stats?.googleLinked ?? googleLinked

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 gap-6">

        {/* Profile header */}
        <div className="flex items-center gap-4">
          <picture>
            <source srcSet="/mascot/neutral.webp" type="image/webp" />
            <img src="/mascot/neutral.png" alt="Dino" className="w-20" />
          </picture>
          <div className="flex flex-col gap-1 min-w-0">
            {editing ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  maxLength={30}
                  autoFocus
                  className="px-3 py-1.5 rounded-lg border-2 border-accent-primary text-text-primary text-base bg-bg-card focus:outline-none"
                />
                {saveError && <p className="text-error text-xs">{saveError}</p>}
                <div className="flex gap-3">
                  <button onClick={saveName} disabled={saving}
                    className="text-sm font-semibold text-accent-primary hover:opacity-75 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => { setEditing(false); setSaveError('') }}
                    className="text-sm text-text-secondary hover:text-text-primary">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="font-display text-2xl font-bold text-text-primary truncate">{displayName}</h1>
                <button
                  onClick={() => { setNameInput(displayName ?? ''); setEditing(true) }}
                  className="text-xs text-text-secondary underline underline-offset-2 hover:text-text-primary text-left">
                  Edit name
                </button>
              </>
            )}
          </div>
        </div>

        {/* Google link nudge / status */}
        {!isGoogleLinked ? (
          <div className="flex flex-col gap-3 bg-accent-warm/8 border border-accent-warm/30 rounded-2xl p-4"
               style={{ backgroundColor: 'color-mix(in srgb, #C9A063 8%, white)' }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-accent-warm shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-bold text-text-primary">Your dino creds aren't backed up</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Connect Google to protect your dino creds and streak across devices. If this browser's cache is cleared, your progress could be lost.
                </p>
              </div>
            </div>
            {linkState === 'conflict' && (
              <p className="text-xs text-error">
                That Google account is already linked to a different profile.
              </p>
            )}
            {linkState === 'error' && (
              <p className="text-xs text-error">Something went wrong. Try again.</p>
            )}
            <button
              onClick={handleLinkGoogle}
              disabled={linkState === 'loading'}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-text-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <GoogleIcon />
              {linkState === 'loading' ? 'Connecting…' : 'Connect Google Account'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-success/8 border border-success/20 rounded-2xl px-4 py-3"
               style={{ backgroundColor: 'color-mix(in srgb, #5A8F6B 8%, white)' }}>
            <ShieldCheck size={18} className="text-success shrink-0" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Dino creds backed up</p>
              <p className="text-xs text-text-secondary">Google account connected — your progress is safe.</p>
            </div>
          </div>
        )}

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total dino creds"
              value={stats.totalScore > 0 ? `+${stats.totalScore}` : String(stats.totalScore)}
              highlight={stats.totalScore >= 0} />
            <StatCard label="Days played" value={String(stats.daysPlayed)} />
            <StatCard label="Current streak" value={`${stats.currentStreak}d`} />
            <StatCard
              label="Calibration"
              value={stats.calibrationPct !== null ? `${stats.calibrationPct}%` : '—'}
              subtitle="High-certainty correct" />
          </div>
        )}

        {!stats && (
          <div className="flex justify-center py-4">
            <div className="w-7 h-7 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <button
          onClick={signOut}
          className="text-sm text-text-secondary underline underline-offset-2 hover:text-text-primary text-center mt-auto">
          Sign out
        </button>
      </main>
      <Nav />
    </div>
  )
}

function StatCard({ label, value, subtitle, highlight }: {
  label: string; value: string; subtitle?: string; highlight?: boolean
}) {
  return (
    <div className="bg-bg-card rounded-2xl border border-border px-4 py-4 flex flex-col gap-1">
      <p className="text-xs text-text-secondary font-semibold uppercase tracking-wide">{label}</p>
      <p className={`font-display text-2xl font-bold tabular-nums ${highlight ? 'text-success' : 'text-text-primary'}`}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#fff" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#ffffffcc" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#ffffffaa" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#ffffffdd" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
