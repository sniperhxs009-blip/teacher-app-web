import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from 'react-hot-toast'
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#2563eb',
}

export const metadata: Metadata = {
  title: "教师助手",
  description: "教师教学助手 - 拍照识别、错题管理、AI解题",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '教师助手',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f5f5f7] text-[#1d1d1f] min-h-screen`}
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif" }}
      >
        <div id="app-content" className="min-h-screen">
          {children}
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'toast-mobile',
            duration: 2000,
            style: {
              background: '#1d1d1f',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '14px',
              maxWidth: '90vw',
              padding: '12px 16px',
            },
          }}
        />
      </body>
    </html>
  );
}
