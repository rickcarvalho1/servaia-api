"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useState } from "react";

let stripePromise: Promise<any> | null = null;

try {
  if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
} catch (error) {
  console.error("Failed to initialize Stripe:", error);
}

export function StripeProvider({ children }: { children: React.ReactNode }) {
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [stripeError, setStripeError] = useState(false);

  useEffect(() => {
    if (!stripePromise) {
      setStripeLoaded(true);
      return;
    }

    stripePromise.then(() => {
      setStripeLoaded(true);
    }).catch((error) => {
      console.error("Failed to load Stripe:", error);
      setStripeError(true);
      setStripeLoaded(true);
    });
  }, []);

  // If no Stripe key or error loading Stripe, render children without provider
  if (!stripePromise || stripeError) {
    return <>{children}</>;
  }

  // If Stripe is still loading, render children without provider for now
  if (!stripeLoaded) {
    return <>{children}</>;
  }

  return <Elements stripe={stripePromise}>{children}</Elements>;
}