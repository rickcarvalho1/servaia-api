'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Send } from 'lucide-react'

export default function NewCustomerPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [done, setDone]       = useState(false)
  const [newCustomer, setNewCustomer] = useState<any>(null)

  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', address: '', notes: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: member } = await supabase
        .from('team_members')
        .select('service_companies(id, name)')
        .eq('user_id', user.id)
        .single()

      if (!member) throw new Error('Business not found')
      const biz = member.service_companies as any

      // Insert customer directly into Supabase
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .insert({
          business_id: biz.id,
          full_name:   form.full_name,
          phone:       form.phone,
          email:       form.email || null,
          address:     form.address || null,
          notes:       form.notes || null,
          card_status: 'pending',
        })
        .select()
        .single()

      if (custErr) throw new Error(custErr.message)

      setNewCustomer({ ...customer, businessName: biz.name })
      setDone(true)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done && newCustomer) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-[rgba(61,191,127,0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-[#0E1117] mb-2"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            Customer Added!
          </h2>
          <p className="text-[#6B7490] text-sm mb-6">
            <strong>{newCustomer.full_name}</strong> has been added. Send them an authorization link so they can save their card on file.
          </p>
          <p className="text-xs text-[#6B7490] bg-[#F8F9FC] border border-[#DDE1EC] rounded-lg px-4 py-3 mb-4">
            📱 Authorization link sending via SMS will be available once Twilio is connected. For now, share the link manually.
          </p>
          <Link href="/dashboard/customers"
            className="block w-full py-3 bg-[#4F8EF7] text-white text-sm font-bold rounded-lg hover:bg-blue-500 transition-colors mb-3 text-center">
            View All Customers
          </Link>
          <Link href="/dashboard/customers/new"
            className="block w-full py-3 border border-[#DDE1EC] text-[#6B7490] text-sm rounded-lg hover:bg-[#F8F9FC] transition-colors text-center">
            Add Another Customer
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <Link href="/dashboard/customers"
        className="flex items-center gap-2 text-[#6B7490] text-sm hover:text-[#0E1117] transition-colors mb-6">
        <ArrowLeft size={16} /> Back to Customers
      </Link>

      <h1 className="text-3xl font-bold text-[#0E1117] tracking-tight mb-1"
          style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
        Add Customer
      </h1>
      <p className="text-[#6B7490] text-sm mb-8">
        After adding, send them an authorization link to save their card on file.
      </p>

      <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">
              Full Name *
            </label>
            <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} required
              placeholder="Sarah Johnson"
              className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm text-[#0E1117] placeholder-[#6B7490]/50 outline-none focus:border-[#4F8EF7] bg-[#F8F9FC] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">
              Phone Number *
            </label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} required
              placeholder="(555) 000-0000"
              className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm text-[#0E1117] placeholder-[#6B7490]/50 outline-none focus:border-[#4F8EF7] bg-[#F8F9FC] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">
              Email Address
            </label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="sarah@email.com"
              className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm text-[#0E1117] placeholder-[#6B7490]/50 outline-none focus:border-[#4F8EF7] bg-[#F8F9FC] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">
              Service Address
            </label>
            <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="123 Main St, Newton MA 02468"
              className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm text-[#0E1117] placeholder-[#6B7490]/50 outline-none focus:border-[#4F8EF7] bg-[#F8F9FC] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">
              Internal Notes
            </label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="e.g. Large corner lot, gate code is 1234..."
              rows={3}
              className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm text-[#0E1117] placeholder-[#6B7490]/50 outline-none focus:border-[#4F8EF7] bg-[#F8F9FC] transition-colors resize-none" />
          </div>

          {error && (
            <div className="px-4 py-3 bg-[rgba(224,82,82,0.1)] border border-[rgba(224,82,82,0.2)] rounded-lg text-sm text-[#E05252]">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-[#0E1117] text-white font-bold text-sm rounded-lg hover:bg-[#4F8EF7] transition-colors disabled:opacity-50 tracking-wide">
            {loading ? 'Adding...' : 'Add Customer →'}
          </button>
        </form>
      </div>
    </div>
  )
}