import type { Metadata, Viewport } from 'next';
import RegisterSW from './register-sw';
import './globals.css';

export const metadata: Metadata = {
  title: '港口安全管理系统',
  description: '港口安全问题上报、整改与闭环管理',
  manifest: '/manifest.json'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a5fb4'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
