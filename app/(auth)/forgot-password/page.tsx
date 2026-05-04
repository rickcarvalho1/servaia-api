'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://app.servaiapay.com/auth/callback?next=/reset-password',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

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
          {!sent ? (
            <>
              <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                  className="text-2xl font-semibold text-white mb-1">
                Reset your password
              </h2>
              <p className="text-sm text-white/40 mb-8">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@yourbusiness.com"
                    required
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder-white/20 outline-none focus:border-blue-400 transition-colors"
                  />
                </div>

                {error && (
                  <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-blue-500 text-white font-bold text-sm rounded-lg hover:bg-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-wide">
                  {loading ? 'Sending...' : 'Send Reset Link →'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center mx-auto mb-6">
                <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                  className="text-2xl font-semibold text-white mb-2">
                Check your email
              </h2>
              <p className="text-sm text-white/40 mb-2">
                We sent a password reset link to
              </p>
              <p className="text-sm text-white font-medium mb-6">{email}</p>
              <p className="text-xs text-white/30">
                Didn't get it? Check your spam folder or{' '}
                <button onClick={() => setSent(false)} className="text-blue-400 hover:text-blue-300 underline">
                  try again
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          Remember your password?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}