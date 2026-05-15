'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Check, CreditCard } from 'lucide-react'

export default function BillingPage() {
  const router = useRouter()
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadCompany()
  }, [])

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

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Billing</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="font-semibold text-red-900">{error}</p>
        </div>
      )}

      {/* Status Card */}
      <div className="mb-8 p-6 border border-slate rounded-lg space-y-4">
        <div className="flex items-center gap-3">
          <Check className="w-6 h-6 text-green-500" />
          <div>
            <h2 className="text-xl font-semibold">Account Status</h2>
            <p className="text-green-600 font-semibold">Active — No monthly fee</p>
          </div>
        </div>
      </div>

      {/* Pricing Card */}
      <div className="mb-8 p-6 border border-gold rounded-lg bg-slate/50 space-y-4">
        <div className="flex items-start gap-3">
          <CreditCard className="w-6 h-6 text-gold flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-3">How Billing Works</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Monthly Fee:</span>
                <span className="font-semibold">$0 — Free forever</span>
              </div>
              <div className="flex justify-between">
                <span>Per Transaction:</span>
                <span className="font-semibold">3.5% + $0.30</span>
              </div>
              <div className="text-sm text-mist mt-3 pt-3 border-t border-slate">
                <p>• No monthly fee — ever</p>
                <p>• Automatic payment charging</p>
                <p>• Money in your account as soon as next day</p>
                <p>• Unlimited jobs, customers, and team members</p>
                <p>• No contract — cancel anytime</p>
              </div>
            </div>

            <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm font-medium">
              We make money when you make money — and not before.
            </div>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="p-4 bg-mist/10 border border-mid rounded-lg text-sm text-mist">
        <p className="font-semibold mb-2">Questions about billing?</p>
        <p>Email <a href="mailto:rick@servaiapay.com" className="underline">rick@servaiapay.com</a> or <a href="https://calendly.com/rick-servaiapay" className="underline">book a call</a>.</p>
      </div>
    </div>
  )
}