import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { canSeeIssue, getIssue } from '@/lib/server/issues';
import { jsonError } from '@/lib/server/json';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;
  try {
    const { id } = await context.params;
    const issue = await getIssue(id);
    if (!canSeeIssue(auth.user, issue)) return NextResponse.json({ message: '无权限查看' }, { status: 403 });
    return NextResponse.json({ issue });
  } catch (error) {
    return jsonError(error, 404);
  }
}
