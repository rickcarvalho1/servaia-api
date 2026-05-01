import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardPaywall from '@/components/DashboardPaywall'
import Sidebar from '@/components/ui/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('team_members')
 .select('*, service_companies(id, name, company_name, logo_url, trade, stripe_connect_status, trial_ends_at, subscription_status)')
    .eq('user_id', user.id)
    .eq('active', true)
    .single()

  if (!member || !member.service_companies) redirect('/login')

  const company = member.service_companies
  const stripeStatus = company.stripe_connect_status || 'pending'
  const stripeConnected = stripeStatus === 'active'

  const trialEndsAt = company.trial_ends_at ? new Date(company.trial_ends_at) : null
  const daysUntilTrialEnd = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const trialEnded = daysUntilTrialEnd !== null && daysUntilTrialEnd < 0
  const trialEndingSoon = daysUntilTrialEnd !== null && daysUntilTrialEnd <= 5 && daysUntilTrialEnd > 0
  const isSubscriptionActive = company.subscription_status === 'active'
  const requirePaywall = trialEnded && !isSubscriptionActive

  const appUser = {
    id:           user.id,
    email:        user.email || '',
    businessId:   company.id,
    businessName: company.company_name || company.name || 'Your business',
    logoUrl:      company.logo_url || undefined,
    fullName:     member.full_name || user.email || 'User',
    role:         member.role || 'member',
    stripeConnectStatus: stripeStatus,
  }

  if (requirePaywall) {
    return <DashboardPaywall enabled={requirePaywall}>{children}</DashboardPaywall>
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8F9FC' }}>
      <Sidebar user={appUser} />
      <main className="flex-1 overflow-y-auto lg:ml-0 pt-16 lg:pt-0">
        {!stripeConnected && (
          <div className="border-b border-orange-200 bg-orange-50 text-orange-800 px-6 py-4">
            <p className="max-w-4xl mx-auto text-sm">
              Connect your Stripe account to start collecting payments.
              <a href="/dashboard/settings/stripe-connect" className="font-semibold underline ml-2">Connect Stripe</a>
            </p>
          </div>
        )}
        {trialEndingSoon && (
          <div className="border-b border-warn/30 bg-warn/10 text-warn px-6 py-4">
            <p className="max-w-4xl mx-auto text-sm font-semibold">
              Your trial ends in {daysUntilTrialEnd} days. Subscribe now to keep using Servaia.
              <a href="/dashboard/billing" className="font-bold underline ml-2">View Billing</a>
            </p>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}