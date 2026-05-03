import jwt from 'jsonwebtoken';
import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from './supabase';
import type { Role, User } from '../types';

const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me';

export function signToken(user: Pick<User, 'id' | 'role'>) {
  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: '30d' });
}

export async function getCurrentUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret) as { sub: string };
    const { data, error } = await supabase
      .from('users')
      .select('id, username, name, role, dept_id, department:departments(id,name)')
      .eq('id', payload.sub)
      .single();
    if (error || !data) return null;
    return data as unknown as User;
  } catch {
    return null;
  }
}

export async function requireUser(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return { error: NextResponse.json({ message: '未登录或登录已失效' }, { status: 401 }) };
  return { user };
}

export function requireRole(user: User, roles: Role[]) {
  if (!roles.includes(user.role)) {
    return NextResponse.json({ message: '无权限操作' }, { status: 403 });
  }
  return null;
}
