'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'

const PAYMENT_METHODS = [
  { value: 'card', label: 'Card on File', description: 'Customer saves card — charged automatically on job completion' },
  { value: 'cash_check', label: 'Cash / Check', description: 'No card needed — collect payment manually after each job' },
  { value: 'invoice', label: 'Invoice', description: 'No card needed — you handle billing separately' },
]

export default function NewCustomerPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)
  const [newCustomer, setNewCustomer] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [selectedServices, setSelectedServices] = useState<{ serviceId: string; name: string; emoji: string; price: string }[]>([])
  const [showServices, setShowServices] = useState(false)
  const [businessId, setBusinessId] = useState('')

  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', address: '', notes: '',
    payment_method: 'card',
  })

  useEffect(() => {
    async function loadServices() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: member } = await supabase
        .from('team_members')
        .select('service_companies(id, name)')
        .eq('user_id', user.id)
        .single()
      if (!member) return
      const biz = member.service_companies as any
      setBusinessId(biz.id)
      const { data: svcs } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', biz.id)
        .eq('active', true)
        .order('sort_order')
      setServices(svcs || [])
    }
    loadServices()
  }, [])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleService(svc: any) {
    const exists = selectedServices.find(s => s.serviceId === svc.id)
    if (exists) {
      setSelectedServices(prev => prev.filter(s => s.serviceId !== svc.id))
    } else {
      setSelectedServices(prev => [...prev, {
        serviceId: svc.id,
        name: svc.name,
        emoji: svc.emoji,
        price: svc.default_price.toString(),
      }])
    }
  }

  function updatePrice(serviceId: string, price: string) {
    setSelectedServices(prev =>
      prev.map(s => s.serviceId === serviceId ? { ...s, price } : s)
    )
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

      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .insert({
          business_id:    biz.id,
          full_name:      form.full_name,
          phone:          form.phone,
          email:          form.email || null,
          address:        form.address || null,
          notes:          form.notes || null,
          card_status:    form.payment_method === 'card' ? 'pending' : 'not_required',
          payment_method: form.payment_method,
        })
        .select()
        .single()

      if (custErr) throw new Error(custErr.message)

      // Save custom service pricing if any selected
      if (selectedServices.length > 0) {
        const inserts = selectedServices.map(s => ({
          customer_id: customer.id,
          service_id:  s.serviceId,
          price:       parseFloat(s.price) || 0,
        }))
        await supabase.from('customer_services').insert(inserts)
      }

      setNewCustomer({ ...customer, businessName: biz.name })
      setDone(true)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done && newCustomer) {
    const isCard = newCustomer.payment_method === 'card'
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
          <p className="text-[#6B7490] text-sm mb-2">
            <strong>{newCustomer.full_name}</strong> has been added
            {isCard ? ' — send them an authorization link to save their card.' : ' — they pay by ' + (newCustomer.payment_method === 'cash_check' ? 'cash or check' : 'invoice') + '.'}
          </p>
          {selectedServices.length > 0 && (
            <p className="text-xs text-[#3DBF7F] font-medium mb-4">
              {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} assigned with custom pricing
            </p>
          )}
          {isCard && (
            <p className="text-xs text-[#6B7490] bg-[#F8F9FC] border border-[#DDE1EC] rounded-lg px-4 py-3 mb-4">
              📱 Send the card authorization link from the customer detail page.
            </p>
          )}
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
        Add a new customer and choose how they pay.
      </p>

      <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">Full Name *</label>
            <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} required
              placeholder="Sarah Johnson"
              className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm text-[#0E1117] placeholder-[#9BA3B8] outline-none focus:border-[#4F8EF7] bg-white transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">Phone Number *</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} required
              placeholder="(555) 000-0000"
              className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm text-[#0E1117] placeholder-[#9BA3B8] outline-none focus:border-[#4F8EF7] bg-white transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">Email Address</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="sarah@email.com"
              className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm text-[#0E1117] placeholder-[#9BA3B8] outline-none focus:border-[#4F8EF7] bg-white transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">Service Address</label>
            <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="123 Main St, Newton MA 02468"
              className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm text-[#0E1117] placeholder-[#9BA3B8] outline-none focus:border-[#4F8EF7] bg-white transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">How Does This Customer Pay?</label>
            <div className="space-y-2">
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.value} type="button" onClick={() => set('payment_method', pm.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    form.payment_method === pm.value
                      ? 'border-[#0E1117] bg-[#0E1117]/5'
                      : 'border-[#DDE1EC] bg-white hover:border-gray-300'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      form.payment_method === pm.value ? 'border-[#0E1117]' : 'border-gray-300'
                    }`}>
                      {form.payment_method === pm.value && <div className="w-2 h-2 rounded-full bg-[#0E1117]" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0E1117]">{pm.label}</p>
                      <p className="text-xs text-[#6B7490]">{pm.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Services — optional */}
          {services.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowServices(!showServices)}
                className="flex items-center justify-between w-full text-left">
                <div>
                  <span className="block text-xs font-bold tracking-widest uppercase text-[#6B7490]">
                    Assign Services & Custom Pricing
                  </span>
                  <span className="text-xs text-[#9BA3B8] mt-0.5 block">
                    {selectedServices.length > 0
                      ? `${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} selected`
                      : 'Optional — uses default prices if skipped'}
                  </span>
                </div>
                {showServices
                  ? <ChevronUp size={16} className="text-[#6B7490] flex-shrink-0" />
                  : <ChevronDown size={16} className="text-[#6B7490] flex-shrink-0" />
                }
              </button>

              {showServices && (
                <div className="mt-3 space-y-2">
                  {services.map(svc => {
                    const selected = selectedServices.find(s => s.serviceId === svc.id)
                    return (
                      <div key={svc.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                          selected ? 'border-[#4F8EF7] bg-[rgba(79,142,247,0.04)]' : 'border-[#DDE1EC]'
                        }`}>
                        <button type="button" onClick={() => toggleService(svc)} className="flex items-center gap-3 flex-1 text-left">
                          <span className="text-lg">{svc.emoji}</span>
                          <span className="text-sm font-medium text-[#0E1117]">{svc.name}</span>
                        </button>
                        {selected ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[#6B7490] text-sm">$</span>
                            <input
                              type="number"
                              value={selected.price}
                              onChange={e => updatePrice(svc.id, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className="w-20 px-2 py-1 border border-[#DDE1EC] rounded text-sm text-right font-mono text-[#0E1117] outline-none focus:border-[#4F8EF7] bg-white"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-[#9BA3B8] font-mono">${svc.default_price}</span>
                        )}
                        <button type="button" onClick={() => toggleService(svc)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            selected ? 'bg-[#4F8EF7] border-[#4F8EF7] text-white' : 'border-[#DDE1EC]'
                          }`}>
                          {selected && <span className="text-xs">✓</span>}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">Internal Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="e.g. Large corner lot, gate code is 1234..."
              rows={3}
              className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm text-[#0E1117] placeholder-[#9BA3B8] outline-none focus:border-[#4F8EF7] bg-white transition-colors resize-none" />
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