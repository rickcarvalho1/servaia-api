'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

interface Company {
  id: string
  name: string
  ownerName: string | null
  ownerEmail: string | null
  createdAt: string | null
  trialEndsAt: string | null
  subscriptionStatus: string
  stripeConnectStatus: string
  totalRevenue: number
  totalJobs: number
}

interface UserRow {
  id: string
  email: string
  createdAt: string
}

interface ActivityPayment {
  id: string
  companyName: string
  amount: number
  status: string
  timestamp: string | null
  customerName: string
}

interface ActivityCompany {
  id: string
  name: string
  ownerEmail: string
  createdAt: string | null
}

interface RevenueSummary {
  totalRevenue: number
  estimatedFees: number
  activeSubscriptions: number
  mrr: number
  totalCompanies: number
  trialCompanies: number
  expiredTrials: number
}

interface AdminPanelProps {
  companies: Company[]
  users: UserRow[]
  revenueSummary: RevenueSummary
  activityFeed: {
    recentCompanies: ActivityCompany[]
    recentPayments: ActivityPayment[]
  }
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`
}

function formatDate(date?: string | null) {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString()
}

export default function AdminPanel({ companies, users, revenueSummary, activityFeed }: AdminPanelProps) {
  const [companyList, setCompanyList] = useState(companies)
  const [actionState, setActionState] = useState<{ id: string; state: 'idle' | 'busy' | 'success' | 'error' } | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const feedItems = useMemo(() => {
    const signups = activityFeed.recentCompanies.map((company) => ({
      id: `signup-${company.id}`,
      title: 'New company signup',
      subtitle: `${company.name} by ${company.ownerEmail}`,
      timestamp: company.createdAt,
      type: 'company',
    }))

    const payments = activityFeed.recentPayments.map((payment) => ({
      id: `payment-${payment.id}`,
      title: `Payment ${formatMoney(payment.amount)}`,
      subtitle: `${payment.customerName} · ${payment.companyName}`,
      timestamp: payment.timestamp,
      type: 'payment',
    }))

    return [...signups, ...payments]
      .filter((item) => item.timestamp)
      .sort((a, b) => (new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime()))
      .slice(0, 10)
  }, [activityFeed.recentCompanies, activityFeed.recentPayments])

  const handleAction = async (companyId: string, action: string, payload?: Record<string, any>) => {
    setActionState({ id: companyId, state: 'busy' })
    setToastMessage(null)

    try {
      const response = await fetch('/api/admin/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, companyId, ...payload }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Unable to complete action')
      }

      if (action === 'deleteCompany') {
        setCompanyList((current) => current.filter((company) => company.id !== companyId))
      }

      if (action === 'extendTrial') {
        setCompanyList((current) =>
          current.map((company) =>
            company.id === companyId
              ? { ...company, trialEndsAt: payload?.newTrialEndsAt ?? company.trialEndsAt }
              : company
          )
        )
      }

      if (action === 'activateSubscription') {
        setCompanyList((current) =>
          current.map((company) =>
            company.id === companyId ? { ...company, subscriptionStatus: 'active' } : company
          )
        )
      }

      setActionState({ id: companyId, state: 'success' })
      setToastMessage(result.message || 'Action completed successfully')
    } catch (error: any) {
      setActionState({ id: companyId, state: 'error' })
      setToastMessage(error.message || 'Action failed')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Rick-only admin dashboard</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Company & revenue operations</h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
              Manage companies, inspect revenue, and take action on trial expiry or subscription state.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Private access only for rick@servaiapay.com
          </div>
        </div>
      </div>

      {toastMessage ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          {toastMessage}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total companies</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{revenueSummary.totalCompanies}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Active subscriptions</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{revenueSummary.activeSubscriptions}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">MRR</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{formatMoney(revenueSummary.mrr)}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Estimated fees</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{formatMoney(revenueSummary.estimatedFees)}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Revenue dashboard</p>
                <p className="mt-4 text-4xl font-semibold text-slate-900">{formatMoney(revenueSummary.totalRevenue)}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                {revenueSummary.trialCompanies} trials open, {revenueSummary.expiredTrials} expired
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Companies</h2>
                <p className="text-sm text-slate-500">View all service companies with trial and subscription status.</p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Owner</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Trial</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Subscription</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Revenue</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Jobs</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {companyList.map((company) => {
                    const trialEnds = company.trialEndsAt ? new Date(company.trialEndsAt) : null
                    const isTrialActive = trialEnds ? trialEnds > new Date() : false
                    const trialLabel = company.subscriptionStatus === 'active'
                      ? 'Complete'
                      : isTrialActive
                        ? `Trial until ${formatDate(company.trialEndsAt)}`
                        : 'Expired'
                    return (
                      <tr key={company.id}>
                        <td className="px-4 py-3 text-slate-900">{company.name}</td>
                        <td className="px-4 py-3 text-slate-900">{company.ownerEmail || 'Unknown'}</td>
                        <td className="px-4 py-3 text-slate-900">{trialLabel}</td>
                        <td className="px-4 py-3 text-slate-900 capitalize">{company.subscriptionStatus}</td>
                        <td className="px-4 py-3 text-slate-900">{formatMoney(company.totalRevenue)}</td>
                        <td className="px-4 py-3 text-slate-900">{company.totalJobs}</td>
                        <td className="px-4 py-3 space-y-2">
                          <Link
                            href={`/admin/company/${company.id}`}
                            className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleAction(company.id, 'extendTrial', {
                              newTrialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                            })}
                            className="inline-flex w-full items-center justify-center rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                          >
                            Extend trial
                          </button>
                          {company.subscriptionStatus !== 'active' ? (
                            <button
                              type="button"
                              onClick={() => handleAction(company.id, 'activateSubscription')}
                              className="inline-flex w-full items-center justify-center rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                            >
                              Activate
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete ${company.name}? This removes company data permanently.`)) {
                                handleAction(company.id, 'deleteCompany')
                              }
                            }}
                            className="inline-flex w-full items-center justify-center rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">User management</h2>
            <p className="mt-2 text-sm text-slate-500">All Supabase auth users in the project.</p>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-600">Email</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.slice(0, 8).map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 text-slate-900 break-all">{user.email}</td>
                      <td className="px-4 py-3 text-slate-900">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Activity feed</h2>
            <p className="mt-2 text-sm text-slate-500">Recent signups and payments for quick review.</p>
            <div className="mt-6 space-y-4">
              {feedItems.length === 0 ? (
                <p className="text-sm text-slate-500">No recent activity.</p>
              ) : (
                feedItems.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Unknown'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
