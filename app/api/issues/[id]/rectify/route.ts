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
    if (!['admin', 'manager'].includes(auth.user.role) || !canSeeIssue(auth.user, issue)) {
      return NextResponse.json({ message: '无权限整改' }, { status: 403 });
    }
    const { rectify_desc, rectify_photos } = await req.json();
    if (!rectify_desc || !rectify_photos?.length) return NextResponse.json({ message: '整改说明和照片不能为空' }, { status: 400 });
    const { error } = await supabase
      .from('issues')
      .update({
        status: 'checking',
        rectify_desc,
        rectify_photos,
        rectified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    if (error) throw error;
    await logIssue(id, '整改完成', auth.user.name, rectify_desc);
    return NextResponse.json({ issue: await getIssue(id) });
  } catch (error) {
    return jsonError(error, 400);
  }
}
