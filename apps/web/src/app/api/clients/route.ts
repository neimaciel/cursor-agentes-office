import { NextResponse } from 'next/server';
import { supabaseAdmin, DEMO_ORG_UUID } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.toLowerCase() ?? '';
  let query = supabaseAdmin.from('clients').select('*').eq('org_id', DEMO_ORG_UUID).order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const filtered = q ? (data ?? []).filter((c) => c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.tags?.toLowerCase().includes(q)) : data;
  return NextResponse.json(filtered);
}

export async function POST(req: Request) {
  const body = await req.json();
  const payload = {
    org_id: DEMO_ORG_UUID,
    name: body.name as string,
    email: (body.email as string) ?? null,
    phone: (body.phone as string) ?? null,
    tags: (body.tags as string) ?? null,
  };
  const { data, error } = await supabaseAdmin.from('clients').insert(payload).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

