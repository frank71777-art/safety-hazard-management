import { NextResponse, type NextRequest } from 'next/server';
import { requireRole, requireUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/json';
import { supabase } from '@/lib/server/supabase';
import type { Issue } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;
  const roleError = requireRole(auth.user, ['admin', 'hsse']);
  if (roleError) return roleError;

  try {
    const [{ data: issues, error }, { data: departments }] = await Promise.all([
      supabase.from('issues').select('*'),
      supabase.from('departments').select('*').order('created_at')
    ]);
    if (error) throw error;
    const items = issues as Issue[];
    const byDepartment = (departments ?? []).map((dept) => {
      const scoped = items.filter((issue) => issue.responsible_dept_id === dept.id);
      const closed = scoped.filter((issue) => issue.status === 'closed').length;
      return {
        deptName: dept.name,
        total: scoped.length,
        closed,
        completionRate: scoped.length ? Math.round((closed / scoped.length) * 100) : 0
      };
    });
    return NextResponse.json({
      stats: {
        total: items.length,
        closed: items.filter((issue) => issue.status === 'closed').length,
        highRisk: items.filter((issue) => issue.risk_level === 'high').length,
        active: items.filter((issue) => !['closed', 'draft'].includes(issue.status)).length,
        byDepartment
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
