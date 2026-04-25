import { getSupabase } from './_lib/supabase.js'
import { authenticateRequest } from './_lib/auth.js'
import { getTodaySGT } from './_lib/dates.js'
import { json } from './_lib/response.js'
import { computeScore, TIMEOUT_CERTAINTY, DEFAULT_CERTAINTY } from './_lib/scoring.js'
import type { Certainty } from './_lib/scoring.js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const userIdOrResponse = await authenticateRequest(req)
  if (userIdOrResponse instanceof Response) return userIdOrResponse
  const userId = userIdOrResponse

  const body = (await req.json()) as {
    questionId?: string
    submittedOption?: string | null
    certainty?: string
  }

  if (!body.questionId) return json({ error: 'questionId is required' }, 400)

  const supabase = getSupabase()
  const today = getTodaySGT()

  // Verify the question belongs to today's set
  const { data: question, error: qErr } = await supabase
    .from('questions')
    .select('id, correct_option, date')
    .eq('id', body.questionId)
    .single()

  if (qErr || !question) return json({ error: 'Question not found' }, 404)
  if (question.date !== today) return json({ error: 'Question is not from today' }, 400)

  // Resolve submitted option and certainty
  const submittedOption = body.submittedOption?.toUpperCase() ?? null
  const validOptions = new Set(['A', 'B', 'C', 'D'])
  const resolvedOption = submittedOption && validOptions.has(submittedOption) ? submittedOption : null

  // Certainty: if no option submitted (timeout) use TIMEOUT_CERTAINTY; if option but no certainty use DEFAULT_CERTAINTY
  let certainty: Certainty
  if (resolvedOption === null) {
    certainty = TIMEOUT_CERTAINTY
  } else if (body.certainty && ['low', 'medium', 'high'].includes(body.certainty)) {
    certainty = body.certainty as Certainty
  } else {
    certainty = DEFAULT_CERTAINTY
  }

  const isCorrect = resolvedOption === question.correct_option
  const scoreDelta = computeScore(isCorrect, certainty)

  // Insert attempt — unique (user_id, question_id) constraint acts as double-submit guard
  const { error: insertErr } = await supabase.from('attempts').insert({
    user_id: userId,
    question_id: body.questionId,
    submitted_option: resolvedOption,
    certainty,
    is_correct: isCorrect,
    score_delta: scoreDelta,
  })

  if (insertErr) {
    if (insertErr.code === '23505') return json({ error: 'Already submitted' }, 409)
    return json({ error: insertErr.message }, 500)
  }

  // Upsert daily_summaries
  const isHighCert = certainty === 'high'
  const { data: existing } = await supabase
    .from('daily_summaries')
    .select('total_score, questions_answered, high_correct, high_total')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (existing) {
    await supabase.from('daily_summaries').update({
      total_score: existing.total_score + scoreDelta,
      questions_answered: existing.questions_answered + 1,
      high_correct: existing.high_correct + (isHighCert && isCorrect ? 1 : 0),
      high_total: existing.high_total + (isHighCert ? 1 : 0),
    }).eq('user_id', userId).eq('date', today)
  } else {
    await supabase.from('daily_summaries').insert({
      user_id: userId,
      date: today,
      total_score: scoreDelta,
      questions_answered: 1,
      high_correct: isHighCert && isCorrect ? 1 : 0,
      high_total: isHighCert ? 1 : 0,
    })
  }

  return json({ ok: true })
}
