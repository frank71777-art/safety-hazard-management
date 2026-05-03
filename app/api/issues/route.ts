import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { getIssue, issueNo, logIssue } from '@/lib/server/issues';
import { jsonError } from '@/lib/server/json';
import { supabase } from '@/lib/server/supabase';
import type { Issue } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;
  const user = auth.user;

  try {
    let query = supabase.from('issues').select('*').order('created_at', { ascending: false });
    if (user.role === 'reporter') query = query.eq('reporter_id', user.id);
    if (user.role === 'manager') query = query.or(`responsible_user_id.eq.${user.id},responsible_dept_id.eq.${user.dept_id}`);
    if (user.role === 'safety_officer') query = query.eq('responsible_dept_id', user.dept_id);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ issues: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;
  const user = auth.user;
  if (!['reporter', 'admin'].includes(user.role)) return NextResponse.json({ message: '无权限上报' }, { status: 403 });

  try {
    const { description, location, photos = [], status = 'pending' } = (await req.json()) as Partial<Issue>;
    if (!description || !location) return NextResponse.json({ message: '问题描述和位置不能为空' }, { status: 400 });
    const { data, error } = await supabase
      .from('issues')
      .insert({
        issue_no: issueNo(),
        reporter_id: user.id,
        reporter_name: user.name,
        description,
        location,
        photos,
        status
      })
      .select('*')
      .single();
    if (error) throw error;
    await logIssue(data.id, status === 'draft' ? '保存草稿' : '提交上报', user.name);
    return NextResponse.json({ issue: await getIssue(data.id) });
  } catch (error) {
    return jsonError(error, 400);
  }
}
