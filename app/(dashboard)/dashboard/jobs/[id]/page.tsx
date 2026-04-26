import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react'

export default async function JobDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: job, error } = await supabase
    .from('payments')
    .select(`
      *,
      customers (
        id, full_name, name, email, phone, address
      ),
      job_services (
        id, name, price_charged, is_custom
      ),
      photos (
        id, storage_path, taken_at, crew_member, gps_lat, gps_lng
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !job) notFound()

  const customer = job.customers as any
  const services = (job.job_services as any[]) ?? []
  const photos   = (job.photos as any[]) ?? []

  const customerName = customer?.full_name || customer?.name || '—'
  const isScheduled  = job.job_status === 'scheduled'
  const isCompleted  = job.job_status === 'completed'

  const photosWithUrls = photos.map((p: any) => {
    const { data: { publicUrl } } = supabase.storage
      .from('job-photos')
      .getPublicUrl(p.storage_path)
    return { ...p, url: publicUrl }
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      <Link
        href="/dashboard/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0E1117] transition"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Jobs
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-[#DDE1EC] bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-[#0E1117]">{customerName}</h1>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(61,191,127,0.1)] text-[#3DBF7F]">
                  <CheckCircle2 size={10} /> Completed
                </span>
              )}
              {isScheduled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(232,160,32,0.1)] text-[#E8A020]">
                  <Calendar size={10} /> Scheduled
                </span>
              )}
              {job.payment_status === 'failed' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(224,82,82,0.1)] text-[#E05252]">
                  <XCircle size={10} /> Failed
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 space-y-0.5">
              {customer?.email && <p>{customer.email}</p>}
              {customer?.phone && <p>{customer.phone}</p>}
              {customer?.address && <p>📍 {customer.address}</p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            {isCompleted && (
              <>
                <p className="text-2xl font-bold text-[#0E1117] font-mono">${Number(job.amount).toFixed(2)}</p>
                <p className="text-xs text-[#3DBF7F] font-medium">Charged</p>
              </>
            )}
            {isScheduled && (
              <>
                <p className="text-2xl font-bold text-[#0E1117] font-mono">
                  ${services.reduce((s: number, sv: any) => s + sv.price_charged, 0).toFixed(2)}
                </p>
                <p className="text-xs text-[#E8A020] font-medium">Pending</p>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#DDE1EC] grid grid-cols-2 gap-4 sm:grid-cols-3">
          {job.completed_at && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Completed</p>
              <p className="text-sm text-[#0E1117]">
                {new Date(job.completed_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
            </div>
          )}
          {job.scheduled_for && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Scheduled for</p>
              <p className="text-sm text-[#0E1117]">
                {new Date(job.scheduled_for).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}{' '}
                {new Date(job.scheduled_for).toLocaleTimeString('en-US', {
                  hour: 'numeric', minute: '2-digit', hour12: true,
                })}
              </p>
            </div>
          )}
          {(job.crew_member || job.assigned_to) && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Crew</p>
              <p className="text-sm text-[#0E1117]">{job.crew_member || job.assigned_to}</p>
            </div>
          )}
          {job.stripe_charge_id && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Charge ID</p>
              <p className="text-xs font-mono text-gray-500 truncate">{job.stripe_charge_id}</p>
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-2xl border border-[#DDE1EC] bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-[#0E1117] mb-4">Services</h2>
        <div className="space-y-0">
          {services.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between py-3 border-b border-[#DDE1EC] last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#0E1117]">{s.name}</span>
                {s.is_custom && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Custom</span>
                )}
              </div>
              <span className="text-sm font-mono font-semibold text-[#0E1117]">
                ${Number(s.price_charged).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm font-bold text-[#0E1117]">Total</span>
            <span className="text-sm font-bold font-mono text-[#3DBF7F]">
              ${services.reduce((s: number, sv: any) => s + Number(sv.price_charged), 0).toFixed(2)}
            </span>
          </div>
        </div>
        {job.notes && (
          <div className="mt-4 pt-4 border-t border-[#DDE1EC]">
            <p className="text-xs text-gray-400 mb-1">Notes</p>
            <p className="text-sm text-gray-600">{job.notes}</p>
          </div>
        )}
      </div>

      {/* Photos */}
      {photosWithUrls.length > 0 && (
        <div className="rounded-2xl border border-[#DDE1EC] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-[#0E1117] mb-4">
            Job Photos ({photosWithUrls.length})
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photosWithUrls.map((p: any) => (
              <div key={p.id} className="space-y-1">
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={p.url}
                    alt="Job photo"
                    className="w-full aspect-square object-cover rounded-xl border border-[#DDE1EC] hover:opacity-90 transition"
                  />
                </a>
                <div className="text-xs text-gray-400 space-y-0.5 px-0.5">
                  {p.taken_at && (
                    <p>
                      {new Date(p.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                      {new Date(p.taken_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </p>
                  )}
                  {p.gps_lat && p.gps_lng && (
                    
                      {p.gps_lat && p.gps_lng && (
  <p>📍 {p.gps_lat.toFixed(4)}, {p.gps_lng.toFixed(4)}</p>
)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#4F8EF7] hover:underline"
                    >
                      📍 View on map
                    </a>
                  )}
                  {p.crew_member && <p>👷 {p.crew_member}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer link */}
      <div className="rounded-2xl border border-[#DDE1EC] bg-white p-4 shadow-sm">
        <Link
          href={`/dashboard/customers/${customer?.id}`}
          className="flex items-center justify-between text-sm text-[#0E1117] hover:text-[#4F8EF7] transition"
        >
          <span>View full customer profile</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

    </div>
  )
}