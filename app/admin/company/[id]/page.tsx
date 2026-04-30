import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DollarSign, Users, Briefcase, TrendingUp, ArrowUpRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

interface PageProps {
  params: { id: string }
}

export default async function CompanyDashboardPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'rickcarvalho1@gmail.com') {
    redirect('/login')
  }

  const businessId = params.id

  // Verify the company exists
  const { data: company } = await supabase
    .from('service_companies')
    .select('*')
    .eq('id', businessId)
    .single()

  if (!company) {
    redirect('/admin')
  }

  const [
    { data: customers },
    { data: jobs },
    { data: todayJobs },
    { data: pendingCards },
  ] = await Promise.all([
    supabase.from('customers').select('id, card_status').eq('business_id', businessId),
    supabase.from('payments').select('id, amount, payment_status, completed_at, customers(full_name), job_services(name, price_charged)')
      .eq('business_id', businessId).order('completed_at', { ascending: false }).limit(10),
    supabase.from('jobs').select('id, amount').eq('business_id', businessId)
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
      <div className="mb-8">
        <Link href="/admin" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4">
          ← Back to Admin
        </Link>
        <h1 className="text-3xl font-bold">{company.company_name || company.name} Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
              </div>
              <div
                className="p-3 rounded-full"
                style={{ backgroundColor: stat.bg }}
              >
                <stat.icon size={24} style={{ color: stat.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {jobs?.map((job) => (
            <div key={job.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle2 size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{(job as any).customers?.full_name}</p>
                  <p className="text-sm text-gray-600">
                    {job.job_services?.map(s => s.name).join(', ')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">${Number(job.amount).toFixed(2)}</p>
                <p className="text-sm text-gray-500">
                  {new Date(job.completed_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )) || <div className="px-6 py-4 text-gray-500">No jobs yet</div>}
        </div>
      </div>
    </div>
  )
}