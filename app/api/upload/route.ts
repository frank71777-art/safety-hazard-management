import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/json';
import { supabase } from '@/lib/server/supabase';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ message: '未收到图片文件' }, { status: 400 });
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('issue-photos').upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || 'image/jpeg',
      upsert: false
    });
    if (error) throw error;
    const { data } = supabase.storage.from('issue-photos').getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    return jsonError(error, 400);
  }
}
