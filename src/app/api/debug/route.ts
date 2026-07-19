import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = supabaseAdmin();
  const { data: roles } = await s.from('support_roles').select('*');
  const { data: profiles } = await s.from('support_staff_profiles').select('*');
  
  return NextResponse.json({ roles, profiles });
}
