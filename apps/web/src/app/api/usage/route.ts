import { NextResponse } from 'next/server';
import { supabaseAdmin, DEMO_ORG_UUID } from '@/lib/supabaseAdmin';

export async function GET() {
  const period = new Date().toISOString().slice(0, 7);
  const [{ data: usage }, { data: runs }] = await Promise.all([
    supabaseAdmin.from('usage_counters').select('*').eq('org_id', DEMO_ORG_UUID).eq('period', period).maybeSingle(),
    supabaseAdmin.from('agent_runs').select('id').eq('org_id', DEMO_ORG_UUID).gte('created_at', `${period}-01`),
  ]);
  const totalRuns = runs?.length ?? 0;
  return NextResponse.json({
    period,
    totalRuns,
    tokensIn: usage?.tokens_in ?? 0,
    tokensOut: usage?.tokens_out ?? 0,
    costCents: usage?.cost_cents ?? 0,
  });
}

