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
    const issue = await getIssue(id);
    if (!['admin', 'safety_officer'].includes(auth.user.role) || !canSeeIssue(auth.user, issue)) {
      return NextResponse.json({ message: '无权限验收' }, { status: 403 });
    }
    const { result, note } = await req.json();
    if (!result || !note) return NextResponse.json({ message: '验收意见不能为空' }, { status: 400 });
    const { error } = await supabase
      .from('issues')
      .update({
        status: result === 'pass' ? 'closed' : 'rectifying',
        check_result: result,
        check_note: note,
        checked_at: new Date().toISOString(),
        safety_officer_id: auth.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    if (error) throw error;
    await logIssue(id, result === 'pass' ? '验收通过' : '验收退回', auth.user.name, note);
    return NextResponse.json({ issue: await getIssue(id) });
  } catch (error) {
    return jsonError(error, 400);
  }
}
