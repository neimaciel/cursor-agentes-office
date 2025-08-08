import { NextResponse } from 'next/server';
import { callMcp } from '@/lib/supabase';

export async function GET() {
  const orgId = process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'demo-org';
  const data = await callMcp('agents.list', { orgId });
  return NextResponse.json(data);
}

