import type { Department, Issue, RiskLevel, Stats, User } from './types';

const TOKEN_KEY = 'port-safety-token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, remember: boolean) {
  if (remember) localStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? '请求失败');
  return data as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  me: () => request<{ user: User }>('/api/auth/me'),
  departments: () => request<{ departments: Department[] }>('/api/departments'),
  users: (deptId?: string, role?: string) => {
    const params = new URLSearchParams();
    if (deptId) params.set('dept_id', deptId);
    if (role) params.set('role', role);
    return request<{ users: User[] }>(`/api/users?${params}`);
  },
  createUser: (payload: Partial<User> & { password: string }) =>
    request<{ user: User }>('/api/users', { method: 'POST', body: JSON.stringify(payload) }),
  issues: () => request<{ issues: Issue[] }>('/api/issues'),
  issue: (id: string) => request<{ issue: Issue }>(`/api/issues/${id}`),
  createIssue: (payload: { description: string; location: string; photos: string[]; status: 'draft' | 'pending' }) =>
    request<{ issue: Issue }>('/api/issues', { method: 'POST', body: JSON.stringify(payload) }),
  assignIssue: (
    id: string,
    payload: {
      risk_level: RiskLevel;
      responsible_dept_id: string;
      responsible_user_id: string;
      rectify_requirement: string;
      deadline: string;
    }
  ) => request<{ issue: Issue }>(`/api/issues/${id}/assign`, { method: 'PATCH', body: JSON.stringify(payload) }),
  rejectIssue: (id: string, note: string) =>
    request<{ issue: Issue }>(`/api/issues/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ note }) }),
  rectifyIssue: (id: string, payload: { rectify_desc: string; rectify_photos: string[] }) =>
    request<{ issue: Issue }>(`/api/issues/${id}/rectify`, { method: 'PATCH', body: JSON.stringify(payload) }),
  checkIssue: (id: string, payload: { result: 'pass' | 'reject'; note: string }) =>
    request<{ issue: Issue }>(`/api/issues/${id}/check`, { method: 'PATCH', body: JSON.stringify(payload) }),
  upload: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ url: string }>('/api/upload', { method: 'POST', body: form });
  },
  stats: () => request<{ stats: Stats }>('/api/stats')
};
