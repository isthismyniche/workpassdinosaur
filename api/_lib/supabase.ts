import { createClient } from '@supabase/supabase-js'

// Server-side client using service role key — bypasses RLS.
// Never expose the service role key to the frontend.
export function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(url, key)
}
