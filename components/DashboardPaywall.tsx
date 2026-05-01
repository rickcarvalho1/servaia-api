'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  enabled: boolean
  children: React.ReactNode
}

export default function DashboardPaywall({ enabled, children }: Props) {
  const pathname = usePathname()
  const allowBilling = pathname === '/dashboard/billing' || pathname.startsWith('/dashboard/billing?')

  if (!enabled || allowBilling) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC] p-6">
      <div className="w-full max-w-xl rounded-[32px] border border-[#DDE1EC] bg-white px-8 py-10 shadow-[0_20px_60px_rgba(14,17,23,0.08)]">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#6B7490]">Subscription Required</p>
          <h1 className="mt-4 text-3xl font-bold text-[#0E1117]">Your trial has ended</h1>
          <p className="mt-4 text-sm leading-7 text-[#6B7490]">
            Your access to the dashboard is paused until you subscribe. Add your payment method and activate your plan on the billing page.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-[#E8EAF2] bg-[#F8FAFC] p-6 text-left">
            <p className="text-sm font-semibold text-[#0E1117]">Continue with Servaia</p>
            <p className="mt-2 text-sm text-[#6B7490]">Subscribe now for $49/month and unlock unlimited jobs, payments, and payouts.</p>
          </div>

          <Link
            href="/dashboard/billing"
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#0E1117] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#111827]"
          >
            Subscribe Now — $49/month
          </Link>

          <p className="text-xs text-center text-[#9AA2B1]">
            No invoices by email. All billing happens inside the Servaia app.
          </p>
        </div>
      </div>
    </div>
  )
}
