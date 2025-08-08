import { NextResponse } from 'next/server';
import { supabaseAdmin, DEMO_ORG_UUID } from '@/lib/supabaseAdmin';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin.from('clients').select('*').eq('org_id', DEMO_ORG_UUID).eq('id', params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from('clients')
    .update({ name: body.name, email: body.email, phone: body.phone, tags: body.tags })
    .eq('org_id', DEMO_ORG_UUID)
    .eq('id', params.id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

