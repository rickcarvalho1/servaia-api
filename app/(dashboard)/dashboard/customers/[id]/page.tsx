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
  job_services: {
    name: string;
    price_charged: number;
  }[];
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
  custom_price: number;
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
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [sendingLink, setSendingLink] = useState(false);
  const [linkMessage, setLinkMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [savingPrices, setSavingPrices] = useState(false);
  const [pricesDirty, setPricesDirty] = useState(false);
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({});

  const [showManualCardModal, setShowManualCardModal] = useState(false);
  const [manualCardSubmitting, setManualCardSubmitting] = useState(false);
  const [manualCardError, setManualCardError] = useState<string | null>(null);
  const [manualCardSuccess, setManualCardSuccess] = useState(false);

  const supabase = createClient();

  const loadCustomer = useCallback(async () => {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();
    if (data) {
      setCustomer(data);
      setEditForm({
        full_name: data.full_name || data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
      });
    }
  }, [customerId, supabase]);

  const loadJobs = useCallback(async () => {
    const { data } = await supabase
      .from("payments")
      .select(`
        id,
        created_at,
        amount,
        notes,
        job_services (
          name,
          price_charged
        )
      `)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    setJobs(data ?? []);
  }, [customerId, supabase]);

  const loadServicesAndOverrides = useCallback(async () => {
    const { data: customerData } = await supabase
      .from("customers")
      .select("business_id")
      .eq("id", customerId)
      .single();

    if (!customerData?.business_id) return;

    const [{ data: svcs }, { data: ovr }] = await Promise.all([
      supabase
        .from("services")
        .select("id, name, default_price, emoji")
        .eq("business_id", customerData.business_id)
        .eq("active", true)
        .order("sort_order"),
      supabase
        .from("customer_services")
        .select("id, service_id, custom_price")
        .eq("customer_id", customerId),
    ]);

    setServices(svcs ?? []);
    setOverrides(ovr ?? []);

    const map: Record<string, string> = {};
    (ovr ?? []).forEach((o) => {
      map[o.service_id] = o.custom_price.toString();
    });
    setLocalOverrides(map);
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

    const { error } = await supabase
      .from("customers")
      .update({
        full_name: editForm.full_name,
        email: editForm.email || null,
        phone: editForm.phone || null,
        address: editForm.address || null,
      })
      .eq("id", customerId);

    if (error) {
      setSaveError("Failed to save changes. Please try again.");
      setSaving(false);
      return;
    }

    await loadCustomer();
    setEditing(false);
    setSaving(false);
  }

  async function handleSendAuthLink() {
    setSendingLink(true);
    setLinkMessage(null);

    try {
      const res = await fetch("/api/auth/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLinkMessage({ type: "error", text: data.error ?? "Failed to send link." });
      } else {
        setLinkMessage({
          type: "success",
          text: data.authLink
            ? `Twilio pending 10DLC approval — test link: ${data.authLink}`
            : "Auth link sent via SMS!",
        });
      }
    } catch {
      setLinkMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSendingLink(false);
    }
  }

  function handlePriceChange(serviceId: string, value: string) {
    setLocalOverrides((prev) => ({ ...prev, [serviceId]: value }));
    setPricesDirty(true);
  }

  function handleClearOverride(serviceId: string) {
    setLocalOverrides((prev) => {
      const next = { ...prev };
      delete next[serviceId];
      return next;
    });
    setPricesDirty(true);
  }

  async function handleSavePrices() {
    setSavingPrices(true);

    await supabase
      .from("customer_services")
      .delete()
      .eq("customer_id", customerId);

    const toInsert = Object.entries(localOverrides)
      .filter(([, val]) => val !== "" && !isNaN(parseFloat(val)))
      .map(([serviceId, val]) => ({
        customer_id: customerId,
        service_id: serviceId,
        custom_price: parseFloat(val),
      }));

    if (toInsert.length > 0) {
      await supabase.from("customer_services").insert(toInsert);
    }

    await loadServicesAndOverrides();
    setPricesDirty(false);
    setSavingPrices(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <svg className="animate-spin h-6 w-6 text-gray-300" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 text-center text-gray-500">
        Customer not found.{" "}
        <Link href="/dashboard/customers" className="text-[#0E1117] underline">
          Back to customers
        </Link>
      </div>
    );
  }

  const displayName = customer.full_name || customer.name || "Unknown";
  const cardActive = customer.card_status === "active";
  const totalSpend = jobs.reduce((sum, j) => sum + (j.amount ?? 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      <Link
        href="/dashboard/customers"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0E1117] transition"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Customers
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        {editing ? (
          <div className="space-y-4">
            <h2 className="font-semibold text-[#0E1117]">Edit customer</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Full name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#0E1117] outline-none focus:border-[#0E1117]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#0E1117] outline-none focus:border-[#0E1117]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#0E1117] outline-none focus:border-[#0E1117]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#0E1117] outline-none focus:border-[#0E1117]"
                />
              </div>
            </div>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="rounded-xl bg-[#0E1117] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a2130] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={() => { setEditing(false); setSaveError(null); }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
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
                {customer.created_at
  ? new Date(customer.created_at).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  : "—"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="text-right">
                <p className="text-2xl font-bold text-[#0E1117]">${totalSpend.toFixed(2)}</p>
                <p className="text-xs text-gray-400">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</p>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card section */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-[#0E1117]">Payment card</h2>
        {cardActive ? (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[#0E1117]">
                {customer.card_brand
                  ? `${customer.card_brand.charAt(0).toUpperCase()}${customer.card_brand.slice(1)} ending in ${customer.card_last4}`
                  : "Card on file"}
              </p>
              <p className="text-xs text-green-600">Active</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[#0E1117]">No card on file</p>
              <p className="text-xs text-gray-400">Send an auth link to let this customer save their card.</p>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleSendAuthLink}
              disabled={sendingLink || !customer.phone}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#0E1117] transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingLink ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {cardActive ? "Re-send auth link" : "Send auth link via SMS"}
                </>
              )}
            </button>
            <button
              onClick={() => setShowManualCardModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#0E1117] transition hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Enter Card Manually
            </button>
          </div>
          {!customer.phone && (
            <p className="text-xs text-gray-400">Add a phone number to this customer to send an auth link.</p>
          )}
          {linkMessage && (
            <div className={`rounded-lg px-4 py-3 text-sm break-all ${
              linkMessage.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {linkMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Per-customer pricing */}
      {services.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="font-semibold text-[#0E1117]">Custom pricing</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Override default service prices for this customer. Leave blank to use the default.
            </p>
          </div>
          <div className="space-y-2">
            {services.map((svc) => {
              const overrideVal = localOverrides[svc.id] ?? "";
              const hasOverride = overrideVal !== "";
              return (
                <div key={svc.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3">
                  <span className="text-lg w-6 text-center">{svc.emoji ?? "🔧"}</span>
                  <span className="flex-1 text-sm text-[#0E1117]">{svc.name}</span>
                  <span className="text-xs text-gray-400 mr-2">Default: ${svc.default_price.toFixed(2)}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      placeholder={svc.default_price.toFixed(2)}
                      value={overrideVal}
                      onChange={(e) => handlePriceChange(svc.id, e.target.value)}
                      className={`w-20 rounded-lg border px-2 py-1.5 text-sm text-right font-mono outline-none focus:border-[#0E1117] ${
                        hasOverride ? "border-[#0E1117] bg-white" : "border-gray-200 bg-gray-50"
                      }`}
                    />
                    {hasOverride && (
                      <button
                        onClick={() => handleClearOverride(svc.id)}
                        className="text-gray-300 hover:text-gray-500 transition"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {pricesDirty && (
            <button
              onClick={handleSavePrices}
              disabled={savingPrices}
              className="rounded-xl bg-[#0E1117] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a2130] disabled:opacity-50 transition"
            >
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
            {jobs.map((job) => (
              <div key={job.id} className="block rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#0E1117]">
                      {job.job_services?.map((s) => s.name).join(", ") || "Service"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {job.created_at
  ? new Date(job.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  : "—"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#0E1117]">
                    ${job.amount.toFixed(2)}
                  </p>
                </div>
                {job.notes && (
                  <p className="mt-1 text-xs text-gray-500 truncate">{job.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Card Modal */}
      {showManualCardModal && (
        <ManualCardModal
          customerId={customerId}
          onClose={() => {
            setShowManualCardModal(false);
            setManualCardError(null);
            setManualCardSuccess(false);
          }}
          onSuccess={() => {
            setManualCardSuccess(true);
            loadCustomer();
            setTimeout(() => setShowManualCardModal(false), 2000);
          }}
        />
      )}

    </div>
  );
}

function ManualCardModal({
  customerId,
  onClose,
  onSuccess,
}: {
  customerId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
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
      // Create SetupIntent
      const res = await fetch("/api/stripe/setup-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { clientSecret } = data;

      // Confirm SetupIntent
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message ?? "Something went wrong.");
        setSubmitting(false);
        return;
      }

      if (setupIntent?.status === "succeeded") {
        // Update customer with setupIntentId
        const updateRes = await fetch("/api/customers/update-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId,
            setupIntentId: setupIntent.id,
          }),
        });

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
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Card Information</label>
            <div className="border border-gray-300 rounded-lg p-3">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !stripe}
              className="flex-1 py-3 bg-[#0E1117] text-white rounded-lg hover:bg-[#1a2130] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}