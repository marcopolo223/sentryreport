/** Shared by Edge middleware and the server client. Keep this file Edge-safe. */
export function getSupabasePublicEnv(): { url: string; key: string } | null {
  const url = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return { url, key };
}

function sanitizeEnv(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}
