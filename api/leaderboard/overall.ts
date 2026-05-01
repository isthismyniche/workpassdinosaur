import { getSupabase } from '../_lib/supabase.js'
import { authenticateRequest } from '../_lib/auth.js'
import { json } from '../_lib/response.js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const userIdOrResponse = await authenticateRequest(req)
  if (userIdOrResponse instanceof Response) return userIdOrResponse
  const userId = userIdOrResponse

  const supabase = getSupabase()

  const { data: summaries, error } = await supabase
    .from('daily_summaries')
    .select('user_id, total_score, questions_answered, high_correct, high_total')
    .eq('is_catchup', false)

  if (error) return json({ error: error.message }, 500)

  const userMap = new Map<string, { totalScore: number; daysPlayed: number; highCorrect: number; highTotal: number }>()
  for (const s of (summaries ?? [])) {
    const existing = userMap.get(s.user_id) ?? { totalScore: 0, daysPlayed: 0, highCorrect: 0, highTotal: 0 }
    userMap.set(s.user_id, {
      totalScore: existing.totalScore + s.total_score,
      daysPlayed: existing.daysPlayed + (s.questions_answered > 0 ? 1 : 0),
      highCorrect: existing.highCorrect + s.high_correct,
      highTotal: existing.highTotal + s.high_total,
    })
  }

  if (userMap.size === 0) return json({ entries: [], userRank: null })

  const userIds = [...userMap.keys()]
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name')
    .in('id', userIds)

  const nameMap = new Map((users ?? []).map(u => [u.id, u.display_name]))

  // Sort: total score desc, days played desc, calibration% desc, alphabetical
  const entries = userIds.map(uid => {
    const stats = userMap.get(uid)!
    const calibration = stats.highTotal > 0 ? stats.highCorrect / stats.highTotal : 0
    return {
      userId: uid,
      displayName: nameMap.get(uid) ?? 'Unknown',
      totalScore: stats.totalScore,
      daysPlayed: stats.daysPlayed,
      calibrationPct: stats.highTotal > 0 ? Math.round(calibration * 100) : null,
      _calibration: calibration,
    }
  }).sort((a, b) =>
    b.totalScore - a.totalScore ||
    b.daysPlayed - a.daysPlayed ||
    b._calibration - a._calibration ||
    a.displayName.localeCompare(b.displayName)
  )

  const ranked = entries.map((e, i) => ({
    rank: i + 1,
    userId: e.userId,
    displayName: e.displayName,
    totalScore: e.totalScore,
    daysPlayed: e.daysPlayed,
    calibrationPct: e.calibrationPct,
    isCurrentUser: e.userId === userId,
  }))

  const userRank = ranked.find(e => e.userId === userId)?.rank ?? null
  const top50 = ranked.slice(0, 50)

  const currentUserEntry = ranked.find(e => e.userId === userId)
  if (currentUserEntry && !top50.find(e => e.userId === userId)) {
    top50.push(currentUserEntry)
  }

  return json({ entries: top50, userRank })
}
