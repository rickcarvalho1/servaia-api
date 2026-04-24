'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const TRADES = [
  'Landscaping / Lawn Care','House Cleaning','Commercial Cleaning',
  'Plumbing','HVAC','Electrical','Pest Control','Pool Service',
  'Tree Service / Arborist','Snow Removal','Window Cleaning',
  'General Contracting','Other',
]

const DEFAULT_SERVICES: Record<string, { name: string; emoji: string; price: number; unit: string }[]> = {
  'Landscaping / Lawn Care': [
    { name: 'Lawn Mowing', emoji: '🌿', price: 85, unit: 'visit' },
    { name: 'Edging & Trimming', emoji: '✂️', price: 40, unit: 'visit' },
    { name: 'Weeding', emoji: '🌾', price: 65, unit: 'visit' },
    { name: 'Leaf Cleanup', emoji: '🍂', price: 120, unit: 'visit' },
    { name: 'Fertilizer Treatment', emoji: '🌱', price: 95, unit: 'visit' },
    { name: 'Mulch Install', emoji: '🪵', price: 180, unit: 'job' },
    { name: 'Tree & Shrub Trim', emoji: '🌳', price: 150, unit: 'job' },
    { name: 'Snow Removal', emoji: '❄️', price: 95, unit: 'event' },
  ],
  'House Cleaning': [
    { name: 'Standard Clean', emoji: '🧹', price: 120, unit: 'visit' },
    { name: 'Deep Clean', emoji: '✨', price: 220, unit: 'visit' },
    { name: 'Move-In/Out Clean', emoji: '📦', price: 300, unit: 'job' },
    { name: 'Window Cleaning', emoji: '🪟', price: 110, unit: 'visit' },
  ],
  'Commercial Cleaning': [
    { name: 'Office Clean', emoji: '🏢', price: 200, unit: 'visit' },
    { name: 'Deep Clean', emoji: '✨', price: 400, unit: 'visit' },
    { name: 'Floor Care', emoji: '🧴', price: 250, unit: 'visit' },
    { name: 'Post-Construction', emoji: '🏗️', price: 500, unit: 'job' },
  ],
  'HVAC': [
    { name: 'AC Maintenance', emoji: '❄️', price: 150, unit: 'visit' },
    { name: 'Heating Tune-Up', emoji: '🔥', price: 150, unit: 'visit' },
    { name: 'Filter Replacement', emoji: '🌬️', price: 45, unit: 'visit' },
    { name: 'Emergency Service', emoji: '🚨', price: 250, unit: 'job' },
  ],
  'Plumbing': [
    { name: 'Drain Cleaning', emoji: '🚿', price: 150, unit: 'job' },
    { name: 'Leak Repair', emoji: '💧', price: 200, unit: 'job' },
    { name: 'Toilet Repair', emoji: '🚽', price: 175, unit: 'job' },
    { name: 'Emergency Plumbing', emoji: '🚨', price: 295, unit: 'job' },
  ],
}

const FALLBACK_SERVICES = [
  { name: 'Standard Service', emoji: '⚙️', price: 125, unit: 'job' },
  { name: 'Premium Service', emoji: '⭐', price: 225, unit: 'job' },
  { name: 'Emergency Call', emoji: '🚨', price: 295, unit: 'job' },
]

type Step = 1 | 2 | 3

export default function SignupPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step, setStep]       = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [bizName, setBizName]     = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone]         = useState('')
  const [trade, setTrade]         = useState('')
  const [services, setServices]   = useState<{ name: string; emoji: string; price: number; unit: string }[]>([])

  function loadDefaultServices(selectedTrade: string) {
    const defaults = DEFAULT_SERVICES[selectedTrade] || FALLBACK_SERVICES
    setServices(defaults.map(s => ({ ...s })))
  }

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPw) { setError('Passwords do not match'); return }
    if (password.length < 8)    { setError('Password must be at least 8 characters'); return }
    setError(null)
    setStep(2)
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault()
    loadDefaultServices(trade)
    setError(null)
    setStep(3)
  }

  async function handleStep3(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: ownerName } },
      })

      if (authErr || !authData.user) throw new Error(authErr?.message || 'Signup failed')

      const { data: biz, error: bizErr } = await supabase
        .from('service_companies')
        .insert({
          name:        bizName,
          owner_name:  ownerName,
          owner_email: email,
          owner_phone: phone,
          trade,
          status:      'active',
        })
        .select()
        .single()

      if (bizErr || !biz) throw new Error(bizErr?.message || 'Could not create business')

      await supabase.from('team_members').insert({
        business_id: biz.id,
        user_id:     authData.user.id,
        full_name:   ownerName,
        email,
        phone,
        role:        'owner',
        active:      true,
      })

      const serviceRows = services
        .filter(s => s.name.trim() && s.price > 0)
        .map((s, i) => ({
          business_id:   biz.id,
          name:          s.name,
          emoji:         s.emoji,
          unit:          s.unit,
          default_price: s.price,
          sort_order:    i,
          active:        true,
        }))

      if (serviceRows.length > 0) {
        await supabase.from('services').insert(serviceRows)
      }

      router.push('/dashboard')
      router.refresh()

    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder-white/20 outline-none focus:border-blue-400 transition-colors"
  const selectClass = "w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white outline-none focus:border-blue-400 transition-colors appearance-none"

  return (
    <div className="min-h-screen bg-[#0E1117] flex flex-col items-center justify-center px-4 py-12"
         style={{
           backgroundImage: 'linear-gradient(rgba(79,142,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,0.03) 1px, transparent 1px)',
           backgroundSize: '60px 60px'
         }}>

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              className="text-4xl font-bold text-white tracking-tight">
            Servaia
          </h1>
          <p className="text-sm text-white/40 tracking-widest uppercase mt-1">Set up your account</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1,2,3].map(n => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === n ? 'bg-blue-500 text-white' :
                step > n  ? 'bg-green-500 text-white' :
                'bg-white/10 text-white/30'
              }`}>{step > n ? '✓' : n}</div>
              {n < 3 && <div className={`w-8 h-px ${step > n ? 'bg-green-500/40' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8">

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-5">
              <div>
                <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                    className="text-2xl font-semibold text-white mb-1">Create your account</h2>
                <p className="text-sm text-white/40">You'll use this to log into Servaia</p>
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@yourbusiness.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="At least 8 characters" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Confirm Password</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required placeholder="••••••••" className={inputClass} />
              </div>
              {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>}
              <button type="submit" className="w-full py-3.5 bg-blue-500 text-white font-bold text-sm rounded-lg hover:bg-blue-400 transition-all">Continue →</button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-5">
              <div>
                <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                    className="text-2xl font-semibold text-white mb-1">Your business</h2>
                <p className="text-sm text-white/40">Tell us about your company</p>
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Business Name</label>
                <input type="text" value={bizName} onChange={e => setBizName(e.target.value)} required placeholder="Green Valley Landscaping" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Your Name</label>
                <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} required placeholder="John Martinez" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="(555) 000-0000" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Your Trade</label>
                <select value={trade} onChange={e => setTrade(e.target.value)} required className={selectClass}>
                  <option value="" className="bg-[#1C2333]">Select your trade...</option>
                  {TRADES.map(t => <option key={t} value={t} className="bg-[#1C2333]">{t}</option>)}
                </select>
              </div>
              {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3.5 border border-white/10 text-white/50 text-sm rounded-lg hover:border-white/20 transition-all">Back</button>
                <button type="submit" className="flex-[2] py-3.5 bg-blue-500 text-white font-bold text-sm rounded-lg hover:bg-blue-400 transition-all">Continue →</button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleStep3} className="space-y-4">
              <div>
                <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                    className="text-2xl font-semibold text-white mb-1">Your services</h2>
                <p className="text-sm text-white/40">Set your default prices — adjust per customer anytime</p>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {services.map((svc, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2.5">
                    <span className="text-xl w-7 flex-shrink-0">{svc.emoji}</span>
                    <span className="text-sm text-white flex-1">{svc.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-white/40 text-xs">$</span>
                      <input
                        type="number"
                        value={svc.price}
                        onChange={e => {
                          const updated = [...services]
                          updated[i] = { ...updated[i], price: parseFloat(e.target.value) || 0 }
                          setServices(updated)
                        }}
                        className="w-16 bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-sm text-white text-right outline-none focus:border-blue-400"
                      />
                      <span className="text-white/30 text-xs">/{svc.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/30 text-center">These are your starting defaults. You can set different prices per customer.</p>
              {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-3.5 border border-white/10 text-white/50 text-sm rounded-lg hover:border-white/20 transition-all">Back</button>
                <button type="submit" disabled={loading} className="flex-[2] py-3.5 bg-blue-500 text-white font-bold text-sm rounded-lg hover:bg-blue-400 transition-all disabled:opacity-50">
                  {loading ? 'Setting up...' : 'Launch My Account →'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}