import { getSupabase } from '../_lib/supabase.js'
import { json } from '../_lib/response.js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const { accessToken } = (await req.json()) as { accessToken?: string }
  if (!accessToken) return json({ error: 'accessToken is required' }, 400)

  const supabase = getSupabase()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken)
  if (authError || !user) return json({ error: 'Invalid or expired token' }, 401)

  const googleSub = user.id
  const googleDisplayName = (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Player'
  ).slice(0, 30) as string

  const { data: existing } = await supabase
    .from('users')
    .select('id, display_name')
    .eq('google_sub', googleSub)
    .single()

  if (existing) {
    return json({ userId: existing.id, displayName: existing.display_name })
  }

  const newUserId = crypto.randomUUID()
  const { error: insertError } = await supabase
    .from('users')
    .insert({ id: newUserId, display_name: googleDisplayName, google_sub: googleSub })

  if (insertError) return json({ error: insertError.message }, 500)

  return json({ userId: newUserId, displayName: googleDisplayName, isNewUser: true })
}
