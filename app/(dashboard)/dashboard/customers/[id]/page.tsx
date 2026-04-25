"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Customer = {
  id: string;
  full_name: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
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
  total_amount: number;
  notes: string | null;
  job_services: {
    service_name: string;
    quantity: number;
    unit_price: number;
  }[];
};

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkMessage, setLinkMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const supabase = createClient();

  const loadCustomer = useCallback(async () => {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();
    setCustomer(data);
  }, [customerId, supabase]);

  const loadJobs = useCallback(async () => {
    const { data } = await supabase
      .from("payments")
      .select(`
        id,
        created_at,
        total_amount,
        notes,
        job_services (
          service_name,
          quantity,
          unit_price
        )
      `)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    setJobs(data ?? []);
  }, [customerId, supabase]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadCustomer(), loadJobs()]);
      setLoading(false);
    }
    init();
  }, [loadCustomer, loadJobs]);

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
            ? `Twilio not set up yet — here's the test link: ${data.authLink}`
            : "Auth link sent via SMS!",
        });
      }
    } catch {
      setLinkMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSendingLink(false);
    }
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
  const totalSpend = jobs.reduce((sum, j) => sum + (j.total_amount ?? 0), 0);

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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0E1117]">{displayName}</h1>
            <div className="mt-1 space-y-0.5 text-sm text-gray-500">
              {customer.email && <p>{customer.email}</p>}
              {customer.phone && <p>{customer.phone}</p>}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Customer since{" "}
              {new Date(customer.created_at).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-[#0E1117]">${totalSpend.toFixed(2)}</p>
            <p className="text-xs text-gray-400">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
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

          {!customer.phone && (
            <p className="text-xs text-gray-400">Add a phone number to this customer to send an auth link.</p>
          )}

          {linkMessage && (
            <div className={`rounded-lg px-4 py-3 text-sm ${
              linkMessage.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {linkMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Job history */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-[#0E1117]">Job history</h2>

        {jobs.length === 0 ? (
          <p className="text-sm text-gray-400">No jobs yet.</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/dashboard/jobs/${job.id}`}
                className="block rounded-xl border border-gray-100 p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#0E1117]">
                      {job.job_services?.map((s) => s.service_name).join(", ") || "Service"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(job.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#0E1117]">
                    ${(job.total_amount / 100).toFixed(2)}
                  </p>
                </div>
                {job.notes && (
                  <p className="mt-1 text-xs text-gray-500 truncate">{job.notes}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}