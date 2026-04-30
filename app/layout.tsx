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
      </head>
      <body className="font-sans antialiased">
        <StripeProvider>{children}</StripeProvider>
      </body>
    </html>
  )
}