import { createBrowserClient, createServerClient } from '@supabase/ssr';

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function createSupabaseServer(cookies: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key: string) => cookies.get(key)?.value,
        set: (key: string, value: string, options: any) => cookies.set(key, value, options),
        remove: (key: string, options: any) => cookies.set(key, '', { ...options, maxAge: 0 }),
      },
    }
  );
}

export async function callMcp(tool: string, params: unknown) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_URL}/mcp-supabase`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, params }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

