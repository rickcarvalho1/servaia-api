'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, AlertTriangle, ArrowRight, DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default function PaymentsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [company, setCompany] = useState<any>(null)
  const [businessId, setBusinessId] = useState<string>('')
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [setupSaving, setSetupSaving] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelSuccess, setCancelSuccess] = useState(false)
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === 'true'

  const [surchargeEnabled, setSurchargeEnabled] = useState(false)
  const [surchargePercentage, setSurchargePercentage] = useState('3.5')
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxPercentage, setTaxPercentage] = useState('0')

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Please sign in'); return }

        const { data: member, error: memberError } = await supabase
          .from('team_members')
          .select('service_companies(id, name, stripe_account_id, stripe_connect_status, surcharge_enabled, surcharge_percentage, tax_enabled, tax_percentage, subscription_status)')
          .eq('user_id', user.id)
          .eq('active', true)
          .single()

        if (memberError || !member) throw new Error('Unable to load business')

        const co = member.service_companies as any
        setCompany(co)
        setBusinessId(co.id)
        setSurchargeEnabled(co.surcharge_enabled || false)
        setSurchargePercentage(String(co.surcharge_percentage || '3.5'))
        setTaxEnabled(co.tax_enabled || false)
        setTaxPercentage(String(co.tax_percentage || '0'))

        if (success) setShowSetup(true)

        const { data: paymentsData } = await supabase
          .from('payments')
          .select('id, amount, surcharge_amount, payment_status, completed_at, customers(full_name), job_services(name, price_charged)')
          .eq('business_id', co.id)
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
  }, [supabase, success])

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

  async function handleSaveSetup() {
    setSetupSaving(true)
    try {
      await supabase.from('service_companies').update({
        surcharge_enabled: surchargeEnabled,
        surcharge_percentage: parseFloat(surchargePercentage) || 0,
        tax_enabled: taxEnabled,
        tax_percentage: parseFloat(taxPercentage) || 0,
      }).eq('id', businessId)
      setShowSetup(false)
      router.replace('/dashboard/settings/stripe-connect')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSetupSaving(false)
    }
  }

  async function handleCancelSubscription() {
    setCancelling(true)
    try {
      const res = await fetch('/api/subscription/cancel', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel subscription')
      setCancelSuccess(true)
      setShowCancelConfirm(false)
      setCompany((prev: any) => ({ ...prev, subscription_status: 'cancelled' }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <div className="p-8 text-[#6B7490] text-sm">Loading payments...</div>
  if (error) return <div className="p-8 text-red-600 text-sm">{error}</div>

  const status = company?.stripe_connect_status || 'pending'
  const connected = !!company?.stripe_account_id
  const isActive = company?.subscription_status === 'active'
  const isTrial = company?.subscription_status === 'trial'
  const isCancelled = company?.subscription_status === 'cancelled'

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

      {/* Post-Stripe Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-[#3DBF7F]" />
              </div>
              <h2 className="text-xl font-bold text-[#0E1117]">Stripe Connected!</h2>
              <p className="text-sm text-[#6B7490] mt-1">Let's set up your payment preferences before you start charging.</p>
            </div>
            <div className="bg-[#F8F9FC] rounded-xl border border-[#DDE1EC] p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-[#0E1117]">Card Surcharge</p>
                  <p className="text-xs text-[#6B7490] mt-0.5">Pass processing fees to your customers</p>
                </div>
                <button onClick={() => setSurchargeEnabled(!surchargeEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${surchargeEnabled ? 'bg-[#3DBF7F]' : 'bg-[#DDE1EC]'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${surchargeEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {surchargeEnabled && (
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" min="0" max="10" value={surchargePercentage}
                    onChange={e => setSurchargePercentage(e.target.value)}
                    className="w-24 bg-white border border-[#DDE1EC] rounded-lg px-3 py-2 text-sm text-[#0E1117] focus:outline-none focus:border-[#4F8EF7]" />
                  <span className="text-sm text-[#6B7490]">% added to each transaction</span>
                </div>
              )}
              <p className="text-xs text-[#6B7490] mt-2">⚠️ Surcharge laws vary by state. Confirm this is permitted in your state before enabling.</p>
            </div>
            <div className="bg-[#F8F9FC] rounded-xl border border-[#DDE1EC] p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-[#0E1117]">Sales Tax</p>
                  <p className="text-xs text-[#6B7490] mt-0.5">Collect sales tax on services if required in your state</p>
                </div>
                <button onClick={() => setTaxEnabled(!taxEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${taxEnabled ? 'bg-[#3DBF7F]' : 'bg-[#DDE1EC]'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${taxEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {taxEnabled && (
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" min="0" max="20" value={taxPercentage}
                    onChange={e => setTaxPercentage(e.target.value)}
                    className="w-24 bg-white border border-[#DDE1EC] rounded-lg px-3 py-2 text-sm text-[#0E1117] focus:outline-none focus:border-[#4F8EF7]" />
                  <span className="text-sm text-[#6B7490]">% sales tax rate</span>
                </div>
              )}
              <p className="text-xs text-[#6B7490] mt-2">🏛️ NH, FL, and TX have no sales tax on most services. Check your state's rules.</p>
            </div>
            <button onClick={handleSaveSetup} disabled={setupSaving}
              className="w-full py-3 bg-[#0E1117] text-white font-semibold rounded-xl text-sm disabled:opacity-50">
              {setupSaving ? 'Saving...' : 'Save & Go to Dashboard →'}
            </button>
            <button onClick={() => { setShowSetup(false); router.replace('/dashboard/settings/stripe-connect') }}
              className="w-full py-2 text-xs text-[#6B7490] hover:text-[#0E1117] mt-2">
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirm Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} className="text-[#E05252]" />
              </div>
              <h2 className="text-xl font-bold text-[#0E1117]">Cancel Subscription?</h2>
              <p className="text-sm text-[#6B7490] mt-2 leading-relaxed">
                Your subscription will be cancelled at the end of your current billing period. You'll keep full access until then. This cannot be undone.
              </p>
            </div>
            <div className="bg-[#FEF2F2] border border-[rgba(224,82,82,0.2)] rounded-xl p-4 mb-6">
              <p className="text-xs text-[#E05252] font-medium">What you'll lose:</p>
              <ul className="text-xs text-[#6B7490] mt-2 space-y-1">
                <li>• Automatic card charging on job completion</li>
                <li>• Customer card storage and management</li>
                <li>• Job scheduling and crew management</li>
                <li>• Payment history and reports</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 border border-[#DDE1EC] text-[#6B7490] text-sm font-semibold rounded-xl hover:bg-[#F8F9FC] transition-colors">
                Keep My Account
              </button>
              <button onClick={handleCancelSubscription} disabled={cancelling}
                className="flex-1 py-3 bg-[#E05252] text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50">
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#0E1117]">Payments</h1>
        <p className="text-sm text-[#6B7490] mt-1">Your transaction history and payment settings.</p>
      </div>

      {/* Cancel success banner */}
      {cancelSuccess && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-[rgba(61,191,127,0.1)] border border-[rgba(61,191,127,0.2)]">
          <CheckCircle2 size={16} className="text-[#3DBF7F] flex-shrink-0" />
          <span className="text-[#0E1117] font-medium">Subscription cancelled. You have full access until the end of your billing period.</span>
        </div>
      )}

      {/* Stripe Connection */}
      <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {connected ? <CheckCircle2 size={20} className="text-[#3DBF7F]" /> : <AlertTriangle size={20} className="text-[#F59E0B]" />}
            <div>
              <p className="text-sm font-semibold text-[#0E1117]">{connected ? 'Stripe connected' : 'Stripe not connected'}</p>
              <p className="text-xs text-[#6B7490]">
                {connected
                  ? `Account ${company.stripe_account_id} — ${status === 'active' ? 'Payouts active' : 'Setup incomplete'}`
                  : 'Connect your bank account to receive payouts'}
              </p>
            </div>
          </div>
          <button onClick={handleConnect} disabled={redirecting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0E1117] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#111827] disabled:opacity-50">
            {connected ? status === 'active' ? 'Manage account' : 'Complete setup' : 'Connect Stripe'}
            <ArrowRight size={14} />
          </button>
        </div>
        {status === 'restricted' && (
          <div className="rounded-xl border border-[#FDE68A] bg-[#FEF3C7] p-4 text-sm text-[#92400E] mt-4">
            Your Stripe account is restricted. Complete the remaining requirements to resume payouts.
          </div>
        )}
      </div>

      {/* Surcharge + Tax Settings */}
      <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-[#0E1117] mb-4">Payment Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#DDE1EC]">
            <div className="flex-1">
              <p className="text-sm font-medium text-[#0E1117]">Card Surcharge</p>
              <p className="text-xs text-[#6B7490] mt-0.5">Add a percentage to offset processing fees</p>
              {surchargeEnabled && (
                <div className="flex items-center gap-2 mt-2">
                  <input type="number" step="0.1" min="0" max="10" value={surchargePercentage}
                    onChange={e => setSurchargePercentage(e.target.value)}
                    className="w-20 bg-white border border-[#DDE1EC] rounded-lg px-3 py-1.5 text-sm text-[#0E1117] focus:outline-none focus:border-[#4F8EF7]" />
                  <span className="text-xs text-[#6B7490]">%</span>
                </div>
              )}
            </div>
            <button onClick={() => setSurchargeEnabled(!surchargeEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${surchargeEnabled ? 'bg-[#3DBF7F]' : 'bg-[#DDE1EC]'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${surchargeEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-[#0E1117]">Sales Tax</p>
              <p className="text-xs text-[#6B7490] mt-0.5">Collect sales tax on services if required in your state</p>
              {taxEnabled && (
                <div className="flex items-center gap-2 mt-2">
                  <input type="number" step="0.1" min="0" max="20" value={taxPercentage}
                    onChange={e => setTaxPercentage(e.target.value)}
                    className="w-20 bg-white border border-[#DDE1EC] rounded-lg px-3 py-1.5 text-sm text-[#0E1117] focus:outline-none focus:border-[#4F8EF7]" />
                  <span className="text-xs text-[#6B7490]">%</span>
                </div>
              )}
            </div>
            <button onClick={() => setTaxEnabled(!taxEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${taxEnabled ? 'bg-[#3DBF7F]' : 'bg-[#DDE1EC]'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${taxEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="pt-2">
            <button onClick={handleSaveSetup} disabled={setupSaving}
              className="px-5 py-2.5 bg-[#0E1117] text-white text-sm font-semibold rounded-lg hover:bg-[#111827] disabled:opacity-50">
              {setupSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
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
          <div className="text-xs text-[#6B7490] mt-1">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        </div>
        <div className="bg-white rounded-xl border border-[#DDE1EC] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} style={{ color: '#E8B84B' }} />
            <span className="text-xs text-[#6B7490] font-medium">Last Month</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#0E1117]">${lastMonthRevenue.toFixed(2)}</div>
          <div className="text-xs text-[#6B7490] mt-1">{new Date(lastMonthYear, lastMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-[#DDE1EC]">
          <h2 className="font-semibold text-[#0E1117]">Transaction History</h2>
        </div>
        <div>
          {payments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <DollarSign size={32} className="mx-auto mb-3 text-[#DDE1EC]" />
              <p className="text-sm text-[#6B7490]">No transactions yet.</p>
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <div className="grid px-6 py-2 text-xs font-medium text-[#6B7490] border-b border-[#DDE1EC]"
                     style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                  <span>Customer</span>
                  <span>Services</span>
                  <span>Date</span>
                  <span className="text-right">Amount</span>
                </div>
                {payments.map(p => (
                  <div key={p.id} className="grid px-6 py-4 border-b border-[#DDE1EC] last:border-0 items-center"
                       style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} style={{ color: '#3DBF7F' }} />
                      <span className="text-sm font-medium text-[#0E1117]">{(p.customers as any)?.full_name || 'Unknown'}</span>
                    </div>
                    <span className="text-xs text-[#6B7490] truncate">{(p.job_services as any[])?.map((s: any) => s.name).join(', ') || '—'}</span>
                    <span className="text-xs text-[#6B7490]">{p.completed_at ? new Date(p.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                    <span className="text-sm font-bold font-mono text-[#0E1117] text-right">${Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="lg:hidden divide-y divide-[#DDE1EC]">
                {payments.map(p => (
                  <div key={p.id} className="px-4 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-[#0E1117]">{(p.customers as any)?.full_name || 'Unknown'}</span>
                      <span className="text-sm font-bold font-mono text-[#0E1117]">${Number(p.amount).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#6B7490]">{(p.job_services as any[])?.map((s: any) => s.name).join(', ') || '—'}</span>
                      <span className="text-xs text-[#6B7490]">{p.completed_at ? new Date(p.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cancel Subscription */}
      {!isCancelled && (
        <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm p-6">
          <h2 className="font-semibold text-[#0E1117] mb-1">Cancel Subscription</h2>
          <p className="text-xs text-[#6B7490] mb-4">
            You'll keep full access until the end of your current billing period. No refunds for partial months.
          </p>
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="px-4 py-2.5 border border-[rgba(224,82,82,0.3)] text-[#E05252] text-sm font-semibold rounded-lg hover:bg-[rgba(224,82,82,0.05)] transition-colors">
            Cancel Subscription
          </button>
        </div>
      )}

      {isCancelled && (
        <div className="bg-white rounded-xl border border-[rgba(224,82,82,0.2)] shadow-sm p-6">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-[#E05252] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#0E1117]">Subscription Cancelled</p>
              <p className="text-xs text-[#6B7490] mt-0.5">Your account is cancelled. Contact us to reactivate.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}