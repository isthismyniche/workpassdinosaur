import { useEffect, useState } from 'react'
import { apiGet, apiPatch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { Nav } from '../components/Nav'
import type { MeResponse } from '../types'

export function MePage() {
  const { displayName, signOut, updateDisplayName } = useAuth()
  const [stats, setStats] = useState<MeResponse | null>(null)
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    apiGet<MeResponse>('/api/me').then(setStats).catch(() => {})
  }, [])

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

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 gap-8">

        {/* Profile header */}
        <div className="flex items-center gap-4">
          <picture>
            <source srcSet="/mascot/neutral.webp" type="image/webp" />
            <img src="/mascot/neutral.png" alt="Dino" className="w-20" />
          </picture>
          <div className="flex flex-col gap-1">
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
                <div className="flex gap-2">
                  <button onClick={saveName} disabled={saving} className="text-sm font-semibold text-accent-primary hover:opacity-75 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => { setEditing(false); setSaveError('') }} className="text-sm text-text-secondary hover:text-text-primary">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="font-display text-2xl font-bold text-text-primary">{displayName}</h1>
                <button
                  onClick={() => { setNameInput(displayName ?? ''); setEditing(true) }}
                  className="text-xs text-text-secondary underline underline-offset-2 hover:text-text-primary text-left"
                >
                  Edit name
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total score" value={stats.totalScore > 0 ? `+${stats.totalScore}` : String(stats.totalScore)} highlight={stats.totalScore >= 0} />
            <StatCard label="Days played" value={String(stats.daysPlayed)} />
            <StatCard label="Current streak" value={`${stats.currentStreak}d`} />
            <StatCard
              label="Calibration"
              value={stats.calibrationPct !== null ? `${stats.calibrationPct}%` : '—'}
              subtitle="High-certainty correct"
            />
          </div>
        )}

        {!stats && (
          <div className="flex justify-center py-4">
            <div className="w-7 h-7 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={signOut}
          className="text-sm text-text-secondary underline underline-offset-2 hover:text-text-primary text-center mt-auto"
        >
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
    <div className="bg-bg-card rounded-2xl border border-black/5 px-4 py-4 flex flex-col gap-1">
      <p className="text-xs text-text-secondary font-semibold uppercase tracking-wide">{label}</p>
      <p className={`font-display text-2xl font-bold tabular-nums ${highlight ? 'text-success' : 'text-text-primary'}`}>{value}</p>
      {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
    </div>
  )
}
