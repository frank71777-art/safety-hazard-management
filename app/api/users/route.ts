import bcrypt from 'bcryptjs';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRole, requireUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/json';
import { supabase } from '@/lib/server/supabase';
import type { Role } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;
  const { searchParams } = new URL(req.url);
  const deptId = searchParams.get('dept_id');
  const role = searchParams.get('role');
  if (!['admin', 'hsse'].includes(auth.user.role) && !deptId) {
    return NextResponse.json({ message: '无权限操作' }, { status: 403 });
  }

  try {
    let query = supabase.from('users').select('id, username, name, role, dept_id, department:departments(id,name)').order('created_at');
    if (deptId) query = query.eq('dept_id', deptId);
    if (role) query = query.eq('role', role);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ users: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;
  const roleError = requireRole(auth.user, ['admin']);
  if (roleError) return roleError;

  try {
    const { username, password, name, role, dept_id } = (await req.json()) as {
      username?: string;
      password?: string;
      name?: string;
      role?: Role;
      dept_id?: string;
    };
    if (!username || !password || !name || !role) return NextResponse.json({ message: '缺少必填项' }, { status: 400 });
    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert({ username, password_hash, name, role, dept_id: dept_id || null })
      .select('id, username, name, role, dept_id, department:departments(id,name)')
      .single();
    if (error) throw error;
    return NextResponse.json({ user: data });
  } catch (error) {
    return jsonError(error, 400);
  }
}
