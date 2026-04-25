import { getSupabase } from '../_lib/supabase.js'
import { authenticateRequest } from '../_lib/auth.js'
import { getTodaySGT } from '../_lib/dates.js'
import { json } from '../_lib/response.js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const userIdOrResponse = await authenticateRequest(req)
  if (userIdOrResponse instanceof Response) return userIdOrResponse
  const userId = userIdOrResponse

  const url = new URL(req.url)
  const date = url.pathname.split('/').pop()

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, 400)
  }

  const today = getTodaySGT()
  if (date === today) {
    return json({ error: 'Use /api/reveal for today\'s results' }, 400)
  }
  if (date > today) {
    return json({ error: 'Future dates are not available' }, 400)
  }

  const supabase = getSupabase()

  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, category, question_text, option_a, option_b, option_c, option_d, source_url, source_fetched_at, correct_option, explanation')
    .eq('date', date)

  if (qErr) return json({ error: qErr.message }, 500)
  if (!questions || questions.length === 0) return json({ error: 'No questions for this date' }, 404)

  const questionIds = questions.map(q => q.id)
  const { data: attempts } = await supabase
    .from('attempts')
    .select('question_id, submitted_option, certainty, is_correct, score_delta')
    .eq('user_id', userId)
    .in('question_id', questionIds)

  const attemptMap = new Map((attempts ?? []).map(a => [a.question_id, a]))
  const userAttempted = attemptMap.size > 0

  const { data: summary } = userAttempted
    ? await supabase
        .from('daily_summaries')
        .select('total_score')
        .eq('user_id', userId)
        .eq('date', date)
        .single()
    : { data: null }

  const ORDER: Record<string, number> = { policies: 0, processes: 1, systems: 2 }
  const sorted = [...questions].sort((a, b) => ORDER[a.category] - ORDER[b.category])

  return json({
    date,
    attempted: userAttempted,
    totalScore: summary?.total_score ?? null,
    questions: sorted.map(q => {
      const attempt = attemptMap.get(q.id)
      const base = {
        id: q.id,
        category: q.category,
        questionText: q.question_text,
        options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
        sourceUrl: q.source_url,
        sourceFetchedAt: q.source_fetched_at,
      }
      if (!attempt) return { ...base, locked: true }
      return {
        ...base,
        locked: false,
        correctOption: q.correct_option,
        submittedOption: attempt.submitted_option,
        certainty: attempt.certainty,
        isCorrect: attempt.is_correct,
        scoreDelta: attempt.score_delta,
        explanation: q.explanation,
      }
    }),
  })
}
