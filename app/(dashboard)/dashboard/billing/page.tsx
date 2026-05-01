'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Check, Clock, CreditCard } from 'lucide-react'

export default function BillingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadCompany()
  }, [])

  useEffect(() => {
    if (searchParams.get('success')) {
      setSuccess('Subscription activated! Thank you.')
    }
    if (searchParams.get('canceled')) {
      setError('Subscription canceled.')
    }
  }, [searchParams])

  async function loadCompany() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('service_companies')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (error) throw error
      setCompany(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade() {
    setUpgrading(true)
    try {
      const res = await fetch('/api/stripe/subscription/create', {
        method: 'POST',
      })
      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to start upgrade')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpgrading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate rounded w-1/3"></div>
          <div className="h-20 bg-slate rounded"></div>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-6">
        <p className="text-red-500">Company not found</p>
      </div>
    )
  }

  const trialEndsAt = company.trial_ends_at ? new Date(company.trial_ends_at) : null
  const daysUntilTrialEnd = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const trialEnded = daysUntilTrialEnd !== null && daysUntilTrialEnd < 0
  const trialEndingSoon = daysUntilTrialEnd !== null && daysUntilTrialEnd <= 5 && daysUntilTrialEnd > 0

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Billing & Subscription</h1>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">{success}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">{error}</p>
          </div>
        </div>
      )}

      {/* Trial Status */}
      <div className="mb-8 p-6 border border-slate rounded-lg space-y-4">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-gold" />
          <div>
            <h2 className="text-xl font-semibold">Trial Status</h2>
            {company.subscription_status === 'trial' ? (
              <p className="text-mist">
                {trialEndingSoon && (
                  <span className="text-warn font-semibold">Trial ending in {daysUntilTrialEnd} days</span>
                )}
                {trialEnded && <span className="text-danger font-semibold">Trial has ended</span>}
                {!trialEndingSoon && !trialEnded && (
                  <span>Free trial active — {daysUntilTrialEnd} days remaining</span>
                )}
              </p>
            ) : (
              <p className="text-success font-semibold">Active Subscription</p>
            )}
          </div>
        </div>
        {trialEndsAt && (
          <p className="text-sm text-mist">
            Trial ends: {trialEndsAt.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Pricing Card */}
      <div className="mb-8 p-6 border border-gold rounded-lg bg-slate/50 space-y-4">
        <div className="flex items-start gap-3">
          <CreditCard className="w-6 h-6 text-gold flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-3">Subscription Plan</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Monthly Subscription:</span>
                <span className="font-semibold">$49/month</span>
              </div>
              <div className="flex justify-between">
                <span>Per Transaction Fee:</span>
                <span className="font-semibold">3.5%</span>
              </div>
              <div className="text-sm text-mist mt-3 pt-3 border-t border-slate">
                <p>• Automatic payment charging</p>
                <p>• Same-day payouts</p>
                <p>• Unlimited jobs and customers</p>
                <p>• Cancel anytime — no contracts</p>
              </div>
            </div>

            {company.subscription_status === 'trial' && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="w-full bg-gold text-ink py-3 rounded-lg font-semibold hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {upgrading ? 'Loading...' : 'Subscribe Now — $49/month'}
              </button>
            )}

            {company.subscription_status === 'active' && (
              <div className="p-3 bg-success/10 border border-success rounded text-success">
                Your subscription is active
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grandfather Clause Info */}
      <div className="p-4 bg-mist/10 border border-mid rounded-lg text-sm text-mist">
        <p className="font-semibold mb-2">Early Adopter Benefit</p>
        <p>Lock in the current $49/month pricing forever. Early signups never pay more, no matter how our pricing changes.</p>
      </div>
    </div>
  )
}
