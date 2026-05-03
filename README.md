# 港口安全管理系统（Next.js + Supabase）

移动端优先的安全问题闭环管理系统，覆盖员工上报、HSSE 定责分派、责任部门整改、部门安全员验收、统计导出和后台人员管理。项目使用 Next.js App Router，可直接部署到 Vercel。

## 技术栈

- 前端：Next.js + React + TypeScript + Tailwind CSS + PWA
- 后端：Next.js Route Handlers（`app/api/**/route.ts`）
- 数据库与文件：Supabase PostgreSQL + Supabase Storage
- 图片：上传前压缩到 1200px、质量 0.8
- 时间：统一按 GMT / 几内亚时间显示

## 本地运行

```bash
npm install
npm run dev
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env.local
npm run dev
```

访问 `http://localhost:3000`。

## Supabase 初始化

1. 创建 Supabase 免费项目。
2. 在 SQL Editor 执行 `supabase/migrations/001_init.sql`。
3. 创建公开 bucket：`issue-photos`。
4. 在 `.env` 填写：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`

## 演示账号

| 用户名 | 密码 | 角色 |
| --- | --- | --- |
| admin | admin123 | 系统管理员 |
| hsse1 | hsse123 | HSSE |
| manager1 | manager123 | 部门经理 |
| safety1 | safety123 | 部门安全员 |
| reporter1 | reporter123 | 员工 |

## 部署建议

1. 将代码推送到 GitHub。
2. 在 Vercel 导入仓库。
3. 在 Vercel Project Settings → Environment Variables 配置：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_NAME`
4. 执行 Vercel 默认构建命令：`npm run build`。

生产环境必须使用强随机 `JWT_SECRET`。`SUPABASE_SERVICE_ROLE_KEY` 只允许存在于 Vercel 服务端环境变量，不要暴露给浏览器。

## 主要流程

`draft` 草稿 → `pending` 待HSSE定责 → `assigned` 已派工 → `checking` 待验收 → `closed` 已闭环。

各节点支持退回并记录原因，所有关键操作写入 `issue_logs`。

## 项目结构

```text
app/
  api/                 Next.js API 路由
  globals.css          Tailwind 全局样式
  layout.tsx           应用布局与 metadata
  manifest.ts          PWA manifest
  page.tsx             移动端主界面
lib/
  client-api.ts        浏览器端 API 封装
  labels.ts            状态、角色、风险等级和 GMT 格式化
  types.ts             共享类型
  server/              Supabase、JWT、权限与问题 helper
public/icons/          PWA 图标
supabase/migrations/   数据库 SQL
```
