'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DollarSign, Users, Briefcase, TrendingUp, ArrowUpRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Period = 'today' | 'week' | 'month' | 'year' | 'all'

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
]

function getPeriodStart(period: Period): string | null {
  const now = new Date()
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  }
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }
  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1).toISOString()
  }
  return null
}

function buildChartData(payments: any[], period: Period) {
  if (!payments.length) return []

  const now = new Date()
  const data: { label: string; revenue: number }[] = []

  if (period === 'today') {
    for (let h = 0; h <= now.getHours(); h++) {
      const label = `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`
      const revenue = payments
        .filter(p => p.completed_at && new Date(p.completed_at).getHours() === h)
        .reduce((s, p) => s + Number(p.amount || 0), 0)
      data.push({ label, revenue })
    }
  } else if (period === 'week') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let d = 0; d < 7; d++) {
      const revenue = payments
        .filter(p => p.completed_at && new Date(p.completed_at).getDay() === d)
        .reduce((s, p) => s + Number(p.amount || 0), 0)
      data.push({ label: days[d], revenue })
    }
  } else if (period === 'month') {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const revenue = payments
        .filter(p => p.completed_at && new Date(p.completed_at).getDate() === d)
        .reduce((s, p) => s + Number(p.amount || 0), 0)
      data.push({ label: String(d), revenue })
    }
  } else if (period === 'year' || period === 'all') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for (let m = 0; m < 12; m++) {
      const revenue = payments
        .filter(p => p.completed_at && new Date(p.completed_at).getMonth() === m)
        .reduce((s, p) => s + Number(p.amount || 0), 0)
      data.push({ label: months[m], revenue })
    }
  }

  return data
}

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('there')
  const [businessId, setBusinessId] = useState('')
  const [period, setPeriod] = useState<Period>('month')

  const [allPayments, setAllPayments] = useState<any[]>([])
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [pendingCards, setPendingCards] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: member } = await supabase
      .from('team_members')
      .select('*, service_companies(id, name)')
      .eq('user_id', user.id)
      .single()

    if (!member || !(member.service_companies as any)?.id) { router.push('/login'); return }
    const bizId = (member.service_companies as any).id
    setBusinessId(bizId)
    setFirstName(member.full_name?.split(' ')[0] || 'there')

    const [
      { data: pays },
      { data: jobs },
      { data: custs },
      { data: pending },
    ] = await Promise.all([
      supabase.from('payments').select('id, amount, payment_status, completed_at')
        .eq('business_id', bizId)
        .in('payment_status', ['charged', 'succeeded']),
      supabase.from('payments').select('id, amount, payment_status, completed_at, customers(full_name), job_services(name, price_charged)')
        .eq('business_id', bizId).order('completed_at', { ascending: false }).limit(10),
      supabase.from('customers').select('id, card_status').eq('business_id', bizId),
      supabase.from('customers').select('id, full_name').eq('business_id', bizId).eq('card_status', 'pending'),
    ])

    setAllPayments(pays || [])
    setRecentJobs(jobs || [])
    setCustomers(custs || [])
    setPendingCards(pending || [])
    setLoading(false)
  }

  // Filter payments by period
  const periodStart = getPeriodStart(period)
  const filteredPayments = periodStart
    ? allPayments.filter(p => p.completed_at && new Date(p.completed_at) >= new Date(periodStart))
    : allPayments

  const periodRevenue = filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const periodJobs = filteredPayments.length
  const avgJobValue = periodJobs > 0 ? periodRevenue / periodJobs : 0
  const totalCustomers = customers.length
  const authorizedCards = customers.filter(c => c.card_status === 'authorized' || c.card_status === 'active').length
  const pendingCardCount = pendingCards.length

  // Best customer
  const customerTotals: Record<string, { name: string; total: number }> = {}
  recentJobs.forEach(j => {
    const name = (j.customers as any)?.full_name || 'Unknown'
    if (!customerTotals[name]) customerTotals[name] = { name, total: 0 }
    customerTotals[name].total += Number(j.amount || 0)
  })
  const bestCustomer = Object.values(customerTotals).sort((a, b) => b.total - a.total)[0]

  const chartData = buildChartData(filteredPayments, period)
  const hasChartData = chartData.some(d => d.revenue > 0)

  const periodLabel = PERIODS.find(p => p.value === period)?.label || 'This Month'

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-[#6B7490] text-sm">Loading dashboard...</div>
    </div>
  )

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
        <div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              className="text-2xl lg:text-3xl font-bold tracking-tight text-[#0E1117]">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {firstName} 👋
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
            {pendingCardCount} customer{pendingCardCount > 1 ? 's' : ''} {pendingCardCount > 1 ? "haven't" : "hasn't"} authorized their card yet:
            {' '}{pendingCards.map((c: any) => c.full_name).join(', ')}
          </span>
          <Link href="/dashboard/customers"
            className="ml-auto font-semibold flex items-center gap-1 hover:underline flex-shrink-0"
            style={{ color: '#E8A020' }}>
            View <ArrowUpRight size={12} />
          </Link>
        </div>
      )}

      {/* Period selector */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm overflow-x-auto"
           style={{ border: '1px solid #DDE1EC' }}>
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`flex-1 min-w-fit px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              period === p.value
                ? 'bg-[#0E1117] text-white'
                : 'text-[#6B7490] hover:text-[#0E1117] hover:bg-gray-50'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link href="/dashboard/jobs"
          className="bg-white rounded-xl p-4 lg:p-5 shadow-sm hover:shadow-md transition-shadow"
          style={{ border: '1px solid #DDE1EC' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(61,191,127,0.1)' }}>
              <DollarSign size={18} style={{ color: '#3DBF7F' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: '#6B7490' }}>{periodLabel}</span>
          </div>
          <div className="text-xl lg:text-2xl font-bold font-mono tracking-tight" style={{ color: '#0E1117' }}>
            ${periodRevenue.toFixed(2)}
          </div>
          <div className="text-xs mt-1" style={{ color: '#6B7490' }}>Revenue</div>
        </Link>

        <Link href="/dashboard/jobs"
          className="bg-white rounded-xl p-4 lg:p-5 shadow-sm hover:shadow-md transition-shadow"
          style={{ border: '1px solid #DDE1EC' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(79,142,247,0.1)' }}>
              <Briefcase size={18} style={{ color: '#4F8EF7' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: '#6B7490' }}>{periodLabel}</span>
          </div>
          <div className="text-xl lg:text-2xl font-bold font-mono tracking-tight" style={{ color: '#0E1117' }}>
            {periodJobs}
          </div>
          <div className="text-xs mt-1" style={{ color: '#6B7490' }}>Jobs Completed</div>
        </Link>

        <Link href="/dashboard/jobs"
          className="bg-white rounded-xl p-4 lg:p-5 shadow-sm hover:shadow-md transition-shadow"
          style={{ border: '1px solid #DDE1EC' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(232,184,75,0.1)' }}>
              <TrendingUp size={18} style={{ color: '#E8B84B' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: '#6B7490' }}>{periodLabel}</span>
          </div>
          <div className="text-xl lg:text-2xl font-bold font-mono tracking-tight" style={{ color: '#0E1117' }}>
            ${avgJobValue.toFixed(2)}
          </div>
          <div className="text-xs mt-1" style={{ color: '#6B7490' }}>Avg Job Value</div>
        </Link>

        <Link href="/dashboard/customers"
          className="bg-white rounded-xl p-4 lg:p-5 shadow-sm hover:shadow-md transition-shadow"
          style={{ border: '1px solid #DDE1EC' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(79,142,247,0.1)' }}>
              <Users size={18} style={{ color: '#4F8EF7' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: '#6B7490' }}>Cards on file</span>
          </div>
          <div className="text-xl lg:text-2xl font-bold font-mono tracking-tight" style={{ color: '#0E1117' }}>
            {authorizedCards} / {totalCustomers}
          </div>
          <div className="text-xs mt-1" style={{ color: '#6B7490' }}>Active Customers</div>
        </Link>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6" style={{ border: '1px solid #DDE1EC' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-[#0E1117]">Revenue — {periodLabel}</h2>
          {bestCustomer && (
            <div className="text-right hidden lg:block">
              <p className="text-xs text-[#6B7490]">Top customer</p>
              <p className="text-sm font-semibold text-[#0E1117]">{bestCustomer.name} · ${bestCustomer.total.toFixed(2)}</p>
            </div>
          )}
        </div>
        {hasChartData ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F8EF7" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4F8EF7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7490' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7490' }} axisLine={false} tickLine={false}
                tickFormatter={v => v === 0 ? '$0' : `$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
              <Tooltip
                formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #DDE1EC', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#4F8EF7" strokeWidth={2}
                fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: '#4F8EF7' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-[#6B7490]">No revenue data for {periodLabel.toLowerCase()}</p>
          </div>
        )}
      </div>

      {/* Recent jobs */}
      <div className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #DDE1EC' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #DDE1EC' }}>
          <h2 className="font-semibold" style={{ color: '#0E1117' }}>Recent Jobs</h2>
          <Link href="/dashboard/jobs"
            className="text-xs font-medium hover:underline flex items-center gap-1"
            style={{ color: '#4F8EF7' }}>
            View all <ArrowUpRight size={11} />
          </Link>
        </div>
        <div>
          {!recentJobs || recentJobs.length === 0 ? (
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
              <div className="hidden lg:block">
                {recentJobs.map((job: any) => (
                  <Link key={job.id} href={`/dashboard/jobs/${job.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                    style={{ borderBottom: '1px solid #DDE1EC' }}>
                    {(job.payment_status === 'charged' || job.payment_status === 'succeeded') && <CheckCircle2 size={14} style={{ color: '#3DBF7F', flexShrink: 0 }} />}
                    {job.payment_status === 'failed'    && <AlertCircle size={14} style={{ color: '#E05252', flexShrink: 0 }} />}
                    {job.payment_status === 'pending'   && <Clock size={14} style={{ color: '#E8A020', flexShrink: 0 }} />}
                    {job.payment_status === 'manual_collection' && <DollarSign size={14} style={{ color: '#E8B84B', flexShrink: 0 }} />}
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
                        {job.completed_at ? new Date(job.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="lg:hidden p-4 space-y-3">
                {recentJobs.map((job: any) => (
                  <Link key={job.id} href={`/dashboard/jobs/${job.id}`}
                    className="block bg-white border border-[#DDE1EC] rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm font-semibold truncate" style={{ color: '#0E1117' }}>
                        {(job.customers as any)?.full_name || 'Unknown'}
                      </div>
                      <div className="flex items-center gap-2">
                        {(job.payment_status === 'charged' || job.payment_status === 'succeeded') && <CheckCircle2 size={14} style={{ color: '#3DBF7F' }} />}
                        {job.payment_status === 'failed'    && <AlertCircle size={14} style={{ color: '#E05252' }} />}
                        {job.payment_status === 'pending'   && <Clock size={14} style={{ color: '#E8A020' }} />}
                        {job.payment_status === 'manual_collection' && <DollarSign size={14} style={{ color: '#E8B84B' }} />}
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
                        {job.completed_at ? new Date(job.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}