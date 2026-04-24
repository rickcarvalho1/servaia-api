import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Plus, CheckCircle2, Clock, XCircle, ArrowUpRight, Phone, Mail } from 'lucide-react'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('team_members')
    .select('service_companies(id)')
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/login')
  const businessId = (member.service_companies as any).id

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  const authorized = customers?.filter(c => c.card_status === 'authorized').length || 0
  const pending    = customers?.filter(c => c.card_status === 'pending').length || 0
  const failed     = customers?.filter(c => c.card_status === 'failed').length || 0

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0E1117]"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            Customers
          </h1>
          <p className="text-sm mt-1 text-[#6B7490]">
            {customers?.length || 0} total · {authorized} with card on file
          </p>
        </div>
        <Link href="/dashboard/customers/new"
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg bg-[#0E1117] hover:bg-[#4F8EF7] transition-colors">
          <Plus size={16} /> Add Customer
        </Link>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[rgba(61,191,127,0.1)] text-[#3DBF7F] border border-[rgba(61,191,127,0.2)]">
          {authorized} Card on file
        </div>
        <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[rgba(232,160,32,0.1)] text-[#E8A020] border border-[rgba(232,160,32,0.2)]">
          {pending} Pending auth
        </div>
        <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[rgba(224,82,82,0.1)] text-[#E05252] border border-[rgba(224,82,82,0.2)]">
          {failed} Card failed
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#DDE1EC]">
        {!customers || customers.length === 0 ? (
          <div className="py-20 text-center">
            <Users size={40} className="mx-auto mb-4 text-[#DDE1EC]" />
            <p className="font-semibold mb-1 text-[#0E1117]">No customers yet</p>
            <p className="text-sm mb-4 text-[#6B7490]">
              Add your first customer and send them an authorization link.
            </p>
            <Link href="/dashboard/customers/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg bg-[#4F8EF7]">
              <Plus size={16} /> Add First Customer
            </Link>
          </div>
        ) : (
          <div>
            {customers.map((customer: any) => (
              <Link key={customer.id} href={`/dashboard/customers/${customer.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors border-b border-[#DDE1EC] last:border-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-[rgba(79,142,247,0.1)] text-[#4F8EF7]">
                  {customer.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-[#0E1117]">{customer.full_name}</span>
                    {customer.card_status === 'authorized' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(61,191,127,0.1)] text-[#3DBF7F]">
                        <CheckCircle2 size={10} /> Card on file
                      </span>
                    )}
                    {customer.card_status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(232,160,32,0.1)] text-[#E8A020]">
                        <Clock size={10} /> Pending
                      </span>
                    )}
                    {customer.card_status === 'failed' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(224,82,82,0.1)] text-[#E05252]">
                        <XCircle size={10} /> Failed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#6B7490]">
                    {customer.phone && <span className="flex items-center gap-1"><Phone size={10} />{customer.phone}</span>}
                    {customer.email && <span className="flex items-center gap-1 truncate"><Mail size={10} />{customer.email}</span>}
                    {customer.address && <span className="truncate hidden sm:block">📍 {customer.address}</span>}
                  </div>
                </div>
                {customer.card_last4 && (
                  <div className="text-xs text-[#6B7490] flex-shrink-0">
                    {customer.card_brand} ···{customer.card_last4}
                  </div>
                )}
                <ArrowUpRight size={14} className="text-[#DDE1EC]" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}