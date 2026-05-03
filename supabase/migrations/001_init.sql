create extension if not exists pgcrypto;

create table if not exists departments (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default now()
);

create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password_hash text not null,
  name text not null,
  role text not null check (role in ('admin','hsse','manager','safety_officer','reporter')),
  dept_id uuid references departments(id),
  created_at timestamp with time zone default now()
);

create table if not exists issues (
  id uuid default gen_random_uuid() primary key,
  issue_no text unique not null,
  reporter_id uuid references users(id),
  reporter_name text,
  description text not null,
  location text not null,
  photos text[] default '{}',
  status text default 'pending' check (status in ('draft','pending','assigned','rectifying','checking','closed','rejected')),
  risk_level text check (risk_level in ('normal','high')),
  responsible_dept_id uuid references departments(id),
  responsible_dept_name text,
  responsible_user_id uuid references users(id),
  responsible_user_name text,
  rectify_requirement text,
  deadline date,
  assigned_at timestamp with time zone,
  rectify_desc text,
  rectify_photos text[] default '{}',
  rectified_at timestamp with time zone,
  check_result text check (check_result in ('pass','reject')),
  check_note text,
  checked_at timestamp with time zone,
  safety_officer_id uuid references users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists issue_logs (
  id uuid default gen_random_uuid() primary key,
  issue_id uuid references issues(id) on delete cascade,
  action text not null,
  user_name text not null,
  note text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_issues_status on issues(status);
create index if not exists idx_issues_reporter on issues(reporter_id);
create index if not exists idx_issues_responsible_dept on issues(responsible_dept_id);
create index if not exists idx_issue_logs_issue on issue_logs(issue_id);

insert into departments (name) values
('装卸事业部-矿石泊位'),
('装卸事业部-通用泊位'),
('公用事业部-油储队'),
('公用事业部-发配电队'),
('公用事业部-水务队'),
('修造车间'),
('装备工艺部'),
('综合部'),
('公共关系部'),
('财务部'),
('HSSE部')
on conflict (name) do nothing;

-- 密码哈希对应：
-- admin123 / hsse123 / manager123 / safety123 / reporter123
insert into users (username, password_hash, name, role, dept_id)
select 'admin', '$2a$10$lG5bofN9LqUI0s8O65krKezuUiGj5zdWzKg7l1fi1C/MQVlnhuH52', '系统管理员', 'admin', null
where not exists (select 1 from users where username = 'admin');

insert into users (username, password_hash, name, role, dept_id)
select 'hsse1', '$2a$10$swwRxp8OzJ7NVIXB82ODYezE5y02xDw9hUTa16K3v/ob2LuxaNcke', 'HSSE值班员', 'hsse', id
from departments where name = 'HSSE部'
on conflict (username) do nothing;

insert into users (username, password_hash, name, role, dept_id)
select 'manager1', '$2a$10$GIL/AxrBhTzzcJSc5J5Pq.nPy09wiuHgnwejpPgkzhgkJCx4.9qjC', '矿石泊位经理', 'manager', id
from departments where name = '装卸事业部-矿石泊位'
on conflict (username) do nothing;

insert into users (username, password_hash, name, role, dept_id)
select 'safety1', '$2a$10$6sRMETM5xeGzxFOtVA.ItO0FUkgetiT1p.9YvjEq5s4qa.DSe2F/q', '矿石泊位安全员', 'safety_officer', id
from departments where name = '装卸事业部-矿石泊位'
on conflict (username) do nothing;

insert into users (username, password_hash, name, role, dept_id)
select 'reporter1', '$2a$10$vgfpJqGAMj77gBKc9N3Rwu4mS2oZDJ0HXL9yhOMhhgxf1iV4gqCXq', '现场员工', 'reporter', id
from departments where name = '装卸事业部-矿石泊位'
on conflict (username) do nothing;

alter table departments enable row level security;
alter table users enable row level security;
alter table issues enable row level security;
alter table issue_logs enable row level security;

-- 本项目通过 Express API 使用 service role key 访问数据库，并在 API 层做角色权限控制。
-- service role 会绕过 RLS；不要把 SUPABASE_SERVICE_ROLE_KEY 暴露到前端。
