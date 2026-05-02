'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { DollarSign, Briefcase, Users, TrendingUp, Download, Calendar, Award } from 'lucide-react'

type Period = 'month' | 'quarter' | 'year' | 'all'

const PERIODS: { label: string; value: Period }[] = [
  { label: 'This Month', value: 'month' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
]

const SERVICE_COLORS = ['#4F8EF7', '#3DBF7F', '#E8B84B', '#E05252', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E']

function getPeriodStart(period: Period): Date | null {
  const now = new Date()
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3)
    return new Date(now.getFullYear(), q * 3, 1)
  }
  if (period === 'year') return new Date(now.getFullYear(), 0, 1)
  return null
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm" style={{ border: '1px solid #DDE1EC' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold font-mono tracking-tight" style={{ color: '#0E1117' }}>{value}</div>
      <div className="text-xs font-medium mt-1" style={{ color: '#6B7490' }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: '#9BA3B8' }}>{sub}</div>}
    </div>
  )
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold" style={{ color: '#0E1117' }}>{title}</h2>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#6B7490' }}>{sub}</p>}
    </div>
  )
}

export default function ReportsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [businessId, setBusinessId] = useState('')

  const [payments, setPayments] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: member } = await supabase
      .from('team_members')
      .select('*, service_companies(id, name)')
      .eq('user_id', user.id)
      .single()

    if (!member || !(member.service_companies as any)?.id) { router.push('/login'); return }
    if (member.role !== 'owner' && member.role !== 'manager') { router.push('/dashboard'); return }

    const bizId = (member.service_companies as any).id
    setBusinessId(bizId)

    const [{ data: pays }, { data: custs }, { data: team }] = await Promise.all([
      supabase.from('payments')
        .select('id, amount, surcharge_amount, payment_status, completed_at, assigned_to, customers(full_name, payment_method), job_services(name, price_charged)')
        .eq('business_id', bizId)
        .order('completed_at', { ascending: false }),
      supabase.from('customers')
        .select('id, full_name, card_status, payment_method, created_at')
        .eq('business_id', bizId),
      supabase.from('team_members')
        .select('id, full_name, role, active')
        .eq('business_id', bizId)
        .eq('active', true),
    ])

    setPayments(pays || [])
    setCustomers(custs || [])
    setTeamMembers(team || [])
    setLoading(false)
  }

  const periodStart = getPeriodStart(period)

  const filtered = payments.filter(p => {
    if (!p.completed_at) return false
    if (periodStart && new Date(p.completed_at) < periodStart) return false
    return true
  })

  const completedFiltered = filtered.filter(p =>
    ['charged', 'succeeded', 'manual_collection'].includes(p.payment_status)
  )
  const cardFiltered = filtered.filter(p => ['charged', 'succeeded'].includes(p.payment_status))
  const manualFiltered = filtered.filter(p => p.payment_status === 'manual_collection')

  const grossRevenue = completedFiltered.reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalSurcharge = cardFiltered.reduce((s, p) => s + Number(p.surcharge_amount || 0), 0)
  const netRevenue = grossRevenue - totalSurcharge
  const totalJobs = completedFiltered.length
  const cardJobs = cardFiltered.length
  const manualJobs = manualFiltered.length
  const avgJobValue = totalJobs > 0 ? grossRevenue / totalJobs : 0

  // Service breakdown
  const serviceTotals: Record<string, { revenue: number; count: number }> = {}
  completedFiltered.forEach(p => {
    ;(p.job_services || []).forEach((s: any) => {
      if (!serviceTotals[s.name]) serviceTotals[s.name] = { revenue: 0, count: 0 }
      serviceTotals[s.name].revenue += Number(s.price_charged || 0)
      serviceTotals[s.name].count += 1
    })
  })
  const serviceBreakdown = Object.entries(serviceTotals)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue)

  // Top customers
  const customerRevenue: Record<string, { name: string; revenue: number; jobs: number; lastJob: string | null }> = {}
  completedFiltered.forEach(p => {
    const name = (p.customers as any)?.full_name || 'Unknown'
    if (!customerRevenue[name]) customerRevenue[name] = { name, revenue: 0, jobs: 0, lastJob: null }
    customerRevenue[name].revenue += Number(p.amount || 0)
    customerRevenue[name].jobs += 1
    if (!customerRevenue[name].lastJob || (p.completed_at && p.completed_at > customerRevenue[name].lastJob!)) {
      customerRevenue[name].lastJob = p.completed_at
    }
  })
  const topCustomers = Object.values(customerRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

  // Dormant customers (60+ days)
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const allCustomerLastJob: Record<string, string> = {}
  payments.forEach(p => {
    if (!p.completed_at) return
    const name = (p.customers as any)?.full_name || 'Unknown'
    if (!allCustomerLastJob[name] || p.completed_at > allCustomerLastJob[name]) {
      allCustomerLastJob[name] = p.completed_at
    }
  })
  const dormantCustomers = customers.filter(c => {
    const last = allCustomerLastJob[c.full_name]
    return !last || new Date(last) < sixtyDaysAgo
  }).slice(0, 8)

  // Team productivity
  const teamStats: Record<string, { name: string; jobs: number; revenue: number }> = {}
  teamMembers.forEach(m => { teamStats[m.full_name] = { name: m.full_name, jobs: 0, revenue: 0 } })
  completedFiltered.forEach(p => {
    const name = p.assigned_to
    if (name && teamStats[name]) {
      teamStats[name].jobs += 1
      teamStats[name].revenue += Number(p.amount || 0)
    }
  })
  const teamPerformance = Object.values(teamStats).sort((a, b) => b.revenue - a.revenue)

  // 6-month trend
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const now = new Date()
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const rev = payments.filter(p => {
      if (!p.completed_at || !['charged','succeeded','manual_collection'].includes(p.payment_status)) return false
      const pd = new Date(p.completed_at)
      return pd >= d && pd <= end
    }).reduce((s, p) => s + Number(p.amount || 0), 0)
    return { label: months[d.getMonth()], revenue: rev }
  })

  function exportCSV() {
    const rows = [
      ['Date', 'Customer', 'Services', 'Amount', 'Surcharge', 'Net', 'Method', 'Status'],
      ...completedFiltered.map(p => [
        p.completed_at ? new Date(p.completed_at).toLocaleDateString() : '',
        (p.customers as any)?.full_name || '',
        (p.job_services || []).map((s: any) => s.name).join('; '),
        Number(p.amount || 0).toFixed(2),
        Number(p.surcharge_amount || 0).toFixed(2),
        (Number(p.amount || 0) - Number(p.surcharge_amount || 0)).toFixed(2),
        (p.customers as any)?.payment_method || 'card',
        p.payment_status,
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `servaia-report-${period}-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-[#6B7490] text-sm">Loading reports...</div>
    </div>
  )

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
        <div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              className="text-2xl lg:text-3xl font-bold tracking-tight text-[#0E1117]">
            Reports
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7490' }}>
            Financial summaries, team performance, and customer insights
          </p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors w-full lg:w-auto hover:opacity-90"
          style={{ background: '#0E1117', color: '#fff' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Period selector */}
      <div className="mb-8">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm overflow-x-auto" style={{ border: '1px solid #DDE1EC' }}>
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`flex-1 min-w-fit px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                period === p.value ? 'bg-[#0E1117] text-white' : 'text-[#6B7490] hover:text-[#0E1117] hover:bg-gray-50'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Financial Summary */}
      <SectionHeader title="Financial Summary" sub={`${PERIODS.find(p => p.value === period)?.label} · ${totalJobs} jobs completed`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Gross Revenue" value={`$${grossRevenue.toFixed(2)}`} sub="Before surcharges" icon={DollarSign} color="#3DBF7F" />
        <StatCard label="Net Revenue" value={`$${netRevenue.toFixed(2)}`} sub="After surcharges" icon={TrendingUp} color="#4F8EF7" />
        <StatCard label="Surcharge Collected" value={`$${totalSurcharge.toFixed(2)}`} sub="Passed to customer" icon={DollarSign} color="#E8B84B" />
        <StatCard label="Avg Job Value" value={`$${avgJobValue.toFixed(2)}`} sub={`${cardJobs} card · ${manualJobs} manual`} icon={Briefcase} color="#9B59B6" />
      </div>

      {/* Payment method split + 6-month trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm" style={{ border: '1px solid #DDE1EC' }}>
          <SectionHeader title="Payment Method Split" />
          <div className="space-y-4">
            {[
              { label: 'Card (Stripe)', count: cardJobs, revenue: cardFiltered.reduce((s,p) => s + Number(p.amount||0), 0), color: '#4F8EF7' },
              { label: 'Cash / Check / Invoice', count: manualJobs, revenue: manualFiltered.reduce((s,p) => s + Number(p.amount||0), 0), color: '#E8B84B' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span style={{ color: '#0E1117' }} className="font-medium">{item.label}</span>
                  <span className="font-mono font-bold" style={{ color: '#0E1117' }}>${item.revenue.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full" style={{ background: '#F0F2F8' }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${totalJobs > 0 ? (item.count / totalJobs) * 100 : 0}%`,
                      background: item.color
                    }} />
                  </div>
                  <span className="text-xs font-medium w-12 text-right" style={{ color: '#6B7490' }}>
                    {totalJobs > 0 ? ((item.count / totalJobs) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm" style={{ border: '1px solid #DDE1EC' }}>
          <SectionHeader title="6-Month Revenue Trend" />
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={monthlyTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7490' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7490' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Revenue']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #DDE1EC', fontSize: '12px' }} />
              <Bar dataKey="revenue" radius={[4,4,0,0]}>
                {monthlyTrend.map((_, i) => (
                  <Cell key={i} fill={i === monthlyTrend.length - 1 ? '#4F8EF7' : '#DDE1EC'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service Breakdown */}
      {serviceBreakdown.length > 0 && (
        <div className="mb-8">
          <SectionHeader title="Revenue by Service" sub="Which services are driving your business" />
          <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #DDE1EC' }}>
            <div className="hidden lg:grid grid-cols-4 px-6 py-3 text-xs font-bold uppercase tracking-widest"
                 style={{ color: '#6B7490', borderBottom: '1px solid #DDE1EC', background: '#F8F9FC' }}>
              <span className="col-span-2">Service</span>
              <span className="text-right">Jobs</span>
              <span className="text-right">Revenue</span>
            </div>
            {serviceBreakdown.map((s, i) => (
              <div key={s.name} className="flex items-center gap-4 px-6 py-4"
                   style={{ borderBottom: i < serviceBreakdown.length - 1 ? '1px solid #DDE1EC' : 'none' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SERVICE_COLORS[i % SERVICE_COLORS.length] }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: '#0E1117' }}>{s.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6B7490' }}>
                    {s.count} job{s.count !== 1 ? 's' : ''} · avg ${s.count > 0 ? (s.revenue / s.count).toFixed(0) : 0}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono" style={{ color: '#0E1117' }}>${s.revenue.toFixed(2)}</div>
                  <div className="text-xs" style={{ color: '#6B7490' }}>
                    {grossRevenue > 0 ? ((s.revenue / grossRevenue) * 100).toFixed(1) : 0}% of total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Performance */}
      {teamPerformance.length > 0 && (
        <div className="mb-8">
          <SectionHeader title="Team Performance" sub="Jobs completed and revenue generated per crew member" />
          <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #DDE1EC' }}>
            <div className="hidden lg:grid grid-cols-4 px-6 py-3 text-xs font-bold uppercase tracking-widest"
                 style={{ color: '#6B7490', borderBottom: '1px solid #DDE1EC', background: '#F8F9FC' }}>
              <span className="col-span-2">Team Member</span>
              <span className="text-right">Jobs</span>
              <span className="text-right">Revenue</span>
            </div>
            {teamPerformance.map((m, i) => (
              <div key={m.name} className="flex items-center gap-4 px-6 py-4"
                   style={{ borderBottom: i < teamPerformance.length - 1 ? '1px solid #DDE1EC' : 'none' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                     style={{
                       background: i === 0 ? 'rgba(232,184,75,0.15)' : 'rgba(79,142,247,0.1)',
                       color: i === 0 ? '#E8B84B' : '#4F8EF7'
                     }}>
                  {i === 0 ? <Award size={14} /> : m.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: '#0E1117' }}>{m.name}</div>
                  {i === 0 && <div className="text-xs" style={{ color: '#E8B84B' }}>Top performer</div>}
                </div>
                <div className="text-sm font-mono text-right" style={{ color: '#6B7490' }}>{m.jobs} jobs</div>
                <div className="text-sm font-bold font-mono text-right w-24" style={{ color: '#0E1117' }}>${m.revenue.toFixed(2)}</div>
              </div>
            ))}
            {teamPerformance.every(m => m.jobs === 0) && (
              <div className="px-6 py-8 text-center text-sm" style={{ color: '#6B7490' }}>
                No jobs assigned to team members this period
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Customers */}
      <div className="mb-8">
        <SectionHeader title="Top Customers" sub={`By revenue · ${PERIODS.find(p => p.value === period)?.label}`} />
        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #DDE1EC' }}>
          <div className="hidden lg:grid grid-cols-4 px-6 py-3 text-xs font-bold uppercase tracking-widest"
               style={{ color: '#6B7490', borderBottom: '1px solid #DDE1EC', background: '#F8F9FC' }}>
            <span className="col-span-2">Customer</span>
            <span className="text-right">Jobs</span>
            <span className="text-right">Revenue</span>
          </div>
          {topCustomers.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm" style={{ color: '#6B7490' }}>No completed jobs this period</div>
          ) : topCustomers.map((c, i) => (
            <div key={c.name} className="flex items-center gap-4 px-6 py-4"
                 style={{ borderBottom: i < topCustomers.length - 1 ? '1px solid #DDE1EC' : 'none' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                   style={{ background: 'rgba(79,142,247,0.1)', color: '#4F8EF7' }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: '#0E1117' }}>{c.name}</div>
                <div className="text-xs" style={{ color: '#6B7490' }}>
                  Last job: {c.lastJob ? new Date(c.lastJob).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </div>
              </div>
              <div className="text-sm font-mono text-right" style={{ color: '#6B7490' }}>{c.jobs} jobs</div>
              <div className="text-sm font-bold font-mono text-right w-24" style={{ color: '#0E1117' }}>${c.revenue.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* At-Risk Customers */}
      {dormantCustomers.length > 0 && (
        <div className="mb-8">
          <SectionHeader title="At-Risk Customers" sub="No job in the last 60 days — worth a follow-up" />
          <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #DDE1EC' }}>
            {dormantCustomers.map((c, i) => (
              <div key={c.id} className="flex items-center gap-4 px-6 py-4"
                   style={{ borderBottom: i < dormantCustomers.length - 1 ? '1px solid #DDE1EC' : 'none' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#E05252' }} />
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: '#0E1117' }}>{c.full_name}</div>
                  <div className="text-xs" style={{ color: '#6B7490' }}>
                    Last seen: {allCustomerLastJob[c.full_name]
                      ? new Date(allCustomerLastJob[c.full_name]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Never'}
                  </div>
                </div>
                <div className="text-xs px-2 py-1 rounded-full font-medium"
                     style={{ background: 'rgba(224,82,82,0.1)', color: '#E05252' }}>
                  Dormant
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Health */}
      <div className="mb-8">
        <SectionHeader title="Customer Health" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Customers" value={String(customers.length)} icon={Users} color="#4F8EF7" />
          <StatCard
            label="Cards on File"
            value={String(customers.filter(c => ['authorized','active'].includes(c.card_status)).length)}
            sub="Authorized"
            icon={DollarSign}
            color="#3DBF7F"
          />
          <StatCard
            label="New This Period"
            value={String(customers.filter(c => {
              if (!c.created_at || !periodStart) return false
              return new Date(c.created_at) >= periodStart
            }).length)}
            icon={Users}
            color="#E8B84B"
          />
          <StatCard
            label="At-Risk (60d)"
            value={String(dormantCustomers.length)}
            sub="No recent jobs"
            icon={Calendar}
            color="#E05252"
          />
        </div>
      </div>

    </div>
  )
}