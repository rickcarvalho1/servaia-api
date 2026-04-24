import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react'

export default async function JobsPage() {
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

  const { data: jobs } = await supabase
    .from('payments')
    .select('id, amount, payment_status, crew_member, completed_at, customers(full_name, name), job_services(name, price_charged)')
    .eq('business_id', businessId)
    .order('completed_at', { ascending: false })
    .limit(100)

  const totalRevenue = jobs?.filter(j => j.payment_status === 'charged')
    .reduce((s, j) => s + Number(j.amount), 0) || 0

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0E1117]"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            Jobs
          </h1>
          <p className="text-sm mt-1 text-[#6B7490]">
            {jobs?.length || 0} total · ${totalRevenue.toFixed(2)} collected
          </p>
        </div>
        <Link href="/dashboard/jobs/new"
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg bg-[#0E1117] hover:bg-[#4F8EF7] transition-colors">
          <Plus size={16} /> Mark Job Done
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#DDE1EC]">
        {!jobs || jobs.length === 0 ? (
          <div className="py-20 text-center">
            <Briefcase size={40} className="mx-auto mb-4 text-[#DDE1EC]" />
            <p className="font-semibold mb-1 text-[#0E1117]">No jobs yet</p>
            <p className="text-sm mb-4 text-[#6B7490]">Mark your first job complete to start collecting.</p>
            <Link href="/dashboard/jobs/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg bg-[#4F8EF7]">
              <Plus size={16} /> Mark First Job Done
            </Link>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-5 gap-4 px-6 py-3 border-b border-[#DDE1EC] bg-[#F8F9FC] rounded-t-xl">
              <span className="text-xs font-bold tracking-widest uppercase text-[#6B7490]">Customer</span>
              <span className="text-xs font-bold tracking-widest uppercase text-[#6B7490] col-span-2">Services</span>
              <span className="text-xs font-bold tracking-widest uppercase text-[#6B7490]">Date</span>
              <span className="text-xs font-bold tracking-widest uppercase text-[#6B7490] text-right">Amount</span>
            </div>
            {jobs.map((job: any) => (
              <div key={job.id} className="grid grid-cols-5 gap-4 px-6 py-4 items-center border-b border-[#DDE1EC] last:border-0 hover:bg-gray-50">
                <div>
                  <div className="text-sm font-semibold text-[#0E1117] truncate">
                    {job.customers?.full_name || job.customers?.name || '—'}
                  </div>
                  {job.crew_member && <div className="text-xs text-[#6B7490]">👷 {job.crew_member}</div>}
                </div>
                <div className="text-xs text-[#6B7490] truncate col-span-2">
                  {job.job_services?.map((s: any) => s.name).join(', ') || '—'}
                </div>
                <div className="text-xs text-[#6B7490]">
                  {new Date(job.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#0E1117] font-mono">${Number(job.amount).toFixed(2)}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {job.payment_status === 'charged' && <CheckCircle2 size={11} className="text-[#3DBF7F]" />}
                    {job.payment_status === 'failed'  && <XCircle size={11} className="text-[#E05252]" />}
                    {job.payment_status === 'pending' && <Clock size={11} className="text-[#E8A020]" />}
                    <span className={`text-xs font-medium ${
                      job.payment_status === 'charged' ? 'text-[#3DBF7F]' :
                      job.payment_status === 'failed'  ? 'text-[#E05252]' : 'text-[#E8A020]'
                    }`}>{job.payment_status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}