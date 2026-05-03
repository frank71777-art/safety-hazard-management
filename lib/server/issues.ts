import type { Issue, User } from '../types';
import { supabase } from './supabase';

export function issueNo() {
  return `ISS${Date.now().toString(36).toUpperCase()}`;
}

export async function logIssue(issueId: string, action: string, userName: string, note?: string) {
  await supabase.from('issue_logs').insert({ issue_id: issueId, action, user_name: userName, note });
}

export async function getIssue(id: string) {
  const { data, error } = await supabase
    .from('issues')
    .select('*, logs:issue_logs(*)')
    .eq('id', id)
    .order('created_at', { referencedTable: 'issue_logs', ascending: true })
    .single();
  if (error) throw error;
  return data as Issue;
}

export function canSeeIssue(user: User, issue: Issue) {
  if (user.role === 'admin' || user.role === 'hsse') return true;
  if (user.role === 'reporter') return issue.reporter_id === user.id;
  if (user.role === 'manager') return issue.responsible_user_id === user.id || issue.responsible_dept_id === user.dept_id;
  if (user.role === 'safety_officer') return issue.responsible_dept_id === user.dept_id;
  return false;
}
