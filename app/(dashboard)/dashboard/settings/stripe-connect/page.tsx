'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'

export default function StripeConnectPage() {
  const supabase = createClient()
  const [company, setCompany] = useState<any>(null)
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
          setError('Please sign in to connect Stripe')
          return
        }

        const { data: member, error } = await supabase
          .from('team_members')
          .select('service_companies(id, name, stripe_account_id, stripe_connect_status)')
          .eq('user_id', user.id)
          .eq('active', true)
          .single()

        if (error || !member) {
          throw new Error(error?.message || 'Unable to load business')
        }

        setCompany(member.service_companies)
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

      if (!res.ok) {
        throw new Error(data.error || 'Unable to create Stripe link')
      }

      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setRedirecting(false)
    }
  }

  if (loading) return <div className="p-8 text-[#6B7490] text-sm">Loading Stripe Connect settings...</div>

  if (error) return (
    <div className="p-8 max-w-3xl mx-auto text-sm text-red-600">
      <div className="mb-4 font-semibold">Stripe Connect</div>
      <p>{error}</p>
    </div>
  )

  const status = company?.stripe_connect_status || 'pending'
  const connected = !!company?.stripe_account_id

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#0E1117]">Stripe Connect</h1>
        <p className="text-sm text-[#6B7490] mt-1">Connect your Stripe account so payouts can be routed automatically.</p>
      </div>

      <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm p-6 space-y-6">
        {success && (
          <div className="rounded-xl border border-[#DDE8FF] bg-[#EFF6FF] p-4 text-sm text-[#1D4ED8]">
            Stripe onboarding completed successfully. Your Stripe account status has been updated.
          </div>
        )}
        <div className="flex items-center gap-3">
          {connected ? (
            <CheckCircle2 size={20} className="text-[#3DBF7F]" />
          ) : (
            <AlertTriangle size={20} className="text-[#F59E0B]" />
          )}
          <div>
            <p className="text-sm font-semibold text-[#0E1117]">{connected ? 'Stripe is connected' : 'Stripe is not connected'}</p>
            <p className="text-sm text-[#6B7490]">{connected ? 'Your business is ready to receive payouts.' : 'Connect Stripe to start collecting payments and transfer payouts to your account.'}</p>
          </div>
        </div>

        {connected && (
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-3 text-sm text-[#0F172A]">
            <div className="flex items-center justify-between">
              <span className="font-medium">Account ID</span>
              <span className="font-mono text-[#0F172A]">{company.stripe_account_id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Payout status</span>
              <span className={status === 'active' ? 'text-[#15803D]' : 'text-[#B45309]'}>{status === 'active' ? 'Active' : status === 'restricted' ? 'Restricted' : 'Pending'}</span>
            </div>
          </div>
        )}

        {status === 'restricted' && (
          <div className="rounded-xl border border-[#FDE68A] bg-[#FEF3C7] p-4 text-sm text-[#92400E]">
            Your Stripe account is restricted. Complete the remaining requirements in Stripe to resume payouts.
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={redirecting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0E1117] px-5 py-3 text-sm font-semibold text-white hover:bg-[#111827] disabled:opacity-50"
        >
          {connected ? (status === 'active' ? 'Manage Stripe account' : 'Complete Stripe requirements') : 'Connect Stripe'}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
