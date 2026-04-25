import { createClient } from '@supabase/supabase-js'

// Frontend-only Supabase client — uses the public anon key.
// Used exclusively for Auth (Google OAuth flow). No direct DB access from frontend.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)
