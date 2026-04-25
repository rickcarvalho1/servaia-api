import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = await createAdminClient();

    // ── Token-based flow (customer-facing /authorize page) ──────────────────
    if (body.token) {
      const { data: authToken, error: tokenError } = await supabase
        .from("auth_tokens")
        .select("customer_id, expires_at, used")
        .eq("token", body.token)
        .single();

      if (tokenError || !authToken) {
        return NextResponse.json({ error: "invalid" }, { status: 401 });
      }

      if (authToken.used) {
        return NextResponse.json({ error: "used" }, { status: 401 });
      }

      if (new Date(authToken.expires_at) < new Date()) {
        return NextResponse.json({ error: "expired" }, { status: 401 });
      }

      const { data: customer } = await supabase
        .from("customers")
        .select(`
          id,
          full_name,
          name,
          email,
          stripe_customer_id,
          service_companies (
            id,
            name
          )
        `)
        .eq("id", authToken.customer_id)
        .single();

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }

      const customerName = customer.full_name || customer.name || "";
      let stripeCustomerId = customer.stripe_customer_id;

      if (!stripeCustomerId) {
        const stripeCustomer = await stripe.customers.create({
          name: customerName,
          email: customer.email ?? undefined,
          metadata: { supabase_customer_id: customer.id },
        });
        stripeCustomerId = stripeCustomer.id;
        await supabase
          .from("customers")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", customer.id);
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        usage: "off_session",
        metadata: {
          customer_id: customer.id,
          token: body.token,
        },
      });

      const company = Array.isArray(customer.service_companies)
        ? customer.service_companies[0]
        : customer.service_companies;

      return NextResponse.json({
        clientSecret: setupIntent.client_secret,
        customerName,
        businessName: company?.name ?? "Your service provider",
      });
    }

    // ── Session-based flow (dashboard) ──────────────────────────────────────
    if (body.customerId) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id, full_name, name, email, stripe_customer_id")
        .eq("id", body.customerId)
        .single();

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }

      let stripeCustomerId = customer.stripe_customer_id;
      const customerName = customer.full_name || customer.name || "";

      if (!stripeCustomerId) {
        const stripeCustomer = await stripe.customers.create({
          name: customerName,
          email: customer.email ?? undefined,
          metadata: { supabase_customer_id: customer.id },
        });
        stripeCustomerId = stripeCustomer.id;
        await supabase
          .from("customers")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", customer.id);
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        usage: "off_session",
      });

      return NextResponse.json({ clientSecret: setupIntent.client_secret });
    }

    return NextResponse.json(
      { error: "token or customerId is required" },
      { status: 400 }
    );
  } catch (err) {
    console.error("setup-intent error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
