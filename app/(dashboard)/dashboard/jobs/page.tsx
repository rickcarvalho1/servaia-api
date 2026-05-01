'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, Plus, CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react'

export default function JobsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState('')
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    loadJobs()
  }, [])

  async function loadJobs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: member } = await supabase
      .from('team_members')
      .select('service_companies(id)')
      .eq('user_id', user.id)
      .single()

    if (!member) { router.push('/login'); return }
    const bizId = (member.service_companies as any).id
    setBusinessId(bizId)

    const { data } = await supabase
      .from('payments')
      .select('id, amount, payment_status, job_status, crew_member, assigned_to, completed_at, scheduled_for, customers(id, full_name, name), job_services(name, price_charged)')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false })
      .limit(100)

    setJobs(data || [])
    setLoading(false)
  }

  async function handleMarkDone(jobId: string) {
    setCompleting(jobId)
    try {
      const res = await fetch('/api/jobs/complete-scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, crewMember: 'Owner', paymentNote: '' }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to complete job')
        setCompleting(null)
        return
      }
      await loadJobs()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setCompleting(null)
    }
  }

  const scheduled = jobs.filter(j => j.job_status === 'scheduled')
  const completed = jobs.filter(j => j.job_status === 'completed')
  const totalRevenue = completed
    .filter(j => j.payment_status === 'charged' || j.payment_status === 'succeeded')
    .reduce((s, j) => s + Number(j.amount), 0)

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-[#6B7490] text-sm">Loading jobs...</div>
    </div>
  )

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#0E1117]"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            Jobs
          </h1>
          <p className="text-sm mt-1 text-[#6B7490]">
            {completed.length} completed · ${totalRevenue.toFixed(2)} collected
            {scheduled.length > 0 && ` · ${scheduled.length} scheduled`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Link href="/dashboard/jobs/schedule"
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-[#0E1117] text-sm font-semibold rounded-lg border border-[#DDE1EC] bg-white hover:bg-gray-50 transition-colors">
            <Calendar size={16} /> Schedule Job
          </Link>
          <Link href="/dashboard/jobs/new"
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg bg-[#0E1117] hover:bg-[#4F8EF7] transition-colors">
            <Plus size={16} /> Mark Job Done
          </Link>
        </div>
      </div>

      {/* Scheduled jobs */}
      {scheduled.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold tracking-widest uppercase text-[#6B7490] mb-3">Upcoming</h2>
          <div className="bg-white rounded-xl shadow-sm border border-[#DDE1EC]">
            {/* Desktop */}
            <div className="hidden lg:block">
              {scheduled.map((job: any) => {
                const customerName = job.customers?.full_name || job.customers?.name || '—'
                const total = job.job_services?.reduce((s: number, sv: any) => s + Number(sv.price_charged), 0) || 0
                const isCompleting = completing === job.id
                return (
                  <div key={job.id} className="grid gap-4 px-6 py-4 items-center border-b border-[#DDE1EC] last:border-0 hover:bg-gray-50 transition-colors"
                    style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr auto' }}>
                    <div>
                      <div className="text-sm font-semibold text-[#0E1117] truncate">{customerName}</div>
                      {(job.crew_member || job.assigned_to) && (
                        <div className="text-xs text-[#6B7490]">👷 {job.crew_member || job.assigned_to}</div>
                      )}
                    </div>
                    <div className="text-xs text-[#6B7490] truncate">
                      {job.job_services?.map((s: any) => s.name).join(', ') || '—'}
                    </div>
                    <div className="text-xs text-[#6B7490]">
                      {job.scheduled_for
                        ? new Date(job.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#0E1117] font-mono">${total.toFixed(2)}</div>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <Calendar size={11} className="text-[#E8A020]" />
                        <span className="text-xs font-medium text-[#E8A020]">scheduled</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkDone(job.id)}
                      disabled={isCompleting}
                      className="px-3 py-1.5 bg-[#3DBF7F] hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      {isCompleting ? 'Processing...' : '✓ Mark Done'}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Mobile */}
            <div className="lg:hidden p-4 space-y-3">
              {scheduled.map((job: any) => {
                const customerName = job.customers?.full_name || job.customers?.name || '—'
                const total = job.job_services?.reduce((s: number, sv: any) => s + Number(sv.price_charged), 0) || 0
                const isCompleting = completing === job.id
                return (
                  <div key={job.id} className="bg-white border border-[#DDE1EC] rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm font-semibold text-[#0E1117] truncate">{customerName}</div>
                      <div className="text-sm font-bold text-[#0E1117] font-mono">${total.toFixed(2)}</div>
                    </div>
                    <div className="text-xs text-[#6B7490] mb-2 truncate">
                      {job.job_services?.map((s: any) => s.name).join(', ') || '—'}
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-[#6B7490]">
                        {job.scheduled_for
                          ? new Date(job.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={11} className="text-[#E8A020]" />
                        <span className="text-xs font-medium text-[#E8A020]">scheduled</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkDone(job.id)}
                      disabled={isCompleting}
                      className="w-full py-2 bg-[#3DBF7F] hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {isCompleting ? 'Processing...' : '✓ Mark Done'}
                    </button>
                    {(job.crew_member || job.assigned_to) && (
                      <div className="text-xs text-[#6B7490] mt-2">👷 {job.crew_member || job.assigned_to}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Completed jobs */}
      <div>
        {scheduled.length > 0 && (
          <h2 className="text-sm font-bold tracking-widest uppercase text-[#6B7490] mb-3">Completed</h2>
        )}
        <div className="bg-white rounded-xl shadow-sm border border-[#DDE1EC]">
          {completed.length === 0 ? (
            <div className="py-20 text-center">
              <Briefcase size={40} className="mx-auto mb-4 text-[#DDE1EC]" />
              <p className="font-semibold mb-1 text-[#0E1117]">No completed jobs yet</p>
              <p className="text-sm mb-4 text-[#6B7490]">Mark your first job complete to start collecting.</p>
              <Link href="/dashboard/jobs/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg bg-[#4F8EF7]">
                <Plus size={16} /> Mark First Job Done
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden lg:block">
                <div className="grid grid-cols-5 gap-4 px-6 py-3 border-b border-[#DDE1EC] bg-[#F8F9FC] rounded-t-xl">
                  <span className="text-xs font-bold tracking-widest uppercase text-[#6B7490]">Customer</span>
                  <span className="text-xs font-bold tracking-widest uppercase text-[#6B7490] col-span-2">Services</span>
                  <span className="text-xs font-bold tracking-widest uppercase text-[#6B7490]">Date</span>
                  <span className="text-xs font-bold tracking-widest uppercase text-[#6B7490] text-right">Amount</span>
                </div>
                {completed.map((job: any) => (
                  <Link key={job.id} href={`/dashboard/jobs/${job.id}`}
                    className="grid grid-cols-5 gap-4 px-6 py-4 items-center border-b border-[#DDE1EC] last:border-0 hover:bg-gray-50 transition-colors">
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
                      {job.completed_at
                        ? new Date(job.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#0E1117] font-mono">${Number(job.amount).toFixed(2)}</div>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {(job.payment_status === 'charged' || job.payment_status === 'succeeded') && <CheckCircle2 size={11} className="text-[#3DBF7F]" />}
                        {job.payment_status === 'failed'  && <XCircle size={11} className="text-[#E05252]" />}
                        {job.payment_status === 'pending' && <Clock size={11} className="text-[#E8A020]" />}
                        <span className={`text-xs font-medium ${
                          (job.payment_status === 'charged' || job.payment_status === 'succeeded') ? 'text-[#3DBF7F]' :
                          job.payment_status === 'failed' ? 'text-[#E05252]' : 'text-[#E8A020]'
                        }`}>{job.payment_status}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Mobile */}
              <div className="lg:hidden p-4 space-y-3">
                {completed.map((job: any) => (
                  <Link key={job.id} href={`/dashboard/jobs/${job.id}`}
                    className="block bg-white border border-[#DDE1EC] rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm font-semibold text-[#0E1117] truncate">
                        {job.customers?.full_name || job.customers?.name || '—'}
                      </div>
                      <div className="text-sm font-bold text-[#0E1117] font-mono">${Number(job.amount).toFixed(2)}</div>
                    </div>
                    <div className="text-xs text-[#6B7490] mb-2 truncate">
                      {job.job_services?.map((s: any) => s.name).join(', ') || '—'}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-[#6B7490]">
                        {job.completed_at
                          ? new Date(job.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </div>
                      <div className="flex items-center gap-1">
                        {(job.payment_status === 'charged' || job.payment_status === 'succeeded') && <CheckCircle2 size={11} className="text-[#3DBF7F]" />}
                        {job.payment_status === 'failed'  && <XCircle size={11} className="text-[#E05252]" />}
                        {job.payment_status === 'pending' && <Clock size={11} className="text-[#E8A020]" />}
                        <span className={`text-xs font-medium ${
                          (job.payment_status === 'charged' || job.payment_status === 'succeeded') ? 'text-[#3DBF7F]' :
                          job.payment_status === 'failed' ? 'text-[#E05252]' : 'text-[#E8A020]'
                        }`}>{job.payment_status}</span>
                      </div>
                    </div>
                    {job.crew_member && (
                      <div className="text-xs text-[#6B7490] mt-2">👷 {job.crew_member}</div>
                    )}
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