import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BeanPixel',
  description: 'Turn images into buildable fuse-bead patterns.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
