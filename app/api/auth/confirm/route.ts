import // v2
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  try {
    const { token, setupIntentId } = await req.json();

    if (!token || !setupIntentId) {
      return NextResponse.json(
        { error: "token and setupIntentId are required" },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    const { data: authToken, error: tokenError } = await supabase
      .from("auth_tokens")
      .select("customer_id, expires_at, used")
      .eq("token", token)
      .single();

    if (tokenError || !authToken) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 401 }
      );
    }

    if (authToken.used) {
      return NextResponse.json(
        { error: "This link has already been used" },
        { status: 401 }
      );
    }

    if (new Date(authToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This link has expired. Please request a new one." },
        { status: 401 }
      );
    }

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
      expand: ["payment_method"],
    });

    if (setupIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Card setup did not complete successfully" },
        { status: 400 }
      );
    }

    const paymentMethodId =
      typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "No payment method found on SetupIntent" },
        { status: 400 }
      );
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const cardBrand = paymentMethod.card?.brand ?? null;
    const cardLast4 = paymentMethod.card?.last4 ?? null;

    const { error: updateError } = await supabase
      .from("customers")
      .update({
        stripe_payment_method: paymentMethodId,
        card_status: "active",
        card_brand: cardBrand,
        card_last4: cardLast4,
      })
      .eq("id", authToken.customer_id);

    if (updateError) {
      console.error("Customer update error:", updateError);
      return NextResponse.json(
        { error: "Failed to save payment method" },
        { status: 500 }
      );
    }

    await supabase
      .from("auth_tokens")
      .update({ used: true })
      .eq("token", token);

    return NextResponse.json({
      success: true,
      message: "Card saved successfully",
      card: cardBrand && cardLast4 ? `${cardBrand} ending in ${cardLast4}` : null,
    });
  } catch (err) {
    console.error("confirm error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}