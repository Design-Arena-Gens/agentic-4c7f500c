import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Document Verifier AI',
  description: 'AI-powered passport and government document verification system',
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
