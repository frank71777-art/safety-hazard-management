export type Role = 'admin' | 'hsse' | 'manager' | 'safety_officer' | 'reporter';
export type IssueStatus = 'draft' | 'pending' | 'assigned' | 'rectifying' | 'checking' | 'closed' | 'rejected';
export type RiskLevel = 'normal' | 'high';

export interface Department {
  id: string;
  name: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  dept_id: string | null;
  department?: Department | null;
}

export interface IssueLog {
  id: string;
  issue_id: string;
  action: string;
  user_name: string;
  note?: string | null;
  created_at: string;
}

export interface Issue {
  id: string;
  issue_no: string;
  reporter_id: string | null;
  reporter_name: string | null;
  description: string;
  location: string;
  photos: string[];
  status: IssueStatus;
  risk_level: RiskLevel | null;
  responsible_dept_id: string | null;
  responsible_dept_name: string | null;
  responsible_user_id: string | null;
  responsible_user_name: string | null;
  rectify_requirement: string | null;
  deadline: string | null;
  assigned_at: string | null;
  rectify_desc: string | null;
  rectify_photos: string[];
  rectified_at: string | null;
  check_result: 'pass' | 'reject' | null;
  check_note: string | null;
  checked_at: string | null;
  safety_officer_id: string | null;
  created_at: string;
  updated_at: string;
  logs?: IssueLog[];
}

export interface Stats {
  total: number;
  closed: number;
  highRisk: number;
  active: number;
  byDepartment: Array<{
    deptName: string;
    total: number;
    closed: number;
    completionRate: number;
  }>;
}
