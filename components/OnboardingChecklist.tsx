'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from 'lucide-react'

type Step = {
  id: string
  label: string
  description: string
  href?: string
  cta?: string
  done: boolean
}

export default function OnboardingChecklist({ businessId, companyData }: { businessId: string, companyData: any }) {
  const supabase = createClient()
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(() => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('checklist-seen') === '1'
})
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (companyData?.onboarding_dismissed) {
      setDismissed(true)
      setLoading(false)
      return
    }
    checkSteps()
  }, [businessId])

  async function checkSteps() {
    const [
      { data: customers },
      { data: authTokens },
      { data: activeCards },
      { data: services },
      { data: scheduledJobs },
      { data: completedJobs },
      { data: teamMembers },
    ] = await Promise.all([
      supabase.from('customers').select('id').eq('business_id', businessId).limit(1),
      supabase.from('auth_tokens').select('id').eq('business_id', businessId).limit(1),
      supabase.from('customers').select('id').eq('business_id', businessId).in('card_status', ['active', 'authorized']).limit(1),
      supabase.from('services').select('id').eq('business_id', businessId).limit(1),
      supabase.from('payments').select('id').eq('business_id', businessId).eq('job_status', 'scheduled').limit(1),
      supabase.from('payments').select('id').eq('business_id', businessId).eq('job_status', 'completed').limit(1),
      supabase.from('team_members').select('id').eq('business_id', businessId),
    ])

    const stripeConnected = companyData?.stripe_connect_status === 'active'

    const newSteps: Step[] = [
      {
        id: 'stripe',
        label: 'Connect your Stripe account',
        description: 'Required to collect payments from customers',
        href: '/dashboard/settings/stripe-connect',
        cta: 'Connect Stripe',
        done: stripeConnected,
      },
      {
        id: 'customer',
        label: 'Add your first customer',
        description: 'Add a customer so you can schedule jobs and collect payment',
        href: '/dashboard/customers/new',
        cta: 'Add Customer',
        done: (customers?.length ?? 0) > 0,
      },
      {
        id: 'auth',
        label: 'Send a card authorization link',
        description: 'Let your customer save their card on file before the job',
        href: '/dashboard/customers',
        cta: 'Go to Customers',
        done: (authTokens?.length ?? 0) > 0,
      },
      {
        id: 'card',
        label: 'Get a card saved on file',
        description: 'Customer saves their card — you\'re ready to charge',
        href: '/dashboard/customers',
        cta: 'View Customers',
        done: (activeCards?.length ?? 0) > 0,
      },
      {
        id: 'services',
        label: 'Set up your service menu',
        description: 'Add the services you offer with default prices',
        href: '/dashboard/settings',
        cta: 'Open Settings',
        done: (services?.length ?? 0) > 0,
      },
      {
        id: 'schedule',
        label: 'Schedule your first job',
        description: 'Assign a job to your crew with a date and time',
        href: '/dashboard/jobs/schedule',
        cta: 'Schedule Job',
        done: (scheduledJobs?.length ?? 0) > 0 || (completedJobs?.length ?? 0) > 0,
      },
      {
        id: 'complete',
        label: 'Mark your first job done',
        description: 'Watch the payment hit your account automatically',
        href: '/dashboard/jobs',
        cta: 'View Jobs',
        done: (completedJobs?.length ?? 0) > 0,
      },
      {
        id: 'team',
        label: 'Invite a team member',
        description: 'Add crew members so they can see and complete jobs',
        href: '/dashboard/team',
        cta: 'Invite Team',
        done: (teamMembers?.length ?? 0) > 1,
      },
    ]

    setSteps(newSteps)
    setLoading(false)

    // Mark as seen after first load
if (typeof window !== 'undefined') {
  localStorage.setItem('checklist-seen', '1')
}

    // Auto-dismiss if all done
    const allDone = newSteps.every(s => s.done)
    if (allDone) {
      setTimeout(() => handleDismiss(), 3000)
    }
  }

  async function handleDismiss() {
    await supabase.from('service_companies')
      .update({ onboarding_dismissed: true })
      .eq('id', businessId)
    setDismissed(true)
  }

  if (loading || dismissed) return null

  const doneCount = steps.filter(s => s.done).length
  const totalCount = steps.length
  const allDone = doneCount === totalCount
  const progressPct = Math.round((doneCount / totalCount) * 100)

  return (
    <div className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #DDE1EC' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
        style={{ borderBottom: collapsed ? 'none' : '1px solid #DDE1EC' }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-[#0E1117] text-sm">
                {allDone ? '🎉 Setup complete!' : 'Get started with Servaia'}
              </p>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: allDone ? 'rgba(61,191,127,0.1)' : 'rgba(79,142,247,0.1)',
                  color: allDone ? '#3DBF7F' : '#4F8EF7'
                }}>
                {doneCount}/{totalCount}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-1.5 w-48 lg:w-64 h-1.5 rounded-full bg-[#DDE1EC] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: allDone ? '#3DBF7F' : '#4F8EF7'
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {allDone && (
            <button
              onClick={e => { e.stopPropagation(); handleDismiss(); }}
              className="text-xs text-[#6B7490] hover:text-[#0E1117] px-2 py-1 rounded transition-colors"
            >
              Dismiss
            </button>
          )}
          {collapsed
            ? <ChevronDown size={16} className="text-[#6B7490]" />
            : <ChevronUp size={16} className="text-[#6B7490]" />
          }
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="divide-y divide-[#DDE1EC]">
          {steps.map((step, i) => (
            <div key={step.id} className={`flex items-start gap-4 px-6 py-4 ${step.done ? 'opacity-60' : ''}`}>
              <div className="flex-shrink-0 mt-0.5">
                {step.done
                  ? <CheckCircle2 size={18} style={{ color: '#3DBF7F' }} />
                  : <Circle size={18} style={{ color: '#DDE1EC' }} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? 'line-through text-[#6B7490]' : 'text-[#0E1117]'}`}>
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs text-[#6B7490] mt-0.5">{step.description}</p>
                )}
              </div>
              {!step.done && step.href && (
                <Link href={step.href}
                  className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'rgba(79,142,247,0.1)', color: '#4F8EF7' }}>
                  {step.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}