import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/json';
import { supabase } from '@/lib/server/supabase';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;
  try {
    const { data, error } = await supabase.from('departments').select('*').order('created_at');
    if (error) throw error;
    return NextResponse.json({ departments: data });
  } catch (error) {
    return jsonError(error);
  }
}
