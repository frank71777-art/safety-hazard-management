import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { canSeeIssue, getIssue, logIssue } from '@/lib/server/issues';
import { jsonError } from '@/lib/server/json';
import { supabase } from '@/lib/server/supabase';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;

  try {
    const { id } = await context.params;
    const { note } = await req.json();
    if (!note) return NextResponse.json({ message: '退回原因不能为空' }, { status: 400 });
    const issue = await getIssue(id);
    if (!canSeeIssue(auth.user, issue)) return NextResponse.json({ message: '无权限操作' }, { status: 403 });
    const { error } = await supabase.from('issues').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    await logIssue(id, '退回', auth.user.name, note);
    return NextResponse.json({ issue: await getIssue(id) });
  } catch (error) {
    return jsonError(error, 400);
  }
}
