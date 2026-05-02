import type { Metadata } from 'next'
import './globals.css'
import { StripeProvider } from '@/components/StripeProvider'

export const metadata: Metadata = {
  title: "Servaia — Get Paid the Moment the Job's Done",
  description: 'Automatic payment collection for field service businesses.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0E1117" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Servaia" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-16x16.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
      </head>
      <body className="font-sans antialiased">
        <StripeProvider>{children}</StripeProvider>
      </body>
    </html>
  )
}