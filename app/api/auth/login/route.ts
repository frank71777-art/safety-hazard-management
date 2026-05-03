import bcrypt from 'bcryptjs';
import { NextResponse, type NextRequest } from 'next/server';
import { signToken } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/json';
import { supabase } from '@/lib/server/supabase';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) return NextResponse.json({ message: '请输入用户名和密码' }, { status: 400 });

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, name, role, dept_id, department:departments(id,name)')
      .eq('username', username)
      .single();

    if (error || !user) return NextResponse.json({ message: '用户名或密码错误' }, { status: 401 });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return NextResponse.json({ message: '用户名或密码错误' }, { status: 401 });

    const safeUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      dept_id: user.dept_id,
      department: user.department
    };
    return NextResponse.json({ token: signToken(user), user: safeUser });
  } catch (error) {
    return jsonError(error);
  }
}
