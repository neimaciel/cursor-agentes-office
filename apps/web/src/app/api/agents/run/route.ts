import { NextResponse } from 'next/server';
import { callMcp } from '@/lib/supabase';

export async function POST(req: Request) {
  const body = await req.json();
  const orgId = process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'demo-org';
  const { agentKey, input } = body as { agentKey: string; input: unknown };
  // Check config enabled
  const cfg = await callMcp('agents.getConfig', { orgId, agentKey });
  if (!cfg || !cfg.enabled) {
    return NextResponse.json({ error: 'Agent disabled' }, { status: 403 });
  }
  const result = await callMcp('agents.run', { orgId, agentKey, input });
  return NextResponse.json(result);
}

