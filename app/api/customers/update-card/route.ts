import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  try {
    const {
      customerId,
      setupIntentId,
    } = await req.json();

    if (!customerId || !setupIntentId) {
      return NextResponse.json(
        { error: "customerId and setupIntentId are required" },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Retrieve the SetupIntent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (setupIntent.status !== "succeeded" || !setupIntent.payment_method) {
      return NextResponse.json(
        { error: "SetupIntent not succeeded or no payment method" },
        { status: 400 }
      );
    }

    // Retrieve payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(setupIntent.payment_method as string);

    const { error } = await supabase
      .from("customers")
      .update({
        stripe_payment_method: setupIntent.payment_method,
        card_brand: paymentMethod.card?.brand,
        card_last4: paymentMethod.card?.last4,
        card_status: "saved",
      })
      .eq("id", customerId);

    if (error) {
      console.error("Update customer card error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update customer card error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}