import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'City Mission',
  description: '2D City Simulator Mission Game',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
