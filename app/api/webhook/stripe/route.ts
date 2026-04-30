import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret || webhookSecret === "whsec_placeholder") {
    console.warn("Stripe webhook secret not configured");
    return NextResponse.json({ received: true });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createAdminClient();

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase
        .from("payments")
        .update({ payment_status: "succeeded" })
        .eq("stripe_charge_id", pi.id);
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase
        .from("payments")
        .update({ payment_status: "failed" })
        .eq("stripe_charge_id", pi.id);
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const companyId = session.metadata?.company_id;

      if (companyId && session.mode === 'subscription') {
        // Activate subscription and set subscription status to active
        await supabase
          .from('service_companies')
          .update({
            subscription_status: 'active',
          })
          .eq('id', companyId);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}