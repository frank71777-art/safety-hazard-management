'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Upload,
  UserCog,
  UserRound
} from 'lucide-react';
import { api, clearToken, getToken, setToken } from '@/lib/client-api';
import { cnCsv, compressImage, gmtDateTime, riskLabels, roleLabels, statusLabels } from '@/lib/labels';
import type { Department, Issue, RiskLevel, Role, Stats, User } from '@/lib/types';

type View = 'issues' | 'stats' | 'admin' | 'profile' | 'new' | 'detail';

const fallbackDepartments = [
  '装卸事业部-矿石泊位',
  '装卸事业部-通用泊位',
  '公用事业部-油储队',
  '公用事业部-发配电队',
  '公用事业部-水务队',
  '修造车间',
  '装备工艺部',
  '综合部',
  '公共关系部',
  '财务部',
  'HSSE部'
];

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('issues');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const selectedIssue = useMemo(() => issues.find((item) => item.id === selectedIssueId) ?? null, [issues, selectedIssueId]);

  useEffect(() => {
    async function boot() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const [{ user: currentUser }, { issues: loadedIssues }, { departments: loadedDepartments }] = await Promise.all([
          api.me(),
          api.issues(),
          api.departments()
        ]);
        setUser(currentUser);
        setIssues(loadedIssues);
        setDepartments(loadedDepartments);
      } catch {
        clearToken();
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, []);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const refresh = async () => {
    const [{ issues: loadedIssues }, { departments: loadedDepartments }] = await Promise.all([api.issues(), api.departments()]);
    setIssues(loadedIssues);
    setDepartments(loadedDepartments);
  };

  const openDetail = async (id: string) => {
    const { issue } = await api.issue(id);
    setIssues((current) => [issue, ...current.filter((item) => item.id !== id)]);
    setSelectedIssueId(id);
    setView('detail');
  };

  if (loading) return <div className="grid min-h-screen place-items-center text-slate-600">正在载入系统...</div>;

  if (!user) {
    return (
      <Login
        onLogin={async (username, password, remember) => {
          const result = await api.login(username, password);
          setToken(result.token, remember);
          setUser(result.user);
          const [{ issues: loadedIssues }, { departments: loadedDepartments }] = await Promise.all([api.issues(), api.departments()]);
          setIssues(loadedIssues);
          setDepartments(loadedDepartments);
          notify('登录成功');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs text-slate-500">GMT / 几内亚时间</p>
            <h1 className="text-lg font-bold text-slate-950">港口安全管理系统</h1>
          </div>
          <button className="btn-secondary" onClick={refresh} title="刷新">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <main className="safe-bottom mx-auto max-w-5xl px-4 py-4">
        {view === 'issues' && <IssueList user={user} issues={issues} onOpen={openDetail} onNew={() => setView('new')} />}
        {view === 'new' && (
          <NewIssue
            onBack={() => setView('issues')}
            onCreated={(issue) => {
              setIssues((current) => [issue, ...current]);
              setView('issues');
              notify(issue.status === 'draft' ? '草稿已保存' : '问题已提交');
            }}
          />
        )}
        {view === 'detail' && selectedIssue && (
          <IssueDetail
            issue={selectedIssue}
            currentUser={user}
            departments={departments}
            users={users}
            loadUsers={async (deptId, role) => {
              const { users: loadedUsers } = await api.users(deptId, role);
              setUsers(loadedUsers);
            }}
            onBack={() => setView('issues')}
            onUpdated={(issue) => {
              setIssues((current) => current.map((item) => (item.id === issue.id ? issue : item)));
              notify('操作已完成');
            }}
          />
        )}
        {view === 'stats' && (
          <StatsView
            stats={stats}
            issues={issues}
            loadStats={async () => {
              const { stats: loadedStats } = await api.stats();
              setStats(loadedStats);
            }}
          />
        )}
        {view === 'admin' && (
          <AdminView
            departments={departments}
            users={users}
            loadUsers={async () => {
              const { users: loadedUsers } = await api.users();
              setUsers(loadedUsers);
            }}
            onUserCreated={async () => {
              const { users: loadedUsers } = await api.users();
              setUsers(loadedUsers);
              notify('用户已创建');
            }}
          />
        )}
        {view === 'profile' && <Profile user={user} onLogout={() => { clearToken(); setUser(null); }} />}
      </main>

      <BottomNav user={user} view={view} setView={setView} />
      {toast && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate-950 px-4 py-3 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}

function Login({ onLogin }: { onLogin: (username: string, password: string, remember: boolean) => Promise<void> }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError('');
          try {
            await onLogin(username, password, remember);
          } catch (err) {
            setError(err instanceof Error ? err.message : '登录失败');
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-port-blue text-white">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950">港口安全管理系统</h1>
            <p className="text-sm text-slate-500">安全问题闭环管理</p>
          </div>
        </div>
        <label className="mb-3 block text-sm font-semibold">
          用户名
          <input className="field mt-1" value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label className="mb-3 block text-sm font-semibold">
          密码
          <input className="field mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <input className="h-4 w-4" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          自动登录
        </label>
        {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>登录</button>
      </form>
    </div>
  );
}

function IssueList({ user, issues, onOpen, onNew }: { user: User; issues: Issue[]; onOpen: (id: string) => void; onNew: () => void }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">问题列表</h2>
          <p className="text-sm text-slate-500">{roleLabels[user.role]} · {user.name}</p>
        </div>
        {['reporter', 'admin'].includes(user.role) && (
          <button className="btn-primary" onClick={onNew}>
            <Plus size={18} />
            上报
          </button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {issues.map((issue) => (
          <button key={issue.id} className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300" onClick={() => onOpen(issue.id)}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-950">{issue.issue_no}</span>
              <StatusPill status={issue.status} />
            </div>
            <p className="line-clamp-2 text-sm text-slate-700">{issue.description}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
              <span>位置：{issue.location}</span>
              <span>上报：{issue.reporter_name ?? '-'}</span>
              <span>责任：{issue.responsible_dept_name ?? '-'}</span>
              <span>{gmtDateTime(issue.created_at)}</span>
            </div>
          </button>
        ))}
        {!issues.length && <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">暂无问题</p>}
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: Issue['status'] }) {
  const color = status === 'closed' ? 'bg-green-50 text-green-700' : status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700';
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${color}`}>{statusLabels[status]}</span>;
}

function NewIssue({ onBack, onCreated }: { onBack: () => void; onCreated: (issue: Issue) => void }) {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const uploadFiles = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    try {
      const selected = Array.from(files).slice(0, 9 - photos.length);
      const uploaded = await Promise.all(selected.map(async (file) => api.upload(await compressImage(file)).then((result) => result.url)));
      setPhotos((current) => [...current, ...uploaded]);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (status: 'draft' | 'pending') => {
    if (!description.trim() || !location.trim()) return;
    setBusy(true);
    try {
      const { issue } = await api.createIssue({ description, location, photos, status });
      onCreated(issue);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl">
      <button className="btn-secondary mb-4" onClick={onBack}>返回</button>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-950">上报新问题</h2>
        <label className="mb-3 block text-sm font-semibold">
          问题描述 *
          <textarea className="field mt-1 min-h-32" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="mb-3 block text-sm font-semibold">
          位置 *
          <input className="field mt-1" value={location} onChange={(event) => setLocation(event.target.value)} />
        </label>
        <PhotoUploader photos={photos} busy={busy} onUpload={uploadFiles} />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="btn-secondary" disabled={busy} onClick={() => submit('draft')}>保存草稿</button>
          <button className="btn-primary" disabled={busy || !description || !location} onClick={() => submit('pending')}>提交上报</button>
        </div>
      </div>
    </section>
  );
}

function PhotoUploader({ photos, busy, onUpload }: { photos: string[]; busy: boolean; onUpload: (files: FileList | null) => void }) {
  return (
    <div>
      <label className="btn-secondary">
        <Upload size={18} />
        上传照片
        <input className="hidden" type="file" accept="image/*" multiple disabled={busy || photos.length >= 9} onChange={(event) => onUpload(event.target.files)} />
      </label>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {photos.map((photo) => <img key={photo} src={photo} alt="上传照片" className="aspect-square rounded-md border border-slate-200 object-cover" />)}
      </div>
      <p className="mt-2 text-xs text-slate-500">最多9张，自动压缩至1200px。</p>
    </div>
  );
}

function IssueDetail({
  issue,
  currentUser,
  departments,
  users,
  loadUsers,
  onBack,
  onUpdated
}: {
  issue: Issue;
  currentUser: User;
  departments: Department[];
  users: User[];
  loadUsers: (deptId?: string, role?: string) => Promise<void>;
  onBack: () => void;
  onUpdated: (issue: Issue) => void;
}) {
  const [risk, setRisk] = useState<RiskLevel>('normal');
  const [deptId, setDeptId] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [requirement, setRequirement] = useState('');
  const [deadline, setDeadline] = useState('');
  const [rectifyDesc, setRectifyDesc] = useState('');
  const [rectifyPhotos, setRectifyPhotos] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const canAssign = ['hsse', 'admin'].includes(currentUser.role) && issue.status === 'pending';
  const canRectify = ['manager', 'admin'].includes(currentUser.role) && ['assigned', 'rectifying', 'rejected'].includes(issue.status);
  const canCheck = ['safety_officer', 'admin'].includes(currentUser.role) && issue.status === 'checking';

  const uploadRectify = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    try {
      const uploaded = await Promise.all(Array.from(files).slice(0, 9 - rectifyPhotos.length).map(async (file) => api.upload(await compressImage(file)).then((result) => result.url)));
      setRectifyPhotos((current) => [...current, ...uploaded]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl">
      <button className="btn-secondary mb-4" onClick={onBack}>返回</button>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">{issue.issue_no}</h2>
            <p className="text-sm text-slate-500">上报时间：{gmtDateTime(issue.created_at)}</p>
          </div>
          <StatusPill status={issue.status} />
        </div>
        <InfoGrid issue={issue} />
        <PhotoGrid title="问题照片" photos={issue.photos} />
        <PhotoGrid title="整改照片" photos={issue.rectify_photos} />
        <Timeline issue={issue} />
      </div>

      {canAssign && (
        <ActionPanel title="HSSE定责分派">
          <select className="field" value={risk} onChange={(event) => setRisk(event.target.value as RiskLevel)}>
            <option value="normal">一般风险</option>
            <option value="high">重大风险</option>
          </select>
          <select
            className="field"
            value={deptId}
            onChange={async (event) => {
              setDeptId(event.target.value);
              setResponsibleUserId('');
              await loadUsers(event.target.value, 'manager');
            }}
          >
            <option value="">选择责任部门</option>
            {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
          </select>
          <select className="field" value={responsibleUserId} onChange={(event) => setResponsibleUserId(event.target.value)}>
            <option value="">选择责任人</option>
            {users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <textarea className="field min-h-24" placeholder="整改要求" value={requirement} onChange={(event) => setRequirement(event.target.value)} />
          <input className="field" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <button
              className="btn-primary"
              disabled={busy || !deptId || !responsibleUserId || !requirement || !deadline}
              onClick={async () => {
                setBusy(true);
                try {
                  onUpdated((await api.assignIssue(issue.id, { risk_level: risk, responsible_dept_id: deptId, responsible_user_id: responsibleUserId, rectify_requirement: requirement, deadline })).issue);
                } finally {
                  setBusy(false);
                }
              }}
            >
              提交分派
            </button>
            <RejectButton issueId={issue.id} note={note} setNote={setNote} onUpdated={onUpdated} />
          </div>
        </ActionPanel>
      )}

      {canRectify && (
        <ActionPanel title="责任部门整改">
          <textarea className="field min-h-24" placeholder="整改说明" value={rectifyDesc} onChange={(event) => setRectifyDesc(event.target.value)} />
          <PhotoUploader photos={rectifyPhotos} busy={busy} onUpload={uploadRectify} />
          <div className="grid grid-cols-2 gap-3">
            <button
              className="btn-primary"
              disabled={busy || !rectifyDesc || !rectifyPhotos.length}
              onClick={async () => {
                setBusy(true);
                try {
                  onUpdated((await api.rectifyIssue(issue.id, { rectify_desc: rectifyDesc, rectify_photos: rectifyPhotos })).issue);
                } finally {
                  setBusy(false);
                }
              }}
            >
              提交整改
            </button>
            <RejectButton issueId={issue.id} note={note} setNote={setNote} onUpdated={onUpdated} />
          </div>
        </ActionPanel>
      )}

      {canCheck && (
        <ActionPanel title="安全员验收">
          <textarea className="field min-h-24" placeholder="验收意见 / 退回原因" value={note} onChange={(event) => setNote(event.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-primary" disabled={!note} onClick={async () => onUpdated((await api.checkIssue(issue.id, { result: 'pass', note })).issue)}>验收通过</button>
            <button className="btn-danger" disabled={!note} onClick={async () => onUpdated((await api.checkIssue(issue.id, { result: 'reject', note })).issue)}>退回整改</button>
          </div>
        </ActionPanel>
      )}
    </section>
  );
}

function InfoGrid({ issue }: { issue: Issue }) {
  const rows = [
    ['问题描述', issue.description],
    ['位置', issue.location],
    ['上报人', issue.reporter_name ?? '-'],
    ['风险等级', issue.risk_level ? riskLabels[issue.risk_level] : '-'],
    ['责任部门', issue.responsible_dept_name ?? '-'],
    ['责任人', issue.responsible_user_name ?? '-'],
    ['整改要求', issue.rectify_requirement ?? '-'],
    ['整改期限', issue.deadline ?? '-'],
    ['整改说明', issue.rectify_desc ?? '-'],
    ['验收意见', issue.check_note ?? '-']
  ];
  return (
    <dl className="grid gap-3 text-sm md:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md bg-slate-50 p-3">
          <dt className="text-xs font-semibold text-slate-500">{label}</dt>
          <dd className="mt-1 whitespace-pre-wrap text-slate-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PhotoGrid({ title, photos }: { title: string; photos: string[] }) {
  if (!photos?.length) return null;
  return (
    <div className="mt-4">
      <h3 className="mb-2 font-semibold text-slate-950">{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => <img key={photo} src={photo} alt={title} className="aspect-square rounded-md object-cover" />)}
      </div>
    </div>
  );
}

function Timeline({ issue }: { issue: Issue }) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 font-semibold text-slate-950">操作日志</h3>
      <div className="space-y-2">
        {issue.logs?.map((log) => (
          <div key={log.id} className="rounded-md border border-slate-200 p-3 text-sm">
            <p className="font-semibold">{log.action} · {log.user_name}</p>
            <p className="text-xs text-slate-500">{gmtDateTime(log.created_at)}</p>
            {log.note && <p className="mt-1 text-slate-600">{log.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-bold text-slate-950">{title}</h3>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function RejectButton({ issueId, note, setNote, onUpdated }: { issueId: string; note: string; setNote: (value: string) => void; onUpdated: (issue: Issue) => void }) {
  return (
    <div className="grid gap-2">
      <input className="field" placeholder="退回原因" value={note} onChange={(event) => setNote(event.target.value)} />
      <button className="btn-danger" disabled={!note} onClick={async () => onUpdated((await api.rejectIssue(issueId, note)).issue)}>退回</button>
    </div>
  );
}

function StatsView({ stats, issues, loadStats }: { stats: Stats | null; issues: Issue[]; loadStats: () => Promise<void> }) {
  useEffect(() => {
    loadStats();
    // loadStats is supplied by the page component and intentionally runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCsv = () => {
    const csv = cnCsv(
      issues.map((issue) => ({
        编号: issue.issue_no,
        状态: statusLabels[issue.status],
        位置: issue.location,
        上报人: issue.reporter_name,
        责任部门: issue.responsible_dept_name,
        风险等级: issue.risk_level ? riskLabels[issue.risk_level] : '',
        上报时间: gmtDateTime(issue.created_at)
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '安全问题明细.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-950">统计报表</h2>
        <button className="btn-secondary" onClick={exportCsv}>导出CSV</button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="总数" value={stats?.total ?? 0} />
        <StatCard label="已闭环" value={stats?.closed ?? 0} />
        <StatCard label="重大风险" value={stats?.highRisk ?? 0} />
        <StatCard label="处理中" value={stats?.active ?? 0} />
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {stats?.byDepartment.map((row) => (
          <div key={row.deptName} className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
            <span>{row.deptName}</span>
            <strong>{row.completionRate}%</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function AdminView({
  departments,
  users,
  loadUsers,
  onUserCreated
}: {
  departments: Department[];
  users: User[];
  loadUsers: () => Promise<void>;
  onUserCreated: () => Promise<void>;
}) {
  const [form, setForm] = useState({ username: '', password: '123456', name: '', role: 'reporter' as Role, dept_id: '' });

  useEffect(() => {
    loadUsers();
    // loadUsers is supplied by the page component and intentionally runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-950">人员管理</h2>
        <div className="grid gap-3">
          <input className="field" placeholder="用户名" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
          <input className="field" placeholder="姓名" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input className="field" placeholder="初始密码" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <select className="field" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
            {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className="field" value={form.dept_id} onChange={(event) => setForm({ ...form, dept_id: event.target.value })}>
            <option value="">无部门</option>
            {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
          </select>
          <button
            className="btn-primary"
            onClick={async () => {
              await api.createUser(form);
              await onUserCreated();
              setForm({ username: '', password: '123456', name: '', role: 'reporter', dept_id: '' });
            }}
          >
            创建用户
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-bold text-slate-950">现有用户</h3>
        <div className="grid gap-2">
          {users.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_auto] rounded-md bg-slate-50 px-3 py-2 text-sm">
              <span>{item.name} · {item.username}</span>
              <span className="text-slate-500">{roleLabels[item.role]}</span>
            </div>
          ))}
        </div>
        <h3 className="mb-3 mt-5 font-bold text-slate-950">部门</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {(departments.length ? departments.map((dept) => dept.name) : fallbackDepartments).map((name) => <div key={name} className="rounded-md bg-slate-50 px-3 py-2 text-sm">{name}</div>)}
        </div>
      </div>
    </section>
  );
}

function Profile({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <section className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-xl font-bold text-slate-950">我的</h2>
      <div className="grid gap-3 text-sm">
        <div className="rounded-md bg-slate-50 p-3">姓名：{user.name}</div>
        <div className="rounded-md bg-slate-50 p-3">角色：{roleLabels[user.role]}</div>
        <div className="rounded-md bg-slate-50 p-3">部门：{user.department?.name ?? '-'}</div>
      </div>
      <button className="btn-danger mt-5 w-full" onClick={onLogout}>
        <LogOut size={18} />
        退出登录
      </button>
    </section>
  );
}

function BottomNav({ user, view, setView }: { user: User; view: View; setView: (view: View) => void }) {
  const items: Array<{ view: View; label: string; icon: React.ReactNode; visible: boolean }> = [
    { view: 'issues', label: '问题', icon: <ClipboardList size={20} />, visible: true },
    { view: 'stats', label: '统计', icon: <BarChart3 size={20} />, visible: ['admin', 'hsse'].includes(user.role) },
    { view: 'admin', label: '管理', icon: <UserCog size={20} />, visible: user.role === 'admin' },
    { view: 'profile', label: '我的', icon: <UserRound size={20} />, visible: true }
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-5xl grid-cols-4">
        {items.filter((item) => item.visible).map((item) => (
          <button key={item.view} className={`tap flex flex-col items-center justify-center gap-1 px-2 py-2 text-xs ${view === item.view ? 'text-port-blue' : 'text-slate-500'}`} onClick={() => setView(item.view)}>
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
