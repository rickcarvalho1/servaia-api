'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const INDUSTRIES = [
  'HVAC',
  'Plumbing',
  'Electrical',
  'Landscaping / Lawn Care',
  'Pool Cleaning / Pool Service',
  'General Contractor / Handyman',
  'Pressure Washing',
  'Window Cleaning',
  'Gutter Cleaning',
  'Roofing',
  'Pest Control',
  'Carpet Cleaning',
  'House Cleaning / Maid Service',
  'Junk Removal',
  'Tree Service / Arborist',
  'Painting',
  'Appliance Repair',
  'Garage Door Service',
  'Irrigation / Sprinkler Service',
  'Snow Removal',
  'Auto Detailing',
  'Moving Services',
  'Locksmith',
  'Other',
] as const

type Industry = (typeof INDUSTRIES)[number]
type Step = 1 | 2 | 3

export default function GetStartedForm() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>(1)
  const [companyName, setCompanyName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [industry, setIndustry] = useState<Industry>('HVAC')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleNext(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!companyName || !ownerName || !email || !password || !phone || !industry) {
      setError('Please fill in all of the required fields.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setStep(2)
  }

  async function handleCreateAccount(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: ownerName,
          phone,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { error: companyError } = await supabase
      .from('service_companies')
      .insert({
        name: companyName,
        owner_name: ownerName,
        owner_email: email,
        owner_phone: phone,
        industry,
        trade: industry,
        status: 'lead',
      })

    if (companyError) {
      setError('Unable to create your company record. Please try again.')
      setLoading(false)
      return
    }

    await fetch('/api/onboarding/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: ownerName, company: companyName }),
    })

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0E1117] text-white px-4 py-12" style={{ backgroundImage: 'linear-gradient(rgba(79,142,247,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,0.04) 1px, transparent 1px)', backgroundSize: '56px 56px' }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-300/70">Start your free trial</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Get started with Servaia</h1>
          <p className="mt-3 text-base text-slate-300">Self-serve onboarding for service businesses. No credit card required for 30 days.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/10 backdrop-blur-md">
            {step === 1 && (
              <form onSubmit={handleNext} className="space-y-6">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300/80">Step 1</div>
                  <h2 className="mt-3 text-2xl font-semibold">Business information</h2>
                </div>

                <label className="block text-sm font-medium text-slate-200">Company name</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Example Service Co" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-blue-400" />

                <label className="block text-sm font-medium text-slate-200">Owner name</label>
                <input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Jordan Brown" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-blue-400" />

                <label className="block text-sm font-medium text-slate-200">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@serviceco.com" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-blue-400" />

                <label className="block text-sm font-medium text-slate-200">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Strong password" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-blue-400" />

                <label className="block text-sm font-medium text-slate-200">Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-blue-400" />

                <label className="block text-sm font-medium text-slate-200">Industry</label>
                <select value={industry} onChange={e => setIndustry(e.target.value as Industry)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-blue-400">
                  {INDUSTRIES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>

                {error && <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-200">{error}</div>}

                <button type="submit" className="w-full rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400 transition">Continue to plan</button>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300/80">Step 2</div>
                  <h2 className="mt-3 text-2xl font-semibold">Choose the plan</h2>
                  <p className="mt-2 text-slate-300">One simple plan for modern service teams.</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.35em] text-blue-300/80">Starter</p>
                      <p className="mt-4 text-4xl font-semibold text-white">$49<span className="text-base font-medium text-slate-400">/month</span></p>
                      <p className="mt-2 text-sm text-slate-400">+ 3.5% per transaction</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3 text-slate-300">
                    <p>• Get paid the moment the job is done</p>
                    <p>• No invoices, no follow-up texts, no waiting</p>
                    <p>• Crew marks job done — card charges automatically</p>
                    <p>• Scheduling, job tracking, photo documentation</p>
                    <p>• Cancel anytime, no contracts</p>
                    <p>• 30-day free trial — no credit card required at signup</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-200 hover:border-white/20 transition">Back</button>
                  <button onClick={() => setStep(3)} className="flex-1 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400 transition">Create account</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <form onSubmit={handleCreateAccount} className="space-y-6">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300/80">Step 3</div>
                  <h2 className="mt-3 text-2xl font-semibold">Create your account</h2>
                  <p className="mt-2 text-slate-300">No credit card required — start your free trial today.</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
                  <p className="text-sm text-slate-300">You will create an account with:</p>
                  <ul className="mt-4 space-y-2 text-slate-200">
                    <li><strong>Company:</strong> {companyName}</li>
                    <li><strong>Owner:</strong> {ownerName}</li>
                    <li><strong>Email:</strong> {email}</li>
                    <li><strong>Industry:</strong> {industry}</li>
                  </ul>
                </div>

                {error && <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-200">{error}</div>}

                <button type="submit" disabled={loading} className="w-full rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400 transition disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? 'Creating account…' : 'Start my free trial'}
                </button>
              </form>
            )}
          </div>

          <aside className="rounded-[28px] border border-white/10 bg-slate-950/50 p-8 text-slate-300 shadow-xl shadow-black/10 backdrop-blur-md">
            <div className="space-y-5">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-blue-300/80">Why Servaia</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">A professional platform built for service teams</h2>
              </div>
              <div className="space-y-3 text-sm leading-7 text-slate-300">
                <p>Centralize payments, scheduling, and job completion in one place.</p>
                <p>Designed for teams that want a confident, modern experience without the startup fluff.</p>
                <p>Launch quickly and upgrade billing when you're ready after the first login.</p>
              </div>
              <div className="rounded-3xl bg-slate-900/80 p-5 border border-white/10">
                <p className="text-xs uppercase tracking-[0.35em] text-blue-300/80">Billing</p>
                <p className="mt-3 text-lg font-semibold text-white">Stripe setup after first login</p>
                <p className="mt-2 text-slate-400 text-sm">You will sign up now and add billing from the dashboard once your trial begins.</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 text-sm text-slate-400 sm:flex-row">
          <span>Already have an account?</span>
          <Link href="/login" className="text-blue-300 hover:text-blue-100">Sign in</Link>
          <span className="hidden sm:inline">•</span>
          <Link href="/privacy" className="text-slate-300 hover:text-white">Privacy</Link>
          <Link href="/terms" className="text-slate-300 hover:text-white">Terms</Link>
        </div>
      </div>
    </div>
  )
}
