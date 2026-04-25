import { getSupabase } from '../_lib/supabase.js'
import { authenticateRequest } from '../_lib/auth.js'
import { weekWindowSGT } from '../_lib/dates.js'
import { json } from '../_lib/response.js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const userIdOrResponse = await authenticateRequest(req)
  if (userIdOrResponse instanceof Response) return userIdOrResponse
  const userId = userIdOrResponse

  const supabase = getSupabase()
  const window = weekWindowSGT()
  const startDate = window[0]
  const endDate = window[6]

  // Aggregate scores and calibration over the 7-day window
  const { data: summaries, error } = await supabase
    .from('daily_summaries')
    .select('user_id, total_score, high_correct, high_total')
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) return json({ error: error.message }, 500)

  // Aggregate per user
  const userMap = new Map<string, { totalScore: number; highCorrect: number; highTotal: number }>()
  for (const s of (summaries ?? [])) {
    const existing = userMap.get(s.user_id) ?? { totalScore: 0, highCorrect: 0, highTotal: 0 }
    userMap.set(s.user_id, {
      totalScore: existing.totalScore + s.total_score,
      highCorrect: existing.highCorrect + s.high_correct,
      highTotal: existing.highTotal + s.high_total,
    })
  }

  if (userMap.size === 0) return json({ entries: [], userRank: null })

  // Fetch display names
  const userIds = [...userMap.keys()]
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name')
    .in('id', userIds)

  const nameMap = new Map((users ?? []).map(u => [u.id, u.display_name]))

  // Build + sort entries: score desc, calibration% desc, alphabetical
  const entries = userIds.map(uid => {
    const stats = userMap.get(uid)!
    const calibration = stats.highTotal > 0 ? stats.highCorrect / stats.highTotal : 0
    return {
      userId: uid,
      displayName: nameMap.get(uid) ?? 'Unknown',
      totalScore: stats.totalScore,
      calibrationPct: stats.highTotal > 0 ? Math.round(calibration * 100) : null,
      _calibration: calibration,
    }
  }).sort((a, b) =>
    b.totalScore - a.totalScore ||
    b._calibration - a._calibration ||
    a.displayName.localeCompare(b.displayName)
  )

  const ranked = entries.map((e, i) => ({
    rank: i + 1,
    userId: e.userId,
    displayName: e.displayName,
    totalScore: e.totalScore,
    calibrationPct: e.calibrationPct,
    isCurrentUser: e.userId === userId,
  }))

  const userRank = ranked.find(e => e.userId === userId)?.rank ?? null
  const top50 = ranked.slice(0, 50)

  // Pin current user if outside top 50
  const currentUserEntry = ranked.find(e => e.userId === userId)
  if (currentUserEntry && !top50.find(e => e.userId === userId)) {
    top50.push(currentUserEntry)
  }

  return json({ entries: top50, userRank })
}
