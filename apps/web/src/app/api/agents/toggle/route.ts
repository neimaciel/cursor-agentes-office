import { NextResponse } from 'next/server';
import { callMcp } from '@/lib/supabase';

export async function POST(req: Request) {
  const body = await req.json();
  const orgId = process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'demo-org';
  const { agentKey, enabled } = body as { agentKey: string; enabled: boolean };
  const data = await callMcp('agents.toggle', { orgId, agentKey, enabled });
  return NextResponse.json(data);
}

