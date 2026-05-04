"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: string;
  scheduled_for: string;
  notes: string | null;
  job_status: string;
  assigned_to: string | null;
  crew_member: string | null;
  customers: {
    id: string;
    full_name: string | null;
    name: string | null;
    phone: string | null;
    address: string | null;
    card_status: string | null;
    payment_method: string | null;
  };
  job_services: {
    name: string;
    price_charged: number;
  }[];
};

type Photo = { id: string; url: string; };
type PageView = "jobs" | "complete" | "success";

function formatDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateLabel(date: Date) {
  const today = formatDateLocal(new Date());
  const yesterday = formatDateLocal(addDays(new Date(), -1));
  const tomorrow = formatDateLocal(addDays(new Date(), 1));
  const key = formatDateLocal(date);
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  if (key === tomorrow) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CrewPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [crewMember, setCrewMember] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [view, setView] = useState<PageView>("jobs");

  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [completeResult, setCompleteResult] = useState<any>(null);
  const [paymentNote, setPaymentNote] = useState('');

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadJobs = useCallback(async (date: Date) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: member } = await supabase
      .from("team_members")
      .select("full_name, service_companies(id)")
      .eq("user_id", user.id)
      .single();

    if (!member) return;

    const bizId = (member.service_companies as any).id;
    setBusinessId(bizId);
    setCrewMember(member.full_name || "");

    const dateStr = formatDateLocal(date);
    const startStr = `${dateStr}T00:00:00`;
    const endStr = `${dateStr}T23:59:59`;

    const { data } = await supabase
      .from("payments")
      .select(`
        id, scheduled_for, notes, job_status, assigned_to, crew_member,
        customers (id, full_name, name, phone, address, card_status, payment_method),
        job_services (name, price_charged)
      `)
      .eq("business_id", bizId)
      .eq("job_status", "scheduled")
      .gte("scheduled_for", startStr)
      .lte("scheduled_for", endStr)
      .order("scheduled_for", { ascending: true });

    setJobs((data ?? []) as any as Job[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadJobs(selectedDate);
  }, [selectedDate, loadJobs]);

  useEffect(() => {
    const jobId = searchParams.get('job');
    if (jobId && jobs.length > 0) {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        setSelectedJob(job);
        setView("complete");
        setCompleteError(null);
      }
    }
  }, [searchParams, jobs]);

  function changeDate(days: number) {
    setSelectedDate(prev => addDays(prev, days));
    setView("jobs");
    setSelectedJob(null);
    router.push('/crew');
  }

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedJob) return;
    setUploadingPhoto(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const position = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(pos => resolve(pos), () => resolve(null), { timeout: 5000 });
        });
        if (position) { lat = position.coords.latitude; lng = position.coords.longitude; }
      } catch {}

      const fd = new FormData();
      fd.append("file", file);
      fd.append("jobId", selectedJob.id);
      fd.append("businessId", businessId);
      fd.append("crewMember", crewMember);
      if (lat !== null) fd.append("lat", lat.toString());
      if (lng !== null) fd.append("lng", lng.toString());

      const res = await fetch("/api/photos/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) setPhotos(prev => [...prev, { id: data.photoId, url: data.url }]);
    } catch (err) {
      console.error("Photo upload error:", err);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleCompleteJob() {
    if (!selectedJob) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      const res = await fetch("/api/jobs/complete-scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJob.id, crewMember, paymentNote }),
      });
      const data = await res.json();
      if (!res.ok) { setCompleteError(data.error || "Failed to complete job"); setCompleting(false); return; }
      setCompleteResult(data);
      setView("success");
    } catch (err: any) {
      setCompleteError(err.message);
      setCompleting(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  function getCustomerName(job: Job) {
    return job.customers?.full_name || job.customers?.name || "Customer";
  }

  function getJobTotal(job: Job) {
    return job.job_services?.reduce((s, sv) => s + sv.price_charged, 0) || 0;
  }

  const isManualPayment = selectedJob?.customers?.payment_method === 'cash_check' || selectedJob?.customers?.payment_method === 'invoice';
  const cardActive = selectedJob?.customers?.card_status === "active" || selectedJob?.customers?.card_status === "authorized";
  const canComplete = isManualPayment || cardActive;

  // SUCCESS VIEW
  if (view === "success" && completeResult) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[#DDE1EC] p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[rgba(61,191,127,0.1)] border-2 border-[#3DBF7F] flex items-center justify-center mx-auto mb-6">
            <svg className="h-10 w-10 text-[#3DBF7F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#0E1117] mb-1">Job Complete!</h2>
          {completeResult.manual ? (
            <>
              <p className="text-4xl font-bold text-[#E8B84B] font-mono mb-2">${completeResult.amount}</p>
              <p className="text-sm text-[#6B7490] mb-2">Collect payment manually</p>
            </>
          ) : (
            <>
              <p className="text-4xl font-bold text-[#3DBF7F] font-mono mb-2">${completeResult.amount}</p>
              <p className="text-sm text-[#6B7490] mb-2">Charged to card on file</p>
            </>
          )}
          {photos.length > 0 && (
            <p className="text-xs text-[#6B7490] mb-6">{photos.length} photo{photos.length !== 1 ? "s" : ""} uploaded</p>
          )}
          <button
            onClick={() => { setView("jobs"); setSelectedJob(null); setPhotos([]); setCompleteResult(null); setPaymentNote(''); loadJobs(selectedDate); router.push('/crew'); }}
            className="w-full py-3 bg-[#0E1117] text-white font-semibold rounded-xl">
            Back to jobs
          </button>
        </div>
      </div>
    );
  }

  // COMPLETE VIEW
  if (view === "complete" && selectedJob) {
    const total = getJobTotal(selectedJob);
    return (
      <div className="min-h-screen bg-[#F8F9FC]">
        <div className="bg-white border-b border-[#DDE1EC] px-4 py-4 flex items-center gap-3">
          <button onClick={() => { setView("jobs"); setPhotos([]); setCompleteError(null); setPaymentNote(''); router.push('/crew'); }}
            className="p-2 rounded-lg hover:bg-gray-50">
            <svg className="h-5 w-5 text-[#6B7490]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="font-semibold text-[#0E1117]">{getCustomerName(selectedJob)}</p>
            <p className="text-xs text-[#6B7490]">{formatTime(selectedJob.scheduled_for)}</p>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto">
          {/* Services */}
          <div className="bg-white rounded-2xl border border-[#DDE1EC] p-5">
            <h3 className="text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-3">Services</h3>
            <div className="space-y-2">
              {selectedJob.job_services.map((s, i) => (
                <div key={i} className="flex justify-between text-sm py-1.5 border-b border-[#DDE1EC] last:border-0">
                  <span className="text-[#0E1117]">{s.name}</span>
                  <span className="font-mono font-semibold text-[#0E1117]">${s.price_charged.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 font-bold">
                <span className="text-[#0E1117]">Total</span>
                <span className="text-[#3DBF7F] font-mono">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white rounded-2xl border border-[#DDE1EC] p-5">
            <h3 className="text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-3">
              Job Photos ({photos.length})
            </h3>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photos.map(p => (
                  <img key={p.id} src={p.url} alt="Job photo" className="w-full aspect-square object-cover rounded-lg" />
                ))}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
              className="w-full py-3 border-2 border-dashed border-[#DDE1EC] rounded-xl text-sm text-[#6B7490] hover:border-[#4F8EF7] hover:text-[#4F8EF7] transition flex items-center justify-center gap-2 disabled:opacity-50">
              {uploadingPhoto ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Uploading…</>
              ) : (
                <><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>Take photo</>
              )}
            </button>
          </div>

          {/* Manual payment note */}
          {isManualPayment && (
            <div className="bg-white rounded-2xl border border-[#DDE1EC] p-5 space-y-3">
              <h3 className="text-xs font-bold tracking-widest uppercase text-[#6B7490]">Payment Collection</h3>
              <p className="text-sm text-[#6B7490]">
                This customer pays by {selectedJob.customers?.payment_method === 'cash_check' ? 'cash or check' : 'invoice'}. No card will be charged.
              </p>
              <input
                type="text"
                placeholder="e.g. Check #1234, Cash, Zelle... (optional)"
                value={paymentNote}
                onChange={e => setPaymentNote(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#DDE1EC] rounded-xl text-sm text-[#0E1117] placeholder-[#9BA3B8] outline-none focus:border-[#4F8EF7] bg-white"
              />
            </div>
          )}

          {!isManualPayment && !cardActive && (
            <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
              ⚠️ No card on file — cannot charge this customer.
            </div>
          )}

          {completeError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {completeError}
            </div>
          )}

          <button onClick={handleCompleteJob} disabled={completing || !canComplete}
            className={`w-full py-4 text-white font-bold text-base rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed ${
              isManualPayment ? 'bg-[#E8B84B] hover:bg-yellow-500' : 'bg-[#3DBF7F] hover:bg-green-500'
            }`}>
            {completing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Processing…
              </span>
            ) : isManualPayment ? (
              `✓ Mark Complete — $${total.toFixed(2)}`
            ) : (
              `💳 Charge $${total.toFixed(2)}`
            )}
          </button>

          <p className="text-xs text-[#6B7490] text-center">
            {isManualPayment ? 'Job will be marked complete. Collect payment manually.' : 'Card will be charged immediately upon completion.'}
          </p>
        </div>
      </div>
    );
  }

  // JOBS LIST VIEW
  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <div className="bg-white border-b border-[#DDE1EC] px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="text-lg font-bold text-[#0E1117]">Crew Jobs</h1>
            <p className="text-xs text-[#6B7490]">{crewMember}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#6B7490]">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center justify-between max-w-lg mx-auto mt-3">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg hover:bg-gray-50 border border-[#DDE1EC]">
            <svg className="h-4 w-4 text-[#6B7490]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <p className="font-semibold text-[#0E1117] text-sm">{formatDateLabel(selectedDate)}</p>
            <p className="text-xs text-[#6B7490]">
              {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button onClick={() => changeDate(1)} className="p-2 rounded-lg hover:bg-gray-50 border border-[#DDE1EC]">
            <svg className="h-4 w-4 text-[#6B7490]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">✅</div>
            <p className="font-semibold text-[#0E1117]">No jobs for {formatDateLabel(selectedDate).toLowerCase()}</p>
            <p className="text-sm text-[#6B7490] mt-1">Use the arrows to navigate dates.</p>
          </div>
        ) : (
          jobs.map(job => {
            const customerName = getCustomerName(job);
            const total = getJobTotal(job);
            const hasCard = job.customers?.card_status === "active" || job.customers?.card_status === "authorized";
            const isManual = job.customers?.payment_method === 'cash_check' || job.customers?.payment_method === 'invoice';

            return (
              <button key={job.id} onClick={() => router.push(`/crew?job=${job.id}`)}
                className="w-full bg-white rounded-2xl border border-[#DDE1EC] p-5 text-left hover:border-[#4F8EF7] transition shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-[#0E1117] text-base">{customerName}</p>
                    {job.customers?.address && <p className="text-xs text-[#6B7490] mt-0.5">📍 {job.customers.address}</p>}
                    {job.customers?.phone && <p className="text-xs text-[#6B7490]">📞 {job.customers.phone}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold font-mono text-[#0E1117]">${total.toFixed(2)}</p>
                    <p className="text-xs text-[#6B7490]">{formatTime(job.scheduled_for)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {job.job_services.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-[#F8F9FC] border border-[#DDE1EC] text-[#6B7490]">{s.name}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  {isManual ? (
                    <span className="text-xs text-[#E8B84B] flex items-center gap-1">💵 {job.customers?.payment_method === 'cash_check' ? 'Cash/Check' : 'Invoice'}</span>
                  ) : hasCard ? (
                    <span className="text-xs text-[#3DBF7F] flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Card on file
                    </span>
                  ) : (
                    <span className="text-xs text-[#E8A020]">⚠️ No card</span>
                  )}
                  <span className="text-xs text-[#4F8EF7] font-semibold">Tap to complete →</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}