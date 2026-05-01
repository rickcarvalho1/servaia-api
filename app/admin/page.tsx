import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import AdminPanel from './AdminPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'rick@servaiapay.com') {
    redirect('/login')
  }

  const admin = createAdminClient()

  const [{ data: companies }, { data: payments }, { data: users }] = await Promise.all([
    supabase
      .from('service_companies')
      .select(
        'id, name, company_name, owner_name, owner_email, created_at, trial_ends_at, subscription_status, stripe_connect_status'
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select(
        'id, business_id, amount, payment_status, completed_at, created_at, customers(full_name), service_companies(id, company_name, name)'
      )
      .order('created_at', { ascending: false }),
    admin
      .from('auth.users')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const now = new Date()
  const paymentSummary = new Map<string, { revenue: number; jobs: number }>()

  ;(payments ?? []).forEach((payment: any) => {
    const businessId = payment.business_id
    if (!businessId) return

    const entry = paymentSummary.get(businessId) ?? { revenue: 0, jobs: 0 }
    entry.revenue += Number(payment.amount ?? 0)
    entry.jobs += 1
    paymentSummary.set(businessId, entry)
  })

  const companiesWithMetrics = (companies ?? []).map((company: any) => {
    const stats = paymentSummary.get(company.id) ?? { revenue: 0, jobs: 0 }
    return {
      id: company.id,
      name: company.company_name || company.name || 'Untitled company',
      ownerName: company.owner_name || null,
      ownerEmail: company.owner_email || null,
      createdAt: company.created_at || null,
      trialEndsAt: company.trial_ends_at || null,
      subscriptionStatus: company.subscription_status || 'inactive',
      stripeConnectStatus: company.stripe_connect_status || 'not_connected',
      totalRevenue: stats.revenue,
      totalJobs: stats.jobs,
    }
  })

  const totalRevenue = companiesWithMetrics.reduce((sum, company) => sum + company.totalRevenue, 0)
  const activeSubscriptions = companiesWithMetrics.filter((company) => company.subscriptionStatus === 'active').length
  const trialCompanies = companiesWithMetrics.filter((company) => {
    const trialEnd = company.trialEndsAt ? new Date(company.trialEndsAt) : null
    return company.subscriptionStatus !== 'active' && trialEnd && trialEnd > now
  }).length
  const expiredTrials = companiesWithMetrics.filter((company) => {
    const trialEnd = company.trialEndsAt ? new Date(company.trialEndsAt) : null
    return company.subscriptionStatus !== 'active' && (!trialEnd || trialEnd <= now)
  }).length
  const estimatedFees = totalRevenue * 0.006
  const mrr = activeSubscriptions * 49

  const recentCompanies = (companies ?? [])
    .slice(0, 5)
    .map((company: any) => ({
      id: company.id,
      name: company.company_name || company.name || 'Untitled company',
      ownerEmail: company.owner_email || 'Unknown',
      createdAt: company.created_at,
    }))

  const recentPayments = (payments ?? [])
    .slice(0, 6)
    .map((payment: any) => ({
      id: payment.id,
      companyName: payment.service_companies?.company_name || payment.service_companies?.name || 'Unknown company',
      amount: Number(payment.amount ?? 0),
      status: payment.payment_status || 'unknown',
      timestamp: payment.completed_at || payment.created_at || null,
      customerName: payment.customers?.full_name || 'Unknown customer',
    }))

  const usersList = (users ?? [])
    .map((user: any) => ({
      id: user.id,
      email: user.email || 'Unknown',
      createdAt: user.created_at,
    }))

  return (
    <AdminPanel
      companies={companiesWithMetrics}
      revenueSummary={{
        totalRevenue,
        estimatedFees,
        activeSubscriptions,
        mrr,
        totalCompanies: companiesWithMetrics.length,
        trialCompanies,
        expiredTrials,
      }}
      users={usersList}
      activityFeed={{ recentCompanies, recentPayments }}
    />
  )
}
