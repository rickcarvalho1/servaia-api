"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Trash2, CheckCircle2 } from "lucide-react";

export default function ScheduleJobPage() {
  const router = useRouter();
  const supabase = createClient();

  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [addons, setAddons] = useState<{ name: string; price: string }[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
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

      const [{ data: custs }, { data: svcs }, { data: team }] = await Promise.all([
        supabase.from("customers").select("*").eq("business_id", bizId).order("full_name"),
        supabase.from("services").select("*").eq("business_id", bizId).eq("active", true).order("sort_order"),
        supabase.from("team_members").select("full_name, role").eq("service_company_id", bizId),
      ]);

      setCustomers(custs || []);
      setServices(svcs || []);
      setTeamMembers(team || []);
      setLoading(false);
    }
    load();
  }, []);

  function toggleService(svc: any) {
    const exists = selectedServices.find((s) => s.serviceId === svc.id);
    if (exists) {
      setSelectedServices((prev) => prev.filter((s) => s.serviceId !== svc.id));
    } else {
      setSelectedServices((prev) => [
        ...prev,
        { serviceId: svc.id, name: svc.name, price: svc.default_price.toString(), isCustom: false },
      ]);
    }
  }

  function updateServicePrice(serviceId: string, price: string) {
    setSelectedServices((prev) =>
      prev.map((s) => (s.serviceId === serviceId ? { ...s, price } : s))
    );
  }

  function addAddon() {
    setAddons((prev) => [...prev, { name: "", price: "" }]);
  }

  function updateAddon(i: number, field: string, value: string) {
    setAddons((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  }

  function removeAddon(i: number) {
    setAddons((prev) => prev.filter((_, idx) => idx !== i));
  }

  const allLineItems = [
    ...selectedServices,
    ...addons
      .filter((a) => a.name && a.price)
      .map((a) => ({ serviceId: null, name: a.name, price: a.price, isCustom: true })),
  ];

  const total = allLineItems.reduce((s, item) => s + (parseFloat(item.price) || 0), 0);

  async function handleSchedule() {
    if (!selectedCustomer) { setError("Please select a customer"); return; }
    if (allLineItems.length === 0) { setError("Please select at least one service"); return; }
    if (!scheduledFor) { setError("Please select a date and time"); return; }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/jobs/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          services: allLineItems,
          scheduledFor: new Date(scheduledFor).toISOString(),
          assignedTo,
          notes,
          businessId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule job");
      router.push("/dashboard/jobs");
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-[#6B7490] text-sm">Loading...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href="/dashboard/jobs"
        className="flex items-center gap-2 text-[#6B7490] text-sm hover:text-[#0E1117] transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back to Jobs
      </Link>

      <h1 className="text-3xl font-bold text-[#0E1117] tracking-tight mb-1"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
        Schedule a Job
      </h1>
      <p className="text-[#6B7490] text-sm mb-8">
        Book a job in advance. Crew will see it on their mobile view.
      </p>

      {/* Customer */}
      <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm p-6 mb-4">
        <h2 className="font-semibold text-[#0E1117] mb-4">Select Customer</h2>
        {customers.length === 0 ? (
          <p className="text-sm text-[#6B7490]">No customers yet.</p>
        ) : (
          <div className="grid gap-2">
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCustomer(c)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                  selectedCustomer?.id === c.id
                    ? "border-[#4F8EF7] bg-[rgba(79,142,247,0.06)]"
                    : "border-[#DDE1EC] hover:border-[#4F8EF7]/50"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-[rgba(79,142,247,0.1)] text-[#4F8EF7] flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {(c.full_name || c.name)?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#0E1117]">{c.full_name || c.name}</div>
                  <div className="text-xs text-[#6B7490]">{c.address || c.phone}</div>
                </div>
                {c.card_status !== "active" && (
                  <span className="text-xs text-[#E8A020]">No card</span>
                )}
                {selectedCustomer?.id === c.id && (
                  <CheckCircle2 size={16} className="text-[#4F8EF7] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Services */}
      <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm p-6 mb-4">
        <h2 className="font-semibold text-[#0E1117] mb-4">Services</h2>
        <div className="grid gap-2 mb-4">
          {services.map((svc) => {
            const selected = selectedServices.find((s) => s.serviceId === svc.id);
            return (
              <div
                key={svc.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                  selected ? "border-[#4F8EF7] bg-[rgba(79,142,247,0.06)]" : "border-[#DDE1EC]"
                }`}
              >
                <button onClick={() => toggleService(svc)} className="flex items-center gap-3 flex-1 text-left">
                  <span className="text-xl">{svc.emoji}</span>
                  <span className="text-sm font-medium text-[#0E1117]">{svc.name}</span>
                </button>
                {selected ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[#6B7490] text-sm">$</span>
                    <input
                      type="number"
                      value={selected.price}
                      onChange={(e) => updateServicePrice(svc.id, e.target.value)}
                      className="w-20 px-2 py-1 border border-[#DDE1EC] rounded text-sm text-right font-mono outline-none focus:border-[#4F8EF7]"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-[#6B7490] font-mono">${svc.default_price}</span>
                )}
                <button
                  onClick={() => toggleService(svc)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    selected ? "bg-[#4F8EF7] border-[#4F8EF7] text-white" : "border-[#DDE1EC]"
                  }`}
                >
                  {selected && <span className="text-xs">✓</span>}
                </button>
              </div>
            );
          })}
        </div>

        {addons.map((addon, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={addon.name}
              onChange={(e) => updateAddon(i, "name", e.target.value)}
              placeholder="Custom item name"
              className="flex-1 px-3 py-2 border border-[#DDE1EC] rounded-lg text-sm outline-none focus:border-[#4F8EF7] bg-[#F8F9FC]"
            />
            <div className="flex items-center gap-1">
              <span className="text-[#6B7490] text-sm">$</span>
              <input
                type="number"
                value={addon.price}
                onChange={(e) => updateAddon(i, "price", e.target.value)}
                placeholder="0"
                className="w-20 px-3 py-2 border border-[#DDE1EC] rounded-lg text-sm text-right font-mono outline-none focus:border-[#4F8EF7] bg-[#F8F9FC]"
              />
            </div>
            <button onClick={() => removeAddon(i)} className="text-[#6B7490] hover:text-[#E05252]">
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        <button onClick={addAddon} className="flex items-center gap-2 text-sm text-[#4F8EF7] hover:underline mt-2">
          <Plus size={14} /> Add custom line item
        </button>
      </div>

      {/* Schedule details */}
      <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm p-6 mb-4">
        <h2 className="font-semibold text-[#0E1117] mb-4">Schedule Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm outline-none focus:border-[#4F8EF7] bg-[#F8F9FC]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">
              Assign To
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm outline-none focus:border-[#4F8EF7] bg-[#F8F9FC]"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m, i) => (
                <option key={i} value={m.full_name}>{m.full_name} ({m.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for the crew..."
              rows={2}
              className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm outline-none focus:border-[#4F8EF7] bg-[#F8F9FC] resize-none"
            />
          </div>
        </div>
      </div>

      {/* Total + Schedule */}
      <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[#6B7490] text-sm font-medium">Estimated Total</span>
          <span className="text-3xl font-bold text-[#0E1117] font-mono">${total.toFixed(2)}</span>
        </div>

        {error && (
          <div className="px-4 py-3 bg-[rgba(224,82,82,0.1)] border border-[rgba(224,82,82,0.2)] rounded-lg text-sm text-[#E05252] mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleSchedule}
          disabled={saving || total === 0 || !selectedCustomer || !scheduledFor}
          className="w-full py-4 bg-[#0E1117] text-white font-bold text-base rounded-lg hover:bg-[#4F8EF7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Scheduling…" : "📅 Schedule Job"}
        </button>
        <p className="text-xs text-[#6B7490] text-center mt-3">
          Card will only be charged when the crew marks the job complete.
        </p>
      </div>
    </div>
  );
}