"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

type Customer = {
  id: string;
  full_name: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  card_status: string | null;
  card_brand: string | null;
  card_last4: string | null;
  stripe_customer_id: string | null;
  stripe_payment_method: string | null;
  created_at: string;
};

type Job = {
  id: string;
  created_at: string;
  amount: number;
  notes: string | null;
  job_services: { name: string; price_charged: number }[];
};

type Service = {
  id: string;
  name: string;
  default_price: number;
  emoji: string | null;
};

type PriceOverride = {
  id: string;
  service_id: string;
  price: number;
};

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [overrides, setOverrides] = useState<PriceOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [sendingLink, setSendingLink] = useState(false);
  const [linkMessage, setLinkMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [savingPrices, setSavingPrices] = useState(false);
  const [pricesDirty, setPricesDirty] = useState(false);
  const [localPrices, setLocalPrices] = useState<Record<string, string>>({});

  const [showBulkChange, setShowBulkChange] = useState(false);
  const [bulkType, setBulkType] = useState<'percent' | 'amount'>('percent');
  const [bulkValue, setBulkValue] = useState('');

  const [showManualCardModal, setShowManualCardModal] = useState(false);
  const [manualCardSuccess, setManualCardSuccess] = useState(false);

  const supabase = createClient();

  const loadCustomer = useCallback(async () => {
    const { data } = await supabase.from("customers").select("*").eq("id", customerId).single();
    if (data) {
      setCustomer(data);
      setEditForm({ full_name: data.full_name || data.name || "", email: data.email || "", phone: data.phone || "", address: data.address || "" });
    }
  }, [customerId, supabase]);

  const loadJobs = useCallback(async () => {
    const { data } = await supabase.from("payments").select(`id, created_at, amount, notes, job_services(name, price_charged)`).eq("customer_id", customerId).order("created_at", { ascending: false });
    setJobs(data ?? []);
  }, [customerId, supabase]);

  const loadServicesAndOverrides = useCallback(async () => {
    const { data: customerData } = await supabase.from("customers").select("business_id").eq("id", customerId).single();
    if (!customerData?.business_id) return;

    const [{ data: svcs }, { data: ovr }] = await Promise.all([
      supabase.from("services").select("id, name, default_price, emoji").eq("business_id", customerData.business_id).eq("active", true).order("sort_order"),
      supabase.from("customer_services").select("id, service_id, price").eq("customer_id", customerId),
    ]);

    const svcList = svcs ?? [];
    const ovrList = ovr ?? [];
    setServices(svcList);
    setOverrides(ovrList);

    const map: Record<string, string> = {};
    svcList.forEach(svc => {
      const override = ovrList.find(o => o.service_id === svc.id);
      map[svc.id] = override ? override.price.toString() : svc.default_price.toString();
    });
    setLocalPrices(map);
  }, [customerId, supabase]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadCustomer(), loadJobs(), loadServicesAndOverrides()]);
      setLoading(false);
    }
    init();
  }, [loadCustomer, loadJobs, loadServicesAndOverrides]);

  async function handleSaveEdit() {
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase.from("customers").update({ full_name: editForm.full_name, email: editForm.email || null, phone: editForm.phone || null, address: editForm.address || null }).eq("id", customerId);
    if (error) { setSaveError("Failed to save changes."); setSaving(false); return; }
    await loadCustomer();
    setEditing(false);
    setSaving(false);
  }

  async function handleSendAuthLink() {
    setSendingLink(true);
    setLinkMessage(null);
    try {
      const res = await fetch("/api/auth/send-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId }) });
      const data = await res.json();
      if (!res.ok) { setLinkMessage({ type: "error", text: data.error ?? "Failed to send link." }); }
      else { setLinkMessage({ type: "success", text: data.authLink ? `Twilio pending 10DLC approval — test link: ${data.authLink}` : "Auth link sent via SMS!" }); }
    } catch { setLinkMessage({ type: "error", text: "Network error. Please try again." }); }
    finally { setSendingLink(false); }
  }

  function handlePriceChange(serviceId: string, value: string) {
    setLocalPrices(prev => ({ ...prev, [serviceId]: value }));
    setPricesDirty(true);
  }

  function handleBulkChange() {
    const val = parseFloat(bulkValue);
    if (isNaN(val)) return;
    const updated: Record<string, string> = {};
    Object.entries(localPrices).forEach(([serviceId, price]) => {
      const current = parseFloat(price) || 0;
      let newPrice: number;
      if (bulkType === 'percent') {
        newPrice = current * (1 + val / 100);
      } else {
        newPrice = current + val;
      }
      updated[serviceId] = Math.max(0, newPrice).toFixed(2);
    });
    setLocalPrices(updated);
    setPricesDirty(true);
    setShowBulkChange(false);
    setBulkValue('');
  }

  async function handleSavePrices() {
    setSavingPrices(true);
    await supabase.from("customer_services").delete().eq("customer_id", customerId);
    const toInsert = Object.entries(localPrices)
      .filter(([, val]) => val !== "" && !isNaN(parseFloat(val)))
      .map(([serviceId, val]) => ({ customer_id: customerId, service_id: serviceId, price: parseFloat(val) }));
    if (toInsert.length > 0) await supabase.from("customer_services").insert(toInsert);
    await loadServicesAndOverrides();
    setPricesDirty(false);
    setSavingPrices(false);
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <svg className="animate-spin h-6 w-6 text-gray-300" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  if (!customer) return (
    <div className="p-6 text-center text-gray-500">
      Customer not found. <Link href="/dashboard/customers" className="text-[#0E1117] underline">Back to customers</Link>
    </div>
  );

  const displayName = customer.full_name || customer.name || "Unknown";
  const cardActive = customer.card_status === "active" || customer.card_status === "authorized";
  const totalSpend = jobs.reduce((sum, j) => sum + (j.amount ?? 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      <Link href="/dashboard/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0E1117] transition">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Customers
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        {editing ? (
          <div className="space-y-4">
            <h2 className="font-semibold text-[#0E1117]">Edit customer</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[['full_name', 'Full name', 'text', 'Sarah Johnson'], ['email', 'Email', 'email', 'sarah@email.com'], ['phone', 'Phone', 'tel', '(555) 000-0000'], ['address', 'Address', 'text', '123 Main St']].map(([field, label, type, placeholder]) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input type={type} value={(editForm as any)[field]} onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))} placeholder={placeholder}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#0E1117] outline-none focus:border-[#0E1117]" />
                </div>
              ))}
            </div>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={handleSaveEdit} disabled={saving} className="rounded-xl bg-[#0E1117] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a2130] disabled:opacity-50">
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button onClick={() => { setEditing(false); setSaveError(null); }} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#0E1117]">{displayName}</h1>
              <div className="mt-1 space-y-0.5 text-sm text-gray-500">
                {customer.email && <p>{customer.email}</p>}
                {customer.phone && <p>{customer.phone}</p>}
                {customer.address && <p>{customer.address}</p>}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {customer.created_at ? new Date(customer.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="text-right">
                <p className="text-2xl font-bold text-[#0E1117]">${totalSpend.toFixed(2)}</p>
                <p className="text-xs text-gray-400">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card section */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-[#0E1117]">Payment card</h2>
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cardActive ? 'bg-green-50' : 'bg-gray-50'}`}>
            <svg className={`h-5 w-5 ${cardActive ? 'text-green-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[#0E1117]">
              {cardActive ? (customer.card_brand ? `${customer.card_brand.charAt(0).toUpperCase()}${customer.card_brand.slice(1)} ending in ${customer.card_last4}` : "Card on file") : "No card on file"}
            </p>
            <p className={`text-xs ${cardActive ? 'text-green-600' : 'text-gray-400'}`}>
              {cardActive ? "Active" : "Send an auth link to let this customer save their card."}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <button onClick={handleSendAuthLink} disabled={sendingLink || !customer.phone}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#0E1117] transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              {sendingLink ? "Sending…" : cardActive ? "Re-send auth link" : "Send auth link via SMS"}
            </button>
            <button onClick={() => setShowManualCardModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#0E1117] transition hover:bg-gray-50">
              Enter Card Manually
            </button>
          </div>
          {!customer.phone && <p className="text-xs text-gray-400">Add a phone number to send an auth link.</p>}
          {linkMessage && (
            <div className={`rounded-lg px-4 py-3 text-sm break-all ${linkMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {linkMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Pricing */}
      {services.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#0E1117]">Service Pricing</h2>
              <p className="text-xs text-gray-400 mt-0.5">Prices for this customer. Changes apply to future jobs only.</p>
            </div>
            <button onClick={() => setShowBulkChange(!showBulkChange)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
              Change All Prices
            </button>
          </div>

          {showBulkChange && (
            <div className="bg-[#F8F9FC] rounded-xl border border-[#DDE1EC] p-4 space-y-3">
              <p className="text-sm font-medium text-[#0E1117]">Change all prices by:</p>
              <div className="flex items-center gap-3">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button onClick={() => setBulkType('percent')}
                    className={`px-3 py-1.5 text-xs font-medium transition ${bulkType === 'percent' ? 'bg-[#0E1117] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    %
                  </button>
                  <button onClick={() => setBulkType('amount')}
                    className={`px-3 py-1.5 text-xs font-medium transition ${bulkType === 'amount' ? 'bg-[#0E1117] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    $
                  </button>
                </div>
                <input type="number" step="0.01" placeholder={bulkType === 'percent' ? 'e.g. 10 or -10' : 'e.g. 5 or -5'}
                  value={bulkValue} onChange={e => setBulkValue(e.target.value)}
                  className="w-32 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-[#0E1117] outline-none focus:border-[#0E1117]" />
                <span className="text-xs text-gray-500">{bulkType === 'percent' ? 'percent' : 'dollars'}</span>
              </div>
              <p className="text-xs text-gray-400">Use a negative number to decrease prices (e.g. -10 to lower by 10%)</p>
              <div className="flex gap-2">
                <button onClick={handleBulkChange}
                  className="px-4 py-2 bg-[#0E1117] text-white text-xs font-semibold rounded-lg hover:bg-[#1a2130] transition">
                  Apply
                </button>
                <button onClick={() => { setShowBulkChange(false); setBulkValue(''); }}
                  className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {services.map(svc => (
              <div key={svc.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3">
                <span className="text-lg w-6 text-center">{svc.emoji ?? "🔧"}</span>
                <span className="flex-1 text-sm text-[#0E1117]">{svc.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 text-sm">$</span>
                  <input type="number" value={localPrices[svc.id] ?? svc.default_price.toString()}
                    onChange={e => handlePriceChange(svc.id, e.target.value)}
                    className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right font-mono outline-none focus:border-[#0E1117] bg-white" />
                </div>
              </div>
            ))}
          </div>

          {pricesDirty && (
            <button onClick={handleSavePrices} disabled={savingPrices}
              className="rounded-xl bg-[#0E1117] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a2130] disabled:opacity-50 transition">
              {savingPrices ? "Saving…" : "Save pricing"}
            </button>
          )}
        </div>
      )}

      {/* Job history */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-[#0E1117]">Job history</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-400">No jobs yet.</p>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="block rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#0E1117]">{job.job_services?.map(s => s.name).join(", ") || "Service"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {job.created_at ? new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#0E1117]">${job.amount.toFixed(2)}</p>
                </div>
                {job.notes && <p className="mt-1 text-xs text-gray-500 truncate">{job.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showManualCardModal && (
        <ManualCardModal
          customerId={customerId}
          onClose={() => { setShowManualCardModal(false); setManualCardSuccess(false); }}
          onSuccess={() => { setManualCardSuccess(true); loadCustomer(); setTimeout(() => setShowManualCardModal(false), 2000); }}
        />
      )}
    </div>
  );
}

function ManualCardModal({ customerId, onClose, onSuccess }: { customerId: string; onClose: () => void; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/setup-intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({ elements, clientSecret: data.clientSecret, redirect: "if_required" });
      if (confirmError) { setError(confirmError.message ?? "Something went wrong."); setSubmitting(false); return; }
      if (setupIntent?.status === "succeeded") {
        const updateRes = await fetch("/api/customers/update-card", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId, setupIntentId: setupIntent.id }) });
        const updateData = await updateRes.json();
        if (!updateRes.ok) throw new Error(updateData.error);
        onSuccess();
      } else {
        setError("Card setup did not complete. Please try again.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#0E1117]">Enter Card Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Card Information</label>
            <div className="border border-gray-300 rounded-lg p-3">
              <CardElement options={{ style: { base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } } } }} />
            </div>
          </div>
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting || !stripe} className="flex-1 py-3 bg-[#0E1117] text-white rounded-lg hover:bg-[#1a2130] disabled:opacity-50">
              {submitting ? "Saving…" : "Save Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}