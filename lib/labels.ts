import imageCompression from 'browser-image-compression';
import type { IssueStatus, RiskLevel, Role } from './types';

export const roleLabels: Record<Role, string> = {
  admin: '系统管理员',
  hsse: 'HSSE',
  manager: '部门经理',
  safety_officer: '部门安全员',
  reporter: '员工'
};

export const statusLabels: Record<IssueStatus, string> = {
  draft: '草稿',
  pending: '待HSSE定责',
  assigned: '已派工',
  rectifying: '整改中',
  checking: '待验收',
  closed: '已闭环',
  rejected: '已退回'
};

export const riskLabels: Record<RiskLevel, string> = {
  normal: '一般风险',
  high: '重大风险'
};

export function gmtDateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'GMT',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function cnCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return '\ufeff';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return `\ufeff${headers.join(',')}\n${rows.map((row) => headers.map((header) => escape(row[header])).join(',')).join('\n')}`;
}

export async function compressImage(file: File) {
  return imageCompression(file, {
    maxWidthOrHeight: 1200,
    maxSizeMB: 1,
    initialQuality: 0.8,
    useWebWorker: true
  });
}
