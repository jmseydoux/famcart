// Verify a Supabase access token by calling the Supabase Auth REST API.
// Returns the Supabase user on success, throws on invalid/expired token.
export async function verifySupabaseToken(token: string): Promise<{
  id: string
  email: string
  user_metadata: Record<string, unknown>
}> {
  const url = `${process.env.SUPABASE_URL}/auth/v1/user`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.SUPABASE_SECRET_KEY!,
    },
  })

  if (!res.ok) throw new Error('Invalid or expired token')

  const user = await res.json() as { id: string; email: string; user_metadata: Record<string, unknown> }
  return user
}
