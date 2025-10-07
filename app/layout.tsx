import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "GDG Clouds Leaderboard",
  description: "Created by Shaurya Srivastava",
  generator: "v0.app",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Prevent flash of incorrect theme by setting it before React hydrates
  const setInitialTheme = `
    try {
      const ls = window.localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = ls || (prefersDark ? 'dark' : 'light');
      const html = document.documentElement;
      if (theme === 'dark') html.classList.add('dark');
      else html.classList.remove('dark');
    } catch (_) {}
  `
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: setInitialTheme }} />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased min-h-screen`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
