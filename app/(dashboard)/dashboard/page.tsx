import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DollarSign, Users, Briefcase, TrendingUp, ArrowUpRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('team_members')
    .select('*, service_companies(id, name)')
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/login')
  const businessId = (member.service_companies as any).id

  const [
    { data: customers },
    { data: jobs },
    { data: todayJobs },
    { data: pendingCards },
  ] = await Promise.all([
    supabase.from('customers').select('id, card_status').eq('business_id', businessId),
    supabase.from('payments').select('id, amount, payment_status, completed_at, customers(full_name), job_services(name, price_charged)')
      .eq('business_id', businessId).order('completed_at', { ascending: false }).limit(10),
    supabase.from('payments').select('id, amount').eq('business_id', businessId)
      .gte('completed_at', new Date().toISOString().slice(0, 10))
      .eq('payment_status', 'charged'),
    supabase.from('customers').select('id').eq('business_id', businessId).eq('card_status', 'pending'),
  ])

  const totalCustomers   = customers?.length || 0
  const authorizedCards  = customers?.filter(c => c.card_status === 'authorized').length || 0
  const pendingCardCount = pendingCards?.length || 0
  const todayRevenue     = todayJobs?.reduce((s, j) => s + Number(j.amount), 0) || 0
  const totalRevenue     = jobs?.filter(j => j.payment_status === 'charged').reduce((s, j) => s + Number(j.amount), 0) || 0
  const totalJobs        = jobs?.length || 0

  const stats = [
    { label: "Today's Revenue", value: `$${todayRevenue.toFixed(2)}`, icon: DollarSign, color: '#3DBF7F', bg: 'rgba(61,191,127,0.1)', change: 'Today' },
    { label: 'Total Revenue',   value: `$${totalRevenue.toFixed(2)}`, icon: TrendingUp,  color: '#4F8EF7', bg: 'rgba(79,142,247,0.1)', change: 'All time' },
    { label: 'Active Customers',value: `${authorizedCards} / ${totalCustomers}`, icon: Users, color: '#E8B84B', bg: 'rgba(232,184,75,0.1)', change: 'Cards on file' },
    { label: 'Jobs Completed',  value: String(totalJobs), icon: Briefcase, color: '#4F8EF7', bg: 'rgba(79,142,247,0.1)', change: 'Total' },
  ]

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
        <div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              className="text-2xl lg:text-3xl font-bold tracking-tight text-[#0E1117]">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {member.full_name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7490' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/dashboard/jobs/new"
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors w-full lg:w-auto"
          style={{ background: '#0E1117' }}>
          + Mark Job Done
        </Link>
      </div>

      {/* Pending cards alert */}
      {pendingCardCount > 0 && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
             style={{ background: 'rgba(232,160,32,0.1)', border: '1px solid rgba(232,160,32,0.2)' }}>
          <AlertCircle size={16} style={{ color: '#E8A020', flexShrink: 0 }} />
          <span className="font-medium" style={{ color: '#0E1117' }}>
            {pendingCardCount} customer{pendingCardCount > 1 ? 's' : ''} haven't authorized their card yet.
          </span>
          <Link href="/dashboard/customers"
            className="ml-auto font-semibold flex items-center gap-1 hover:underline"
            style={{ color: '#E8A020' }}>
            View <ArrowUpRight size={12} />
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-xl p-4 lg:p-5 shadow-sm"
               style={{ border: '1px solid #DDE1EC' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center"
                   style={{ background: stat.bg }}>
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              <span className="text-xs font-medium" style={{ color: '#6B7490' }}>{stat.change}</span>
            </div>
            <div className="text-xl lg:text-2xl font-bold font-mono tracking-tight" style={{ color: '#0E1117' }}>
              {stat.value}
            </div>
            <div className="text-xs mt-1" style={{ color: '#6B7490' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent jobs */}
      <div className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #DDE1EC' }}>
        <div className="flex items-center justify-between px-6 py-4"
             style={{ borderBottom: '1px solid #DDE1EC' }}>
          <h2 className="font-semibold" style={{ color: '#0E1117' }}>Recent Jobs</h2>
          <Link href="/dashboard/jobs"
            className="text-xs font-medium hover:underline flex items-center gap-1"
            style={{ color: '#4F8EF7' }}>
            View all <ArrowUpRight size={11} />
          </Link>
        </div>
        <div>
          {!jobs || jobs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Briefcase size={32} className="mx-auto mb-3" style={{ color: '#DDE1EC' }} />
              <p className="text-sm" style={{ color: '#6B7490' }}>
                No jobs yet.{' '}
                <Link href="/dashboard/customers" className="font-medium hover:underline" style={{ color: '#4F8EF7' }}>
                  Add your first customer →
                </Link>
              </p>
            </div>
          ) : (
            <>
              {/* Desktop List */}
              <div className="hidden lg:block">
                {jobs.map((job: any) => (
                  <div key={job.id} className="flex items-center gap-4 px-6 py-4"
                       style={{ borderBottom: '1px solid #DDE1EC' }}>
                    {job.payment_status === 'charged' && <CheckCircle2 size={14} style={{ color: '#3DBF7F', flexShrink: 0 }} />}
                    {job.payment_status === 'failed'  && <AlertCircle  size={14} style={{ color: '#E05252', flexShrink: 0 }} />}
                    {job.payment_status === 'pending' && <Clock        size={14} style={{ color: '#E8A020', flexShrink: 0 }} />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: '#0E1117' }}>
                        {(job.customers as any)?.full_name || 'Unknown'}
                      </div>
                      <div className="text-xs truncate" style={{ color: '#6B7490' }}>
                        {(job.job_services as any[])?.map((s: any) => s.name).join(', ') || '—'}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold font-mono" style={{ color: '#0E1117' }}>
                        ${Number(job.amount).toFixed(2)}
                      </div>
                      <div className="text-xs" style={{ color: '#6B7490' }}>
                        {new Date(job.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden p-4 space-y-3">
                {jobs.map((job: any) => (
                  <div key={job.id} className="bg-white border border-[#DDE1EC] rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm font-semibold truncate" style={{ color: '#0E1117' }}>
                        {(job.customers as any)?.full_name || 'Unknown'}
                      </div>
                      <div className="flex items-center gap-2">
                        {job.payment_status === 'charged' && <CheckCircle2 size={14} style={{ color: '#3DBF7F' }} />}
                        {job.payment_status === 'failed'  && <AlertCircle  size={14} style={{ color: '#E05252' }} />}
                        {job.payment_status === 'pending' && <Clock        size={14} style={{ color: '#E8A020' }} />}
                      </div>
                    </div>
                    <div className="text-xs mb-2" style={{ color: '#6B7490' }}>
                      {(job.job_services as any[])?.map((s: any) => s.name).join(', ') || '—'}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold font-mono" style={{ color: '#0E1117' }}>
                        ${Number(job.amount).toFixed(2)}
                      </div>
                      <div className="text-xs" style={{ color: '#6B7490' }}>
                        {new Date(job.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}