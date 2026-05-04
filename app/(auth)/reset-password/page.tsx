'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function getStrengthIssue(p: string): string | null {
    if (p.length < 8) return 'At least 8 characters required'
    if (!/[A-Z]/.test(p)) return 'Include at least one uppercase letter'
    if (!/[0-9]/.test(p)) return 'Include at least one number'
    return null
  }

  const strengthIssue = getStrengthIssue(password)
  const passwordsMatch = password === confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (strengthIssue) { setError(strengthIssue); return }
    if (!passwordsMatch) { setError('Passwords do not match'); return }

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  if (done) return (
    <div className="min-h-screen bg-[#0E1117] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
          <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
            className="text-2xl font-semibold text-white mb-2">Password updated!</h2>
        <p className="text-sm text-white/40">Redirecting you to the dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0E1117] flex flex-col items-center justify-center px-4"
         style={{
           backgroundImage: 'linear-gradient(rgba(79,142,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,0.03) 1px, transparent 1px)',
           backgroundSize: '60px 60px'
         }}>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              className="text-4xl font-bold text-white tracking-tight mb-2">
            Servaia
          </h1>
          <p className="text-sm text-white/40 tracking-widest uppercase">Payment Platform</p>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8">
          <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              className="text-2xl font-semibold text-white mb-1">
            Set new password
          </h2>
          <p className="text-sm text-white/40 mb-8">Choose a strong password for your account.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder-white/20 outline-none focus:border-blue-400 transition-colors"
              />
              {password && (
                <div className="mt-2 space-y-1">
                  {[
                    { label: '8+ characters', ok: password.length >= 8 },
                    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
                    { label: 'Number', ok: /[0-9]/.test(password) },
                  ].map(rule => (
                    <div key={rule.label} className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${rule.ok ? 'bg-green-400' : 'bg-white/20'}`} />
                      <span className={`text-xs ${rule.ok ? 'text-green-400' : 'text-white/30'}`}>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className={`w-full px-4 py-3 bg-white/[0.06] border rounded-lg text-sm text-white placeholder-white/20 outline-none transition-colors ${
                  confirm && !passwordsMatch ? 'border-red-500/40' : 'border-white/10 focus:border-blue-400'
                }`}
              />
              {confirm && !passwordsMatch && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !!strengthIssue || !passwordsMatch || !confirm}
              className="w-full py-3.5 bg-blue-500 text-white font-bold text-sm rounded-lg hover:bg-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-wide">
              {loading ? 'Updating...' : 'Update Password →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}