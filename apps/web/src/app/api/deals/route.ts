import { NextResponse } from 'next/server';
import { supabaseAdmin, DEMO_ORG_UUID } from '@/lib/supabaseAdmin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('deals')
    .select('*')
    .eq('org_id', DEMO_ORG_UUID)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  const { id, stage } = await req.json();
  const { error } = await supabaseAdmin
    .from('deals')
    .update({ stage })
    .eq('org_id', DEMO_ORG_UUID)
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

