import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI收款管家 - 每天告诉你哪笔钱最该收',
  description: '上传 Excel/CSV，10秒知道哪些应收账款需要优先催收。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
