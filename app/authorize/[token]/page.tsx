"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  loadStripe,
  StripeElementsOptions,
} from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

function CardSetupForm({
  token,
  clientSecret,
  onSuccess,
}: {
  token: string;
  clientSecret: string;
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

    const { error: confirmError, setupIntent } =
      await stripe.confirmSetup({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/authorize/${token}/success`,
        },
      });

    if (confirmError) {
      setError(confirmError.message ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    if (setupIntent?.status === "succeeded") {
      const res = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          setupIntentId: setupIntent.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save card.");
        setSubmitting(false);
        return;
      }

      onSuccess();
    } else {
      setError("Card setup did not complete. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",
          fields: {
            billingDetails: {
              name: "auto",
              email: "never",
            },
          },
        }}
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !stripe}
        className="w-full rounded-xl bg-[#0E1117] text-white py-3.5 text-sm font-semibold tracking-wide transition hover:bg-[#1a2130] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving card...
          </span>
        ) : (
          "Save card securely"
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        Your card is encrypted and stored securely via Stripe.
        <br />
        You will only be charged after a completed service.
      </p>
    </form>
  );
}

type PageState = "loading" | "ready" | "success" | "expired" | "used" | "error";

export default function AuthorizePage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<PageState>("loading");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("Your service provider");
  const [customerName, setCustomerName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!token) return;

    async function initialize() {
      try {
        const res = await fetch("/api/stripe/setup-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.error === "expired") setState("expired");
          else if (data.error === "used") setState("used");
          else { setErrorMessage(data.error ?? "Invalid link."); setState("error"); }
          return;
        }

        setClientSecret(data.clientSecret);
        setBusinessName(data.businessName ?? "Your service provider");
        setCustomerName(data.customerName ?? "");
        setState("ready");
      } catch {
        setErrorMessage("Unable to load page. Please try again.");
        setState("error");
      }
    }

    initialize();
  }, [token]);

  if (state === "success") {
    return (
      <PageShell>
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#0E1117]">Card saved!</h2>
          <p className="text-sm text-gray-500">
            Your card has been securely saved. You&apos;ll only be charged after a completed service.
          </p>
          <p className="text-xs text-gray-400 pt-2">You can close this window.</p>
        </div>
      </PageShell>
    );
  }

  if (state === "expired") {
    return (
      <PageShell>
        <StatusCard icon="⏰" title="Link expired" message="This authorization link has expired. Please contact your service provider to request a new one." color="yellow" />
      </PageShell>
    );
  }

  if (state === "used") {
    return (
      <PageShell>
        <StatusCard icon="✓" title="Already authorized" message="Your card has already been saved on file. No further action is needed." color="green" />
      </PageShell>
    );
  }

  if (state === "error") {
    return (
      <PageShell>
        <StatusCard icon="✕" title="Invalid link" message={errorMessage || "This link is invalid or no longer active."} color="red" />
      </PageShell>
    );
  }

  if (state === "loading" || !clientSecret) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 py-8">
          <svg className="animate-spin h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-400">Loading secure page…</p>
        </div>
      </PageShell>
    );
  }

  const elementsOptions: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#0E1117",
        colorBackground: "#ffffff",
        colorText: "#0E1117",
        colorDanger: "#df1b41",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "10px",
      },
    },
  };

  return (
    <PageShell>
      <div className="mb-6 space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0E1117]">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[#0E1117]">Save your card on file</h1>
        {customerName && <p className="text-sm text-gray-500">Hi {customerName} 👋</p>}
        <p className="text-sm text-gray-500">
          {businessName} uses Servaia to charge for completed services. Save your card now for seamless billing.
        </p>
      </div>

      <Elements stripe={stripePromise} options={elementsOptions}>
        <CardSetupForm token={token} clientSecret={clientSecret} onSuccess={() => setState("success")} />
      </Elements>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-lg font-bold tracking-tight text-[#0E1117]">Servaia</span>
          <span className="ml-1 text-lg font-light text-gray-400">Pay</span>
        </div>
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-6 py-8">
          {children}
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            SSL encrypted
          </span>
          <span>·</span>
          <span>Powered by Stripe</span>
          <span>·</span>
          <span>PCI compliant</span>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon, title, message, color }: { icon: string; title: string; message: string; color: "green" | "yellow" | "red" }) {
  const bg = { green: "bg-green-50", yellow: "bg-yellow-50", red: "bg-red-50" }[color];
  return (
    <div className={`rounded-xl ${bg} p-6 text-center space-y-3`}>
      <div className="text-3xl">{icon}</div>
      <h2 className="font-bold text-[#0E1117]">{title}</h2>
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
}