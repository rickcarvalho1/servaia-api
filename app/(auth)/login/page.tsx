'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
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
          <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              className="text-2xl font-semibold text-white mb-1">
            Welcome back
          </h2>
          <p className="text-sm text-white/40 mb-8">Sign in to your Servaia account</p>

          <form onSubmit={handleLogin} className="space-y-5">
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

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold tracking-widest uppercase text-white/40">
                  Password
                </label>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder-white/20 outline-none focus:border-blue-400 transition-colors"
              />
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-500 text-white font-bold text-sm rounded-lg hover:bg-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          New to Servaia?{' '}
          <Link href="/signup" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}