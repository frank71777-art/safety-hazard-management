import { NextResponse } from 'next/server';

export function jsonError(error: unknown, status = 500) {
  return NextResponse.json({ message: error instanceof Error ? error.message : '服务器错误' }, { status });
}
