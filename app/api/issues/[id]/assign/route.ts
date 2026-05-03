import { NextResponse, type NextRequest } from 'next/server';
import { requireRole, requireUser } from '@/lib/server/auth';
import { getIssue, logIssue } from '@/lib/server/issues';
import { jsonError } from '@/lib/server/json';
import { supabase } from '@/lib/server/supabase';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;
  const roleError = requireRole(auth.user, ['admin', 'hsse']);
  if (roleError) return roleError;

  try {
    const { id } = await context.params;
    const { risk_level, responsible_dept_id, responsible_user_id, rectify_requirement, deadline } = await req.json();
    const [{ data: dept }, { data: responsibleUser }] = await Promise.all([
      supabase.from('departments').select('id,name').eq('id', responsible_dept_id).single(),
      supabase.from('users').select('id,name').eq('id', responsible_user_id).single()
    ]);
    if (!dept || !responsibleUser) return NextResponse.json({ message: '责任部门或责任人不存在' }, { status: 400 });
    const { error } = await supabase
      .from('issues')
      .update({
        status: 'assigned',
        risk_level,
        responsible_dept_id,
        responsible_dept_name: dept.name,
        responsible_user_id,
        responsible_user_name: responsibleUser.name,
        rectify_requirement,
        deadline,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    if (error) throw error;
    await logIssue(id, 'HSSE定责分派', auth.user.name, rectify_requirement);
    return NextResponse.json({ issue: await getIssue(id) });
  } catch (error) {
    return jsonError(error, 400);
  }
}
