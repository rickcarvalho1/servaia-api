'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, AlertTriangle, ArrowRight, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react'

export default function PaymentsPage() {
  const supabase = createClient()
  const [company, setCompany] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === 'true'

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Please sign in')
          return
        }

        const { data: member, error: memberError } = await supabase
          .from('team_members')
          .select('service_companies(id, name, stripe_account_id, stripe_connect_status)')
          .eq('user_id', user.id)
          .eq('active', true)
          .single()

        if (memberError || !member) throw new Error('Unable to load business')

        const company = member.service_companies as any
        setCompany(company)

        const { data: paymentsData } = await supabase
          .from('payments')
          .select('id, amount, surcharge_amount, payment_status, completed_at, customers(full_name), job_services(name, price_charged)')
          .eq('business_id', company.id)
          .in('payment_status', ['charged', 'succeeded'])
          .order('completed_at', { ascending: false })

        setPayments(paymentsData || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [supabase])

  async function handleConnect() {
    setRedirecting(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/connect/create', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to create Stripe link')
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setRedirecting(false)
    }
  }

  if (loading) return <div className="p-8 text-[#6B7490] text-sm">Loading payments...</div>
  if (error) return <div className="p-8 text-red-600 text-sm">{error}</div>

  const status = company?.stripe_connect_status || 'pending'
  const connected = !!company?.stripe_account_id

  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const monthRevenue = payments
    .filter(p => {
      const d = new Date(p.completed_at)
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear
    })
    .reduce((s, p) => s + Number(p.amount || 0), 0)

  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear
  const lastMonthRevenue = payments
    .filter(p => {
      const d = new Date(p.completed_at)
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
    })
    .reduce((s, p) => s + Number(p.amount || 0), 0)

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#0E1117]">Payments</h1>
        <p className="text-sm text-[#6B7490] mt-1">Your transaction history and Stripe connection.</p>
      </div>

      {/* Stripe Connection */}
      <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm p-6 mb-6">
        {success && (
          <div className="rounded-xl border border-[#DDE8FF] bg-[#EFF6FF] p-4 text-sm text-[#1D4ED8] mb-4">
            Stripe onboarding completed successfully.
          </div>
        )}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {connected ? (
              <CheckCircle2 size={20} className="text-[#3DBF7F]" />
            ) : (
              <AlertTriangle size={20} className="text-[#F59E0B]" />
            )}
            <div>
              <p className="text-sm font-semibold text-[#0E1117]">
                {connected ? 'Stripe connected' : 'Stripe not connected'}
              </p>
              <p className="text-xs text-[#6B7490]">
                {connected
                  ? `Account ${company.stripe_account_id} — ${status === 'active' ? 'Payouts active' : 'Setup incomplete'}`
                  : 'Connect your bank account to receive payouts'}
              </p>
            </div>
          </div>
          <button
            onClick={handleConnect}
            disabled={redirecting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0E1117] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#111827] disabled:opacity-50"
          >
            {connected
              ? status === 'active' ? 'Manage account' : 'Complete setup'
              : 'Connect Stripe'}
            <ArrowRight size={14} />
          </button>
        </div>

        {status === 'restricted' && (
          <div className="rounded-xl border border-[#FDE68A] bg-[#FEF3C7] p-4 text-sm text-[#92400E] mt-4">
            Your Stripe account is restricted. Complete the remaining requirements to resume payouts.
          </div>
        )}
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#DDE1EC] p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} style={{ color: '#3DBF7F' }} />
            <span className="text-xs text-[#6B7490] font-medium">Total Revenue</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#0E1117]">${totalRevenue.toFixed(2)}</div>
          <div className="text-xs text-[#6B7490] mt-1">{payments.length} transactions</div>
        </div>
        <div className="bg-white rounded-xl border border-[#DDE1EC] p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} style={{ color: '#4F8EF7' }} />
            <span className="text-xs text-[#6B7490] font-medium">This Month</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#0E1117]">${monthRevenue.toFixed(2)}</div>
          <div className="text-xs text-[#6B7490] mt-1">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#DDE1EC] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} style={{ color: '#E8B84B' }} />
            <span className="text-xs text-[#6B7490] font-medium">Last Month</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#0E1117]">${lastMonthRevenue.toFixed(2)}</div>
          <div className="text-xs text-[#6B7490] mt-1">
            {new Date(lastMonthYear, lastMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm">
        <div className="px-6 py-4 border-b border-[#DDE1EC]">
          <h2 className="font-semibold text-[#0E1117]">Transaction History</h2>
        </div>
        <div>
          {payments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <DollarSign size={32} className="mx-auto mb-3 text-[#DDE1EC]" />
              <p className="text-sm text-[#6B7490]">No transactions yet. Complete your first job to see payments here.</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden lg:block">
                <div className="grid grid-cols-4 px-6 py-2 text-xs font-medium text-[#6B7490] border-b border-[#DDE1EC]"
                     style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                  <span>Customer</span>
                  <span>Services</span>
                  <span>Date</span>
                  <span className="text-right">Amount</span>
                </div>
                {payments.map(p => (
                  <div key={p.id}
                    className="grid px-6 py-4 border-b border-[#DDE1EC] last:border-0 items-center"
                    style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} style={{ color: '#3DBF7F' }} />
                      <span className="text-sm font-medium text-[#0E1117]">
                        {(p.customers as any)?.full_name || 'Unknown'}
                      </span>
                    </div>
                    <span className="text-xs text-[#6B7490] truncate">
                      {(p.job_services as any[])?.map((s: any) => s.name).join(', ') || '—'}
                    </span>
                    <span className="text-xs text-[#6B7490]">
                      {p.completed_at
                        ? new Date(p.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </span>
                    <span className="text-sm font-bold font-mono text-[#0E1117] text-right">
                      ${Number(p.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Mobile */}
              <div className="lg:hidden divide-y divide-[#DDE1EC]">
                {payments.map(p => (
                  <div key={p.id} className="px-4 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-[#0E1117]">
                        {(p.customers as any)?.full_name || 'Unknown'}
                      </span>
                      <span className="text-sm font-bold font-mono text-[#0E1117]">
                        ${Number(p.amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#6B7490]">
                        {(p.job_services as any[])?.map((s: any) => s.name).join(', ') || '—'}
                      </span>
                      <span className="text-xs text-[#6B7490]">
                        {p.completed_at
                          ? new Date(p.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}