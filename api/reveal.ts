import { getSupabase } from './_lib/supabase.js'
import { authenticateRequest } from './_lib/auth.js'
import { getTodaySGT } from './_lib/dates.js'
import { json } from './_lib/response.js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const userIdOrResponse = await authenticateRequest(req)
  if (userIdOrResponse instanceof Response) return userIdOrResponse
  const userId = userIdOrResponse

  const supabase = getSupabase()
  const today = getTodaySGT()

  // Fetch today's 3 questions (including the fields we withhold from /today)
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, category, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, source_url, source_fetched_at')
    .eq('date', today)

  if (qErr) return json({ error: qErr.message }, 500)
  if (!questions || questions.length === 0) return json({ error: 'No questions for today' }, 404)

  // Fetch this user's attempts for today's questions
  const questionIds = questions.map(q => q.id)
  const { data: attempts, error: aErr } = await supabase
    .from('attempts')
    .select('question_id, submitted_option, certainty, is_correct, score_delta')
    .eq('user_id', userId)
    .in('question_id', questionIds)

  if (aErr) return json({ error: aErr.message }, 500)

  // Gate: all 3 must be submitted
  if ((attempts ?? []).length < questions.length) {
    return json({ error: 'Not all questions have been submitted yet' }, 403)
  }

  const attemptByQuestionId = new Map(attempts!.map(a => [a.question_id, a]))

  // Total score from daily_summaries (single source of truth)
  const { data: summary } = await supabase
    .from('daily_summaries')
    .select('total_score, questions_answered, high_correct, high_total')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  const totalScore = summary?.total_score ?? 0

  // Enforce display order: policies → processes → systems
  const ORDER: Record<string, number> = { policies: 0, processes: 1, systems: 2 }
  const sorted = [...questions].sort((a, b) => ORDER[a.category] - ORDER[b.category])

  return json({
    date: today,
    totalScore,
    questions: sorted.map(q => {
      const attempt = attemptByQuestionId.get(q.id)!
      return {
        id: q.id,
        category: q.category,
        questionText: q.question_text,
        options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
        correctOption: q.correct_option,
        submittedOption: attempt.submitted_option,
        certainty: attempt.certainty,
        isCorrect: attempt.is_correct,
        scoreDelta: attempt.score_delta,
        explanation: q.explanation,
        sourceUrl: q.source_url,
        sourceFetchedAt: q.source_fetched_at,
      }
    }),
  })
}
