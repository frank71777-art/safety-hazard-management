import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '港口安全管理系统',
    short_name: '港口安全',
    description: '移动端港口安全问题上报、整改与闭环管理',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1a5fb4',
    icons: [
      { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' }
    ]
  };
}
